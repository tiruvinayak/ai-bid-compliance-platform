package com.sih.gem.verification;

/**
 * Phase 5A — Internal outcome returned by a provider adapter before it is
 * converted to a response DTO / persisted. referenceValue is always masked.
 */
public record ProviderOutcome(
        VerificationStatus status,
        String message,
        String referenceType,
        String referenceValue,   // masked only — never a raw government identifier
        String verifiedName,
        String verifiedStatus,
        String verifiedDate,
        String mismatchReason,
        String source,
        String evidenceReference
) {

    public static ProviderOutcome unavailable(String referenceType, String maskedReference, String message) {
        return new ProviderOutcome(VerificationStatus.UNAVAILABLE, message, referenceType, maskedReference,
                null, null, null, null, "Not configured", null);
    }

    public static ProviderOutcome notVerified(String referenceType, String maskedReference, String message,
                                              String source) {
        return new ProviderOutcome(VerificationStatus.NOT_VERIFIED, message, referenceType, maskedReference,
                null, null, null, null, source, null);
    }

    public static ProviderOutcome error(String referenceType, String maskedReference, String message) {
        return new ProviderOutcome(VerificationStatus.ERROR, message, referenceType, maskedReference,
                null, null, null, null, "Configured provider endpoint", null);
    }
}
