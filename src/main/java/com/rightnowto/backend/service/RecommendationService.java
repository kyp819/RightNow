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
    private final RestClient restClient = RestClient.create();

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${gemini.api.key}")
    private String geminiApiKey;

    public RecommendationService(WeatherService weatherService,
            PlacesService placesService,
            VibeCheckRepository vibeCheckRepository) {
        this.weatherService = weatherService;
        this.placesService = placesService;
        this.vibeCheckRepository = vibeCheckRepository;
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
                    "model", "nvidia/nemotron-3-ultra-550b-a55b:free",
                    "messages", List.of(
                            Map.of(
                                    "role", "user",
                                    "content", prompt
                            )
                    )
            );

            Map<String, Object> response = restClient.post()
                    .uri("https://openrouter.ai/api/v1/chat/completions")
                    .header("Content-Type", "application/json")
                    .header("Authorization", "Bearer " + geminiApiKey)
                    .body(requestBody)
                    .retrieve()
                    .body(Map.class);

            if (response == null || response.get("choices") == null) {
                return List.of(Map.of("error", "No response from OpenRouter"));
            }

            List<Map<String, Object>> choices = (List<Map<String, Object>>) response.get("choices");

            if (choices.isEmpty()) {
                return List.of(Map.of("error", "OpenRouter returned no choices"));
            }

            Map<String, Object> firstChoice = choices.get(0);
            Map<String, Object> message = (Map<String, Object>) firstChoice.get("message");

            if (message == null || message.get("content") == null) {
                return List.of(Map.of("error", "OpenRouter response has no message content"));
            }

            String responseText = (String) message.get("content");
            
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
            return List.of(Map.of("error", "Something went wrong" + e.getMessage()));
        }
    }

}