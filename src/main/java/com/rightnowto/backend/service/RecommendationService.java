package com.rightnowto.backend.service;

import com.rightnowto.backend.entity.VibeCheck;
import com.rightnowto.backend.repository.VibeCheckRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import tools.jackson.databind.ObjectMapper;

import java.util.List;
import java.util.Map;

@Service
public class RecommendationService {
    private final WeatherService weatherService;
    private final PlacesService placesService;
    private final VibeCheckRepository vibeCheckRepository;
    private final RestClient restClient;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${gemini.api.key}")
    private String geminiApiKey;

    @Value("${gemini.model:google/gemini-2.5-flash}")
    private String geminiModel;

    public RecommendationService(WeatherService weatherService,
            PlacesService placesService,
            VibeCheckRepository vibeCheckRepository) {
        this.weatherService = weatherService;
        this.placesService = placesService;
        this.vibeCheckRepository = vibeCheckRepository;
        org.springframework.http.client.SimpleClientHttpRequestFactory factory = new org.springframework.http.client.SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(10000);
        factory.setReadTimeout(30000);
        this.restClient = RestClient.builder()
                .requestFactory(factory)
                .build();
    }

    public List<Map<String, Object>> getRecommendations() {
        try {
            Map<String, Object> weather = weatherService.getCurrentWeather();
            Map<String, Object> places = placesService.getNearbyPlaces();
            List<VibeCheck> vibeChecks = vibeCheckRepository.findAll();

            String prompt = "It is currently " + weather.get("current") + " in downtown Toronto. "
                    + "Here are nearby food and drink spots: " + places.get("places") + ". "
                    + "Here are recent vibe checks: " + vibeChecks + ". "
                    + "Based on the weather, time, and vibe checks, recommend the best 3-5 food and drink spots right now and also show 3 - 4 food and drink spots which are vegetarian and vegan"
                    + "For each, give a short plain-English reason. "
                    + "Respond ONLY with valid JSON, no other text, in this exact format: "
                    + "{\"recommendations\": [{\"placeName\": \"...\", \"reason\": \"...\", \"Type\"}]}";

            Map<String, Object> requestBody = Map.of(
                    "contents", List.of(
                            Map.of(
                                    "parts", List.of(
                                            Map.of("text", prompt)
                                    )
                            )
                    )
            );

            Map<String, Object> response = restClient.post()
                    .uri("https://generativelanguage.googleapis.com/v1beta/models/" + geminiModel + ":generateContent?key=" + geminiApiKey)
                    .header("Content-Type", "application/json")
                    .body(requestBody)
                    .retrieve()
                    .body(Map.class);

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
                return List.of(Map.of("error", "Gemini response has no message content"));
            }

            List<Map<String, Object>> parts = (List<Map<String, Object>>) content.get("parts");
            if (parts.isEmpty()) {
                return List.of(Map.of("error", "Gemini response has no parts"));
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