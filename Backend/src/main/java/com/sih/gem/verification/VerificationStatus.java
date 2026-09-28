package com.sih.gem.verification;

/**
 * Phase 5A — Explicit verification statuses.
 * UNAVAILABLE and SANDBOX are deliberately distinct from any success status:
 * a provider that was never contacted can never be reported as VERIFIED.
 */
public enum VerificationStatus {

    /** A configured provider responded and the record matched. */
    VERIFIED,
    /** A configured provider responded and the record is not active/valid, or no reference exists. */
    NOT_VERIFIED,
    /** A configured provider responded but the returned identity does not match the bid. */
    MISMATCH,
    /** No credentials / API access configured for this provider. */
    UNAVAILABLE,
    /** Provider responded, but the endpoint is a non-production sandbox — not live government verification. */
    SANDBOX,
    /** Provider is configured but the call or response handling failed. */
    ERROR,
    /** Request accepted, result not yet produced (or never run). */
    PENDING
}
