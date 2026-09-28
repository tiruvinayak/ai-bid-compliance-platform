package com.sih.gem.verification;

import com.sih.gem.entity.Bid;

/**
 * Phase 5A — Provider abstraction. One adapter per external registry
 * (GST, PAN, MCA, EPFO/ESIC, DigiLocker). Controllers and services never
 * contain provider-specific logic; they only call this interface.
 */
public interface GovernmentVerificationProvider {

    VerificationProviderType type();

    /**
     * Verifies the bid against this provider. Implementations must never
     * return VERIFIED/SANDBOX unless an actual configured endpoint produced
     * a matching response.
     */
    ProviderOutcome verify(Bid bid);
}
