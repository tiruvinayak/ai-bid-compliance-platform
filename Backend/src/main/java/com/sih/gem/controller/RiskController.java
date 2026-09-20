package com.sih.gem.controller;

import com.sih.gem.entity.RiskCategorySummary;
import com.sih.gem.service.RiskService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/bids/{bidId}/risks")
public class RiskController {

    private final RiskService riskService;

    public RiskController(RiskService riskService) {
        this.riskService = riskService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('GOVERNMENT_OFFICER', 'GOVT_OFFICER')")
    public ResponseEntity<List<RiskCategorySummary>> getRisks(@PathVariable String bidId) {
        return ResponseEntity.ok(riskService.getRiskSummary(bidId));
    }
}
