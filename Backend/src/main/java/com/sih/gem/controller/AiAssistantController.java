package com.sih.gem.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sih.gem.ai.AiClientException;
import com.sih.gem.service.AiAssistantService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class AiAssistantController {

    private final AiAssistantService assistantService;
    private final ObjectMapper objectMapper;

    public AiAssistantController(AiAssistantService assistantService, ObjectMapper objectMapper) {
        this.assistantService = assistantService;
        this.objectMapper = objectMapper;
    }

    @PostMapping("/bids/{bidId}/assistant/chat")
    @PreAuthorize("hasAnyRole('USER', 'BIDDER', 'GOVERNMENT_OFFICER', 'GOVT_OFFICER', 'OFFICER', 'CENTRAL_ADMIN', 'SECTOR_USER')")
    public ResponseEntity<JsonNode> chat(@PathVariable String bidId,
                                          @Valid @RequestBody AssistantChatRequest request,
                                          Authentication authentication) {
        String currentUser = authentication.getName();
        boolean officer = authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_GOVERNMENT_OFFICER")
                        || a.getAuthority().equals("ROLE_GOVT_OFFICER")
                        || a.getAuthority().equals("ROLE_OFFICER")
                        || a.getAuthority().equals("ROLE_CENTRAL_ADMIN")
                        || a.getAuthority().equals("ROLE_SECTOR_USER"));

        try {
            JsonNode response = assistantService.chat(bidId, request.question(),
                    request.normalizedChatHistory(), currentUser, officer);
            return ResponseEntity.ok(response);
        } catch (org.springframework.security.access.AccessDeniedException e) {
            throw e;
        } catch (org.springframework.web.server.ResponseStatusException e) {
            // Preserve 404 for missing bids (GlobalExceptionHandler renders the JSON body);
            // without this rethrow the RuntimeException catch below would collapse it to 500.
            throw e;
        } catch (AiClientException e) {
            return ResponseEntity.badRequest().body(objectMapper.valueToTree(Map.of(
                    "success", false,
                    "error_code", e.getCode(),
                    "message", e.getMessage()
            )));
        } catch (RuntimeException e) {
            return ResponseEntity.internalServerError().body(objectMapper.valueToTree(Map.of(
                    "success", false,
                    "error_code", "ASSISTANT_SERVICE_ERROR",
                    "message", "AI assistant service failed: " + e.getMessage()
            )));
        }
    }

    public record AssistantChatRequest(
            @NotBlank String question,
            List<Map<String, Object>> chat_history
    ) {
        public AssistantChatRequest {
            if (chat_history == null) chat_history = List.of();
        }

        /**
         * Normalizes history entries to the string-only {role, content} contract expected
         * by the AI service. Tolerates extra client fields such as citation arrays, which
         * previously caused HTTP 400 (Jackson String-vs-Array) from the second turn onward.
         */
        public List<Map<String, String>> normalizedChatHistory() {
            List<Map<String, String>> normalized = new ArrayList<>();
            for (Map<String, Object> entry : chat_history) {
                if (entry == null) continue;
                Object role = entry.get("role");
                Object content = entry.get("content");
                if (!(role instanceof CharSequence roleValue) || !(content instanceof CharSequence contentValue)) continue;
                if (roleValue.toString().isBlank() || contentValue.toString().isBlank()) continue;
                Map<String, String> clean = new HashMap<>();
                clean.put("role", roleValue.toString().trim());
                clean.put("content", contentValue.toString());
                normalized.add(clean);
            }
            return normalized;
        }
    }
}