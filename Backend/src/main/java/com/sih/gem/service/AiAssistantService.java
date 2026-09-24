package com.sih.gem.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sih.gem.ai.AiClient;
import com.sih.gem.ai.AiClientException;
import com.sih.gem.entity.*;
import com.sih.gem.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Service for the Bidder AI Assistant (Phase 3).
 * Retrieves tender/bid context and proxies chat requests to the AI service.
 */
@Service
public class AiAssistantService {

    private final AiClient aiClient;
    private final ObjectMapper objectMapper;
    private final BidRepository bidRepository;
    private final BidderDocumentRepository documentRepository;
    private final RequirementRepository requirementRepository;
    private final BidderFactRepository factRepository;
    private final ComplianceResultRepository complianceRepository;
    private final EvidenceDetailRepository evidenceRepository;
    private final PreliminaryVerificationCheckRepository preliminaryVerificationRepository;
    private final RiskCategorySummaryRepository riskRepository;
    private final ConflictItemRepository conflictRepository;
    private final AuditEventRepository auditRepository;
    private final UserRepository userRepository;

    public AiAssistantService(AiClient aiClient, ObjectMapper objectMapper,
                              BidRepository bidRepository,
                              BidderDocumentRepository documentRepository,
                              RequirementRepository requirementRepository,
                              BidderFactRepository factRepository,
                              ComplianceResultRepository complianceRepository,
                              EvidenceDetailRepository evidenceRepository,
                              PreliminaryVerificationCheckRepository preliminaryVerificationRepository,
                              RiskCategorySummaryRepository riskRepository,
                              ConflictItemRepository conflictRepository,
                              AuditEventRepository auditRepository,
                              UserRepository userRepository) {
        this.aiClient = aiClient;
        this.objectMapper = objectMapper;
        this.bidRepository = bidRepository;
        this.documentRepository = documentRepository;
        this.requirementRepository = requirementRepository;
        this.factRepository = factRepository;
        this.complianceRepository = complianceRepository;
        this.evidenceRepository = evidenceRepository;
        this.preliminaryVerificationRepository = preliminaryVerificationRepository;
        this.riskRepository = riskRepository;
        this.conflictRepository = conflictRepository;
        this.auditRepository = auditRepository;
        this.userRepository = userRepository;
    }

    /**
     * Chat with the AI assistant for a specific bid.
     * Retrieves full context and proxies to the AI service.
     */
    @Transactional
    public JsonNode chat(String bidId, String question, List<Map<String, String>> chatHistory,
                         String currentUser, boolean officer) {
        // Verify bid exists and user has access
        Bid bid = bidRepository.findByBidId(bidId)
                .orElseThrow(() -> new IllegalArgumentException("Bid not found: " + bidId));

        List<BidderDocument> documents = documentRepository.findByBidIdOrderByUploadedAtDesc(bidId);
        authorize(currentUser, officer, bid, documents);

        // Build full context
        Map<String, Object> context = buildContext(bidId, bid, documents);

        // Call AI service
        try {
            // Build request for AI service
            Map<String, Object> request = new HashMap<>();
            request.put("question", question);
            request.put("chat_history", chatHistory);
            request.put("context", context);

            JsonNode response = aiClient.assistantChat(request);

            // Audit log
            audit(bidId, currentUser, officer ? "GOVERNMENT OFFICER" : "USER",
                    "AI_ASSISTANT_CHAT", "Bid", "SUCCESS",
                    "Bidder AI assistant query: " + question.substring(0, Math.min(100, question.length())));

            return response;

        } catch (AiClientException e) {
            audit(bidId, currentUser, officer ? "GOVERNMENT OFFICER" : "USER",
                    "AI_ASSISTANT_CHAT_FAILED", "Bid", "WARNING", e.getMessage());
            throw e;
        } catch (RuntimeException e) {
            audit(bidId, currentUser, officer ? "GOVERNMENT OFFICER" : "USER",
                    "AI_ASSISTANT_CHAT_FAILED", "Bid", "WARNING", e.getMessage());
            throw e;
        }
    }

    /**
     * Builds the full context for the bidder assistant.
     */
    private Map<String, Object> buildContext(String bidId, Bid bid, List<BidderDocument> documents) {
        Map<String, Object> context = new HashMap<>();

        // Tender context
        Map<String, Object> tenderContext = new HashMap<>();
        tenderContext.put("tenderId", bid.getTenderId());
        tenderContext.put("tenderTitle", bid.getTenderTitle());
        tenderContext.put("category", bid.getCategory());
        context.put("tender", tenderContext);

        // Bid context
        Map<String, Object> bidContext = new HashMap<>();
        bidContext.put("bidId", bid.getBidId());
        bidContext.put("bidderName", bid.getBidderName());
        bidContext.put("status", bid.getStatus());
        bidContext.put("compliancePercentage", bid.getCompliancePercentage());
        context.put("bid", bidContext);

        // Requirements
        List<Requirement> requirements = requirementRepository.findByBidId(bidId);
        List<Map<String, Object>> reqList = requirements.stream().map(this::requirementToMap).collect(Collectors.toList());
        context.put("requirements", reqList);

        // Bidder facts
        List<BidderFact> facts = factRepository.findByBidId(bidId);
        List<Map<String, Object>> factList = facts.stream().map(this::factToMap).collect(Collectors.toList());
        context.put("bidder_facts", factList);

        // Compliance results
        List<ComplianceResult> compliance = complianceRepository.findByBidId(bidId);
        List<Map<String, Object>> compList = compliance.stream().map(this::complianceToMap).collect(Collectors.toList());
        context.put("compliance", compList);

        // Preliminary verification
        List<PreliminaryVerificationCheck> preliminary = preliminaryVerificationRepository.findByBidId(bidId);
        List<Map<String, Object>> prelimList = preliminary.stream().map(this::preliminaryToMap).collect(Collectors.toList());
        context.put("preliminary_verification", prelimList);

        // Evidence
        List<EvidenceDetail> evidence = evidenceRepository.findAll().stream()
                .filter(e -> e.getRequirementId() != null && e.getRequirementId().startsWith(bidId + ":"))
                .collect(Collectors.toList());
        List<Map<String, Object>> evList = evidence.stream().map(this::evidenceToMap).collect(Collectors.toList());
        context.put("evidence", evList);

        // Risk/conflicts
        List<RiskCategorySummary> risks = riskRepository.findByBidId(bidId);
        List<ConflictItem> conflicts = conflictRepository.findByBidId(bidId);
        List<Map<String, Object>> riskConflictList = new ArrayList<>();
        riskConflictList.addAll(risks.stream().map(this::riskToMap).collect(Collectors.toList()));
        riskConflictList.addAll(conflicts.stream().map(this::conflictToMap).collect(Collectors.toList()));
        context.put("risk_conflicts", riskConflictList);

        return context;
    }

    private Map<String, Object> requirementToMap(Requirement r) {
        Map<String, Object> map = new HashMap<>();
        map.put("requirement_id", r.getRequirementId());
        map.put("id", r.getId());
        map.put("category", r.getCategory());
        map.put("description", r.getRequirement());
        map.put("required_value", r.getRequiredValue());
        map.put("unit", r.getUnit());
        map.put("period", r.getPeriod());
        map.put("mandatory", r.getMandatory());
        map.put("ambiguous", r.getAmbiguous());
        map.put("source_document", r.getSourceDoc());
        map.put("page_number", r.getPageNumber());
        map.put("source_text", r.getSourceText());
        map.put("status", r.getStatus());
        map.put("risk", r.getRisk());
        map.put("confidence", r.getConfidence());
        map.put("detected_value", r.getDetectedValue());
        return map;
    }

    private Map<String, Object> factToMap(BidderFact f) {
        Map<String, Object> map = new HashMap<>();
        map.put("fact_id", f.getFactId());
        map.put("category", f.getCategory());
        map.put("field", f.getFieldName());
        map.put("detected_value", f.getDetectedValue());
        map.put("unit", f.getUnit());
        map.put("period", f.getPeriod());
        map.put("confidence", f.getConfidence());
        map.put("ambiguous", f.getAmbiguous());
        map.put("source_document", f.getSourceDocument());
        map.put("page_number", f.getPageNumber());
        map.put("section_name", f.getSectionName());
        map.put("source_text", f.getSourceText());
        return map;
    }

    private Map<String, Object> complianceToMap(ComplianceResult c) {
        Map<String, Object> map = new HashMap<>();
        map.put("requirement_id", c.getRequirementId());
        map.put("status", c.getStatus());
        map.put("required_value", c.getRequiredValue());
        map.put("required_unit", c.getRequiredUnit());
        map.put("required_period", c.getRequiredPeriod());
        map.put("detected_value", c.getDetectedValue());
        map.put("detected_unit", c.getDetectedUnit());
        map.put("fact_ids", c.getFactIds());
        map.put("reason", c.getReason());
        map.put("confidence", c.getConfidence());
        map.put("mandatory", c.getMandatory());
        map.put("requires_manual_review", c.getRequiresManualReview());
        map.put("rule_used", c.getRuleUsed());
        return map;
    }

    private Map<String, Object> preliminaryToMap(PreliminaryVerificationCheck p) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", p.getId());
        map.put("check_type", p.getCheckType().name());
        map.put("status", p.getStatus().name());
        map.put("message", p.getMessage());
        map.put("field_name", p.getFieldName());
        map.put("expected_value", p.getExpectedValue());
        map.put("actual_value", p.getActualValue());
        map.put("source_page", p.getSourcePage());
        map.put("evidence_reference", p.getEvidenceReference());
        map.put("created_at", p.getCreatedAt());
        return map;
    }

    private Map<String, Object> evidenceToMap(EvidenceDetail e) {
        Map<String, Object> map = new HashMap<>();
        map.put("requirement_id", e.getRequirementId());
        map.put("requirement_title", e.getRequirementTitle());
        map.put("source_document", e.getSourceDocument());
        map.put("page_number", e.getPageNumber());
        map.put("section_name", e.getSectionName());
        map.put("extracted_snippet", e.getExtractedSnippet());
        map.put("required_value", e.getRequiredValue());
        map.put("detected_value", e.getDetectedValue());
        map.put("decision", e.getDecision());
        map.put("reason", e.getReason());
        map.put("confidence", e.getConfidence());
        map.put("verification_source", e.getVerificationSource());
        return map;
    }

    private Map<String, Object> riskToMap(RiskCategorySummary r) {
        Map<String, Object> map = new HashMap<>();
        map.put("risk_id", r.getRiskId());
        map.put("risk_type", r.getCategory());
        map.put("severity", r.getRiskLevel());
        map.put("score", r.getScore());
        map.put("requirement_id", r.getRequirementId());
        map.put("conflict_id", r.getConflictId());
        map.put("reason", r.getSummary());
        map.put("recommended_action", r.getRecommendedAction());
        map.put("requires_manual_review", r.getRequiresManualReview());
        return map;
    }

    private Map<String, Object> conflictToMap(ConflictItem c) {
        Map<String, Object> map = new HashMap<>();
        map.put("conflict_id", c.getConflictId());
        map.put("conflict_type", c.getConflictType());
        map.put("requirement_id", c.getRequirementId());
        map.put("severity", c.getRiskLevel());
        map.put("reason", c.getExplanation());
        map.put("requires_manual_review", c.getRequiresManualReview());
        return map;
    }

    private void authorize(String user, boolean officer, Bid bid, List<BidderDocument> documents) {
        if (officer) return;

        // Ownership signal 1: the requester uploaded at least one document for this bid.
        if (documents.stream().anyMatch(d -> user.equalsIgnoreCase(d.getUploadedBy()))) return;

        // Ownership signal 2: authenticated profile matches the bid's bidder identity.
        User currentUser = userRepository.findByEmail(user)
                .or(() -> userRepository.findByEmail(user.toLowerCase(Locale.ROOT)))
                .orElse(null);
        if (currentUser != null) {
            String org = currentUser.getDepartment() != null && !currentUser.getDepartment().isBlank()
                    ? currentUser.getDepartment() : currentUser.getOrganization();
            if (org != null && bid.getBidderName() != null && org.equalsIgnoreCase(bid.getBidderName())) return;
            if (currentUser.getGstin() != null && !currentUser.getGstin().isBlank()
                    && currentUser.getGstin().equalsIgnoreCase(bid.getGstin())) return;
            if (currentUser.getRegistrationNo() != null && !currentUser.getRegistrationNo().isBlank()
                    && currentUser.getRegistrationNo().equalsIgnoreCase(bid.getRegistrationNo())) return;
        }

        throw new org.springframework.security.access.AccessDeniedException("You cannot access another bidder's submission.");
    }

    private void audit(String bidId, String actor, String role, String action, String entity, String status, String details) {
        auditRepository.save(AuditEvent.builder()
                .bidId(bidId)
                .actor(actor)
                .userRole(role)
                .action(action)
                .entity(entity)
                .status(status)
                .details(details)
                .timestamp(java.time.LocalDateTime.now())
                .build());
    }
}