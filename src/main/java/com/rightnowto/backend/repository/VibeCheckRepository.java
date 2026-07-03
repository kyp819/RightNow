package com.rightnowto.backend.repository;

import com.rightnowto.backend.entity.VibeCheck;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface VibeCheckRepository extends JpaRepository<VibeCheck,Long> {
    List<VibeCheck> findTop30ByOrderByTimestampDesc();
}

