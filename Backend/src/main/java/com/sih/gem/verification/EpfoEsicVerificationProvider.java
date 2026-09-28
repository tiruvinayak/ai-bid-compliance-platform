package com.sih.gem.verification;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sih.gem.entity.Bid;
import org.springframework.stereotype.Component;

/**
 * EPFO / ESIC employer registration adapter. Reference: the bid's
 * registration number is used as the declared employer reference; no
 * employee counts or compliance statuses are ever fabricated.
 */
@Component
public class EpfoEsicVerificationProvider extends AbstractHttpVerificationProvider {

    public EpfoEsicVerificationProvider(VerificationProperties properties,
                                        VerificationHttpClient httpClient,
                                        ObjectMapper objectMapper) {
        super(VerificationProviderType.EPFO_ESIC, properties.provider("epfo-esic"),
                httpClient, objectMapper, "/epfo-esic/verify", "Employer Registration");
    }

    @Override
    protected String resolveReference(Bid bid) {
        return bid.getRegistrationNo();
    }

    @Override
    protected String maskReference(String raw) {
        return maskMiddle(raw, 4, 4);
    }
}
