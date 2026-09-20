package com.sih.gem.controller;

import com.sih.gem.entity.AuditEvent;
import com.sih.gem.service.AuditService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/bids/{bidId}/audit")
public class AuditController {

    private final AuditService auditService;

    public AuditController(AuditService auditService) {
        this.auditService = auditService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('GOVERNMENT_OFFICER', 'GOVT_OFFICER')")
    public ResponseEntity<List<AuditEvent>> getAuditTrail(@PathVariable String bidId) {
        return ResponseEntity.ok(auditService.getAuditTrail(bidId));
    }
}
