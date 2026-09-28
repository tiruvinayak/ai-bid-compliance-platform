package com.sih.gem.controller;

import com.sih.gem.dto.GovernmentVerificationDtos.GovernmentVerificationResponse;
import com.sih.gem.dto.GovernmentVerificationDtos.VerificationProviderRequest;
import com.sih.gem.service.GovernmentVerificationService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * Phase 5A — Officer-facing external government verification endpoints.
 * Bidder role is excluded; hierarchy scope is enforced in the service layer
 * via HierarchyService.requireAccessibleTender.
 */
@RestController
@RequestMapping("/api/bids/{bidId}/government-verification")
public class GovernmentVerificationController {

    private final GovernmentVerificationService verificationService;

    public GovernmentVerificationController(GovernmentVerificationService verificationService) {
        this.verificationService = verificationService;
    }

    /** Runs the requested providers (or all) and persists masked results. */
    @PostMapping
    @PreAuthorize("hasAnyRole('CENTRAL_ADMIN', 'ADMIN', 'GOVERNMENT_ADMIN', 'SECTOR_USER', 'GOVERNMENT_OFFICER', 'GOVT_OFFICER', 'OFFICER')")
    public ResponseEntity<GovernmentVerificationResponse> run(
            @PathVariable String bidId,
            @RequestBody(required = false) VerificationProviderRequest request) {
        return ResponseEntity.ok(verificationService.runVerification(
                bidId, request != null ? request.providers() : null));
    }

    /** Returns previously stored results (latest per provider). */
    @GetMapping
    @PreAuthorize("hasAnyRole('CENTRAL_ADMIN', 'ADMIN', 'GOVERNMENT_ADMIN', 'SECTOR_USER', 'GOVERNMENT_OFFICER', 'GOVT_OFFICER', 'OFFICER')")
    public ResponseEntity<GovernmentVerificationResponse> getStored(@PathVariable String bidId) {
        return ResponseEntity.ok(verificationService.getStoredResults(bidId));
    }
}
