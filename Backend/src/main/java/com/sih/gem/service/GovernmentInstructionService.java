package com.sih.gem.service;

import com.sih.gem.entity.GovernmentInstruction;
import com.sih.gem.repository.GovernmentInstructionRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class GovernmentInstructionService {

    private final GovernmentInstructionRepository instructionRepository;

    public GovernmentInstructionService(GovernmentInstructionRepository instructionRepository) {
        this.instructionRepository = instructionRepository;
    }

    public List<GovernmentInstruction> getInstructions() {
        return instructionRepository.findAll();
    }

    public List<GovernmentInstruction> getRestrictions() {
        return instructionRepository.findByIsRestrictionTrue();
    }
}
