package com.sih.gem.controller;

import com.sih.gem.entity.EvidenceDetail;
import com.sih.gem.entity.Requirement;
import com.sih.gem.service.ComplianceService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
public class ComplianceController {

    private final ComplianceService complianceService;

    public ComplianceController(ComplianceService complianceService) {
        this.complianceService = complianceService;
    }

    @GetMapping("/bids/{bidId}/requirements")
    @PreAuthorize("hasAnyRole('GOVERNMENT_OFFICER', 'GOVT_OFFICER', 'CENTRAL_ADMIN', 'SECTOR_USER')")
    public ResponseEntity<List<Requirement>> getRequirements(@PathVariable String bidId) {
        return ResponseEntity.ok(complianceService.getRequirements(bidId));
    }

    @GetMapping("/bids/{bidId}/requirements/{reqId}")
    @PreAuthorize("hasAnyRole('GOVERNMENT_OFFICER', 'GOVT_OFFICER', 'CENTRAL_ADMIN', 'SECTOR_USER')")
    public ResponseEntity<Requirement> getRequirement(@PathVariable String bidId, @PathVariable String reqId) {
        return complianceService.getRequirement(bidId, reqId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/requirements/{reqId}/evidence")
    @PreAuthorize("hasAnyRole('GOVERNMENT_OFFICER', 'GOVT_OFFICER', 'CENTRAL_ADMIN', 'SECTOR_USER')")
    public ResponseEntity<EvidenceDetail> getEvidence(@PathVariable String reqId) {
        return complianceService.getEvidence(reqId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/bids/{bidId}/requirements/{reqId}/evidence")
    @PreAuthorize("hasAnyRole('GOVERNMENT_OFFICER', 'GOVT_OFFICER', 'CENTRAL_ADMIN', 'SECTOR_USER')")
    public ResponseEntity<EvidenceDetail> getEvidenceForBid(@PathVariable String bidId, @PathVariable String reqId) {
        return complianceService.getEvidence(bidId, reqId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
