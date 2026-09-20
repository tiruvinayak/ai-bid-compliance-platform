package com.sih.gem.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sih.gem.entity.Bid;
import com.sih.gem.entity.BidderDocument;
import com.sih.gem.repository.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class AiServiceTest {
    private final ObjectMapper mapper = new ObjectMapper();
    private final AiClient client = mock(AiClient.class);
    private final BidRepository bids = mock(BidRepository.class);
    private final BidderDocumentRepository documents = mock(BidderDocumentRepository.class);
    private final RequirementRepository requirements = mock(RequirementRepository.class);
    private final EvidenceDetailRepository evidence = mock(EvidenceDetailRepository.class);
    private final BidderFactRepository facts = mock(BidderFactRepository.class);
    private final ComplianceResultRepository compliance = mock(ComplianceResultRepository.class);
    private final RiskCategorySummaryRepository risks = mock(RiskCategorySummaryRepository.class);
    private final ConflictItemRepository conflicts = mock(ConflictItemRepository.class);
    private final AuditEventRepository audits = mock(AuditEventRepository.class);
    private final AiService service = new AiService(client, mapper, bids, documents, requirements, evidence, facts,
            compliance, risks, conflicts, audits);

    @Test
    void processSubmissionPersistsTraceableAiResults(@TempDir Path tempDir) throws Exception {
        Path tender = Files.writeString(tempDir.resolve("tender.txt"), "tender");
        Path bidder = Files.writeString(tempDir.resolve("bidder.txt"), "bidder");
        Bid bid = Bid.builder().bidId("SUB-001").build();
        when(bids.findByBidId("SUB-001")).thenReturn(Optional.of(bid));
        when(documents.findByBidIdOrderByUploadedAtDesc("SUB-001")).thenReturn(List.of(
                document(1L, "Tender RFP Specification", tender, "user@example.gov.in"),
                document(2L, "Bidder Certificate", bidder, "user@example.gov.in")));
        when(evidence.findAll()).thenReturn(List.of());
        JsonNode aiResponse = mapper.readTree("""
                {"success":true,"submission_id":"SUB-001",
                 "requirements":[{"requirement_id":"REQ-1","category":"Legal","description":"GST","required_value":"valid","unit":"id","period":"current","mandatory":true,"source_document":"tender.txt","page_number":1,"source_text":"GST required","status":"REVIEW"}],
                  "bidder_facts":[{"fact_id":"FACT-1","category":"Legal","field":"GST","detected_value":"27ABCDE","unit":"id","period":"current","confidence":0.92,"source_document":"bidder.txt","page_number":2,"section_name":"Tax","source_text":"GST 27ABCDE"}],
                  "compliance":[{"requirement_id":"REQ-1","status":"REVIEW","required_value":"valid","detected_value":"27ABCDE","fact_ids":["FACT-1"],"reason":"Manual verification","confidence":0.80,"mandatory":true,"requires_manual_review":true,"rule_used":"GST_RULE","evidence":[{"fact_id":"FACT-1","source_document":"bidder.txt","page_number":2,"section_name":"Tax","source_text":"GST 27ABCDE"}]}],
                 "risk":{"overall_risk_score":40,"overall_risk_level":"MEDIUM","review_priority":"HIGH","manual_review_required":true,"items":[{"risk_id":"R-1","risk_type":"Legal","severity":"MEDIUM","score_contribution":40,"requirement_id":"REQ-1","fact_ids":["FACT-1"],"reason":"Verify GST","recommended_action":"Review","requires_manual_review":true}]},
                 "conflicts":[{"conflict_id":"C-1","conflict_type":"Data Inconsistency","documents":["bidder.txt"],"facts":["FACT-1"],"reason":"Check source","severity":"MEDIUM","requires_manual_review":true}],"overall_status":"REVIEW"}
                """);
        when(client.processSubmission(eq("SUB-001"), eq(tender), eq(List.of(bidder)))).thenReturn(aiResponse);

        assertSame(aiResponse, service.processSubmission("SUB-001", "user@example.gov.in", false));
        verify(requirements).save(argThat(r -> "REQ-1".equals(r.getRequirementId()) && "GST required".equals(r.getSourceText())));
        verify(facts).save(argThat(f -> "FACT-1".equals(f.getFactId()) && "Tax".equals(f.getSectionName())
                && f.getConfidence() != null && Math.abs(f.getConfidence() - 0.92D) < 0.0001D));
        verify(compliance).save(argThat(c -> c.getFactIds().contains("FACT-1") && c.getRequiresManualReview()
                && c.getConfidence() != null && Math.abs(c.getConfidence() - 0.80D) < 0.0001D));
        verify(evidence).save(argThat(e -> "FACT-1".equals(e.getFactId()) && "Tax".equals(e.getSectionName())));
        verify(risks).save(argThat(r -> "R-1".equals(r.getRiskId()) && r.getRequiresManualReview()));
        verify(conflicts).save(argThat(c -> "C-1".equals(c.getConflictId()) && "MANUAL VERIFICATION REQUIRED".equals(c.getStatus())));
        assertEquals(40, bid.getOverallRiskScore());
        assertEquals("REVIEW_REQUIRED", bid.getStatus());
    }

    @Test
    void rejectsBidderWithoutAnUploadedDocument() {
        when(bids.findByBidId("SUB-001")).thenReturn(Optional.of(Bid.builder().bidId("SUB-001").build()));
        when(documents.findByBidIdOrderByUploadedAtDesc("SUB-001")).thenReturn(List.of());
        assertThrows(org.springframework.security.access.AccessDeniedException.class,
                () -> service.processSubmission("SUB-001", "other@example.gov.in", false));
        verifyNoInteractions(client);
    }

    @Test
    void marksSubmissionFailedWhenAiServiceIsUnavailable(@TempDir Path tempDir) throws Exception {
        Path tender = Files.writeString(tempDir.resolve("tender.txt"), "tender");
        Path bidder = Files.writeString(tempDir.resolve("bidder.txt"), "bidder");
        Bid bid = Bid.builder().bidId("SUB-001").build();
        when(bids.findByBidId("SUB-001")).thenReturn(Optional.of(bid));
        when(documents.findByBidIdOrderByUploadedAtDesc("SUB-001")).thenReturn(List.of(
                document(1L, "Tender", tender, "user@example.gov.in"), document(2L, "Bidder", bidder, "user@example.gov.in")));
        when(client.processSubmission(anyString(), any(), anyList())).thenThrow(new AiClientException("AI_SERVICE_UNAVAILABLE", "AI processing service is currently unavailable."));
        assertThrows(AiClientException.class, () -> service.processSubmission("SUB-001", "user@example.gov.in", false));
        assertEquals("FAILED", bid.getStatus());
    }

    @Test
    void forwardsHealthAndGroundedGovernmentResponses() throws Exception {
        JsonNode health = mapper.readTree("{\"status\":\"UP\"}");
        JsonNode grounded = mapper.readTree("{\"answer\":\"Use GST certificate\",\"status\":\"GROUNDED\",\"grounding_status\":\"GROUNDED\",\"confidence\":0.9,\"retrieval_count\":1,\"sources\":[]}");
        when(client.health()).thenReturn(health);
        when(client.askGovernment(any())).thenReturn(grounded);
        assertSame(health, service.health());
        assertSame(grounded, service.askGovernment(mapper.readTree("{\"question\":\"requirements?\"}")));
    }

    @Test
    void rejectsInvalidAiResponse(@TempDir Path tempDir) throws Exception {
        Path tender = Files.writeString(tempDir.resolve("tender.txt"), "tender");
        Path bidder = Files.writeString(tempDir.resolve("bidder.txt"), "bidder");
        Bid bid = Bid.builder().bidId("SUB-001").build();
        when(bids.findByBidId("SUB-001")).thenReturn(Optional.of(bid));
        when(documents.findByBidIdOrderByUploadedAtDesc("SUB-001")).thenReturn(List.of(document(1L, "Tender", tender, "u"), document(2L, "Bidder", bidder, "u")));
        when(client.processSubmission(anyString(), any(), anyList())).thenReturn(mapper.readTree("{\"success\":true}"));
        AiClientException ex = assertThrows(AiClientException.class, () -> service.processSubmission("SUB-001", "u", false));
        assertEquals("AI_INVALID_RESPONSE", ex.getCode());
    }

    private BidderDocument document(Long id, String type, Path path, String uploadedBy) {
        return BidderDocument.builder().id(id).filename(path.getFileName().toString()).docType(type)
                .storedPath(path.toString()).uploadedBy(uploadedBy).build();
    }
}
