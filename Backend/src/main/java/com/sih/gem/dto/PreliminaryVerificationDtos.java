package com.sih.gem.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.sih.gem.entity.PreliminaryVerificationCheck;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

public class PreliminaryVerificationDtos {

    public record PreliminaryVerificationResponse(
            @JsonProperty("overallStatus") String overallStatus,
            @JsonProperty("summary") Map<String, Object> summary,
            @JsonProperty("checks") List<PreliminaryVerificationCheckDto> checks
    ) {}

    public record PreliminaryVerificationCheckDto(
            @JsonProperty("id") Long id,
            @JsonProperty("bidId") String bidId,
            @JsonProperty("documentId") String documentId,
            @JsonProperty("checkType") String checkType,
            @JsonProperty("status") String status,
            @JsonProperty("message") String message,
            @JsonProperty("fieldName") String fieldName,
            @JsonProperty("expectedValue") String expectedValue,
            @JsonProperty("actualValue") String actualValue,
            @JsonProperty("sourcePage") Integer sourcePage,
            @JsonProperty("evidenceReference") String evidenceReference,
            @JsonProperty("createdAt") LocalDateTime createdAt
    ) {}
}