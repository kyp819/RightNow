package com.rightnowto.backend.service;

import com.rightnowto.backend.constants.Location;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import java.util.Map;

@Service
public class WeatherService {

    private final RestClient restClient = RestClient.create();

//    private static final String TORONTO_LAT = "43.6532";
//    private static final String TORONTO_LON = "-79.3832";

    public Map<String,Object> getCurrentWeather()
    {
        String url = "https://api.open-meteo.com/v1/forecast"
                + "?latitude="+ Location.LAT
                +"&longitude="+ Location.LON
                + "&current=temperature_2m,weather_code"
                +"&timezone=America/Toronto";

        return restClient.get().uri(url).retrieve().body(new ParameterizedTypeReference<Map<String, Object>>() {});

    }

}
