package com.rightnowto.backend.controller;

import com.rightnowto.backend.service.PlacesService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class PlacesController {


            private final PlacesService placesService;

            public PlacesController(PlacesService placesService)
            {
                this.placesService = placesService;
            }

            @GetMapping("/api/places")
            public Map<String,Object> getPlaces()
            {
                return placesService.getNearbyPlaces();
            }


}
