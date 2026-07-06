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
                this.restClient = RestClient.builder().build();
        }

        private Map<String, Object> cachedPlaces = null;
        private Double cachedLat = null;
        private Double cachedLon = null;
        private long lastFetchTime = 0;
        private static final long CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

        public Map<String, Object> getNearbyPlaces(Double lat, Double lon) {
                double latitude = lat != null ? lat : Location.LAT;
                double longitude = lon != null ? lon : Location.LON;
                long now = System.currentTimeMillis();
                
                if (cachedPlaces != null && cachedLat != null && cachedLon != null 
                    && Math.abs(cachedLat - latitude) < 0.0001 
                    && Math.abs(cachedLon - longitude) < 0.0001 
                    && (now - lastFetchTime) < CACHE_DURATION_MS) {
                        System.out.println("Returning cached places (saves API cost)");
                        return cachedPlaces;
                }

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
                                                                                        "latitude", latitude,
                                                                                        "longitude", longitude),
                                                                        "radius", 1500.0)));

                        Map<String, Object> response = restClient.post()
                                        .uri("https://places.googleapis.com/v1/places:searchNearby")
                                        .header("X-Goog-Api-Key", apiKey)
                                        .header("X-Goog-FieldMask",
                                                        "places.displayName," +
                                                                        "places.formattedAddress," +
                                                                        "places.location," +
                                                                        "places.regularOpeningHours," +
                                                                        "places.nationalPhoneNumber," +
                                                                        "places.primaryType")
                                        .body(requestBody)
                                        .retrieve()
                                        .body(new ParameterizedTypeReference<Map<String, Object>>() {
                                        });

                        cachedPlaces = response;
                        cachedLat = latitude;
                        cachedLon = longitude;
                        lastFetchTime = now;
                        return response;
                } catch (Exception e) {
                        throw new RuntimeException("Failed to fetch nearby places", e);
                }
        }

}
