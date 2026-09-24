package com.sih.gem.controller;

import com.sih.gem.dto.PreliminaryVerificationDtos.*;
import com.sih.gem.entity.PreliminaryVerificationCheck;
import com.sih.gem.service.PreliminaryIntegrityService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class PreliminaryIntegrityController {

    private final PreliminaryIntegrityService integrityService;

    public PreliminaryIntegrityController(PreliminaryIntegrityService integrityService) {
        this.integrityService = integrityService;
    }

    @PostMapping("/bids/{bidId}/preliminary-verification")
    @PreAuthorize("hasAnyRole('GOVERNMENT_OFFICER', 'GOVT_OFFICER', 'OFFICER', 'CENTRAL_ADMIN', 'SECTOR_USER')")
    public ResponseEntity<PreliminaryVerificationResponse> runChecks(@PathVariable String bidId) {
        List<PreliminaryVerificationCheckDto> checks = integrityService.runPreliminaryChecks(bidId).stream()
                .map(this::toDto)
                .toList();
        Map<String, Object> summary = integrityService.getSummary(bidId);
        return ResponseEntity.ok(new PreliminaryVerificationResponse(
                (String) summary.get("overallStatus"),
                summary,
                checks
        ));
    }

    @GetMapping("/bids/{bidId}/preliminary-verification")
    @PreAuthorize("hasAnyRole('GOVERNMENT_OFFICER', 'GOVT_OFFICER', 'OFFICER', 'CENTRAL_ADMIN', 'SECTOR_USER', 'USER')")
    public ResponseEntity<PreliminaryVerificationResponse> getChecks(@PathVariable String bidId) {
        List<PreliminaryVerificationCheckDto> checks = integrityService.getChecks(bidId).stream()
                .map(this::toDto)
                .toList();
        Map<String, Object> summary = integrityService.getSummary(bidId);
        return ResponseEntity.ok(new PreliminaryVerificationResponse(
                (String) summary.get("overallStatus"),
                summary,
                checks
        ));
    }

    @GetMapping("/bids/{bidId}/documents/{documentId}/preliminary-verification")
    @PreAuthorize("hasAnyRole('GOVERNMENT_OFFICER', 'GOVT_OFFICER', 'OFFICER', 'CENTRAL_ADMIN', 'SECTOR_USER')")
    public ResponseEntity<List<PreliminaryVerificationCheckDto>> getDocumentChecks(
            @PathVariable String bidId, @PathVariable String documentId) {
        List<PreliminaryVerificationCheckDto> checks = integrityService.getChecks(bidId).stream()
                .filter(c -> documentId.equals(c.getDocumentId()))
                .map(this::toDto)
                .toList();
        return ResponseEntity.ok(checks);
    }

    private PreliminaryVerificationCheckDto toDto(PreliminaryVerificationCheck check) {
        return new PreliminaryVerificationCheckDto(
                check.getId(),
                check.getBidId(),
                check.getDocumentId(),
                check.getCheckType().name(),
                check.getStatus().name(),
                check.getMessage(),
                check.getFieldName(),
                check.getExpectedValue(),
                check.getActualValue(),
                check.getSourcePage(),
                check.getEvidenceReference(),
                check.getCreatedAt()
        );
    }
}