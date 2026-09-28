package com.sih.gem.service;

import com.sih.gem.controller.TenderComparisonController;
import com.sih.gem.dto.BidComparisonDtos.*;
import com.sih.gem.entity.*;
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
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Phase 4 — Multi-Bidder Comparison backend tests.
 * Covers: same-tender validation, RBAC annotation, multi-bid retrieval,
 * single-bid response, requirement matrix, evidence traceability,
 * risk aggregation, conflict aggregation, document coverage, hierarchy denial propagation.
 */
class BidComparisonServiceTest {

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
    private final AuditEventRepository audits = mock(AuditEventRepository.class);

    private final BidComparisonService service = new BidComparisonService(
            hierarchyService, bids, requirements, compliance, preliminary,
            risks, conflicts, documents, evidence, audits);

    @BeforeEach
    void authenticateOfficer() {
        SecurityContextHolder.getContext().setAuthentication(new TestingAuthenticationToken(
                "officer@demo.gov.in", "n/a",
                List.of(new SimpleGrantedAuthority("ROLE_GOVERNMENT_OFFICER"))));
    }

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    private void stubDefaults() {
        when(hierarchyService.requireAccessibleTender(TENDER)).thenReturn(tender());
        when(requirements.findByBidId(anyString())).thenReturn(List.of());
        when(compliance.findByBidId(anyString())).thenReturn(List.of());
        when(preliminary.findByBidId(anyString())).thenReturn(List.of());
        when(risks.findByBidId(anyString())).thenReturn(List.of());
        when(conflicts.findByBidId(anyString())).thenReturn(List.of());
        when(documents.findByBidIdOrderByUploadedAtDesc(anyString())).thenReturn(List.of());
        when(evidence.findAll()).thenReturn(List.of());
    }

    private Tender tender() {
        Sector sector = Sector.builder().id(1L).code("RAILWAYS").name("Railways").build();
        Department dept = Department.builder().id(10L).code("RPD")
                .name("Railway Procurement Department").sector(sector).build();
        return Tender.builder().id(1L).tenderId(TENDER)
                .title("Supply and Installation of Network Infrastructure")
                .department(dept).status("ACTIVE").build();
    }

    private Bid bid(String bidId, String bidderName) {
        return Bid.builder().bidId(bidId).tenderId(TENDER).bidderName(bidderName)
                .status("Review Required").build();
    }

    private Requirement req(String bidId, String reqId, String description, String status) {
        return Requirement.builder()
                .bidId(bidId).requirementId(reqId).category("Financial")
                .requirement(description).requiredValue(">= 10 crore")
                .detectedValue("n/a").status(status).risk("MEDIUM")
                .sourceDoc("Financials.pdf").pageNumber(3).mandatory(true)
                .build();
    }

    // ---- Test 1: two bids from the same tender → 200-equivalent success ----
    @Test
    void sameTenderTwoBidsReturnsComparison() {
        stubDefaults();
        when(bids.findByTenderIdOrderByCreatedAtDesc(TENDER))
                .thenReturn(List.of(bid("GEM-2026-001", "ABC Technologies Pvt Ltd"),
                        bid("GEM-2026-002", "Bharat Networks Pvt Ltd")));

        BidComparisonResponse response = service.getComparison(TENDER, null);

        assertEquals(TENDER, response.tenderId());
        assertEquals(2, response.bidCount());
        assertEquals(2, response.bidders().size());
        assertEquals("ABC Technologies Pvt Ltd", response.bidders().get(0).bidderName());
        verify(audits).save(argThat(e -> "COMPARE_BIDS".equals(e.getAction())
                && TENDER.equals(e.getBidId())));
    }

    // ---- Test 2: bid from a different tender → 400 (IllegalArgumentException) ----
    @Test
    void rejectsBidFromDifferentTender() {
        stubDefaults();
        when(bids.findByTenderIdOrderByCreatedAtDesc(TENDER))
                .thenReturn(List.of(bid("GEM-2026-001", "ABC")));
        Bid foreign = Bid.builder().bidId("GEM-2026-999")
                .tenderId("TND-FIN-2026-3101").bidderName("Other").build();
        when(bids.findByBidId("GEM-2026-999")).thenReturn(Optional.of(foreign));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> service.getComparison(TENDER, List.of("GEM-2026-999")));
        assertTrue(ex.getMessage().contains("same tender"));
        verifyNoInteractions(audits);
    }

    @Test
    void rejectsUnknownBidId() {
        stubDefaults();
        when(bids.findByTenderIdOrderByCreatedAtDesc(TENDER)).thenReturn(List.of());
        when(bids.findByBidId("GEM-2026-404")).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
                () -> service.getComparison(TENDER, List.of("GEM-2026-404")));
    }

    // ---- Test 3: bidder role must NOT be granted by the endpoint annotation ----
    @Test
    void comparisonEndpointRequiresGovernmentRoleAndExcludesBidder() throws Exception {
        Method method = TenderComparisonController.class
                .getMethod("compare", String.class, List.class);
        PreAuthorize preAuthorize = method.getAnnotation(PreAuthorize.class);

        assertNotNull(preAuthorize, "Comparison endpoint must declare @PreAuthorize");
        String expr = preAuthorize.value();
        assertTrue(expr.contains("GOVERNMENT_OFFICER"), "officer role must be allowed");
        assertTrue(expr.contains("CENTRAL_ADMIN"), "central admin must be allowed");
        assertTrue(expr.contains("SECTOR_USER"), "sector user must be allowed");
        assertFalse(expr.contains("'USER'"), "bidder USER role must not be allowed");
    }

    // ---- Test 4a: hierarchy denial propagates as 403 from the comparison service ----
    @Test
    void hierarchyAccessDeniedPropagates() {
        when(hierarchyService.requireAccessibleTender(TENDER))
                .thenThrow(new AccessDeniedException("Not authorized to access this department"));

        AccessDeniedException ex = assertThrows(AccessDeniedException.class,
                () -> service.getComparison(TENDER, null));
        assertTrue(ex.getMessage().contains("department"));
        verifyNoInteractions(bids, audits);
    }

    // ---- Test 5: a single bid yields a valid, non-crashing response ----
    @Test
    void singleBidReturnsValidComparison() {
        stubDefaults();
        when(bids.findByTenderIdOrderByCreatedAtDesc(TENDER))
                .thenReturn(List.of(bid("GEM-2026-001", "ABC Technologies Pvt Ltd")));
        when(requirements.findByBidId("GEM-2026-001"))
                .thenReturn(List.of(req("GEM-2026-001", "REQ-001", "Minimum turnover", "PASS")));

        BidComparisonResponse response = service.getComparison(TENDER, null);

        assertEquals(1, response.bidCount());
        assertEquals(1, response.bidders().size());
        assertEquals("NOT_RUN", response.bidders().get(0).preliminary().overallStatus());
        assertEquals(1, response.requirements().size());
        assertEquals(1, response.bidders().get(0).compliance().pass());
    }

    // ---- Test 6: multiple bids all returned; bidIds filter narrows selection ----
    @Test
    void multipleBidsAllReturnedAndFilterWorks() {
        stubDefaults();
        when(bids.findByTenderIdOrderByCreatedAtDesc(TENDER)).thenReturn(List.of(
                bid("GEM-2026-001", "ABC Technologies Pvt Ltd"),
                bid("GEM-2026-002", "Bharat Networks Pvt Ltd"),
                bid("GEM-2026-003", "Zenith IT Solutions Ltd")));
        when(bids.findByBidId("GEM-2026-001"))
                .thenReturn(Optional.of(bid("GEM-2026-001", "ABC Technologies Pvt Ltd")));
        when(bids.findByBidId("GEM-2026-003"))
                .thenReturn(Optional.of(bid("GEM-2026-003", "Zenith IT Solutions Ltd")));

        BidComparisonResponse all = service.getComparison(TENDER, null);
        assertEquals(3, all.bidCount());

        BidComparisonResponse filtered = service.getComparison(TENDER,
                List.of("GEM-2026-001", "GEM-2026-003"));
        assertEquals(2, filtered.bidCount());
        assertEquals(List.of("GEM-2026-001", "GEM-2026-003"),
                filtered.bidders().stream().map(BidderComparisonDto::bidId).toList());
    }

    // ---- Test 7: requirement matrix carries correct per-bidder statuses ----
    @Test
    void requirementMatrixShowsCorrectStatusPerBidder() {
        stubDefaults();
        when(bids.findByTenderIdOrderByCreatedAtDesc(TENDER)).thenReturn(List.of(
                bid("GEM-2026-001", "Bidder A"),
                bid("GEM-2026-002", "Bidder B"),
                bid("GEM-2026-003", "Bidder C")));

        // Bidder A: stored compliance result overrides requirement status.
        when(requirements.findByBidId("GEM-2026-001"))
                .thenReturn(List.of(req("GEM-2026-001", "REQ-001", "Minimum turnover", "PASS")));
        when(compliance.findByBidId("GEM-2026-001")).thenReturn(List.of(
                ComplianceResult.builder().bidId("GEM-2026-001").requirementId("REQ-001")
                        .status("FAIL").requiredValue(">= 10 crore").detectedValue("6.2 crore")
                        .reason("Below threshold").mandatory(true).build()));

        // Bidder B: only requirement status stored (REVIEW).
        when(requirements.findByBidId("GEM-2026-002"))
                .thenReturn(List.of(req("GEM-2026-002", "REQ-001", "Minimum turnover", "REVIEW")));

        // Bidder C: requirement missing this row entirely → null status.
        when(requirements.findByBidId("GEM-2026-003")).thenReturn(List.of());

        BidComparisonResponse response = service.getComparison(TENDER, null);

        assertEquals(1, response.requirements().size());
        RequirementMatrixRowDto row = response.requirements().get(0);
        assertEquals("REQ-001", row.requirementId());
        assertEquals("Minimum turnover", row.description());

        RequirementCellDto cellA = row.cells().get(0);
        RequirementCellDto cellB = row.cells().get(1);
        RequirementCellDto cellC = row.cells().get(2);
        assertEquals("GEM-2026-001", cellA.bidId());
        assertEquals("FAIL", cellA.status());
        assertEquals("6.2 crore", cellA.actualValue());
        assertEquals("REVIEW", cellB.status());
        assertNull(cellC.status());

        // Summary counts are computed from the matrix cells.
        ComplianceCountsDto countsA = response.bidders().get(0).compliance();
        assertEquals(1, countsA.total());
        assertEquals(1, countsA.fail());
        assertEquals(0, countsA.pass());
        ComplianceCountsDto countsB = response.bidders().get(1).compliance();
        assertEquals(1, countsB.review());
    }

    // ---- Test 8: evidence chain resolves document/page references ----
    @Test
    void evidenceIsTraceableToDocumentAndPage() {
        stubDefaults();
        when(bids.findByTenderIdOrderByCreatedAtDesc(TENDER))
                .thenReturn(List.of(bid("GEM-2026-001", "ABC")));
        when(requirements.findByBidId("GEM-2026-001"))
                .thenReturn(List.of(req("GEM-2026-001", "REQ-001", "Minimum turnover", "REVIEW")));
        when(evidence.findAll()).thenReturn(List.of(
                EvidenceDetail.builder()
                        .requirementId("GEM-2026-001:REQ-001")
                        .requirementTitle("Minimum turnover")
                        .sourceDocument("Financials.pdf")
                        .pageNumber(4)
                        .extractedSnippet("Turnover of 12.5 crore detected in audited P&L.")
                        .decision("REVIEW")
                        .confidence(70.0)
                        .build()));

        BidComparisonResponse response = service.getComparison(TENDER, null);
        RequirementCellDto cell = response.requirements().get(0).cells().get(0);

        assertTrue(cell.hasEvidence());
        assertEquals("Financials.pdf", cell.evidenceDocument());
        assertEquals(4, cell.evidencePage());
        assertEquals("Financials.pdf", cell.document());
        assertEquals(4, cell.page());
        assertNotNull(cell.evidenceSnippet());
    }

    // ---- Test 9: risk counts aggregate the actual stored risk factors ----
    @Test
    void riskCountsAggregateStoredRiskFactors() {
        stubDefaults();
        when(bids.findByTenderIdOrderByCreatedAtDesc(TENDER))
                .thenReturn(List.of(bid("GEM-2026-001", "ABC")));
        when(risks.findByBidId("GEM-2026-001")).thenReturn(List.of(
                risk("HIGH"), risk("HIGH"), risk("MEDIUM"), risk("LOW")));

        BidComparisonResponse response = service.getComparison(TENDER, null);
        RiskCountsDto risk = response.bidders().get(0).risk();

        assertEquals(2, risk.high());
        assertEquals(1, risk.medium());
        assertEquals(1, risk.low());
        assertEquals(4, risk.total());
    }

    // ---- Test 10: conflicts aggregate the actual stored conflict items ----
    @Test
    void conflictsAggregateStoredConflictItems() {
        stubDefaults();
        when(bids.findByTenderIdOrderByCreatedAtDesc(TENDER))
                .thenReturn(List.of(bid("GEM-2026-001", "ABC"), bid("GEM-2026-003", "Zenith")));
        when(conflicts.findByBidId("GEM-2026-001")).thenReturn(List.of(
                conflict("CONFLICT-001", "REQ-001"),
                conflict("CONFLICT-002", "REQ-008")));
        when(conflicts.findByBidId("GEM-2026-003")).thenReturn(List.of());

        BidComparisonResponse response = service.getComparison(TENDER, null);

        BidderComparisonDto abc = response.bidders().get(0);
        assertEquals(2, abc.conflictCount());
        assertEquals(2, abc.conflicts().size());
        assertEquals("CONFLICT-001", abc.conflicts().get(0).conflictId());
        assertTrue(abc.conflicts().get(0).sources().contains("Financials.pdf"));

        BidderComparisonDto zenith = response.bidders().get(1);
        assertEquals(0, zenith.conflictCount());
        assertTrue(zenith.conflicts().isEmpty());
    }

    // ---- Bonus: document coverage uses only real docType rows ----
    @Test
    void documentCoverageBuiltFromActualDocumentsOnly() {
        stubDefaults();
        when(bids.findByTenderIdOrderByCreatedAtDesc(TENDER)).thenReturn(List.of(
                bid("GEM-2026-001", "A"), bid("GEM-2026-003", "C")));
        when(documents.findByBidIdOrderByUploadedAtDesc("GEM-2026-001")).thenReturn(List.of(
                document("GST Certificate"), document("PAN Card"), document(null)));
        when(documents.findByBidIdOrderByUploadedAtDesc("GEM-2026-003")).thenReturn(List.of(
                document("GST Certificate"), document("Integrity Pact")));

        BidComparisonResponse response = service.getComparison(TENDER, null);

        // Blank/null docType is skipped — never fabricated.
        assertEquals(3, response.documentCoverage().size());
        DocumentCoverageRowDto gst = response.documentCoverage().get(0);
        assertEquals("GST Certificate", gst.category());
        assertTrue(gst.cells().get(0).present());
        assertTrue(gst.cells().get(1).present());

        DocumentCoverageRowDto integrity = response.documentCoverage().stream()
                .filter(r -> "Integrity Pact".equals(r.category()))
                .findFirst().orElseThrow();
        assertFalse(integrity.cells().get(0).present());
        assertTrue(integrity.cells().get(1).present());
    }

    // ---- Bonus: preliminary overall mirrors existing Phase 2 rule ----
    @Test
    void preliminaryOverallMirrorsExistingSummaryRule() {
        stubDefaults();
        when(bids.findByTenderIdOrderByCreatedAtDesc(TENDER)).thenReturn(List.of(
                bid("GEM-2026-001", "A"), bid("GEM-2026-002", "B")));
        when(preliminary.findByBidId("GEM-2026-001")).thenReturn(List.of(
                prelim(PreliminaryVerificationCheck.CheckStatus.PASS),
                prelim(PreliminaryVerificationCheck.CheckStatus.REVIEW),
                prelim(PreliminaryVerificationCheck.CheckStatus.MISSING)));
        when(preliminary.findByBidId("GEM-2026-002")).thenReturn(List.of(
                prelim(PreliminaryVerificationCheck.CheckStatus.FAIL),
                prelim(PreliminaryVerificationCheck.CheckStatus.PASS)));

        BidComparisonResponse response = service.getComparison(TENDER, null);

        PreliminaryComparisonDto a = response.bidders().get(0).preliminary();
        assertEquals("REVIEW", a.overallStatus());
        assertEquals(3, a.total());
        assertEquals(1, a.pass());
        assertEquals(1, a.missing());

        PreliminaryComparisonDto b = response.bidders().get(1).preliminary();
        assertEquals("FAIL", b.overallStatus());
        assertEquals(1, b.fail());
    }

    private RiskCategorySummary risk(String level) {
        return RiskCategorySummary.builder()
                .bidId("GEM-2026-001").category("Financial").riskLevel(level).score(50)
                .summary("demo").factors(List.of("demo factor")).build();
    }

    private ConflictItem conflict(String conflictId, String reqId) {
        return ConflictItem.builder()
                .bidId("GEM-2026-001").conflictId(conflictId).requirementId(reqId)
                .conflictType("financial_turnover").title("Discrepancy")
                .status("MANUAL VERIFICATION REQUIRED").riskLevel("MEDIUM")
                .sources(List.of("Financials.pdf", "Certificate.pdf"))
                .build();
    }

    private BidderDocument document(String docType) {
        BidderDocument doc = new BidderDocument();
        doc.setFilename("demo.pdf");
        doc.setDocType(docType);
        return doc;
    }

    private PreliminaryVerificationCheck prelim(PreliminaryVerificationCheck.CheckStatus status) {
        return PreliminaryVerificationCheck.builder()
                .bidId("demo")
                .checkType(PreliminaryVerificationCheck.CheckType.DOCUMENT_VALIDITY)
                .status(status)
                .message("demo")
                .build();
    }
}
