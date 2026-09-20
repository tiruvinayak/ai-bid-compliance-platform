package com.sih.gem.controller;

import com.sih.gem.entity.GovernmentInstruction;
import com.sih.gem.service.GovernmentInstructionService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/government-instructions")
public class GovernmentInstructionController {

    private final GovernmentInstructionService instructionService;

    public GovernmentInstructionController(GovernmentInstructionService instructionService) {
        this.instructionService = instructionService;
    }

    @GetMapping
    public ResponseEntity<List<GovernmentInstruction>> getInstructions() {
        return ResponseEntity.ok(instructionService.getInstructions());
    }

    @GetMapping("/restrictions")
    public ResponseEntity<List<GovernmentInstruction>> getRestrictions() {
        return ResponseEntity.ok(instructionService.getRestrictions());
    }
}
