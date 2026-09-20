package com.sih.gem.controller;

import com.sih.gem.entity.ConflictItem;
import com.sih.gem.service.ConflictService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/bids/{bidId}/conflicts")
public class ConflictController {

    private final ConflictService conflictService;

    public ConflictController(ConflictService conflictService) {
        this.conflictService = conflictService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('GOVERNMENT_OFFICER', 'GOVT_OFFICER')")
    public ResponseEntity<List<ConflictItem>> getConflicts(@PathVariable String bidId) {
        return ResponseEntity.ok(conflictService.getConflicts(bidId));
    }
}
