package com.sih.gem.verification;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sih.gem.entity.Bid;
import org.springframework.stereotype.Component;

/**
 * MCA (Ministry of Corporate Affairs) company registration adapter.
 * Reference: registration number / CIN recorded on the bid, masked for storage.
 * No scraping of MCA records is performed.
 */
@Component
public class McaVerificationProvider extends AbstractHttpVerificationProvider {

    public McaVerificationProvider(VerificationProperties properties,
                                   VerificationHttpClient httpClient,
                                   ObjectMapper objectMapper) {
        super(VerificationProviderType.MCA, properties.provider("mca"),
                httpClient, objectMapper, "/mca/verify", "CIN");
    }

    @Override
    protected String resolveReference(Bid bid) {
        return bid.getRegistrationNo();
    }

    @Override
    protected String maskReference(String raw) {
        // e.g. CIN-U72900DL2019PTC345678 → CIN-******************5678
        return maskMiddle(raw, 4, 4);
    }
}
