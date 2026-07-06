package com.rightnowto.backend.controller;

import com.rightnowto.backend.service.WeatherService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.Map;

import org.springframework.web.bind.annotation.RequestParam;

@RestController
public class WeatherController {
    private final WeatherService weatherService;

    public WeatherController(WeatherService weatherService) {
        this.weatherService = weatherService;
    }

    @GetMapping("/api/weather")
    public Map<String, Object> getWeather(
            @RequestParam(required = false) Double lat,
            @RequestParam(required = false) Double lon) {
        return weatherService.getCurrentWeather(lat, lon);
    }

    

}
