package com.sih.gem.controller;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sih.gem.ai.AiService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api")
public class AiController {
    private final AiService aiService;
    private final ObjectMapper objectMapper;

    public AiController(AiService aiService, ObjectMapper objectMapper) {
        this.aiService = aiService;
        this.objectMapper = objectMapper;
    }

    @GetMapping("/ai/health")
    public ResponseEntity<JsonNode> health() { return ResponseEntity.ok(aiService.health()); }

    @PostMapping("/submissions/{submissionId}/process-ai")
    @PreAuthorize("hasAnyRole('GOVERNMENT_OFFICER', 'GOVT_OFFICER', 'OFFICER', 'USER', 'BIDDER')")
    public ResponseEntity<JsonNode> process(@PathVariable String submissionId, Authentication authentication) {
        boolean officer = authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_GOVERNMENT_OFFICER") || a.getAuthority().equals("ROLE_GOVT_OFFICER") || a.getAuthority().equals("ROLE_OFFICER"));
        return ResponseEntity.ok(aiService.processSubmission(submissionId, authentication.getName(), officer));
    }

    @PostMapping("/government/ask")
    @PreAuthorize("hasAnyRole('GOVERNMENT_OFFICER', 'GOVT_OFFICER', 'OFFICER')")
    public ResponseEntity<JsonNode> askGovernment(@Valid @RequestBody GovernmentRagRequest request) {
        return ResponseEntity.ok(aiService.askGovernment(objectMapper.valueToTree(Map.of(
                "question", request.question(), "top_k", request.topK(), "threshold", request.threshold()))));
    }

    public record GovernmentRagRequest(
            @NotBlank String question,
            @JsonProperty("top_k") @Min(1) @Max(20) Integer topK,
            @JsonProperty("threshold") @Min(0) @Max(1) Double threshold
    ) {
        public GovernmentRagRequest { if (topK == null) topK = 5; if (threshold == null) threshold = 0.15; }
    }
}
