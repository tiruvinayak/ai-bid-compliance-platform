package com.sih.gem.service;

import com.sih.gem.entity.OfficerReviewRecord;
import com.sih.gem.repository.OfficerReviewRecordRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
public class ReviewService {

    private final OfficerReviewRecordRepository reviewRepository;

    public ReviewService(OfficerReviewRecordRepository reviewRepository) {
        this.reviewRepository = reviewRepository;
    }

    public Optional<OfficerReviewRecord> getReview(String bidId) {
        return reviewRepository.findByBidId(bidId);
    }

    public OfficerReviewRecord saveReview(String bidId, OfficerReviewRecord record) {
        // If a review already exists for this bid, update it instead of inserting a duplicate
        OfficerReviewRecord existing = reviewRepository.findByBidId(bidId).orElse(null);
        if (existing != null) {
            existing.setOfficerName(record.getOfficerName());
            existing.setOfficerDesignation(record.getOfficerDesignation());
            existing.setRecommendation(record.getRecommendation());
            existing.setFinalDecision(record.getFinalDecision());
            existing.setComment(record.getComment());
            existing.setUpdatedAt(LocalDateTime.now());
            return reviewRepository.save(existing);
        }
        record.setBidId(bidId);
        record.setUpdatedAt(LocalDateTime.now());
        return reviewRepository.save(record);
    }
}
