package com.sih.gem.dto;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Phase 5A — External Government Verification DTOs.
 * Results carry explicit statuses; UNAVAILABLE never maps to a success state.
 */
public final class GovernmentVerificationDtos {

    private GovernmentVerificationDtos() {}

    /** Optional request body: { "providers": ["GST","PAN"] }. Absent/empty = all providers. */
    public record VerificationProviderRequest(List<String> providers) {}

    public record VerificationResultDto(
            String provider,
            String displayName,
            String status,          // VERIFIED / NOT_VERIFIED / MISMATCH / UNAVAILABLE / SANDBOX / ERROR / PENDING
            String message,
            String referenceType,
            String referenceValue,  // masked only
            String verifiedName,
            String verifiedStatus,
            String verifiedDate,
            String mismatchReason,
            String source,
            LocalDateTime checkedAt,
            String evidenceReference
    ) {}

    public record GovernmentVerificationResponse(
            String bidId,
            String tenderId,
            LocalDateTime checkedAt,
            List<VerificationResultDto> results
    ) {}
}
