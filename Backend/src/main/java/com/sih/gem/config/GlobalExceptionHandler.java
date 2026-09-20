package com.sih.gem.config;

import com.sih.gem.ai.AiClientException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Map<String, String>> handleAccessDenied(AccessDeniedException ex) {
        log.warn("Access denied: {}", ex.getMessage());
        String msg = "Access Denied: " + ex.getMessage();
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", msg, "message", msg));
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<Map<String, String>> handleAuth(AuthenticationException ex) {
        log.warn("Authentication failed: {}", ex.getMessage());
        String msg = "Authentication Failed: Invalid credentials or expired session";
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", msg, "message", msg));
    }

    @ExceptionHandler(AiClientException.class)
    public ResponseEntity<Map<String, Object>> handleAiFailure(AiClientException ex) {
        log.warn("AI service failure [{}]: {}", ex.getCode(), ex.getMessage());
        HttpStatus status = switch (ex.getCode()) {
            case "AI_SERVICE_TIMEOUT" -> HttpStatus.GATEWAY_TIMEOUT;
            case "AI_SERVICE_UNAVAILABLE", "AI_SERVICE_ERROR" -> HttpStatus.SERVICE_UNAVAILABLE;
            case "AI_SERVICE_RATE_LIMITED" -> HttpStatus.TOO_MANY_REQUESTS;
            default -> HttpStatus.BAD_GATEWAY;
        };
        Map<String, Object> body = new HashMap<>();
        body.put("error_code", ex.getCode());
        body.put("error", "AI processing is unavailable");
        body.put("message", ex.getMessage() == null ? "AI processing could not be completed." : ex.getMessage());
        if (ex.getUpstreamDetails() != null) body.put("details", ex.getUpstreamDetails());
        return ResponseEntity.status(status).body(body);
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Map<String, String>> handleRuntime(RuntimeException ex) {
        log.error("Runtime exception: ", ex);
        String msg = ex.getMessage() != null ? ex.getMessage() : "Bad request";
        return ResponseEntity.badRequest().body(Map.of("error", msg, "message", msg));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> fieldErrors = new HashMap<>();
        ex.getBindingResult().getFieldErrors().forEach(fe -> fieldErrors.put(fe.getField(), fe.getDefaultMessage()));
        log.warn("Validation error: {}", fieldErrors);

        String firstMsg = fieldErrors.entrySet().stream()
                .map(entry -> entry.getKey() + ": " + entry.getValue())
                .findFirst()
                .orElse("Validation failed");

        Map<String, Object> body = new HashMap<>();
        body.put("error", firstMsg);
        body.put("message", firstMsg);
        body.put("fieldErrors", fieldErrors);
        return ResponseEntity.badRequest().body(body);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> handleGeneric(Exception ex) {
        log.error("Unhandled server exception: ", ex);
        String msg = "Internal server error: " + (ex.getMessage() != null ? ex.getMessage() : ex.getClass().getName());
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", msg, "message", msg));
    }
}
