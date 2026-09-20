package com.sih.gem.controller;

import com.sih.gem.ai.AiService;
import com.sih.gem.service.AnalysisService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/bids/{bidId}")
public class AnalysisController {

    private final AnalysisService analysisService;
    private final AiService aiService;

    public AnalysisController(AnalysisService analysisService, AiService aiService) {
        this.analysisService = analysisService;
        this.aiService = aiService;
    }

    @PostMapping("/analyze")
    @PreAuthorize("hasAnyRole('GOVERNMENT_OFFICER', 'GOVT_OFFICER')")
    public ResponseEntity<Map<String, String>> startAnalysis(@PathVariable String bidId,
                                                              Authentication authentication) {
        // Keep the existing endpoint contract while using the persisted FastAPI pipeline.
        aiService.processSubmission(bidId, authentication.getName(), true);
        return ResponseEntity.ok(Map.of("status", "STARTED"));
    }

    @GetMapping("/analysis")
    public ResponseEntity<List<AnalysisService.AnalysisStage>> getAnalysisProgress(@PathVariable String bidId) {
        return ResponseEntity.ok(analysisService.getStages(bidId));
    }
}
