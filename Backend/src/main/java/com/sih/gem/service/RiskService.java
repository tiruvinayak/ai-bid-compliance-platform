package com.sih.gem.service;

import com.sih.gem.entity.RiskCategorySummary;
import com.sih.gem.repository.RiskCategorySummaryRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class RiskService {

    private final RiskCategorySummaryRepository riskRepository;

    public RiskService(RiskCategorySummaryRepository riskRepository) {
        this.riskRepository = riskRepository;
    }

    public List<RiskCategorySummary> getRiskSummary(String bidId) {
        return riskRepository.findByBidId(bidId);
    }
}
