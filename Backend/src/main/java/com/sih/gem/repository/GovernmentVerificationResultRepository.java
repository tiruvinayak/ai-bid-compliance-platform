package com.sih.gem.repository;

import com.sih.gem.entity.GovernmentVerificationResult;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface GovernmentVerificationResultRepository extends JpaRepository<GovernmentVerificationResult, Long> {

    List<GovernmentVerificationResult> findByBidIdOrderByCheckedAtDesc(String bidId);
}
