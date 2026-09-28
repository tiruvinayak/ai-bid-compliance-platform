package com.sih.gem.dto;

import java.util.List;
import java.util.Map;

/**
 * Phase 5B — ML Risk Layer DTOs.
 * The ML layer is decision support only; it never merges into or replaces
 * the deterministic rule-based risk engine.
 */
public final class MlRiskDtos {

    private MlRiskDtos() {}

    /** Stable, versioned feature schema (order is part of the contract — feature_version v1). */
    public record FeatureVectorDto(
            String featureVersion,   // "v1"
            int requirementsPassed,
            int requirementsReview,
            int requirementsFailed,
            int requirementsMissing,
            int preliminaryFailCount,
            int preliminaryReviewCount,
            int expiredDocumentCount,
            int conflictCount,
            int riskFactorCount,
            int highRiskCount,
            int mediumRiskCount,
            int lowRiskCount,
            int documentCount,
            double evidenceCoverage   // 0.0 – 1.0
    ) {}

    public record ContributingFeatureDto(
            String feature,
            double value,
            Double contribution   // model coefficient * standardised value, when a model exists
    ) {}

    public record MlRiskResponse(
            String bidId,
            String status,          // AVAILABLE | NOT_AVAILABLE
            String reason,          // populated when NOT_AVAILABLE
            String featureVersion,
            FeatureVectorDto features,
            String modelVersion,
            String riskLevel,       // HIGH / MEDIUM / LOW only when a trained model produced it
            Double prediction,      // probability in [0,1] only when a trained model produced it
            List<ContributingFeatureDto> contributingFeatures
    ) {}
}
