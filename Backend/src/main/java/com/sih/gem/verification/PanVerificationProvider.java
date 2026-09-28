package com.sih.gem.verification;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sih.gem.entity.Bid;
import org.springframework.stereotype.Component;

/**
 * PAN / Income Tax adapter. There is no direct Income Tax Department
 * integration; the PAN reference is derived from the GSTIN embedded on the
 * bid (GSTIN positions 3–12) and stored only in masked form (ABCDE****F).
 */
@Component
public class PanVerificationProvider extends AbstractHttpVerificationProvider {

    public PanVerificationProvider(VerificationProperties properties,
                                   VerificationHttpClient httpClient,
                                   ObjectMapper objectMapper) {
        super(VerificationProviderType.PAN, properties.provider("pan"),
                httpClient, objectMapper, "/pan/verify", "PAN");
    }

    @Override
    protected String resolveReference(Bid bid) {
        return panFromGstin(bid.getGstin());
    }

    @Override
    protected String maskReference(String raw) {
        // e.g. AABCT1234F → AABCT****F
        return maskMiddle(raw, 5, 1);
    }
}
