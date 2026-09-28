package com.sih.gem.service;

import com.sih.gem.dto.BidComparisonDtos.*;
import com.sih.gem.entity.*;
import com.sih.gem.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Phase 4 — Multi-Bidder Comparison & Decision Support.
 * Deterministic aggregation over stored requirements, compliance results,
 * preliminary checks, risks, conflicts, documents and evidence.
 * No LLM calls. No rankings. No winner selection — the officer decides.
 */
@Service
public class BidComparisonService {

    private static final Logger log = LoggerFactory.getLogger(BidComparisonService.class);
    private static final Set<String> KNOWN_STATUSES =
            Set.of("PASS", "REVIEW", "FAIL", "MISSING", "CONFLICT");

    private final HierarchyService hierarchyService;
    private final BidRepository bidRepository;
    private final RequirementRepository requirementRepository;
    private final ComplianceResultRepository complianceRepository;
    private final PreliminaryVerificationCheckRepository preliminaryRepository;
    private final RiskCategorySummaryRepository riskRepository;
    private final ConflictItemRepository conflictRepository;
    private final BidderDocumentRepository documentRepository;
    private final EvidenceDetailRepository evidenceRepository;
    private final AuditEventRepository auditRepository;

    public BidComparisonService(HierarchyService hierarchyService,
                                BidRepository bidRepository,
                                RequirementRepository requirementRepository,
                                ComplianceResultRepository complianceRepository,
                                PreliminaryVerificationCheckRepository preliminaryRepository,
                                RiskCategorySummaryRepository riskRepository,
                                ConflictItemRepository conflictRepository,
                                BidderDocumentRepository documentRepository,
                                EvidenceDetailRepository evidenceRepository,
                                AuditEventRepository auditRepository) {
        this.hierarchyService = hierarchyService;
        this.bidRepository = bidRepository;
        this.requirementRepository = requirementRepository;
        this.complianceRepository = complianceRepository;
        this.preliminaryRepository = preliminaryRepository;
        this.riskRepository = riskRepository;
        this.conflictRepository = conflictRepository;
        this.documentRepository = documentRepository;
        this.evidenceRepository = evidenceRepository;
        this.auditRepository = auditRepository;
    }

    /**
     * Builds a factual comparison of all (or selected) bids of a single tender.
     * Authorization (role + hierarchy department scope) is enforced by
     * {@link HierarchyService#requireAccessibleTender(String)} before any data is read.
     * Selected bids that do not belong to the requested tender are rejected with 400.
     */
    public BidComparisonResponse getComparison(String tenderId, List<String> requestedBidIds) {
        Tender tender = hierarchyService.requireAccessibleTender(tenderId);

        List<Bid> selected = resolveSelectedBids(tenderId, requestedBidIds);

        // ---- Load stored analysis data (per bid) ----
        Map<String, List<Requirement>> reqsByBid = new LinkedHashMap<>();
        Map<String, List<ComplianceResult>> compByBid = new LinkedHashMap<>();
        Map<String, List<PreliminaryVerificationCheck>> prelimByBid = new LinkedHashMap<>();
        Map<String, List<RiskCategorySummary>> riskByBid = new LinkedHashMap<>();
        Map<String, List<ConflictItem>> conflictByBid = new LinkedHashMap<>();
        Map<String, List<BidderDocument>> docsByBid = new LinkedHashMap<>();
        for (Bid bid : selected) {
            String bidId = bid.getBidId();
            reqsByBid.put(bidId, requirementRepository.findByBidId(bidId));
            compByBid.put(bidId, complianceRepository.findByBidId(bidId));
            prelimByBid.put(bidId, preliminaryRepository.findByBidId(bidId));
            riskByBid.put(bidId, riskRepository.findByBidId(bidId));
            conflictByBid.put(bidId, conflictRepository.findByBidId(bidId));
            docsByBid.put(bidId, documentRepository.findByBidIdOrderByUploadedAtDesc(bidId));
        }

        // Evidence is keyed by composite "bidId:requirementId".
        Map<String, EvidenceDetail> evidenceByKey = evidenceRepository.findAll().stream()
                .filter(e -> e.getRequirementId() != null && e.getRequirementId().contains(":"))
                .collect(Collectors.toMap(
                        EvidenceDetail::getRequirementId,
                        e -> e,
                        (a, b) -> a));

        List<String> bidIds = selected.stream().map(Bid::getBidId).toList();

        // ---- Requirement-by-requirement matrix ----
        List<RequirementMatrixRowDto> matrix = buildMatrix(bidIds, reqsByBid, compByBid, evidenceByKey);

        // ---- Per-bidder summaries ----
        List<BidderComparisonDto> bidders = new ArrayList<>();
        for (Bid bid : selected) {
            String bidId = bid.getBidId();
            bidders.add(new BidderComparisonDto(
                    bidId,
                    bid.getBidderName(),
                    bid.getStatus(),
                    preliminarySummary(prelimByBid.get(bidId)),
                    complianceCounts(matrix, bidId),
                    riskCounts(riskByBid.get(bidId)),
                    conflictByBid.get(bidId).size(),
                    conflictSummaries(conflictByBid.get(bidId)),
                    documentTypes(docsByBid.get(bidId))
            ));
        }

        List<DocumentCoverageRowDto> coverage = buildDocumentCoverage(bidIds, docsByBid);

        recordAudit(tenderId, bidIds);

        Department department = tender.getDepartment();
        Sector sector = department != null ? department.getSector() : null;
        return new BidComparisonResponse(
                tender.getTenderId(),
                tender.getTitle(),
                department != null ? department.getName() : null,
                sector != null ? sector.getName() : null,
                bidders.size(),
                bidders,
                matrix,
                coverage
        );
    }

    /**
     * Same-tender scope: every explicitly requested bid must exist and belong to
     * the requested tender; anything else is rejected with 400.
     */
    private List<Bid> resolveSelectedBids(String tenderId, List<String> requestedBidIds) {
        List<Bid> tenderBids = bidRepository.findByTenderIdOrderByCreatedAtDesc(tenderId);
        if (requestedBidIds == null || requestedBidIds.isEmpty()) {
            return tenderBids;
        }
        List<String> distinct = requestedBidIds.stream()
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .distinct()
                .toList();
        if (distinct.isEmpty()) {
            return tenderBids;
        }
        List<Bid> selected = new ArrayList<>();
        for (String bidId : distinct) {
            Bid bid = bidRepository.findByBidId(bidId)
                    .orElseThrow(() -> new IllegalArgumentException("Bid " + bidId + " was not found."));
            if (!tenderId.equals(bid.getTenderId())) {
                throw new IllegalArgumentException(
                        "All selected bids must belong to the same tender. Bid " + bidId
                                + " belongs to tender " + bid.getTenderId() + ".");
            }
            selected.add(bid);
        }
        return selected;
    }

    private List<RequirementMatrixRowDto> buildMatrix(List<String> bidIds,
                                                      Map<String, List<Requirement>> reqsByBid,
                                                      Map<String, List<ComplianceResult>> compByBid,
                                                      Map<String, EvidenceDetail> evidenceByKey) {
        // Union of requirement IDs across selected bids, ordered by first appearance.
        Map<String, Requirement> canonicalById = new LinkedHashMap<>();
        for (String bidId : bidIds) {
            for (Requirement r : reqsByBid.getOrDefault(bidId, List.of())) {
                if (r.getRequirementId() == null) continue;
                canonicalById.putIfAbsent(r.getRequirementId(), r);
            }
        }

        List<RequirementMatrixRowDto> rows = new ArrayList<>();
        for (Map.Entry<String, Requirement> entry : canonicalById.entrySet()) {
            String reqId = entry.getKey();
            Requirement canonical = entry.getValue();
            List<RequirementCellDto> cells = new ArrayList<>();
            for (String bidId : bidIds) {
                cells.add(buildCell(bidId, reqId, reqsByBid, compByBid, evidenceByKey));
            }
            rows.add(new RequirementMatrixRowDto(
                    reqId,
                    canonical.getRequirement(),
                    canonical.getCategory(),
                    canonical.getRequiredValue(),
                    canonical.getMandatory(),
                    cells
            ));
        }
        return rows;
    }

    private RequirementCellDto buildCell(String bidId,
                                         String reqId,
                                         Map<String, List<Requirement>> reqsByBid,
                                         Map<String, List<ComplianceResult>> compByBid,
                                         Map<String, EvidenceDetail> evidenceByKey) {
        Requirement requirement = reqsByBid.getOrDefault(bidId, List.of()).stream()
                .filter(r -> reqId.equals(r.getRequirementId()))
                .findFirst()
                .orElse(null);
        ComplianceResult compliance = compByBid.getOrDefault(bidId, List.of()).stream()
                .filter(c -> reqId.equals(c.getRequirementId()))
                .findFirst()
                .orElse(null);
        EvidenceDetail evidence = evidenceByKey.get(bidId + ":" + reqId);

        String status = null;
        if (compliance != null && compliance.getStatus() != null) {
            status = normalizeStatus(compliance.getStatus());
        } else if (requirement != null && requirement.getStatus() != null) {
            status = normalizeStatus(requirement.getStatus());
        }

        String expected = compliance != null && compliance.getRequiredValue() != null
                && !compliance.getRequiredValue().isBlank()
                ? compliance.getRequiredValue()
                : requirement != null ? requirement.getRequiredValue() : null;
        String actual = compliance != null && compliance.getDetectedValue() != null
                && !compliance.getDetectedValue().isBlank()
                ? compliance.getDetectedValue()
                : requirement != null ? requirement.getDetectedValue() : null;
        String reason = compliance != null && compliance.getReason() != null
                ? compliance.getReason()
                : requirement != null ? requirement.getReason() : null;

        String document = requirement != null ? requirement.getSourceDoc() : null;
        if (evidence != null && evidence.getSourceDocument() != null) {
            document = evidence.getSourceDocument();
        }
        Integer page = requirement != null ? requirement.getPageNumber() : null;
        if (evidence != null && evidence.getPageNumber() != null) {
            page = evidence.getPageNumber();
        }
        if (actual == null && evidence != null) {
            actual = evidence.getDetectedValue();
        }

        return new RequirementCellDto(
                bidId,
                status,
                expected,
                actual,
                reason,
                document,
                page,
                evidence != null,
                evidence != null ? evidence.getSourceDocument() : null,
                evidence != null ? evidence.getPageNumber() : null,
                evidence != null ? evidence.getExtractedSnippet() : null
        );
    }

    private ComplianceCountsDto complianceCounts(List<RequirementMatrixRowDto> matrix, String bidId) {
        int total = 0, pass = 0, review = 0, fail = 0, missing = 0, conflict = 0;
        for (RequirementMatrixRowDto row : matrix) {
            RequirementCellDto cell = row.cells().stream()
                    .filter(c -> bidId.equals(c.bidId()))
                    .findFirst()
                    .orElse(null);
            if (cell == null || cell.status() == null) continue;
            total++;
            switch (cell.status()) {
                case "PASS" -> pass++;
                case "REVIEW" -> review++;
                case "FAIL" -> fail++;
                case "MISSING" -> missing++;
                case "CONFLICT" -> conflict++;
                default -> review++;
            }
        }
        Double coverage = total > 0 ? Math.round(pass * 1000.0 / total) / 10.0 : null;
        return new ComplianceCountsDto(total, pass, review, fail, missing, conflict, coverage);
    }

    private PreliminaryComparisonDto preliminarySummary(List<PreliminaryVerificationCheck> checks) {
        if (checks == null || checks.isEmpty()) {
            return new PreliminaryComparisonDto("NOT_RUN", 0, 0, 0, 0, 0, 0);
        }
        int pass = 0, review = 0, fail = 0, missing = 0, conflict = 0;
        for (PreliminaryVerificationCheck c : checks) {
            if (c.getStatus() == null) continue;
            switch (c.getStatus()) {
                case PASS -> pass++;
                case REVIEW -> review++;
                case FAIL -> fail++;
                case MISSING -> missing++;
                case CONFLICT -> conflict++;
            }
        }
        // Mirrors PreliminaryIntegrityService.getSummary overall rule.
        String overall = fail > 0 ? "FAIL"
                : (conflict > 0 || missing > 0 || review > 0) ? "REVIEW"
                : "PASS";
        return new PreliminaryComparisonDto(overall, checks.size(), pass, review, fail, missing, conflict);
    }

    private RiskCountsDto riskCounts(List<RiskCategorySummary> risks) {
        int high = 0, medium = 0, low = 0;
        if (risks != null) {
            for (RiskCategorySummary r : risks) {
                if (r.getRiskLevel() == null) continue;
                switch (r.getRiskLevel().toUpperCase(Locale.ROOT)) {
                    case "HIGH" -> high++;
                    case "MEDIUM" -> medium++;
                    case "LOW" -> low++;
                    default -> { /* unrecognised level: not counted */ }
                }
            }
        }
        int total = risks != null ? risks.size() : 0;
        return new RiskCountsDto(high, medium, low, total);
    }

    private List<ConflictSummaryDto> conflictSummaries(List<ConflictItem> conflicts) {
        if (conflicts == null) return List.of();
        return conflicts.stream()
                .map(c -> new ConflictSummaryDto(
                        c.getConflictId(),
                        c.getRequirementId(),
                        c.getConflictType(),
                        c.getTitle(),
                        c.getStatus(),
                        c.getRiskLevel(),
                        c.getSources() != null ? c.getSources() : List.of()
                ))
                .toList();
    }

    private List<String> documentTypes(List<BidderDocument> documents) {
        if (documents == null) return List.of();
        return documents.stream()
                .map(BidderDocument::getDocType)
                .filter(t -> t != null && !t.isBlank())
                .distinct()
                .toList();
    }

    private List<DocumentCoverageRowDto> buildDocumentCoverage(List<String> bidIds,
                                                               Map<String, List<BidderDocument>> docsByBid) {
        // Union of document categories across selected bids, first-seen order.
        // Blank/unknown docType values are skipped — never fabricated.
        Map<String, Map<String, Integer>> countsByCategory = new LinkedHashMap<>();
        for (String bidId : bidIds) {
            for (BidderDocument doc : docsByBid.getOrDefault(bidId, List.of())) {
                String category = doc.getDocType();
                if (category == null || category.isBlank()) continue;
                countsByCategory
                        .computeIfAbsent(category.trim(), k -> new LinkedHashMap<>())
                        .merge(bidId, 1, Integer::sum);
            }
        }
        List<DocumentCoverageRowDto> rows = new ArrayList<>();
        for (Map.Entry<String, Map<String, Integer>> entry : countsByCategory.entrySet()) {
            String category = entry.getKey();
            List<DocumentCoverageCellDto> cells = new ArrayList<>();
            for (String bidId : bidIds) {
                int count = entry.getValue().getOrDefault(bidId, 0);
                cells.add(new DocumentCoverageCellDto(bidId, count > 0, count));
            }
            rows.add(new DocumentCoverageRowDto(category, cells));
        }
        return rows;
    }

    private static String normalizeStatus(String status) {
        String s = status.trim().toUpperCase(Locale.ROOT);
        return KNOWN_STATUSES.contains(s) ? s : "REVIEW";
    }

    private void recordAudit(String tenderId, List<String> bidIds) {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            String actor = auth != null && auth.getName() != null && !auth.getName().isBlank()
                    ? auth.getName() : "SYSTEM";
            String role = "SYSTEM";
            if (auth != null && auth.getAuthorities() != null) {
                role = auth.getAuthorities().stream()
                        .findFirst()
                        .map(a -> a.getAuthority().replaceFirst("^ROLE_", "").replace('_', ' '))
                        .orElse("SYSTEM");
            }
            auditRepository.save(AuditEvent.builder()
                    .bidId(tenderId)
                    .actor(actor)
                    .userRole(role)
                    .action("COMPARE_BIDS")
                    .entity("Tender")
                    .status("SUCCESS")
                    .details("Compared bids for tender " + tenderId + ": " + String.join(", ", bidIds))
                    .timestamp(LocalDateTime.now())
                    .build());
        } catch (AccessDeniedException e) {
            throw e;
        } catch (Exception e) {
            log.warn("Failed to record COMPARE_BIDS audit event for {}: {}", tenderId, e.getMessage());
        }
    }
}
