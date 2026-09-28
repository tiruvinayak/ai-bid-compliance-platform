package com.sih.gem.verification;

/**
 * Phase 5A — External government verification provider types.
 * Each type maps to one adapter implementing {@link GovernmentVerificationProvider}.
 */
public enum VerificationProviderType {

    GST("GST", "GST Registration Verification"),
    PAN("PAN", "PAN / Income Tax Verification"),
    MCA("MCA", "MCA Company Registration Verification"),
    EPFO_ESIC("EPFO_ESIC", "EPFO / ESIC Employer Verification"),
    DIGILOCKER("DIGILOCKER", "DigiLocker Integration");

    private final String code;
    private final String displayName;

    VerificationProviderType(String code, String displayName) {
        this.code = code;
        this.displayName = displayName;
    }

    public String getCode() {
        return code;
    }

    public String getDisplayName() {
        return displayName;
    }
}
