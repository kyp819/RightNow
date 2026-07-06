package com.rightnowto.backend.controller;

import com.rightnowto.backend.entity.VibeCheck;
import com.rightnowto.backend.repository.VibeCheckRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.List;

@RestController
public class VibeCheckController {

    private final VibeCheckRepository vibeCheckRepository;

    public VibeCheckController(VibeCheckRepository vibeCheckRepository) {
        this.vibeCheckRepository = vibeCheckRepository;
    }

    @PostMapping("/api/vibe-check")
    public VibeCheck submitVibeCheck(@RequestBody VibeCheck vibeCheck) {
        vibeCheck.setTimestamp(LocalDateTime.now());
        return vibeCheckRepository.save(vibeCheck);
    }

    @GetMapping("/api/vibe-checks")
    public List<VibeCheck> getAllVibeChecks() {
        return vibeCheckRepository.findTop30ByOrderByTimestampDesc();
    }
}