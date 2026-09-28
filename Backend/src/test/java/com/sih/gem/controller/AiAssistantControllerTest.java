package com.sih.gem.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sih.gem.ai.AiClientException;
import com.sih.gem.controller.AiAssistantController.AssistantChatRequest;
import com.sih.gem.service.AiAssistantService;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Regression tests for the chat_history contract that previously caused HTTP 400
 * (Jackson String-vs-Array) from the second turn onward: the frontend sends full
 * AssistantMessage objects whose assistant entries contain a citations ARRAY and
 * timestamps, while the AI service only accepts {role, content} strings.
 */
class AiAssistantControllerTest {

    private final AiAssistantService service = mock(AiAssistantService.class);
    private final AiAssistantController controller =
            new AiAssistantController(service, new ObjectMapper());

    private TestingAuthenticationToken userAuth() {
        return new TestingAuthenticationToken("user@demo.gov.in", "n/a",
                List.of(new SimpleGrantedAuthority("ROLE_USER")));
    }

    private Map<String, Object> assistantEntryWithCitations() {
        Map<String, Object> entry = new HashMap<>();
        entry.put("role", "assistant");
        entry.put("content", "GST certificate is available.");
        entry.put("citations", List.of(Map.of("type", "requirement", "id", "REQ-001", "page", 1)));
        entry.put("timestamp", "2026-09-28T12:00:00");
        return entry;
    }

    @Test
    void normalizedChatHistoryStripsCitationsAndExtraFields() {
        List<Map<String, Object>> history = new ArrayList<>();
        history.add(assistantEntryWithCitations());
        history.add(Map.of("role", "user", "content", "Is my GSTIN available?"));

        AssistantChatRequest request = new AssistantChatRequest("Follow-up?", history);
        List<Map<String, String>> normalized = request.normalizedChatHistory();

        assertEquals(2, normalized.size());
        assertEquals("assistant", normalized.get(0).get("role"));
        assertEquals("GST certificate is available.", normalized.get(0).get("content"));
        assertFalse(normalized.get(0).containsKey("citations"));
        assertFalse(normalized.get(0).containsKey("timestamp"));
        assertEquals("user", normalized.get(1).get("role"));
        assertEquals("Is my GSTIN available?", normalized.get(1).get("content"));
    }

    @Test
    void normalizedChatHistoryDropsInvalidEntries() {
        Map<String, Object> nonStringContent = new HashMap<>();
        nonStringContent.put("role", "assistant");
        nonStringContent.put("content", List.of("nested", "array"));
        List<Map<String, Object>> history = new ArrayList<>();
        history.add(null);
        history.add(Map.of("role", "assistant"));                       // missing content
        history.add(Map.of("role", " ", "content", "x"));               // blank role
        history.add(Map.of("role", "user", "content", "   "));          // blank content
        history.add(nonStringContent);                                  // non-string content

        AssistantChatRequest request = new AssistantChatRequest("q", history);
        assertTrue(request.normalizedChatHistory().isEmpty());
    }

    @Test
    void nullHistoryDefaultsToEmptyList() {
        AssistantChatRequest request = new AssistantChatRequest("q", null);
        assertNotNull(request.chat_history());
        assertTrue(request.normalizedChatHistory().isEmpty());
    }

    @Test
    void chatPassesNormalizedHistoryToService() throws Exception {
        when(service.chat(anyString(), anyString(), any(), anyString(), anyBoolean()))
                .thenReturn(new ObjectMapper().createObjectNode());

        List<Map<String, Object>> history = new ArrayList<>();
        history.add(assistantEntryWithCitations());

        ResponseEntity<?> response = controller.chat("GEM-2026-001",
                new AssistantChatRequest("Follow-up?", history), userAuth());

        assertEquals(200, response.getStatusCode().value());
        @SuppressWarnings({"unchecked", "rawtypes"})
        org.mockito.ArgumentCaptor<List> captor = org.mockito.ArgumentCaptor.forClass(List.class);
        verify(service).chat(eq("GEM-2026-001"), eq("Follow-up?"), captor.capture(),
                eq("user@demo.gov.in"), eq(false));
        List<Map<String, String>> sent = captor.getValue();
        assertEquals(1, sent.size());
        assertEquals("assistant", sent.get(0).get("role"));
        assertFalse(sent.get(0).containsKey("citations"));
    }

    @Test
    void aiClientErrorMapsToBadRequest() {
        when(service.chat(anyString(), anyString(), any(), anyString(), anyBoolean()))
                .thenThrow(new AiClientException("AI_SERVICE_ERROR", "FastAPI call failed"));

        ResponseEntity<?> response = controller.chat("GEM-2026-001",
                new AssistantChatRequest("hello", List.of()), userAuth());

        assertEquals(400, response.getStatusCode().value());
        String body = response.getBody().toString();
        assertTrue(body.contains("AI_SERVICE_ERROR"));
        assertTrue(body.contains("FastAPI call failed"));
    }

    @Test
    void questionFieldIsNotBlankAnnotatedForBeanValidation() throws Exception {
        var field = AssistantChatRequest.class.getDeclaredField("question");
        assertNotNull(field.getAnnotation(jakarta.validation.constraints.NotBlank.class),
                "question must be @NotBlank so blank questions return HTTP 400");
    }

    @Test
    void accessDeniedIsRethrownForSecurityHandler() {
        when(service.chat(anyString(), anyString(), any(), anyString(), anyBoolean()))
                .thenThrow(new AccessDeniedException("You cannot access another bidder's submission."));

        AccessDeniedException ex = assertThrows(AccessDeniedException.class,
                () -> controller.chat("GEM-2026-001",
                        new AssistantChatRequest("hello", List.of()), userAuth()));

        assertTrue(ex.getMessage().contains("another bidder"));
    }
}
