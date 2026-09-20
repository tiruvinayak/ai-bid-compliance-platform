package com.sih.gem.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sih.gem.entity.*;
import com.sih.gem.repository.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;

@Service
public class AiService {
    private final AiClient client;
    private final ObjectMapper objectMapper;
    private final BidRepository bidRepository;
    private final BidderDocumentRepository documentRepository;
    private final RequirementRepository requirementRepository;
    private final EvidenceDetailRepository evidenceRepository;
    private final BidderFactRepository factRepository;
    private final ComplianceResultRepository complianceRepository;
    private final RiskCategorySummaryRepository riskRepository;
    private final ConflictItemRepository conflictRepository;
    private final AuditEventRepository auditRepository;

    public AiService(AiClient client, ObjectMapper objectMapper, BidRepository bidRepository,
                     BidderDocumentRepository documentRepository, RequirementRepository requirementRepository,
                     EvidenceDetailRepository evidenceRepository, BidderFactRepository factRepository,
                     ComplianceResultRepository complianceRepository, RiskCategorySummaryRepository riskRepository,
                     ConflictItemRepository conflictRepository, AuditEventRepository auditRepository) {
        this.client = client;
        this.objectMapper = objectMapper;
        this.bidRepository = bidRepository;
        this.documentRepository = documentRepository;
        this.requirementRepository = requirementRepository;
        this.evidenceRepository = evidenceRepository;
        this.factRepository = factRepository;
        this.complianceRepository = complianceRepository;
        this.riskRepository = riskRepository;
        this.conflictRepository = conflictRepository;
        this.auditRepository = auditRepository;
    }

    public JsonNode health() {
        return client.health();
    }

    public JsonNode askGovernment(JsonNode request) {
        JsonNode response = client.askGovernment(request);
        if (!response.has("status") && !response.has("grounding_status")) {
            throw new AiClientException("AI_INVALID_RESPONSE", "AI service response is missing grounding status.");
        }
        return response;
    }

    @Transactional(noRollbackFor = AiClientException.class)
    public JsonNode processSubmission(String bidId, String currentUser, boolean officer) {
        Bid bid = bidRepository.findByBidId(bidId)
                .orElseThrow(() -> new IllegalArgumentException("Submission not found: " + bidId));
        List<BidderDocument> documents = documentRepository.findByBidIdOrderByUploadedAtDesc(bidId);
        authorize(currentUser, officer, documents);

        BidderDocument tender = documents.stream()
                .filter(d -> d.getDocType() != null && d.getDocType().toLowerCase().contains("tender"))
                .findFirst().orElseThrow(() -> new IllegalArgumentException("A tender document is required before AI processing."));
        Path tenderPath = validPath(tender);
        List<Path> bidderPaths = documents.stream().filter(d -> d.getId() != null && !d.getId().equals(tender.getId()))
                .map(this::validPath).toList();
        if (bidderPaths.isEmpty()) {
            throw new IllegalArgumentException("At least one bidder document is required before AI processing.");
        }

        bid.setStatus("PROCESSING");
        bidRepository.save(bid);
        try {
            JsonNode response = client.processSubmission(bidId, tenderPath, bidderPaths);
            validateSubmissionResponse(bidId, response);
            persistResult(bid, response);
            audit(bidId, currentUser, officer ? "GOVERNMENT OFFICER" : "USER", "AI_SUBMISSION_PROCESSED", "Submission", "SUCCESS", "Python AI response persisted");
            return response;
        } catch (RuntimeException ex) {
            bid.setStatus("FAILED");
            bidRepository.save(bid);
            audit(bidId, currentUser, officer ? "GOVERNMENT OFFICER" : "USER", "AI_SUBMISSION_PROCESSING_FAILED", "Submission", "WARNING", ex.getMessage());
            throw ex;
        }
    }

    private void authorize(String user, boolean officer, List<BidderDocument> documents) {
        if (officer) return;
        if (documents.stream().noneMatch(d -> user.equalsIgnoreCase(d.getUploadedBy()))) {
            throw new AccessDeniedException("You cannot access another bidder's submission.");
        }
    }

    private Path validPath(BidderDocument document) {
        if (document.getStoredPath() == null) throw new IllegalArgumentException("Document file is unavailable: " + document.getFilename());
        Path path = Path.of(document.getStoredPath()).toAbsolutePath().normalize();
        if (!Files.isRegularFile(path)) throw new IllegalArgumentException("Document file is unavailable: " + document.getFilename());
        return path;
    }

    private void validateSubmissionResponse(String bidId, JsonNode response) {
        if (!response.path("success").asBoolean(false)) {
            throw new AiClientException("AI_INVALID_RESPONSE", "AI service did not report successful processing.");
        }
        String returnedId = text(response, "submission_id", "submissionId");
        if (returnedId != null && !returnedId.equals(bidId)) {
            throw new AiClientException("AI_INVALID_RESPONSE", "AI service response belongs to a different submission.");
        }
        if (!response.path("requirements").isArray() || !response.path("bidder_facts").isArray()) {
            throw new AiClientException("AI_INVALID_RESPONSE", "AI service response is missing requirements or bidder facts.");
        }
    }

    private void persistResult(Bid bid, JsonNode response) {
        String bidId = bid.getBidId();
        requirementRepository.deleteByBidId(bidId);
        factRepository.deleteByBidId(bidId);
        complianceRepository.deleteByBidId(bidId);
        riskRepository.deleteByBidId(bidId);
        conflictRepository.deleteByBidId(bidId);
        evidenceRepository.deleteAll(evidenceRepository.findAll().stream()
                .filter(e -> e.getRequirementId() != null && e.getRequirementId().startsWith(bidId + ":")) .toList());

        List<Requirement> persistedRequirements = new ArrayList<>();
        for (JsonNode node : response.path("requirements")) {
            Requirement requirement = Requirement.builder().bidId(bidId)
                    .requirementId(value(node, "requirement_id", "id"))
                    .category(value(node, "category")).requirement(value(node, "description", "requirement"))
                    .requiredValue(value(node, "required_value")).unit(value(node, "unit"))
                    .period(value(node, "period")).mandatory(bool(node, "mandatory"))
                    .ambiguous(bool(node, "ambiguous")).sourceDoc(value(node, "source_document"))
                    .pageNumber(integer(node, "page_number")).sourceText(value(node, "source_text"))
                    .status(status(node, "status")).build();
            persistedRequirements.add(requirement);
            requirementRepository.save(requirement);
        }
        for (JsonNode node : response.path("bidder_facts")) {
            factRepository.save(BidderFact.builder().bidId(bidId).factId(value(node, "fact_id", "id"))
                    .category(value(node, "category")).fieldName(value(node, "field"))
                    .detectedValue(value(node, "detected_value", "value")).unit(value(node, "unit"))
                    .period(value(node, "period")).confidence(decimal(node, "confidence"))
                    .ambiguous(bool(node, "ambiguous")).sourceDocument(value(node, "source_document"))
                    .pageNumber(integer(node, "page_number")).sectionName(value(node, "section_name"))
                    .sourceText(value(node, "source_text")).build());
        }
        JsonNode compliance = response.path("compliance");
        Iterable<JsonNode> complianceItems = compliance.isArray() ? compliance : compliance.path("results");
        int pass = 0, fail = 0, missing = 0, review = 0, conflict = 0, total = 0;
        for (JsonNode node : complianceItems) {
            String resultStatus = status(node, "status");
            total++;
            switch (resultStatus) { case "PASS" -> pass++; case "FAIL" -> fail++; case "MISSING" -> missing++; case "CONFLICT" -> conflict++; default -> review++; }
            String requirementId = value(node, "requirement_id");
            complianceRepository.save(ComplianceResult.builder().bidId(bidId).requirementId(requirementId).status(resultStatus)
                    .requiredValue(value(node, "required_value")).requiredUnit(value(node, "required_unit"))
                    .requiredPeriod(value(node, "required_period")).detectedValue(value(node, "detected_value"))
                    .detectedUnit(value(node, "detected_unit")).factIds(strings(node.path("fact_ids")))
                    .reason(value(node, "reason")).confidence(decimal(node, "confidence")).mandatory(bool(node, "mandatory"))
                    .requiresManualReview(bool(node, "requires_manual_review")).ruleUsed(value(node, "rule_used")).build());
            persistedRequirements.stream().filter(req -> requirementId != null && requirementId.equals(req.getRequirementId()))
                    .findFirst().ifPresent(req -> {
                        req.setDetectedValue(value(node, "detected_value"));
                        req.setStatus(resultStatus);
                        req.setConfidence(decimal(node, "confidence"));
                        req.setReason(value(node, "reason"));
                    });
            persistEvidence(bidId, requirementId, node);
        }
        persistRisks(bidId, response.path("risk"));
        persistConflicts(bidId, response.path("conflicts"));
        bid.setTotalRequirements(total); bid.setPassCount(pass); bid.setFailCount(fail); bid.setMissingCount(missing); bid.setReviewCount(review); bid.setConflictCount(conflict);
        bid.setCompliancePercentage(total == 0 ? 0D : Math.round((pass * 1000D / total)) / 10D);
        bid.setOverallRiskScore(integer(response.path("risk"), "risk_score", "overall_risk_score", "score"));
        bid.setRiskLevel(value(response.path("risk"), "overall_risk_level", "level", "risk_level"));
        bid.setReviewPriority(value(response.path("risk"), "review_priority"));
        bid.setManualReviewRequired(bool(response.path("risk"), "manual_review_required", "requires_manual_review"));
        String overall = status(response, "overall_status");
        bid.setStatus("REVIEW".equals(overall) || Boolean.TRUE.equals(bid.getManualReviewRequired()) ? "REVIEW_REQUIRED" : "COMPLETED");
        bidRepository.save(bid);
    }

    private void persistEvidence(String bidId, String requirementId, JsonNode result) {
        JsonNode evidence = result.path("evidence");
        Iterable<JsonNode> entries = evidence.isArray() ? evidence : evidence.isMissingNode() ? List.of() : List.of(evidence);
        for (JsonNode node : entries) evidenceRepository.save(EvidenceDetail.builder().requirementId(bidId + ":" + requirementId)
                .factId(value(node, "fact_id")).sourceDocument(value(node, "source_document"))
                .pageNumber(integer(node, "page_number")).sectionName(value(node, "section_name"))
                .extractedSnippet(value(node, "source_text", "quoted_text")).decision(status(result, "status"))
                .reason(value(result, "reason")).confidence(decimal(result, "confidence"))
                .verificationSource("Python AI service").build());
    }

    private void persistRisks(String bidId, JsonNode risk) {
        JsonNode riskItems = risk.path("risk_items").isArray() ? risk.path("risk_items") : risk.path("items");
        Iterable<JsonNode> risks = riskItems.isArray() ? riskItems : risk.isArray() ? risk : List.of();
        for (JsonNode node : risks) if (!node.isMissingNode() && !node.isEmpty()) riskRepository.save(RiskCategorySummary.builder().bidId(bidId)
                .riskId(value(node, "risk_id", "id")).category(value(node, "risk_type", "category"))
                .riskLevel(value(node, "severity", "risk_level")).score(integer(node, "score_contribution", "score"))
                .requirementId(value(node, "requirement_id")).conflictId(value(node, "conflict_id"))
                .summary(value(node, "reason", "summary")).recommendedAction(value(node, "recommended_action"))
                .requiresManualReview(bool(node, "requires_manual_review")).factors(strings(node.path("fact_ids"))).build());
    }

    private void persistConflicts(String bidId, JsonNode conflicts) {
        if (!conflicts.isArray()) return;
        List<ConflictItem> oldConflicts = conflictRepository.findByBidId(bidId);
        if (!oldConflicts.isEmpty()) {
            conflictRepository.deleteAll(oldConflicts);
        }
        for (JsonNode node : conflicts) {
            String field = value(node, "field", "conflict_type");
            String titleField = field != null ? field.toUpperCase().replace("_", " ") : "DATA";

            String subDoc = value(node, "submitted_document", "submittedDocument");
            String subVal = value(node, "submitted_value", "submittedValue");
            String verSrc = value(node, "verification_source", "verificationSource");
            String verVal = value(node, "verification_value", "verificationValue");

            JsonNode evidenceArr = node.path("evidence");
            if ((subVal == null || verVal == null) && evidenceArr.isArray() && evidenceArr.size() >= 2) {
                if (subDoc == null) subDoc = text(evidenceArr.get(0), "source_document");
                if (subVal == null) subVal = text(evidenceArr.get(0), "detected_value");
                if (verSrc == null) verSrc = text(evidenceArr.get(1), "source_document");
                if (verVal == null) verVal = text(evidenceArr.get(1), "detected_value");
            }

            conflictRepository.save(ConflictItem.builder()
                    .bidId(bidId)
                    .conflictId(value(node, "conflict_id", "id"))
                    .conflictType(field)
                    .requirementId(value(node, "requirement_id"))
                    .title("Cross-Document " + titleField + " Discrepancy")
                    .submittedDocument(subDoc != null ? subDoc : "Bidder Primary Filing")
                    .submittedValue(subVal != null ? subVal : "Declared Value")
                    .verificationSource(verSrc != null ? verSrc : "Official Verification Registry")
                    .verificationValue(verVal != null ? verVal : "Verified Source Value")
                    .status("MANUAL VERIFICATION REQUIRED")
                    .riskLevel(value(node, "severity", "risk_level"))
                    .sources(strings(node.path("documents")))
                    .factIds(strings(node.has("facts") ? node.path("facts") : node.path("fact_ids")))
                    .explanation(value(node, "reason"))
                    .requiresManualReview(bool(node, "requires_manual_review"))
                    .build());
        }
    }

    private void audit(String bidId, String actor, String role, String action, String entity, String status, String details) {
        auditRepository.save(AuditEvent.builder().bidId(bidId).actor(actor).userRole(role).action(action).entity(entity)
                .status(status).details(details).timestamp(LocalDateTime.now()).build());
    }

    private String value(JsonNode node, String... names) { return text(node, names); }
    private String text(JsonNode node, String... names) { for (String name : names) if (node.hasNonNull(name)) return node.get(name).asText(); return null; }
    private Integer integer(JsonNode node, String... names) { for (String name : names) if (node.has(name) && node.get(name).canConvertToInt()) return node.get(name).asInt(); return null; }
    private Double decimal(JsonNode node, String... names) { for (String name : names) if (node.has(name) && node.get(name).isNumber()) return node.get(name).doubleValue(); return null; }
    private Boolean bool(JsonNode node, String... names) { for (String name : names) if (node.has(name)) return node.get(name).asBoolean(); return false; }
    private String status(JsonNode node, String... names) { String value = text(node, names); return value == null ? "REVIEW" : value.toUpperCase(); }
    private List<String> strings(JsonNode node) { List<String> values = new ArrayList<>(); if (node.isArray()) node.forEach(v -> values.add(v.asText())); return values; }
}
