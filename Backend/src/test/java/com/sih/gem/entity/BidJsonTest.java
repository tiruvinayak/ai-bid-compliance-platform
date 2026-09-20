package com.sih.gem.entity;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

class BidJsonTest {
    @Test
    void exposesBusinessIdForApiPathsInsteadOfDatabaseKey() {
        Bid bid = Bid.builder().id(42L).bidId("GEM-2026-007").build();

        var json = new ObjectMapper().valueToTree(bid);

        assertEquals("GEM-2026-007", json.path("id").asText());
        assertFalse(json.has("databaseId"));
    }
}
