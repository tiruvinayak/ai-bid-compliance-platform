package com.sih.gem.controller;

import com.sih.gem.dto.BidComparisonDtos.BidComparisonResponse;
import com.sih.gem.service.BidComparisonService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Phase 4 — Multi-Bidder Comparison & Decision Support.
 * GET /api/tenders/{tenderId}/comparison — factual same-tender comparison
 * for authorized government users only (bidders receive 403).
 */
@RestController
@RequestMapping("/api/tenders")
public class TenderComparisonController {

    private final BidComparisonService comparisonService;

    public TenderComparisonController(BidComparisonService comparisonService) {
        this.comparisonService = comparisonService;
    }

    @GetMapping("/{tenderId}/comparison")
    @PreAuthorize("hasAnyRole('CENTRAL_ADMIN', 'ADMIN', 'GOVERNMENT_ADMIN', 'SECTOR_USER', 'GOVERNMENT_OFFICER', 'GOVT_OFFICER', 'OFFICER')")
    public ResponseEntity<BidComparisonResponse> compare(
            @PathVariable String tenderId,
            @RequestParam(value = "bidIds", required = false) List<String> bidIds) {
        return ResponseEntity.ok(comparisonService.getComparison(tenderId, bidIds));
    }
}
