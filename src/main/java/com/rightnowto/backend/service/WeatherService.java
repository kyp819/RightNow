package com.rightnowto.backend.service;

import com.rightnowto.backend.constants.Location;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import java.util.Map;

@Service
public class WeatherService {

    private final RestClient restClient;

    public WeatherService() {
        org.springframework.http.client.SimpleClientHttpRequestFactory factory = new org.springframework.http.client.SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(3000);
        factory.setReadTimeout(3000);
        this.restClient = RestClient.builder()
                .requestFactory(factory)
                .build();
    }

//    private static final String TORONTO_LAT = "43.6532";
//    private static final String TORONTO_LON = "-79.3832";

    public Map<String,Object> getCurrentWeather()
    {
        try {
            String url = "https://api.open-meteo.com/v1/forecast"
                    + "?latitude="+ Location.LAT
                    +"&longitude="+ Location.LON
                    + "&current=temperature_2m,weather_code"
                    +"&timezone=America/Toronto";

            return restClient.get().uri(url).retrieve().body(new ParameterizedTypeReference<Map<String, Object>>() {});
        } catch (Exception e) {
            // Fallback weather data if the external service is offline or blocked
            return Map.of(
                "current", Map.of(
                    "temperature_2m", 21.5,
                    "weather_code", 1
                )
            );
        }
    }

}
