package com.sih.gem.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import java.nio.file.Path;
import java.util.List;

@Component
public class AiClient {
    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    public AiClient(RestClient aiRestClient) {
        this(aiRestClient, new ObjectMapper());
    }

    @Autowired
    public AiClient(RestClient aiRestClient, ObjectMapper objectMapper) {
        this.restClient = aiRestClient;
        this.objectMapper = objectMapper;
    }

    public JsonNode health() {
        return get("/api/ai/health");
    }

    public JsonNode processSubmission(String submissionId, Path tenderFile, List<Path> bidderFiles) {
        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("submissionId", submissionId);
        body.add("tenderFile", new FileSystemResource(tenderFile));
        bidderFiles.forEach(file -> body.add("bidderFiles", new FileSystemResource(file)));
        return postMultipart("/api/ai/process-submission", body);
    }

    public JsonNode askGovernment(JsonNode request) {
        return postJson("/api/ai/government/ask", request);
    }

    public JsonNode assistantChat(java.util.Map<String, Object> request) {
        return postJson("/api/ai/bidder-assistant/chat", objectMapper.valueToTree(request));
    }

    private JsonNode get(String path) {
        try {
            JsonNode response = restClient.get().uri(path).retrieve().body(JsonNode.class);
            return requireResponse(response);
        } catch (ResourceAccessException ex) {
            throw unavailable(ex);
        } catch (RestClientResponseException ex) {
            throw upstream(ex);
        } catch (RestClientException ex) {
            throw new AiClientException("AI_INVALID_RESPONSE", "AI service returned an invalid response.", ex);
        }
    }

    private JsonNode postMultipart(String path, MultiValueMap<String, Object> body) {
        try {
            JsonNode response = restClient.post().uri(path).contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(body).retrieve().body(JsonNode.class);
            return requireResponse(response);
        } catch (ResourceAccessException ex) {
            throw unavailable(ex);
        } catch (RestClientResponseException ex) {
            throw upstream(ex);
        } catch (RestClientException ex) {
            throw new AiClientException("AI_INVALID_RESPONSE", "AI service returned an invalid response.", ex);
        }
    }

    private JsonNode postJson(String path, JsonNode body) {
        try {
            JsonNode response = restClient.post().uri(path)
                    .contentType(MediaType.APPLICATION_JSON)
                    .accept(MediaType.APPLICATION_JSON)
                    .body(body != null ? body : new com.fasterxml.jackson.databind.ObjectMapper().createObjectNode())
                    .retrieve()
                    .body(JsonNode.class);
            return requireResponse(response);
        } catch (ResourceAccessException ex) {
            throw unavailable(ex);
        } catch (RestClientResponseException ex) {
            throw upstream(ex);
        } catch (RestClientException ex) {
            throw new AiClientException("AI_INVALID_RESPONSE", "AI service returned an invalid response.", ex);
        }
    }

    private JsonNode requireResponse(JsonNode response) {
        if (response == null || !response.isObject()) {
            throw new AiClientException("AI_INVALID_RESPONSE", "AI service returned an invalid response.");
        }
        return response;
    }

    private AiClientException unavailable(ResourceAccessException ex) {
        String message = ex.getCause() instanceof java.net.http.HttpTimeoutException
                ? "AI processing service timed out." : "AI processing service is currently unavailable.";
        return new AiClientException(ex.getCause() instanceof java.net.http.HttpTimeoutException
                ? "AI_SERVICE_TIMEOUT" : "AI_SERVICE_UNAVAILABLE", message, ex);
    }

    private AiClientException upstream(RestClientResponseException ex) {
        int status = ex.getStatusCode().value();
        JsonNode body = null;
        try {
            String raw = ex.getResponseBodyAsString();
            if (raw != null && !raw.isBlank()) body = objectMapper.readTree(raw);
        } catch (Exception ignored) {
            // The HTTP status remains useful even when the upstream body is malformed.
        }

        String upstreamCode = text(body, "error_code", "error");
        String message = text(body, "message", "error_message");
        if (message == null || message.isBlank()) message = "AI service returned HTTP " + status + ".";
        String code = switch (status) {
            case 400, 422 -> "AI_UPSTREAM_VALIDATION";
            case 408, 504 -> "AI_SERVICE_TIMEOUT";
            case 429 -> "AI_SERVICE_RATE_LIMITED";
            default -> status >= 500 ? "AI_SERVICE_ERROR" : "AI_UPSTREAM_ERROR";
        };
        JsonNode details = body == null ? null : body.path("details");
        return new AiClientException(code, message, ex, status, upstreamCode,
                details != null && !details.isMissingNode() ? details : null);
    }

    private String text(JsonNode node, String... names) {
        if (node == null) return null;
        for (String name : names) if (node.hasNonNull(name)) return node.get(name).asText();
        return null;
    }
}
