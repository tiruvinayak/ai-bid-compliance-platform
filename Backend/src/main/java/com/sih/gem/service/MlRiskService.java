package com.sih.gem.service;

import com.sih.gem.dto.MlRiskDtos.*;
import com.sih.gem.entity.*;
import com.sih.gem.ml.MlModelRegistry;
import com.sih.gem.ml.MlModelRegistry.ModelDescriptor;
import com.sih.gem.repository.*;
import org.springframework.stereotype.Service;

import java.util.*;

/**
 * Phase 5B — ML Risk Layer (decision support only).
 *
 * Builds a stable, explainable feature vector (feature_version "v1") from
 * existing stored analysis data. If no validated trained model exists in the
 * registry, the response is NOT_AVAILABLE with the factual features — no
 * fabricated probabilities. The deterministic rule-based risk engine is
 * untouched; ML output is reported separately and never merged into it.
 */
@Service
public class MlRiskService {

    /** Feature version — also fixes the feature order contract for training + inference. */
    public static final String FEATURE_VERSION = "v1";

    /** Canonical feature order for v1 (must match FeatureVectorDto field order and training pipeline). */
    public static final List<String> FEATURE_ORDER = List.of(
            "requirements_passed",
            "requirements_review",
            "requirements_failed",
            "requirements_missing",
            "preliminary_fail_count",
            "preliminary_review_count",
            "expired_document_count",
            "conflict_count",
            "risk_factor_count",
            "high_risk_count",
            "medium_risk_count",
            "low_risk_count",
            "document_count",
            "evidence_coverage");

    public static final String NOT_AVAILABLE_REASON = "No validated trained model available";

    private final HierarchyService hierarchyService;
    private final BidRepository bidRepository;
    private final RequirementRepository requirementRepository;
    private final ComplianceResultRepository complianceRepository;
    private final PreliminaryVerificationCheckRepository preliminaryRepository;
    private final RiskCategorySummaryRepository riskRepository;
    private final ConflictItemRepository conflictRepository;
    private final BidderDocumentRepository documentRepository;
    private final EvidenceDetailRepository evidenceRepository;
    private final MlModelRegistry registry;

    public MlRiskService(HierarchyService hierarchyService,
                         BidRepository bidRepository,
                         RequirementRepository requirementRepository,
                         ComplianceResultRepository complianceRepository,
                         PreliminaryVerificationCheckRepository preliminaryRepository,
                         RiskCategorySummaryRepository riskRepository,
                         ConflictItemRepository conflictRepository,
                         BidderDocumentRepository documentRepository,
                         EvidenceDetailRepository evidenceRepository,
                         MlModelRegistry registry) {
        this.hierarchyService = hierarchyService;
        this.bidRepository = bidRepository;
        this.requirementRepository = requirementRepository;
        this.complianceRepository = complianceRepository;
        this.preliminaryRepository = preliminaryRepository;
        this.riskRepository = riskRepository;
        this.conflictRepository = conflictRepository;
        this.documentRepository = documentRepository;
        this.evidenceRepository = evidenceRepository;
        this.registry = registry;
    }

    /**
     * Computes features for an accessible bid and, only when a validated
     * trained model exists, an explainable ML-indicated risk prediction.
     */
    public MlRiskResponse assess(String bidId) {
        Bid bid = requireAccessibleBid(bidId);
        FeatureVectorDto features = buildFeatures(bid);

        Optional<ModelDescriptor> model = registry.activeModel();
        if (model.isEmpty()) {
            return new MlRiskResponse(
                    bid.getBidId(), "NOT_AVAILABLE", NOT_AVAILABLE_REASON,
                    FEATURE_VERSION, features, null, null, null, List.of());
        }

        ModelDescriptor m = model.get();
        double[] x = toVector(features);
        double[] standardised = new double[x.length];
        for (int i = 0; i < x.length; i++) {
            Double mean = m.featureMean.get(i);
            Double std = m.featureStd.get(i);
            standardised[i] = (mean == null || std == null || std == 0.0)
                    ? 0.0 : (x[i] - mean) / std;
        }
        double z = m.intercept;
        List<ContributingFeatureDto> contributing = new ArrayList<>();
        for (int i = 0; i < m.coefficients.size(); i++) {
            double contribution = m.coefficients.get(i) * standardised[i];
            z += contribution;
            if (contribution != 0.0) {
                contributing.add(new ContributingFeatureDto(FEATURE_ORDER.get(i), x[i], contribution));
            }
        }
        double prediction = 1.0 / (1.0 + Math.exp(-z));
        double medium = m.thresholdMedium != null ? m.thresholdMedium : 0.33;
        double high = m.thresholdHigh != null ? m.thresholdHigh : 0.66;
        String riskLevel = prediction >= high ? "HIGH" : prediction >= medium ? "MEDIUM" : "LOW";

        contributing.sort((a, b) -> Double.compare(
                Math.abs(b.contribution() == null ? 0 : b.contribution()),
                Math.abs(a.contribution() == null ? 0 : a.contribution())));

        return new MlRiskResponse(
                bid.getBidId(), "AVAILABLE", null,
                FEATURE_VERSION, features, m.modelVersion, riskLevel, prediction,
                contributing.stream().limit(5).toList());
    }

    /** Builds the deterministic feature vector from stored analysis data. No LLM, no randomness. */
    public FeatureVectorDto buildFeatures(Bid bid) {
        String bidId = bid.getBidId();

        List<ComplianceResult> comps = complianceRepository.findByBidId(bidId);
        int pass = 0, review = 0, fail = 0, missing = 0;
        if (!comps.isEmpty()) {
            for (ComplianceResult c : comps) {
                if (c.getStatus() == null) { missing++; continue; }
                switch (c.getStatus().trim().toUpperCase(Locale.ROOT)) {
                    case "PASS" -> pass++;
                    case "REVIEW" -> review++;
                    case "FAIL" -> fail++;
                    case "MISSING" -> missing++;
                    default -> review++;
                }
            }
        } else {
            // Fallback: count from requirement statuses when compliance has not run.
            for (Requirement r : requirementRepository.findByBidId(bidId)) {
                if (r.getStatus() == null || r.getStatus().isBlank()) { missing++; continue; }
                switch (r.getStatus().trim().toUpperCase(Locale.ROOT)) {
                    case "PASS" -> pass++;
                    case "REVIEW" -> review++;
                    case "FAIL" -> fail++;
                    case "MISSING" -> missing++;
                    default -> review++;
                }
            }
        }

        int prelimFail = 0, prelimReview = 0, expired = 0;
        for (PreliminaryVerificationCheck check : preliminaryRepository.findByBidId(bidId)) {
            PreliminaryVerificationCheck.CheckStatus s = check.getStatus();
            if (s == null) continue;
            if (check.getCheckType() == PreliminaryVerificationCheck.CheckType.EXPIRY_DATE
                    && s == PreliminaryVerificationCheck.CheckStatus.FAIL) {
                expired++;
            }
            if (s == PreliminaryVerificationCheck.CheckStatus.FAIL) prelimFail++;
            if (s == PreliminaryVerificationCheck.CheckStatus.REVIEW) prelimReview++;
        }

        int conflicts = conflictRepository.findByBidId(bidId).size();

        int riskFactors = 0, high = 0, medium = 0, low = 0;
        for (RiskCategorySummary r : riskRepository.findByBidId(bidId)) {
            if (r.getFactors() != null) riskFactors += r.getFactors().size();
            if (r.getRiskLevel() == null) continue;
            switch (r.getRiskLevel().toUpperCase(Locale.ROOT)) {
                case "HIGH" -> high++;
                case "MEDIUM" -> medium++;
                case "LOW" -> low++;
                default -> { /* unrecognised level not counted */ }
            }
        }

        int documents = documentRepository.findByBidIdOrderByUploadedAtDesc(bidId).size();

        List<Requirement> reqs = requirementRepository.findByBidId(bidId);
        long evaluated = pass + review + fail + missing;
        int totalRequirements = !comps.isEmpty()
                ? (int) evaluated
                : reqs.size();
        // Evidence rows are keyed by composite "bidId:requirementId" — filter like Phase 4 does.
        long withEvidence = evidenceRepository.findAll().stream()
                .map(EvidenceDetail::getRequirementId)
                .filter(Objects::nonNull)
                .filter(id -> id.startsWith(bidId + ":"))
                .map(id -> id.substring(bidId.length() + 1))
                .filter(id -> !id.isBlank())
                .distinct()
                .count();
        double evidenceCoverage = totalRequirements > 0
                ? Math.min(1.0, Math.round(withEvidence * 10000.0 / totalRequirements) / 10000.0)
                : 0.0;

        return new FeatureVectorDto(
                FEATURE_VERSION, pass, review, fail, missing,
                prelimFail, prelimReview, expired, conflicts,
                riskFactors, high, medium, low, documents, evidenceCoverage);
    }

    private Bid requireAccessibleBid(String bidId) {
        Bid bid = bidRepository.findByBidId(bidId)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND,
                        "Bid " + bidId + " was not found."));
        hierarchyService.requireAccessibleTender(bid.getTenderId());
        return bid;
    }

    private static double[] toVector(FeatureVectorDto f) {
        return new double[]{
                f.requirementsPassed(), f.requirementsReview(), f.requirementsFailed(),
                f.requirementsMissing(), f.preliminaryFailCount(), f.preliminaryReviewCount(),
                f.expiredDocumentCount(), f.conflictCount(), f.riskFactorCount(),
                f.highRiskCount(), f.mediumRiskCount(), f.lowRiskCount(),
                f.documentCount(), f.evidenceCoverage()};
    }
}
