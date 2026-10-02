package com.sih.gem.controller;

import java.sql.Connection;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

import javax.sql.DataSource;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Lightweight, unauthenticated health probe used by deployment verification.
 * Reports only liveness plus non-sensitive runtime facts (active Spring profile
 * and database product name) so production deployments can confirm they are
 * running against the intended database (e.g. PostgreSQL vs H2).
 */
@RestController
public class HealthController {

    private final DataSource dataSource;

    @Value("${spring.profiles.active:default}")
    private String activeProfiles;

    public HealthController(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @GetMapping("/api/health")
    public ResponseEntity<Map<String, Object>> health() {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", "UP");
        body.put("service", "bid-compliance-platform");
        body.put("timestamp", Instant.now().toString());
        body.put("profile", activeProfiles);
        body.put("database", databaseProductName());
        return ResponseEntity.ok(body);
    }

    private String databaseProductName() {
        try (Connection connection = dataSource.getConnection()) {
            return connection.getMetaData().getDatabaseProductName();
        } catch (Exception ex) {
            return "unavailable";
        }
    }
}
