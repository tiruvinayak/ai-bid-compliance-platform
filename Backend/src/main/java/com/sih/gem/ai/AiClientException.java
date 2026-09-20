package com.sih.gem.ai;

import com.fasterxml.jackson.databind.JsonNode;

public class AiClientException extends RuntimeException {
    private final String code;
    private final Integer upstreamStatus;
    private final String upstreamCode;
    private final JsonNode upstreamDetails;

    public AiClientException(String code, String message, Throwable cause) {
        this(code, message, cause, null, null, null);
    }

    public AiClientException(String code, String message, Throwable cause,
                             Integer upstreamStatus, String upstreamCode, JsonNode upstreamDetails) {
        super(message, cause);
        this.code = code;
        this.upstreamStatus = upstreamStatus;
        this.upstreamCode = upstreamCode;
        this.upstreamDetails = upstreamDetails;
    }

    public AiClientException(String code, String message) {
        this(code, message, null);
    }

    public String getCode() {
        return code;
    }

    public Integer getUpstreamStatus() {
        return upstreamStatus;
    }

    public String getUpstreamCode() {
        return upstreamCode;
    }

    public JsonNode getUpstreamDetails() {
        return upstreamDetails;
    }
}
