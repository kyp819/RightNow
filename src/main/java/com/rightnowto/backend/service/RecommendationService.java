package com.rightnowto.backend.service;

import com.rightnowto.backend.entity.VibeCheck;
import com.rightnowto.backend.repository.VibeCheckRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import tools.jackson.databind.ObjectMapper;

import java.util.List;
import java.util.Map;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.Duration;
import java.util.Queue;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.atomic.AtomicInteger;

@Service
public class RecommendationService {
    private final WeatherService weatherService;
    private final PlacesService placesService;
    private final VibeCheckRepository vibeCheckRepository;
    private final RestClient restClient;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${gemini.api.key}")
    private String geminiApiKey;

    @Value("${gemini.model:gemini-2.0-flash-lite}")
    private String geminiModel;

    // Rate Limiting variables
    private final Queue<Long> minuteRequests = new ConcurrentLinkedQueue<>();
    private final AtomicInteger dailyRequests = new AtomicInteger(0);
    private LocalDate currentDay = LocalDate.now();

    public RecommendationService(WeatherService weatherService,
            PlacesService placesService,
            VibeCheckRepository vibeCheckRepository) {
        this.weatherService = weatherService;
        this.placesService = placesService;
        this.vibeCheckRepository = vibeCheckRepository;
        org.springframework.http.client.SimpleClientHttpRequestFactory factory = new org.springframework.http.client.SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(10000);
        factory.setReadTimeout(120000);
        this.restClient = RestClient.builder()
                .requestFactory(factory)
                .build();
    }

    public List<Map<String, Object>> getRecommendations() {
        LocalDate today = LocalDate.now();
        if (!today.equals(currentDay)) {
            dailyRequests.set(0);
            currentDay = today;
            minuteRequests.clear();
        }

        long now = System.currentTimeMillis();
        minuteRequests.removeIf(t -> now - t > 60000);

        if (dailyRequests.get() >= 17) {
            LocalDateTime tomorrowMidnight = LocalDateTime.of(today.plusDays(1), LocalTime.MIDNIGHT);
            long hoursLeft = Duration.between(LocalDateTime.now(), tomorrowMidnight).toHours();
            long minutesLeft = Duration.between(LocalDateTime.now(), tomorrowMidnight).toMinutes() % 60;
            return List.of(Map.of("error", "Daily API limit reached. You can use it again in " + hoursLeft + " hours and " + minutesLeft + " minutes."));
        }

        if (minuteRequests.size() >= 2) {
            long oldest = minuteRequests.isEmpty() ? now : minuteRequests.peek();
            long secondsLeft = 60 - ((now - oldest) / 1000);
            if (secondsLeft < 0) secondsLeft = 1;
            return List.of(Map.of("error", "Per-minute limit reached. Please wait " + secondsLeft + " seconds."));
        }

        minuteRequests.add(now);
        dailyRequests.incrementAndGet();

        // --- GEMINI API CODE ---
        try {
            Map<String, Object> weather = weatherService.getCurrentWeather();
            Map<String, Object> places = placesService.getNearbyPlaces();
            List<VibeCheck> vibeChecks = vibeCheckRepository.findAll();

            String prompt = "It is currently " + weather.get("current") + " in downtown Toronto. "
                    + "Here are nearby food and drink spots: " + places.get("places") + ". "
                    + "Here are recent vibe checks: " + vibeChecks + ". "
                    + "Based on the weather, time, and vibe checks, recommend the best 8 - 10 food and drink spots right now and also show 3 - 4 food and drink spots which are vegetarian and vegan"
                    + "For each, give a short plain-English reason. "
                    + "Respond ONLY with valid JSON, no other text, in this exact format: "
                    + "{\"recommendations\": [{\"placeName\": \"...\", \"reason\": \"...\", \"Type\"}]}";

            Map<String, Object> requestBody = Map.of(
                    "contents", List.of(
                            Map.of("parts", List.of(
                                    Map.of("text", prompt)))),
                    "generationConfig", Map.of(
                            "temperature", 0.2,
                            "topP", 0.7,
                            "responseMimeType", "application/json"));

            String uri = String.format(
                    "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s", geminiModel,
                    geminiApiKey);

            String rawResponse = restClient.post()
                    .uri(uri)
                    .header("Content-Type", "application/json")
                    .body(requestBody)
                    .exchange((request, response) -> {
                        byte[] bytes = response.getBody().readAllBytes();
                        String res = new String(bytes, java.nio.charset.StandardCharsets.UTF_8);
                        if (response.getStatusCode().is4xxClientError()
                                || response.getStatusCode().is5xxServerError()) {
                            throw new RuntimeException("Gemini API Error " + response.getStatusCode() + ": " + res);
                        }
                        return res;
                    });
            System.out.println("GEMINI RAW RESPONSE: " + rawResponse);
            Map<String, Object> response = objectMapper.readValue(rawResponse, Map.class);

            if (response == null || response.get("candidates") == null) {
                return List.of(Map.of("error", "No response from Gemini API"));
            }

            List<Map<String, Object>> candidates = (List<Map<String, Object>>) response.get("candidates");

            if (candidates.isEmpty()) {
                return List.of(Map.of("error", "Gemini API returned no candidates"));
            }

            Map<String, Object> firstCandidate = candidates.get(0);
            Map<String, Object> content = (Map<String, Object>) firstCandidate.get("content");

            if (content == null || content.get("parts") == null) {
                return List.of(Map.of("error", "Gemini response has no content parts"));
            }

            List<Map<String, Object>> parts = (List<Map<String, Object>>) content.get("parts");
            if (parts.isEmpty()) {
                return List.of(Map.of("error", "Gemini response has empty parts"));
            }

            String responseText = (String) parts.get(0).get("text");

            // Clean markdown JSON formatting if present
            if (responseText.contains("```json")) {
                responseText = responseText.substring(responseText.indexOf("```json") + 7);
                if (responseText.contains("```")) {
                    responseText = responseText.substring(0, responseText.indexOf("```"));
                }
            } else if (responseText.contains("```")) {
                responseText = responseText.substring(responseText.indexOf("```") + 3);
                if (responseText.contains("```")) {
                    responseText = responseText.substring(0, responseText.indexOf("```"));
                }
            }
            responseText = responseText.trim();

            Map<String, Object> parsed = objectMapper.readValue(responseText, Map.class);
            return (List<Map<String, Object>>) parsed.get("recommendations");

        } catch (Exception e) {
            e.printStackTrace();
            return List.of(Map.of("error", "Something went wrong" + e.getMessage()));
        }
    }

}