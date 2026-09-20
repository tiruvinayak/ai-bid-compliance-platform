package com.sih.gem.repository;

import com.sih.gem.entity.GovernmentInstruction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface GovernmentInstructionRepository extends JpaRepository<GovernmentInstruction, Long> {
    List<GovernmentInstruction> findByIsRestrictionTrue();
}
