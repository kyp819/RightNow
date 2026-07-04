package com.rightnowto.backend.service;

import com.rightnowto.backend.constants.Location;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

@Service
public class PlacesService {
    @Value("${google.places.api.key}")
    private String apiKey;

        private final RestClient restClient;

        public PlacesService() {
                org.springframework.http.client.SimpleClientHttpRequestFactory factory = new org.springframework.http.client.SimpleClientHttpRequestFactory();
                factory.setConnectTimeout(3000);
                factory.setReadTimeout(3000);
                this.restClient = RestClient.builder()
                                .requestFactory(factory)
                                .build();
        }

        public Map<String, Object> getNearbyPlaces() {
                try {
                        Map<String, Object> requestBody = Map.of(
                                        "includedTypes",
                                        List.of("cafe", "coffee_shop", "bakery", "restaurant", "bar", "pub",
                                                        "ice_cream_shop", "juice_shop", "vegan_restaurant",
                                                        "vegetarian_restaurant"),
                                        "maxResultCount", 20,
                                        "locationRestriction", Map.of(
                                                        "circle", Map.of(
                                                                        "center", Map.of(
                                                                                        "latitude", Location.LAT,
                                                                                        "longitude", Location.LON),
                                                                        "radius", 1500.0)));

                        return restClient.post()
                                        .uri("https://places.googleapis.com/v1/places:searchNearby")
                                        .header("X-Goog-Api-Key", apiKey)
                                        .header("X-Goog-FieldMask",
                                                        "places.displayName," +
                                                                        "places.formattedAddress," +
                                                                        "places.location," +
                                                                        "places.regularOpeningHours," +
                                                                        "places.nationalPhoneNumber")
                                        .body(requestBody)
                                        .retrieve()
                                        .body(new ParameterizedTypeReference<Map<String, Object>>() {
                                        });
                } catch (Exception e) {
                        throw new RuntimeException("Failed to fetch nearby places", e);
                }
        }

}
