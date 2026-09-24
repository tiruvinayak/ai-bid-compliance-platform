package com.sih.gem.repository;

import com.sih.gem.entity.ComplianceResult;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ComplianceResultRepository extends JpaRepository<ComplianceResult, Long> {
    void deleteByBidId(String bidId);
    List<ComplianceResult> findByBidId(String bidId);
}
