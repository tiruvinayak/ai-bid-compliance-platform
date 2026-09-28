package com.sih.gem.service;

import com.sih.gem.dto.GovernmentVerificationDtos.*;
import com.sih.gem.entity.AuditEvent;
import com.sih.gem.entity.Bid;
import com.sih.gem.entity.GovernmentVerificationResult;
import com.sih.gem.repository.AuditEventRepository;
import com.sih.gem.repository.BidRepository;
import com.sih.gem.repository.GovernmentVerificationResultRepository;
import com.sih.gem.verification.GovernmentVerificationProvider;
import com.sih.gem.verification.ProviderOutcome;
import com.sih.gem.verification.VerificationProviderType;
import com.sih.gem.verification.VerificationStatus;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Phase 5A — External Government Verification orchestration.
 *
 * Runs each requested provider adapter against the bid, persists masked
 * results, and records a GOVERNMENT_VERIFICATION audit event. Authorization
 * reuses {@link HierarchyService#requireAccessibleTender} — no duplicated
 * access logic. Providers that are not configured report UNAVAILABLE and can
 * never produce a success status.
 */
@Service
public class GovernmentVerificationService {

    private static final Logger log = LoggerFactory.getLogger(GovernmentVerificationService.class);

    private final HierarchyService hierarchyService;
    private final BidRepository bidRepository;
    private final GovernmentVerificationResultRepository resultRepository;
    private final AuditEventRepository auditRepository;
    private final Map<VerificationProviderType, GovernmentVerificationProvider> providers;

    public GovernmentVerificationService(HierarchyService hierarchyService,
                                         BidRepository bidRepository,
                                         GovernmentVerificationResultRepository resultRepository,
                                         AuditEventRepository auditRepository,
                                         List<GovernmentVerificationProvider> providerBeans) {
        this.hierarchyService = hierarchyService;
        this.bidRepository = bidRepository;
        this.resultRepository = resultRepository;
        this.auditRepository = auditRepository;
        this.providers = providerBeans.stream()
                .collect(Collectors.toMap(GovernmentVerificationProvider::type, Function.identity(),
                        (a, b) -> a, () -> new EnumMap<>(VerificationProviderType.class)));
    }

    /** Runs the requested providers (or all, when none/empty requested) for an accessible bid. */
    public GovernmentVerificationResponse runVerification(String bidId, List<String> requestedProviders) {
        Bid bid = requireAccessibleBid(bidId);
        List<VerificationProviderType> toRun = parseProviders(requestedProviders);

        List<VerificationResultDto> results = new ArrayList<>();
        LocalDateTime now = LocalDateTime.now();
        for (VerificationProviderType type : toRun) {
            GovernmentVerificationProvider provider = providers.get(type);
            if (provider == null) {
                throw new IllegalArgumentException("Verification provider " + type.getCode() + " is not registered.");
            }
            ProviderOutcome outcome = provider.verify(bid);
            persist(bid, type, outcome, now);
            results.add(toDto(type, outcome, now));
        }

        recordAudit(bid, toRun, results);
        return new GovernmentVerificationResponse(bid.getBidId(), bid.getTenderId(), now, results);
    }

    /** Returns the latest stored result per provider (previous run), enum order. */
    public GovernmentVerificationResponse getStoredResults(String bidId) {
        Bid bid = requireAccessibleBid(bidId);
        List<GovernmentVerificationResult> stored =
                resultRepository.findByBidIdOrderByCheckedAtDesc(bidId);

        Map<String, GovernmentVerificationResult> latestByProvider = new LinkedHashMap<>();
        for (GovernmentVerificationResult r : stored) {
            latestByProvider.putIfAbsent(r.getProvider(), r); // list is newest-first
        }

        List<VerificationResultDto> results = new ArrayList<>();
        LocalDateTime latest = null;
        for (VerificationProviderType type : VerificationProviderType.values()) {
            GovernmentVerificationResult r = latestByProvider.get(type.getCode());
            if (r == null) continue;
            results.add(new VerificationResultDto(
                    r.getProvider(), type.getDisplayName(), r.getStatus(), r.getMessage(),
                    r.getReferenceType(), r.getReferenceValue(), r.getVerifiedName(),
                    r.getVerifiedStatus(), r.getVerifiedDate(), r.getMismatchReason(),
                    r.getSource(), r.getCheckedAt(), r.getEvidenceReference()));
            if (latest == null || (r.getCheckedAt() != null && r.getCheckedAt().isAfter(latest))) {
                latest = r.getCheckedAt();
            }
        }
        return new GovernmentVerificationResponse(bid.getBidId(), bid.getTenderId(), latest, results);
    }

    private Bid requireAccessibleBid(String bidId) {
        Bid bid = bidRepository.findByBidId(bidId)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND,
                        "Bid " + bidId + " was not found."));
        hierarchyService.requireAccessibleTender(bid.getTenderId());
        return bid;
    }

    private List<VerificationProviderType> parseProviders(List<String> requested) {
        if (requested == null || requested.isEmpty()) {
            return List.of(VerificationProviderType.values());
        }
        List<VerificationProviderType> parsed = new ArrayList<>();
        for (String name : requested) {
            if (name == null || name.isBlank()) continue;
            try {
                VerificationProviderType type = VerificationProviderType.valueOf(name.trim().toUpperCase(Locale.ROOT));
                if (!parsed.contains(type)) parsed.add(type);
            } catch (IllegalArgumentException e) {
                throw new IllegalArgumentException("Unknown verification provider: " + name
                        + ". Valid providers: GST, PAN, MCA, EPFO_ESIC, DIGILOCKER.");
            }
        }
        if (parsed.isEmpty()) {
            return List.of(VerificationProviderType.values());
        }
        return parsed;
    }

    private void persist(Bid bid, VerificationProviderType type, ProviderOutcome outcome, LocalDateTime now) {
        try {
            resultRepository.save(GovernmentVerificationResult.builder()
                    .bidId(bid.getBidId())
                    .tenderId(bid.getTenderId())
                    .provider(type.getCode())
                    .status(outcome.status().name())
                    .referenceType(outcome.referenceType())
                    .referenceValue(outcome.referenceValue())
                    .verifiedName(outcome.verifiedName())
                    .verifiedStatus(outcome.verifiedStatus())
                    .verifiedDate(outcome.verifiedDate())
                    .mismatchReason(outcome.mismatchReason())
                    .source(outcome.source())
                    .message(outcome.message())
                    .checkedAt(now)
                    .evidenceReference(outcome.evidenceReference())
                    .build());
        } catch (Exception e) {
            log.warn("Failed to persist verification result for {} / {}: {}",
                    bid.getBidId(), type.getCode(), e.getMessage());
        }
    }

    private static VerificationResultDto toDto(VerificationProviderType type, ProviderOutcome outcome,
                                               LocalDateTime now) {
        return new VerificationResultDto(
                type.getCode(), type.getDisplayName(), outcome.status().name(), outcome.message(),
                outcome.referenceType(), outcome.referenceValue(), outcome.verifiedName(),
                outcome.verifiedStatus(), outcome.verifiedDate(), outcome.mismatchReason(),
                outcome.source(), now, outcome.evidenceReference());
    }

    private void recordAudit(Bid bid, List<VerificationProviderType> run, List<VerificationResultDto> results) {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            String actor = auth != null && auth.getName() != null && !auth.getName().isBlank()
                    ? auth.getName() : "SYSTEM";
            String role = "SYSTEM";
            if (auth != null && auth.getAuthorities() != null) {
                role = auth.getAuthorities().stream()
                        .findFirst()
                        .map(a -> a.getAuthority().replaceFirst("^ROLE_", "").replace('_', ' '))
                        .orElse("SYSTEM");
            }
            String statuses = results.stream()
                    .map(r -> r.provider() + "=" + r.status())
                    .collect(Collectors.joining(", "));
            auditRepository.save(AuditEvent.builder()
                    .bidId(bid.getBidId())
                    .actor(actor)
                    .userRole(role)
                    .action("GOVERNMENT_VERIFICATION")
                    .entity("Bid")
                    .status("SUCCESS")
                    .details("Providers run: " + statuses
                            + "; tender: " + bid.getTenderId()
                            + "; requested: " + run.stream().map(VerificationProviderType::getCode)
                                    .collect(Collectors.joining(",")))
                    .timestamp(LocalDateTime.now())
                    .build());
        } catch (AccessDeniedException e) {
            throw e;
        } catch (Exception e) {
            log.warn("Failed to record GOVERNMENT_VERIFICATION audit event for {}: {}",
                    bid.getBidId(), e.getMessage());
        }
    }

    // Exposed for tests: the set of registered provider types.
    public Set<VerificationProviderType> registeredProviderTypes() {
        return Collections.unmodifiableSet(providers.keySet());
    }

    /** Statuses that would count as a success claim — used nowhere in unconfigured flows. */
    public static boolean isSuccessStatus(VerificationStatus status) {
        return status == VerificationStatus.VERIFIED || status == VerificationStatus.SANDBOX;
    }
}
