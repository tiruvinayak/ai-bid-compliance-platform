package com.sih.gem.repository;

import com.sih.gem.entity.OfficerReviewRecord;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface OfficerReviewRecordRepository extends JpaRepository<OfficerReviewRecord, Long> {
    Optional<OfficerReviewRecord> findByBidId(String bidId);
}
