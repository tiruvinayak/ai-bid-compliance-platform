package com.sih.gem.service;

import com.sih.gem.controller.GovernmentVerificationController;
import com.sih.gem.dto.GovernmentVerificationDtos.*;
import com.sih.gem.entity.*;
import com.sih.gem.repository.*;
import com.sih.gem.verification.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.lang.reflect.Method;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Phase 5A — External Government Verification tests (spec §26):
 * officer can request, bidder 403, hierarchy rules, UNAVAILABLE providers,
 * no fake VERIFIED, audit event, masking, stored-result retrieval, safe
 * provider failure handling.
 */
class GovernmentVerificationServiceTest {

    private static final String BID = "GEM-2026-001";
    private static final String TENDER = "TND-GEM-2026-1042";
    private static final String GSTIN = "07AABCT1234F1Z5";
    private static final String CIN = "CIN-U72900DL2019PTC345678";

    private final HierarchyService hierarchyService = mock(HierarchyService.class);
    private final BidRepository bids = mock(BidRepository.class);
    private final GovernmentVerificationResultRepository results = mock(GovernmentVerificationResultRepository.class);
    private final AuditEventRepository audits = mock(AuditEventRepository.class);

    private final VerificationProperties properties = new VerificationProperties();
    private final VerificationHttpClient http = mock(VerificationHttpClient.class);
    private final ObjectMapper mapper = new ObjectMapper();

    private final GovernmentVerificationService service = new GovernmentVerificationService(
            hierarchyService, bids, results, audits,
            List.of(
                    new GstVerificationProvider(properties, http, mapper),
                    new PanVerificationProvider(properties, http, mapper),
                    new McaVerificationProvider(properties, http, mapper),
                    new EpfoEsicVerificationProvider(properties, http, mapper),
                    new DigiLockerVerificationProvider(properties, http, mapper)));

    @BeforeEach
    void authenticateOfficer() {
        SecurityContextHolder.getContext().setAuthentication(new TestingAuthenticationToken(
                "officer@demo.gov.in", "n/a",
                List.of(new SimpleGrantedAuthority("ROLE_GOVERNMENT_OFFICER"))));
        when(bids.findByBidId(BID)).thenReturn(Optional.of(bid()));
        when(hierarchyService.requireAccessibleTender(TENDER)).thenReturn(tender());
        when(results.findByBidIdOrderByCheckedAtDesc(BID)).thenReturn(List.of());
    }

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    private Bid bid() {
        return Bid.builder().bidId(BID).tenderId(TENDER)
                .bidderName("ABC Technologies Pvt Ltd")
                .gstin(GSTIN).registrationNo(CIN).build();
    }

    private Tender tender() {
        Sector sector = Sector.builder().id(1L).code("RAILWAYS").name("Railways").build();
        Department dept = Department.builder().id(10L).code("RPD")
                .name("Railway Procurement Department").sector(sector).build();
        return Tender.builder().id(1L).tenderId(TENDER).title("Network Infrastructure")
                .department(dept).status("ACTIVE").build();
    }

    // ---- 1. Officer can request verification (200-equivalent success) ----
    @Test
    void officerCanRequestVerificationForAllProviders() {
        GovernmentVerificationResponse response = service.runVerification(BID, null);

        assertEquals(BID, response.bidId());
        assertEquals(TENDER, response.tenderId());
        assertEquals(5, response.results().size());
        verify(results, times(5)).save(any(GovernmentVerificationResult.class));
    }

    // ---- 2. Bidder receives 403: endpoint annotation excludes USER role ----
    @Test
    void verificationEndpointsExcludeBidderRole() throws Exception {
        for (String methodName : new String[]{"run", "getStored"}) {
            Method method = (methodName.equals("run")
                    ? GovernmentVerificationController.class.getMethod(methodName, String.class, VerificationProviderRequest.class)
                    : GovernmentVerificationController.class.getMethod(methodName, String.class));
            PreAuthorize preAuthorize = method.getAnnotation(PreAuthorize.class);

            assertNotNull(preAuthorize, methodName + " must declare @PreAuthorize");
            String expr = preAuthorize.value();
            assertTrue(expr.contains("GOVERNMENT_OFFICER"), "officer role must be allowed");
            assertTrue(expr.contains("CENTRAL_ADMIN"), "central admin must be allowed");
            assertTrue(expr.contains("SECTOR_USER"), "sector user must be allowed");
            assertFalse(expr.contains("'USER'"), "bidder USER role must not be allowed");
        }
    }

    // ---- 3 & 4. Unauthorized officer / hierarchy rules apply via shared service ----
    @Test
    void hierarchyAccessDeniedPropagatesAndNothingIsPersisted() {
        when(hierarchyService.requireAccessibleTender(TENDER))
                .thenThrow(new AccessDeniedException("Not authorized to access this department"));

        AccessDeniedException ex = assertThrows(AccessDeniedException.class,
                () -> service.runVerification(BID, null));
        assertTrue(ex.getMessage().contains("department"));
        verifyNoInteractions(results, audits);
    }

    // ---- 5. Unavailable provider returns UNAVAILABLE with explicit reason ----
    @Test
    void unavailableProviderReturnsUnavailableStatus() {
        GovernmentVerificationResponse response = service.runVerification(BID, List.of("GST"));

        VerificationResultDto gst = response.results().get(0);
        assertEquals("GST", gst.provider());
        assertEquals("UNAVAILABLE", gst.status());
        assertTrue(gst.message().contains("not configured"),
                "UNAVAILABLE must explain missing credentials: " + gst.message());
    }

    // ---- 6. No fake VERIFIED status when providers are unconfigured ----
    @Test
    void neverReturnsVerifiedStatusForUnconfiguredProviders() {
        GovernmentVerificationResponse response = service.runVerification(BID, null);

        for (VerificationResultDto r : response.results()) {
            assertNotEquals("VERIFIED", r.status(), r.provider() + " must not claim VERIFIED");
            assertNotEquals("SANDBOX", r.status(), r.provider() + " must not claim SANDBOX");
            assertEquals("UNAVAILABLE", r.status(), r.provider() + " should be UNAVAILABLE");
            assertNull(r.verifiedName());
            assertNull(r.evidenceReference());
        }
    }

    // ---- 7. Audit event created ----
    @Test
    void auditEventIsRecordedWithProviderStatuses() {
        service.runVerification(BID, List.of("GST", "PAN"));

        verify(audits).save(argThat(e ->
                "GOVERNMENT_VERIFICATION".equals(e.getAction())
                        && BID.equals(e.getBidId())
                        && e.getDetails().contains("GST=UNAVAILABLE")
                        && e.getDetails().contains("PAN=UNAVAILABLE")
                        && e.getDetails().contains(TENDER)));
    }

    // ---- 8. Sensitive identifiers are masked in storage ----
    @Test
    void sensitiveIdentifiersAreMaskedInStoredResults() {
        service.runVerification(BID, List.of("GST", "PAN", "MCA"));

        var saved = org.mockito.ArgumentCaptor.forClass(GovernmentVerificationResult.class);
        verify(results, atLeastOnce()).save(saved.capture());

        GovernmentVerificationResult gst = saved.getAllValues().stream()
                .filter(r -> "GST".equals(r.getProvider())).findFirst().orElseThrow();
        GovernmentVerificationResult pan = saved.getAllValues().stream()
                .filter(r -> "PAN".equals(r.getProvider())).findFirst().orElseThrow();
        GovernmentVerificationResult mca = saved.getAllValues().stream()
                .filter(r -> "MCA".equals(r.getProvider())).findFirst().orElseThrow();

        // Raw GSTIN never persisted: masked to first2 + stars + last4.
        assertFalse(gst.getReferenceValue().contains("AABCT1234"),
                "Full GSTIN must not be stored: " + gst.getReferenceValue());
        assertTrue(gst.getReferenceValue().startsWith("07"));
        assertTrue(gst.getReferenceValue().endsWith("F1Z5"));

        // PAN masked ABCDE****F pattern, derived from GSTIN positions 3–12.
        assertFalse(pan.getReferenceValue().contains("AABCT1234"),
                "Full PAN must not be stored: " + pan.getReferenceValue());
        assertTrue(pan.getReferenceValue().matches("AABCT\\*{4}F"),
                "PAN must be masked as AABCT****F: " + pan.getReferenceValue());

        // CIN masked too.
        assertFalse(mca.getReferenceValue().contains("2019PTC345678"),
                "Full CIN must not be stored: " + mca.getReferenceValue());
        assertTrue(mca.getReferenceValue().startsWith("CIN-"));
    }

    // ---- 9. Previous results can be retrieved (latest per provider) ----
    @Test
    void previousResultsCanBeRetrievedLatestPerProvider() {
        GovernmentVerificationResult old = GovernmentVerificationResult.builder()
                .bidId(BID).tenderId(TENDER).provider("GST").status("ERROR")
                .referenceType("GSTIN").source("Configured provider endpoint")
                .checkedAt(java.time.LocalDateTime.now().minusMinutes(10)).build();
        GovernmentVerificationResult latest = GovernmentVerificationResult.builder()
                .bidId(BID).tenderId(TENDER).provider("GST").status("UNAVAILABLE")
                .referenceType("GSTIN").source("Not configured")
                .checkedAt(java.time.LocalDateTime.now()).build();
        GovernmentVerificationResult pan = GovernmentVerificationResult.builder()
                .bidId(BID).tenderId(TENDER).provider("PAN").status("UNAVAILABLE")
                .checkedAt(java.time.LocalDateTime.now()).build();
        // Repo contract: newest first.
        when(results.findByBidIdOrderByCheckedAtDesc(BID))
                .thenReturn(List.of(latest, pan, old));

        GovernmentVerificationResponse response = service.getStoredResults(BID);

        assertEquals(2, response.results().size());
        VerificationResultDto gst = response.results().get(0);
        assertEquals("GST", gst.provider());
        assertEquals("UNAVAILABLE", gst.status(), "Latest result per provider must win");
        assertEquals("PAN", response.results().get(1).provider());
        assertEquals(BID, response.bidId());
    }

    // ---- 10. Provider failure is handled safely (ERROR, no exception escapes) ----
    @Test
    void configuredProviderFailureIsReportedAsErrorSafely() {
        // Configure GST with a real-looking endpoint, then make the HTTP call fail.
        VerificationProperties.ProviderCredentials gstCfg = new VerificationProperties.ProviderCredentials();
        gstCfg.setEnabled(true);
        gstCfg.setBaseUrl("https://gst-verify.example.gov.in/api");
        gstCfg.setApiKey("test-key");
        properties.getProviders().put("gst", gstCfg);
        when(http.get(anyString(), anyString()))
                .thenThrow(new org.springframework.web.client.HttpServerErrorException(
                        org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR));

        GovernmentVerificationService customService = new GovernmentVerificationService(
                hierarchyService, bids, results, audits,
                List.of(new GstVerificationProvider(properties, http, mapper),
                        new PanVerificationProvider(properties, http, mapper),
                        new McaVerificationProvider(properties, http, mapper),
                        new EpfoEsicVerificationProvider(properties, http, mapper),
                        new DigiLockerVerificationProvider(properties, http, mapper)));

        GovernmentVerificationResponse response = customService.runVerification(BID, null);

        assertEquals(5, response.results().size());
        VerificationResultDto gst = response.results().get(0);
        assertEquals("ERROR", gst.status());
        // Failure message must not leak the API key or raw reference-bearing URL.
        assertFalse(gst.message().contains("test-key"));
        assertFalse(gst.message().contains(GSTIN));
        assertTrue(gst.message().contains("HTTP 500"));
        // Remaining providers still resolve as UNAVAILABLE — no crash.
        for (int i = 1; i < response.results().size(); i++) {
            assertEquals("UNAVAILABLE", response.results().get(i).status());
        }
    }

    // ---- Bonus: unknown provider → 400-style IllegalArgumentException ----
    @Test
    void unknownProviderIsRejected() {
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> service.runVerification(BID, List.of("INCOME_TAX_PORTAL")));
        assertTrue(ex.getMessage().contains("Unknown verification provider"));
        verifyNoInteractions(results, audits);
    }

    // ---- Bonus: unknown bid rejected with 404 before any provider call ----
    @Test
    void unknownBidIsRejectedWithNotFound() {
        when(bids.findByBidId("GEM-2026-404")).thenReturn(Optional.empty());
        org.springframework.web.server.ResponseStatusException ex =
                assertThrows(org.springframework.web.server.ResponseStatusException.class,
                        () -> service.runVerification("GEM-2026-404", null));
        assertEquals(org.springframework.http.HttpStatus.NOT_FOUND, ex.getStatusCode());
        verifyNoInteractions(results, audits, http);
    }

    // ---- Bonus: subset request runs only the requested providers ----
    @Test
    void providerSubsetRunsOnlyRequestedProviders() {
        GovernmentVerificationResponse response = service.runVerification(BID, List.of("MCA"));
        assertEquals(1, response.results().size());
        assertEquals("MCA", response.results().get(0).provider());
        verify(results, times(1)).save(any());
    }

    // ---- Bonus: unconfigured provider with no local reference still UNAVAILABLE (config checked first) ----
    @Test
    void digilockerWithoutReferenceStillReportsUnavailable() {
        GovernmentVerificationResponse response = service.runVerification(BID, List.of("DIGILOCKER"));
        VerificationResultDto dl = response.results().get(0);
        assertEquals("DIGILOCKER", dl.provider());
        assertEquals("UNAVAILABLE", dl.status());
        assertNull(dl.referenceValue());
    }

    // ---- Bonus: sandbox mode never leaks into unconfigured flow ----
    @Test
    void sandboxModeNeverAppearsWhenProviderUnconfigured() {
        VerificationProperties.ProviderCredentials panCfg = new VerificationProperties.ProviderCredentials();
        panCfg.setEnabled(false);
        panCfg.setMode("sandbox");
        properties.getProviders().put("pan", panCfg);

        GovernmentVerificationResponse response = service.runVerification(BID, List.of("PAN"));
        assertEquals("UNAVAILABLE", response.results().get(0).status());
    }
}
