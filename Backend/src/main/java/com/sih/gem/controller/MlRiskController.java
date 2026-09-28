package com.sih.gem.controller;

import com.sih.gem.dto.MlRiskDtos.MlRiskResponse;
import com.sih.gem.service.MlRiskService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * Phase 5B — ML Risk prediction endpoint (decision support).
 * Officer/central roles only; bidder role excluded. Hierarchy scope is
 * enforced inside the service via HierarchyService.requireAccessibleTender.
 * Returns NOT_AVAILABLE with factual features when no trained model exists.
 */
@RestController
@RequestMapping("/api/bids/{bidId}")
public class MlRiskController {

    private final MlRiskService mlRiskService;

    public MlRiskController(MlRiskService mlRiskService) {
        this.mlRiskService = mlRiskService;
    }

    @PostMapping("/ml-risk")
    @PreAuthorize("hasAnyRole('CENTRAL_ADMIN', 'ADMIN', 'GOVERNMENT_ADMIN', 'SECTOR_USER', 'GOVERNMENT_OFFICER', 'GOVT_OFFICER', 'OFFICER')")
    public ResponseEntity<MlRiskResponse> assess(@PathVariable String bidId) {
        return ResponseEntity.ok(mlRiskService.assess(bidId));
    }
}
