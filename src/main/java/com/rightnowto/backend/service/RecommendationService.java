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

    @Value("${gemini.model:gemini-2.0-flash-lite}")
    private String geminiModel;

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

    public List<Map<String, Object>> getRecommendations(Double lat, Double lon, String city) {
        // --- GEMINI API CODE ---
        try {
            String activeCity = city != null ? city : "Toronto";
            Map<String, Object> weather = weatherService.getCurrentWeather(lat, lon);
            Map<String, Object> places = placesService.getNearbyPlaces(lat, lon);
            List<VibeCheck> vibeChecks = vibeCheckRepository.findAll();
            
            // --- CLEANED PROMPT LOGIC ---
            StringBuilder cleanPlacesList = new StringBuilder();
            List<Map<String, Object>> placesList = (List<Map<String, Object>>) places.get("places");
            if (placesList != null) {
                for (int i = 0; i < placesList.size(); i++) {
                    Map<String, Object> place = placesList.get(i);
                    Map<String, String> displayName = (Map<String, String>) place.get("displayName");
                    String name = displayName != null ? displayName.get("text") : "Unknown Place";
                    String type = place.containsKey("primaryType") ? (String) place.get("primaryType") : "restaurant";
                    cleanPlacesList.append("- ").append(name).append(" (Type: ").append(type).append(")\n");
                }
            }
            
            StringBuilder vibeList = new StringBuilder();
            for (VibeCheck v : vibeChecks) {
                if (v.getLocationName() != null && v.getVibe() != null) {
                    vibeList.append("- ").append(v.getLocationName())
                            .append(": ").append(v.getVibe()).append("\n");
                }
            }
            String vibeSection = vibeList.length() > 0
                ? "Here are recent crowd vibe reports from people on the street right now:\n" + vibeList.toString()
                : "No vibe reports yet.";

            String prompt = "It is currently " + weather.get("current") + " in downtown " + activeCity + ".\n"
            + "Here is the STRICT list of nearby food and drink spots:\n"
            + cleanPlacesList.toString() + "\n"
            + vibeSection + "\n"
            + "Based on the weather, time, and vibe reports, recommend the best 8 - 10 food and drink spots from the STRICT list provided above.\n"
            + "CRITICAL: You MUST ONLY recommend places that are EXACTLY in the list above. Do not recommend any place that is not in the list.\n"
            + "Make sure to include 3 - 4 food and drink spots from the list which are vegetarian and vegan.\n"
            + "For each, give a short and weather and time based plain-English reason and give ONLY open now spots only\n"
            + "Respond ONLY with valid JSON, no other text, in this exact format:\n"
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
            "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s",
            geminiModel,
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
            throw new RuntimeException("Gemini API Error " + response.getStatusCode() +
            ": " + res);
            }
            return res;
            });
            System.out.println("GEMINI RAW RESPONSE: " + rawResponse);
            Map<String, Object> response = objectMapper.readValue(rawResponse,
            Map.class);
            
            if (response == null || response.get("candidates") == null) {
            return List.of(Map.of("error", "No response from Gemini API"));
            }
            
            List<Map<String, Object>> candidates = (List<Map<String, Object>>)
            response.get("candidates");
            
            if (candidates.isEmpty()) {
            return List.of(Map.of("error", "Gemini API returned no candidates"));
            }
            
            Map<String, Object> firstCandidate = candidates.get(0);
            Map<String, Object> content = (Map<String, Object>)
            firstCandidate.get("content");
            
            if (content == null || content.get("parts") == null) {
            return List.of(Map.of("error", "Gemini response has no content parts"));
            }
            
            List<Map<String, Object>> parts = (List<Map<String, Object>>)
            content.get("parts");
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