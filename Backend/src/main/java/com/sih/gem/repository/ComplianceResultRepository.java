package com.sih.gem.repository;

import com.sih.gem.entity.ComplianceResult;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ComplianceResultRepository extends JpaRepository<ComplianceResult, Long> {
    void deleteByBidId(String bidId);
}
