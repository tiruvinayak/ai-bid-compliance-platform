package com.sih.gem.service;

import com.sih.gem.controller.MlRiskController;
import com.sih.gem.dto.MlRiskDtos.*;
import com.sih.gem.entity.*;
import com.sih.gem.ml.MlModelRegistry;
import com.sih.gem.ml.MlModelRegistry.ModelDescriptor;
import com.sih.gem.repository.*;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.lang.reflect.Method;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/**
 * Phase 5B — ML Risk Layer tests (spec §27, no-dataset path):
 * feature generation, feature schema, NOT_AVAILABLE behaviour, no fake
 * prediction, hierarchy + RBAC, plus model-loading inference infrastructure
 * verified with a synthetic fixture (the production registry stays NOT_TRAINED).
 */
class MlRiskServiceTest {

    private static final String BID = "GEM-2026-001";
    private static final String TENDER = "TND-GEM-2026-1042";

    private final HierarchyService hierarchyService = mock(HierarchyService.class);
    private final BidRepository bids = mock(BidRepository.class);
    private final RequirementRepository requirements = mock(RequirementRepository.class);
    private final ComplianceResultRepository compliance = mock(ComplianceResultRepository.class);
    private final PreliminaryVerificationCheckRepository preliminary = mock(PreliminaryVerificationCheckRepository.class);
    private final RiskCategorySummaryRepository risks = mock(RiskCategorySummaryRepository.class);
    private final ConflictItemRepository conflicts = mock(ConflictItemRepository.class);
    private final BidderDocumentRepository documents = mock(BidderDocumentRepository.class);
    private final EvidenceDetailRepository evidence = mock(EvidenceDetailRepository.class);

    /** Production-shaped registry: no trained model (mirrors model-registry.json). */
    private final MlModelRegistry emptyRegistry = new MlModelRegistry((ModelDescriptor) null);

    private final MlRiskService service = new MlRiskService(
            hierarchyService, bids, requirements, compliance, preliminary,
            risks, conflicts, documents, evidence, emptyRegistry);

    @BeforeEach
    void setUp() {
        SecurityContextHolder.getContext().setAuthentication(new TestingAuthenticationToken(
                "officer@demo.gov.in", "n/a",
                List.of(new SimpleGrantedAuthority("ROLE_GOVERNMENT_OFFICER"))));
        when(bids.findByBidId(BID)).thenReturn(Optional.of(bid()));
        when(hierarchyService.requireAccessibleTender(TENDER)).thenReturn(tender());
        when(compliance.findByBidId(anyString())).thenReturn(List.of());
        when(requirements.findByBidId(anyString())).thenReturn(List.of());
        when(preliminary.findByBidId(anyString())).thenReturn(List.of());
        when(risks.findByBidId(anyString())).thenReturn(List.of());
        when(conflicts.findByBidId(anyString())).thenReturn(List.of());
        when(documents.findByBidIdOrderByUploadedAtDesc(anyString())).thenReturn(List.of());
        when(evidence.findAll()).thenReturn(List.of());
    }

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    private Bid bid() {
        return Bid.builder().bidId(BID).tenderId(TENDER)
                .bidderName("ABC Technologies Pvt Ltd").riskLevel("HIGH").build();
    }

    private Tender tender() {
        Sector sector = Sector.builder().id(1L).code("RAILWAYS").name("Railways").build();
        Department dept = Department.builder().id(10L).code("RPD")
                .name("Railway Procurement Department").sector(sector).build();
        return Tender.builder().id(1L).tenderId(TENDER).title("Network Infrastructure")
                .department(dept).status("ACTIVE").build();
    }

    // ---- 1. Feature generation from stored analysis data ----
    @Test
    void featureVectorGeneratedFromStoredData() {
        when(compliance.findByBidId(BID)).thenReturn(List.of(
                comp("PASS"), comp("PASS"), comp("FAIL"), comp("REVIEW"), comp("MISSING")));
        when(preliminary.findByBidId(BID)).thenReturn(List.of(
                prelim(PreliminaryVerificationCheck.CheckType.DOCUMENT_VALIDITY,
                        PreliminaryVerificationCheck.CheckStatus.FAIL),
                prelim(PreliminaryVerificationCheck.CheckType.EXPIRY_DATE,
                        PreliminaryVerificationCheck.CheckStatus.FAIL),
                prelim(PreliminaryVerificationCheck.CheckType.FIELD_COMPLETENESS,
                        PreliminaryVerificationCheck.CheckStatus.REVIEW)));
        when(conflicts.findByBidId(BID)).thenReturn(List.of(new ConflictItem()));
        when(risks.findByBidId(BID)).thenReturn(List.of(
                risk("HIGH", List.of("f1", "f2")),
                risk("MEDIUM", List.of("f3")),
                risk("LOW", List.of())));
        when(documents.findByBidIdOrderByUploadedAtDesc(BID)).thenReturn(List.of(
                new BidderDocument(), new BidderDocument(), new BidderDocument()));
        when(evidence.findAll()).thenReturn(List.of(
                EvidenceDetail.builder().requirementId(BID + ":REQ-001").build(),
                EvidenceDetail.builder().requirementId(BID + ":REQ-002").build(),
                EvidenceDetail.builder().requirementId("OTHER-BID:REQ-001").build()));

        FeatureVectorDto f = service.buildFeatures(bid());

        assertEquals("v1", f.featureVersion());
        assertEquals(2, f.requirementsPassed());
        assertEquals(1, f.requirementsReview());
        assertEquals(1, f.requirementsFailed());
        assertEquals(1, f.requirementsMissing());
        assertEquals(2, f.preliminaryFailCount());  // DOCUMENT_VALIDITY FAIL + EXPIRY_DATE FAIL
        assertEquals(1, f.preliminaryReviewCount());
        assertEquals(1, f.expiredDocumentCount());   // EXPIRY_DATE FAIL = expired
        assertEquals(1, f.conflictCount());
        assertEquals(3, f.riskFactorCount());        // f1 + f2 + f3
        assertEquals(1, f.highRiskCount());
        assertEquals(1, f.mediumRiskCount());
        assertEquals(1, f.lowRiskCount());
        assertEquals(3, f.documentCount());
        assertEquals(0.4, f.evidenceCoverage(), 0.001); // 2 of 5 requirements
    }

    // ---- 2. Feature schema: version + stable order ----
    @Test
    void featureSchemaIsStableVersionV1() {
        assertEquals("v1", MlRiskService.FEATURE_VERSION);
        assertEquals(List.of(
                "requirements_passed", "requirements_review", "requirements_failed",
                "requirements_missing", "preliminary_fail_count", "preliminary_review_count",
                "expired_document_count", "conflict_count", "risk_factor_count",
                "high_risk_count", "medium_risk_count", "low_risk_count",
                "document_count", "evidence_coverage"), MlRiskService.FEATURE_ORDER);

        // Record field order must match FEATURE_ORDER (inference depends on it).
        var fields = FeatureVectorDto.class.getRecordComponents();
        assertEquals(MlRiskService.FEATURE_ORDER.size(), fields.length - 1); // + featureVersion
        assertEquals("featureVersion", fields[0].getName());
    }

    // ---- 3. No trained model → NOT_AVAILABLE with reason ----
    @Test
    void noTrainedModelReturnsNotAvailable() {
        MlRiskResponse response = service.assess(BID);

        assertEquals(BID, response.bidId());
        assertEquals("NOT_AVAILABLE", response.status());
        assertEquals(MlRiskService.NOT_AVAILABLE_REASON, response.reason());
        assertNotNull(response.features());
        assertEquals("v1", response.featureVersion());
        assertNull(response.modelVersion());
        assertNull(response.riskLevel());
        assertTrue(response.contributingFeatures().isEmpty());
    }

    // ---- 4. No fake prediction — probability is null when NOT_AVAILABLE ----
    @Test
    void noFakePredictionWhenModelUnavailable() {
        MlRiskResponse response = service.assess(BID);
        assertNull(response.prediction(), "A probability must never be invented without a model");
        assertNull(response.riskLevel());
    }

    // ---- 5. Explanation list empty when no model (no fabricated factors) ----
    @Test
    void contributingFeaturesEmptyWhenNotAvailable() {
        MlRiskResponse response = service.assess(BID);
        assertNotNull(response.contributingFeatures());
        assertTrue(response.contributingFeatures().isEmpty());
    }

    // ---- 6. Hierarchy denial propagates; no feature work attempted for foreign bids ----
    @Test
    void hierarchyAccessDeniedPropagates() {
        when(hierarchyService.requireAccessibleTender(TENDER))
                .thenThrow(new AccessDeniedException("Not authorized to access this department"));

        assertThrows(AccessDeniedException.class, () -> service.assess(BID));
        verify(compliance, never()).findByBidId(anyString());
    }

    // ---- 7. Endpoint annotation excludes bidder role ----
    @Test
    void mlRiskEndpointExcludesBidderRole() throws Exception {
        Method method = MlRiskController.class.getMethod("assess", String.class);
        PreAuthorize preAuthorize = method.getAnnotation(PreAuthorize.class);

        assertNotNull(preAuthorize, "ML risk endpoint must declare @PreAuthorize");
        String expr = preAuthorize.value();
        assertTrue(expr.contains("GOVERNMENT_OFFICER"));
        assertTrue(expr.contains("CENTRAL_ADMIN"));
        assertFalse(expr.contains("'USER'"), "bidder USER role must not be allowed");
    }

    // ---- 8. Model loading + logistic-regression inference infrastructure ----
    // Uses a synthetic fixture descriptor — NOT a production model. The shipped
    // registry (classpath:ml/model-registry.json) remains NOT_TRAINED.
    @Test
    void trainedModelFixtureProducesExplainablePrediction() {
        // 14 features; fixture: intercept 0.0, positive weight on conflict_count.
        List<Double> coefs = List.of(0.1, 0.0, 0.2, 0.3, 0.4, 0.1, 0.5, 1.5, 0.2, 0.3, 0.2, 0.1, 0.0, -0.4);
        List<Double> mean = List.of(0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0);
        List<Double> std = List.of(1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0);
        ModelDescriptor fixture = new ModelDescriptor(
                "risk-model-v1", "v1", "TRAINED", "LOGISTIC_REGRESSION",
                "2026-09-24T00:00:00", "synthetic-fixture",
                Map.of("accuracy", 0.9, "roc_auc", 0.9),
                0.0, coefs, mean, std, 0.33, 0.66,
                "Synthetic fixture for infrastructure tests only.");

        MlModelRegistry fixtureRegistry = new MlModelRegistry(fixture);
        assertTrue(fixtureRegistry.activeModel().isPresent());

        MlRiskService fixtureService = new MlRiskService(
                hierarchyService, bids, requirements, compliance, preliminary,
                risks, conflicts, documents, evidence, fixtureRegistry);

        when(conflicts.findByBidId(BID)).thenReturn(List.of(new ConflictItem(), new ConflictItem()));

        MlRiskResponse response = fixtureService.assess(BID);

        assertEquals("AVAILABLE", response.status());
        assertEquals("risk-model-v1", response.modelVersion());
        assertNotNull(response.prediction());
        assertTrue(response.prediction() > 0.0 && response.prediction() < 1.0,
                "Sigmoid output must be a probability in (0,1)");
        assertTrue(List.of("LOW", "MEDIUM", "HIGH").contains(response.riskLevel()));
        assertFalse(response.contributingFeatures().isEmpty());
        // conflict_count has the largest weight — must appear among contributions.
        assertTrue(response.contributingFeatures().stream()
                        .anyMatch(c -> "conflict_count".equals(c.feature())),
                "Largest-weight feature should be listed as a contributing feature");
        // Explanation is factual features, not causal fraud claims.
        assertTrue(response.contributingFeatures().stream()
                .allMatch(c -> c.feature() != null && !c.feature().isBlank()));
    }

    // ---- 9. Empty analysis data still yields a valid zero vector (no crash) ----
    @Test
    void emptyAnalysisDataYieldsZeroFeatureVector() {
        FeatureVectorDto f = service.buildFeatures(bid());
        assertEquals(0, f.requirementsPassed());
        assertEquals(0, f.conflictCount());
        assertEquals(0, f.documentCount());
        assertEquals(0.0, f.evidenceCoverage());
    }

    // ---- 10. ML response is separate from rule-based risk (no merged score field) ----
    @Test
    void mlResponseDoesNotCarryRuleBasedRiskFields() throws Exception {
        // The DTO shape must not contain a rule-based/merged risk field.
        var fieldNames = java.util.Arrays.stream(MlRiskResponse.class.getRecordComponents())
                .map(c -> java.beans.Introspector.decapitalize(c.getName()))
                .toList();
        assertFalse(fieldNames.contains("ruleBasedRisk"));
        assertFalse(fieldNames.contains("overallRisk"));
        assertFalse(fieldNames.contains("mergedScore"));
        assertFalse(fieldNames.contains("recommendedAction"));
    }

    // ---- Bonus: production registry resource is NOT_TRAINED (guard against silent training) ----
    @Test
    void shippedRegistryIsNotTrained() throws Exception {
        var registryFile = new com.fasterxml.jackson.databind.ObjectMapper()
                .readValue(getClass().getClassLoader()
                        .getResourceAsStream("ml/model-registry.json"),
                        MlModelRegistry.RegistryFile.class);
        assertNotNull(registryFile);
        assertEquals("NOT_TRAINED", registryFile.models.get(0).status);
        assertNull(registryFile.activeModelVersion);
    }

    private ComplianceResult comp(String status) {
        return ComplianceResult.builder().bidId(BID).requirementId("REQ-X").status(status).build();
    }

    private PreliminaryVerificationCheck prelim(PreliminaryVerificationCheck.CheckType type,
                                                PreliminaryVerificationCheck.CheckStatus status) {
        return PreliminaryVerificationCheck.builder()
                .bidId(BID).checkType(type).status(status).message("demo").build();
    }

    private RiskCategorySummary risk(String level, List<String> factors) {
        return RiskCategorySummary.builder()
                .bidId(BID).category("Financial").riskLevel(level).score(50)
                .summary("demo").factors(factors).build();
    }
}
