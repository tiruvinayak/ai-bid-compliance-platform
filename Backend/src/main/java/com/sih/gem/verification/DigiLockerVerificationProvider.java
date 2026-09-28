package com.sih.gem.verification;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sih.gem.entity.Bid;
import org.springframework.stereotype.Component;

/**
 * DigiLocker integration adapter. Bid documents are NOT assumed to come from
 * DigiLocker; without approved OAuth/API credentials this provider always
 * reports UNAVAILABLE. No share/reference token exists on bids, so even a
 * configured endpoint would require an explicit DigiLocker share reference.
 */
@Component
public class DigiLockerVerificationProvider extends AbstractHttpVerificationProvider {

    public DigiLockerVerificationProvider(VerificationProperties properties,
                                          VerificationHttpClient httpClient,
                                          ObjectMapper objectMapper) {
        super(VerificationProviderType.DIGILOCKER, properties.provider("digilocker"),
                httpClient, objectMapper, "/digilocker/verify", "DigiLocker Share Reference");
    }

    @Override
    protected String resolveReference(Bid bid) {
        // No DigiLocker share token is stored on bids — never invented.
        return null;
    }

    @Override
    protected String maskReference(String raw) {
        return raw == null ? null : maskMiddle(raw, 2, 2);
    }
}
