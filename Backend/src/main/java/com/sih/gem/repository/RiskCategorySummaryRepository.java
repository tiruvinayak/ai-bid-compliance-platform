package com.sih.gem.repository;

import com.sih.gem.entity.RiskCategorySummary;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RiskCategorySummaryRepository extends JpaRepository<RiskCategorySummary, Long> {
    List<RiskCategorySummary> findByBidId(String bidId);
    void deleteByBidId(String bidId);
}
