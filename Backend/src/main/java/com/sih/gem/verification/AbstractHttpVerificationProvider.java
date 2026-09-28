package com.sih.gem.verification;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sih.gem.entity.Bid;
import com.sih.gem.verification.VerificationProperties.ProviderCredentials;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.LocalDate;
import java.util.Locale;

/**
 * Phase 5A — Shared adapter flow for HTTP-capable provider integrations.
 *
 * Flow: resolve local reference → mask it → if not configured, return
 * UNAVAILABLE (never a success status) → otherwise call the configured
 * endpoint and map the real response (VERIFIED / SANDBOX / NOT_VERIFIED /
 * MISMATCH / ERROR). A VERIFIED or SANDBOX status is only ever produced
 * from an actual HTTP response of a configured provider.
 *
 * Expected provider response contract (JSON):
 *   { "status": "...", "name" | "legalName": "...", "verifiedDate": "...", "message": "..." }
 */
public abstract class AbstractHttpVerificationProvider implements GovernmentVerificationProvider {

    private static final String[] ACTIVE_TOKENS =
            {"active", "valid", "registered", "approved", "ok", "success", "compliant"};
    private static final String[] NEGATIVE_TOKENS =
            {"inactive", "invalid", "cancelled", "canceled", "suspended", "deactivated", "not found", "not_found", "mismatch"};

    private final VerificationProviderType type;
    private final ProviderCredentials config;
    private final VerificationHttpClient httpClient;
    private final ObjectMapper objectMapper;
    private final String endpointPath;
    private final String referenceType;

    protected AbstractHttpVerificationProvider(VerificationProviderType type,
                                               ProviderCredentials config,
                                               VerificationHttpClient httpClient,
                                               ObjectMapper objectMapper,
                                               String endpointPath,
                                               String referenceType) {
        this.type = type;
        this.config = config;
        this.httpClient = httpClient;
        this.objectMapper = objectMapper;
        this.endpointPath = endpointPath;
        this.referenceType = referenceType;
    }

    @Override
    public VerificationProviderType type() {
        return type;
    }

    @Override
    public ProviderOutcome verify(Bid bid) {
        String rawReference = resolveReference(bid);
        String maskedReference = rawReference != null ? maskReference(rawReference) : null;

        if (!config.isConfigured()) {
            return ProviderOutcome.unavailable(referenceType, maskedReference,
                    VerificationProperties.UNCONFIGURED_MESSAGE);
        }
        if (rawReference == null || rawReference.isBlank()) {
            return ProviderOutcome.notVerified(referenceType, null,
                    "No " + referenceType + " reference is available on this bid.",
                    "Configured provider endpoint");
        }

        String url = buildUrl(rawReference, bid);
        String body;
        try {
            body = httpClient.get(url, config.getApiKey());
        } catch (RuntimeException e) {
            return ProviderOutcome.error(referenceType, maskedReference, safeFailureMessage(e));
        }

        JsonNode payload;
        try {
            payload = objectMapper.readTree(body == null ? "" : body);
        } catch (Exception e) {
            return ProviderOutcome.error(referenceType, maskedReference,
                    "Provider returned a response that could not be parsed.");
        }
        if (payload == null || !payload.isObject()) {
            return ProviderOutcome.error(referenceType, maskedReference,
                    "Provider returned an unexpected response payload.");
        }
        return mapPayload(payload, bid, maskedReference);
    }

    private ProviderOutcome mapPayload(JsonNode payload, Bid bid, String maskedReference) {
        String rawStatus = firstText(payload, "status", "regStatus", "registrationStatus");
        String name = firstText(payload, "name", "legalName", "entityName");
        String verifiedDate = firstText(payload, "verifiedDate", "date");
        String providerMessage = firstText(payload, "message", "remarks");

        if (rawStatus == null || rawStatus.isBlank()) {
            return ProviderOutcome.error(referenceType, maskedReference,
                    "Provider response did not include a status field.");
        }

        String lower = rawStatus.toLowerCase(Locale.ROOT);
        VerificationStatus status;
        if (containsAny(lower, ACTIVE_TOKENS)) {
            status = config.isSandbox() ? VerificationStatus.SANDBOX : VerificationStatus.VERIFIED;
        } else if (containsAny(lower, NEGATIVE_TOKENS)) {
            status = VerificationStatus.NOT_VERIFIED;
        } else {
            // Unrecognised statuses are never mapped to a success state.
            return ProviderOutcome.error(referenceType, maskedReference,
                    "Provider returned an unrecognised status: " + rawStatus);
        }

        String mismatchReason = null;
        if ((status == VerificationStatus.VERIFIED || status == VerificationStatus.SANDBOX)
                && name != null && bid.getBidderName() != null
                && !name.equalsIgnoreCase(bid.getBidderName())) {
            status = VerificationStatus.MISMATCH;
            mismatchReason = "Provider name record: " + name
                    + "; bidder name on bid: " + bid.getBidderName();
        }

        String source = config.isSandbox()
                ? "Configured provider endpoint (SANDBOX — not production government verification)"
                : "Configured provider endpoint";
        String message = switch (status) {
            case VERIFIED -> "Provider returned an active registration matching the bidder name.";
            case SANDBOX -> "Sandbox provider returned an active registration match. Not a production government verification.";
            case NOT_VERIFIED -> providerMessage != null ? providerMessage
                    : "Provider returned a non-active registration status: " + rawStatus;
            case MISMATCH -> mismatchReason;
            default -> null;
        };

        return new ProviderOutcome(
                status,
                message,
                referenceType,
                maskedReference,
                (status == VerificationStatus.NOT_VERIFIED) ? null : name,
                rawStatus,
                verifiedDate,
                mismatchReason,
                source,
                null
        );
    }

    private String buildUrl(String rawReference, Bid bid) {
        return UriComponentsBuilder.fromUriString(config.getBaseUrl() + endpointPath)
                .queryParam("reference", rawReference)
                .queryParam("name", bid.getBidderName() != null ? bid.getBidderName() : "")
                .build()
                .encode()
                .toUriString();
    }

    /** Failure text must never embed the request URL (which carries the raw reference) or the API key. */
    private static String safeFailureMessage(RuntimeException e) {
        if (e instanceof org.springframework.web.client.RestClientResponseException rcre) {
            return "Provider request failed with HTTP " + rcre.getStatusCode().value() + ".";
        }
        return "Provider request failed (" + e.getClass().getSimpleName() + ").";
    }

    private static String firstText(JsonNode node, String... fields) {
        for (String f : fields) {
            JsonNode v = node.get(f);
            if (v != null && v.isTextual() && !v.asText().isBlank()) {
                return v.asText();
            }
        }
        return null;
    }

    private static boolean containsAny(String haystack, String[] needles) {
        for (String n : needles) {
            if (haystack.contains(n)) return true;
        }
        return false;
    }

    /** Extracts the local reference used for this provider from bid data (may be null). */
    protected abstract String resolveReference(Bid bid);

    /** Masks the raw reference for storage/display — the raw value is never persisted. */
    protected abstract String maskReference(String raw);

    /** Shared masking helper: keep first/last characters, star out the middle. */
    protected static String maskMiddle(String raw, int keepStart, int keepEnd) {
        if (raw == null) return null;
        if (raw.length() <= keepStart + keepEnd) {
            return "*".repeat(raw.length());
        }
        return raw.substring(0, keepStart)
                + "*".repeat(raw.length() - keepStart - keepEnd)
                + raw.substring(raw.length() - keepEnd);
    }

    /** Extracts the 10-character PAN embedded in a standard 15-character GSTIN, or null. */
    protected static String panFromGstin(String gstin) {
        if (gstin == null || gstin.length() != 15) return null;
        return gstin.substring(2, 12);
    }

    protected static String todayIso() {
        return LocalDate.now().toString();
    }
}
