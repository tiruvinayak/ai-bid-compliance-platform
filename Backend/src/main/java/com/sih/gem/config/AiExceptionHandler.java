package com.sih.gem.config;

import com.sih.gem.ai.AiClientException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import java.util.LinkedHashMap;
import java.util.Map;

@RestControllerAdvice
public class AiExceptionHandler {
    @ExceptionHandler(AiClientException.class)
    public ResponseEntity<Map<String, Object>> handleAi(AiClientException ex) {
        HttpStatus status = switch (ex.getCode()) {
            case "AI_SERVICE_UNAVAILABLE", "AI_SERVICE_TIMEOUT" -> HttpStatus.SERVICE_UNAVAILABLE;
            case "AI_SERVICE_RATE_LIMITED" -> HttpStatus.TOO_MANY_REQUESTS;
            case "AI_UPSTREAM_VALIDATION" -> HttpStatus.BAD_REQUEST;
            case "AI_INVALID_RESPONSE" -> HttpStatus.BAD_GATEWAY;
            default -> HttpStatus.BAD_GATEWAY;
        };
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("success", false);
        body.put("error", ex.getCode());
        body.put("message", ex.getMessage());
        Map<String, Object> details = new LinkedHashMap<>();
        if (ex.getUpstreamCode() != null) details.put("upstreamError", ex.getUpstreamCode());
        if (ex.getUpstreamStatus() != null) details.put("upstreamStatus", ex.getUpstreamStatus());
        if (ex.getUpstreamDetails() != null) details.put("upstreamDetails", ex.getUpstreamDetails());
        body.put("details", details.isEmpty() ? null : details);
        return ResponseEntity.status(status).body(body);
    }
}
