package com.sih.gem.controller;

import com.sih.gem.entity.OfficerReviewRecord;
import com.sih.gem.service.ReviewService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/bids/{bidId}/review")
public class ReviewController {

    private final ReviewService reviewService;

    public ReviewController(ReviewService reviewService) {
        this.reviewService = reviewService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('GOVERNMENT_OFFICER', 'GOVT_OFFICER')")
    public ResponseEntity<OfficerReviewRecord> getReview(@PathVariable String bidId) {
        return reviewService.getReview(bidId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @PreAuthorize("hasRole('GOVERNMENT_OFFICER')")
    public ResponseEntity<OfficerReviewRecord> saveReview(@PathVariable String bidId,
                                                          @RequestBody OfficerReviewRecord record) {
        return ResponseEntity.ok(reviewService.saveReview(bidId, record));
    }
}
