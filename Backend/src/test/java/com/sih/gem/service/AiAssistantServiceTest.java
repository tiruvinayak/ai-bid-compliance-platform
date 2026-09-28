package com.sih.gem.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sih.gem.ai.AiClient;
import com.sih.gem.ai.AiClientException;
import com.sih.gem.config.GlobalExceptionHandler;
import com.sih.gem.controller.AiAssistantController;
import com.sih.gem.entity.AuditEvent;
import com.sih.gem.entity.Bid;
import com.sih.gem.entity.BidderDocument;
import com.sih.gem.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Bidder AI Assistant service tests (spec Phase 3 / AI ASSISTANT FINAL DEBUG):
 * valid grounded response, citation mapping passthrough, empty context building,
 * missing bid, unauthorized bidder isolation, officer bypass, FastAPI error
 * propagation, and blank question validation.
 */
class AiAssistantServiceTest {

    private static final String BID = "GEM-2026-001";
    private static final String OWNER = "user@demo.gov.in";

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final AiClient aiClient = mock(AiClient.class);
    private final BidRepository bids = mock(BidRepository.class);
    private final BidderDocumentRepository documents = mock(BidderDocumentRepository.class);
    private final RequirementRepository requirements = mock(RequirementRepository.class);
    private final BidderFactRepository facts = mock(BidderFactRepository.class);
    private final ComplianceResultRepository compliance = mock(ComplianceResultRepository.class);
    private final EvidenceDetailRepository evidence = mock(EvidenceDetailRepository.class);
    private final PreliminaryVerificationCheckRepository preliminary = mock(PreliminaryVerificationCheckRepository.class);
    private final RiskCategorySummaryRepository risks = mock(RiskCategorySummaryRepository.class);
    private final ConflictItemRepository conflicts = mock(ConflictItemRepository.class);
    private final AuditEventRepository audits = mock(AuditEventRepository.class);
    private final UserRepository users = mock(UserRepository.class);

    private final AiAssistantService service = new AiAssistantService(
            aiClient, objectMapper, bids, documents, requirements, facts,
            compliance, evidence, preliminary, risks, conflicts, audits, users);

    private Bid bid() {
        return Bid.builder()
                .bidId(BID)
                .tenderId("TND-GEM-2026-1042")
                .tenderTitle("Sector modernization")
                .category("IT")
                .bidderName("Acme Infra Ltd")
                .status("SUBMITTED")
                .compliancePercentage(87.5)
                .gstin("07AABCT1234F1Z5")
                .registrationNo("REG-ACME-01")
                .build();
    }

    private JsonNode aiJson(String json) throws Exception {
        return objectMapper.readTree(json);
    }

    private void stubOwner() {
        when(documents.findByBidIdOrderByUploadedAtDesc(BID))
                .thenReturn(List.of(BidderDocument.builder().uploadedBy(OWNER).build()));
    }

    @BeforeEach
    void setUp() {
        when(bids.findByBidId(BID)).thenReturn(Optional.of(bid()));
        when(bids.findByBidId("GEM-9999-999")).thenReturn(Optional.empty());
        when(documents.findByBidIdOrderByUploadedAtDesc(BID)).thenReturn(List.of());
        when(requirements.findByBidId(anyString())).thenReturn(List.of());
        when(facts.findByBidId(anyString())).thenReturn(List.of());
        when(compliance.findByBidId(anyString())).thenReturn(List.of());
        when(preliminary.findByBidId(anyString())).thenReturn(List.of());
        when(evidence.findAll()).thenReturn(List.of());
        when(risks.findByBidId(anyString())).thenReturn(List.of());
        when(conflicts.findByBidId(anyString())).thenReturn(List.of());
        when(users.findByEmail(anyString())).thenReturn(Optional.empty());
    }

    @Test
    void validGroundedResponsePassesThroughAndBuildsContext() throws Exception {
        stubOwner();
        when(aiClient.assistantChat(any())).thenReturn(aiJson(
                "{\"answer\":\"GST certificate is available.\","
                        + "\"citations\":[{\"type\":\"requirement\",\"id\":\"REQ-001\",\"page\":1}],"
                        + "\"grounding_status\":\"GROUNDED\",\"error_message\":null}"));

        JsonNode out = service.chat(BID, "Is my GST certificate available?",
                List.of(), OWNER, false);

        assertEquals("GROUNDED", out.get("grounding_status").asText());
        assertEquals(1, out.get("citations").size());
        assertEquals("REQ-001", out.get("citations").get(0).get("id").asText());

        @SuppressWarnings("unchecked")
        ArgumentCaptor<Map<String, Object>> captor = ArgumentCaptor.forClass(Map.class);
        verify(aiClient).assistantChat(captor.capture());
        Map<String, Object> request = captor.getValue();
        assertEquals("Is my GST certificate available?", request.get("question"));
        assertNotNull(request.get("chat_history"));
        @SuppressWarnings("unchecked")
        Map<String, Object> context = (Map<String, Object>) request.get("context");
        assertTrue(context.containsKey("requirements"));
        assertTrue(context.containsKey("bidder_facts"));
        assertTrue(context.containsKey("compliance"));
        assertTrue(context.containsKey("risk_conflicts"));
        verify(audits).save(any(AuditEvent.class));
    }

    @Test
    void citationMappingKeepsTypeAndAuthoritativePage() throws Exception {
        stubOwner();
        when(aiClient.assistantChat(any())).thenReturn(aiJson(
                "{\"answer\":\"Turnover is 12.5 crore.\","
                        + "\"citations\":["
                        + "{\"type\":\"requirement\",\"id\":\"REQ-003\",\"page\":3},"
                        + "{\"type\":\"fact\",\"id\":\"FACT-ABC-001\",\"page\":null}],"
                        + "\"grounding_status\":\"GROUNDED\",\"error_message\":null}"));

        JsonNode out = service.chat(BID, "What is my turnover?", List.of(), OWNER, false);

        assertEquals(2, out.get("citations").size());
        assertEquals("requirement", out.get("citations").get(0).get("type").asText());
        assertEquals(3, out.get("citations").get(0).get("page").asInt());
        assertTrue(out.get("citations").get(1).get("page").isNull());
    }

    @Test
    void unauthorizedBidderIsRejected() {
        when(users.findByEmail("intruder@evil.com")).thenReturn(Optional.empty());

        AccessDeniedException ex = assertThrows(AccessDeniedException.class,
                () -> service.chat(BID, "What is my GSTIN?", List.of(), "intruder@evil.com", false));

        assertTrue(ex.getMessage().contains("another bidder"));
        verify(aiClient, never()).assistantChat(any());
    }

    @Test
    void missingBidThrowsNotFound() {
        org.springframework.web.server.ResponseStatusException ex =
                assertThrows(org.springframework.web.server.ResponseStatusException.class,
                        () -> service.chat("GEM-9999-999", "hello", List.of(), OWNER, false));

        assertEquals(org.springframework.http.HttpStatus.NOT_FOUND, ex.getStatusCode());
        assertTrue(ex.getReason() != null && ex.getReason().contains("Bid not found"));
        verify(aiClient, never()).assistantChat(any());
    }

    @Test
    void missingBidReturns404WithCleanJsonAndNoAiCall() throws Exception {
        AiAssistantController controller = new AiAssistantController(service, objectMapper);
        MockMvc mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();

        var result = mockMvc.perform(post("/api/bids/{bidId}/assistant/chat", "GEM-9999-999")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"question\":\"hello\",\"chat_history\":[]}")
                        .principal(new TestingAuthenticationToken(OWNER, "n/a",
                                List.of(new SimpleGrantedAuthority("ROLE_USER")))))
                .andExpect(status().isNotFound())
                .andReturn();

        String body = result.getResponse().getContentAsString();
        assertTrue(body.contains("Bid not found"), "clean message expected, got: " + body);
        assertFalse(body.contains("Exception"), "no exception class must leak, got: " + body);
        assertFalse(body.contains("at com.sih"), "no stack frames must leak, got: " + body);
        assertFalse(body.contains("error_code"), "must not use the 500 error envelope, got: " + body);
        verify(aiClient, never()).assistantChat(any());
        verify(audits, never()).save(any(AuditEvent.class));
    }

    @Test
    void emptyContextIsSentAsEmptyLists() throws Exception {
        stubOwner();
        when(aiClient.assistantChat(any())).thenReturn(aiJson(
                "{\"answer\":\"No data.\",\"citations\":[],"
                        + "\"grounding_status\":\"INSUFFICIENT_EVIDENCE\",\"error_message\":null}"));

        JsonNode out = service.chat(BID, "What is my compliance status?",
                List.of(), OWNER, false);

        assertEquals("INSUFFICIENT_EVIDENCE", out.get("grounding_status").asText());

        @SuppressWarnings("unchecked")
        ArgumentCaptor<Map<String, Object>> captor = ArgumentCaptor.forClass(Map.class);
        verify(aiClient).assistantChat(captor.capture());
        @SuppressWarnings("unchecked")
        Map<String, Object> context = (Map<String, Object>) captor.getValue().get("context");
        assertTrue(((List<?>) context.get("requirements")).isEmpty());
        assertTrue(((List<?>) context.get("bidder_facts")).isEmpty());
        assertTrue(((List<?>) context.get("compliance")).isEmpty());
        assertTrue(((List<?>) context.get("risk_conflicts")).isEmpty());
    }

    @Test
    void fastApiErrorPropagatesAndIsAudited() {
        stubOwner();
        when(aiClient.assistantChat(any()))
                .thenThrow(new AiClientException("AI_SERVICE_ERROR", "FastAPI call failed"));

        AiClientException ex = assertThrows(AiClientException.class,
                () -> service.chat(BID, "hello", List.of(), OWNER, false));

        assertEquals("AI_SERVICE_ERROR", ex.getCode());
        verify(audits).save(any(AuditEvent.class));
    }

    @Test
    void officerBypassesBidderOwnershipCheck() throws Exception {
        when(aiClient.assistantChat(any())).thenReturn(aiJson(
                "{\"answer\":\"Officer view.\",\"citations\":[],"
                        + "\"grounding_status\":\"GROUNDED\",\"error_message\":null}"));

        JsonNode out = service.chat(BID, "Show bidder status", List.of(),
                "officer@demo.gov.in", true);

        assertEquals("GROUNDED", out.get("grounding_status").asText());
        verify(aiClient).assistantChat(any());
    }
}
