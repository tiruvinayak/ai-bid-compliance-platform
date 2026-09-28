package com.sih.gem.verification;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sih.gem.entity.Bid;
import org.springframework.stereotype.Component;

/**
 * GST registry adapter. Reference: GSTIN from the bid, masked for storage.
 */
@Component
public class GstVerificationProvider extends AbstractHttpVerificationProvider {

    public GstVerificationProvider(VerificationProperties properties,
                                   VerificationHttpClient httpClient,
                                   ObjectMapper objectMapper) {
        super(VerificationProviderType.GST, properties.provider("gst"),
                httpClient, objectMapper, "/gst/verify", "GSTIN");
    }

    @Override
    protected String resolveReference(Bid bid) {
        return bid.getGstin();
    }

    @Override
    protected String maskReference(String raw) {
        // e.g. 07AABCT1234F1Z5 → 07*********F1Z5
        return maskMiddle(raw, 2, 4);
    }
}
