package com.sih.gem.service;

import com.sih.gem.entity.*;
import com.sih.gem.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Phase 2 — Preliminary Compliance & Document Integrity Engine.
 * Runs before deep compliance analysis to catch document-level issues.
 */
@Service
public class PreliminaryIntegrityService {

    private final BidderDocumentRepository documentRepository;
    private final BidderFactRepository factRepository;
    private final RequirementRepository requirementRepository;
    private final PreliminaryVerificationCheckRepository checkRepository;

    public PreliminaryIntegrityService(BidderDocumentRepository documentRepository,
                                        BidderFactRepository factRepository,
                                        RequirementRepository requirementRepository,
                                        PreliminaryVerificationCheckRepository checkRepository) {
        this.documentRepository = documentRepository;
        this.factRepository = factRepository;
        this.requirementRepository = requirementRepository;
        this.checkRepository = checkRepository;
    }

    @Transactional
    public List<PreliminaryVerificationCheck> runPreliminaryChecks(String bidId) {
        checkRepository.deleteByBidId(bidId);

        List<PreliminaryVerificationCheck> allChecks = new ArrayList<>();

        List<BidderDocument> documents = documentRepository.findByBidIdOrderByUploadedAtDesc(bidId);
        List<BidderFact> facts = factRepository.findByBidId(bidId);
        List<Requirement> requirements = requirementRepository.findByBidId(bidId);

        for (BidderDocument doc : documents) {
            allChecks.addAll(checkDocumentValidity(bidId, doc));
            allChecks.addAll(checkRequiredDocuments(bidId, doc, requirements));
            allChecks.addAll(checkExpiryDates(bidId, doc, facts));
            allChecks.addAll(checkFieldCompleteness(bidId, doc, facts, requirements));
            allChecks.addAll(checkCrossPageConsistency(bidId, doc, facts));
        }

        return checkRepository.saveAll(allChecks);
    }

    public List<PreliminaryVerificationCheck> getChecks(String bidId) {
        return checkRepository.findByBidId(bidId);
    }

    public Map<String, Object> getSummary(String bidId) {
        List<PreliminaryVerificationCheck> checks = checkRepository.findByBidId(bidId);

        long pass = checks.stream().filter(c -> c.getStatus() == PreliminaryVerificationCheck.CheckStatus.PASS).count();
        long review = checks.stream().filter(c -> c.getStatus() == PreliminaryVerificationCheck.CheckStatus.REVIEW).count();
        long fail = checks.stream().filter(c -> c.getStatus() == PreliminaryVerificationCheck.CheckStatus.FAIL).count();
        long missing = checks.stream().filter(c -> c.getStatus() == PreliminaryVerificationCheck.CheckStatus.MISSING).count();
        long conflict = checks.stream().filter(c -> c.getStatus() == PreliminaryVerificationCheck.CheckStatus.CONFLICT).count();

        PreliminaryVerificationCheck.CheckStatus overall;
        if (fail > 0) {
            overall = PreliminaryVerificationCheck.CheckStatus.FAIL;
        } else if (conflict > 0 || missing > 0 || review > 0) {
            overall = PreliminaryVerificationCheck.CheckStatus.REVIEW;
        } else {
            overall = PreliminaryVerificationCheck.CheckStatus.PASS;
        }

        Map<String, Object> summary = new HashMap<>();
        summary.put("overallStatus", overall.name());
        summary.put("pass", pass);
        summary.put("review", review);
        summary.put("fail", fail);
        summary.put("missing", missing);
        summary.put("conflict", conflict);
        summary.put("total", checks.size());
        return summary;
    }

    // ==================== CHECK A: Document Validity ====================
    private List<PreliminaryVerificationCheck> checkDocumentValidity(String bidId, BidderDocument doc) {
        List<PreliminaryVerificationCheck> checks = new ArrayList<>();

        if (doc.getProcessingStatus() == null || doc.getProcessingStatus().equals("FAILED")) {
            checks.add(buildCheck(bidId, doc.getId().toString(), PreliminaryVerificationCheck.CheckType.DOCUMENT_VALIDITY,
                    PreliminaryVerificationCheck.CheckStatus.FAIL,
                    "Document processing failed or not processed",
                    null, null, null, doc.getFilename(), null));
            return checks;
        }

        if (doc.getExtractedText() == null || doc.getExtractedText().isBlank()) {
            checks.add(buildCheck(bidId, doc.getId().toString(), PreliminaryVerificationCheck.CheckType.DOCUMENT_VALIDITY,
                    PreliminaryVerificationCheck.CheckStatus.FAIL,
                    "No extractable text found in document",
                    null, null, null, doc.getFilename(), null));
            return checks;
        }

        if (doc.getPageCount() == null || doc.getPageCount() <= 0) {
            checks.add(buildCheck(bidId, doc.getId().toString(), PreliminaryVerificationCheck.CheckType.DOCUMENT_VALIDITY,
                    PreliminaryVerificationCheck.CheckStatus.FAIL,
                    "Document has zero or invalid page count",
                    null, null, null, doc.getFilename(), null));
            return checks;
        }

        checks.add(buildCheck(bidId, doc.getId().toString(), PreliminaryVerificationCheck.CheckType.DOCUMENT_VALIDITY,
                PreliminaryVerificationCheck.CheckStatus.PASS,
                "Document successfully processed with " + doc.getPageCount() + " pages",
                null, null, null, doc.getFilename(), null));
        return checks;
    }

    // ==================== CHECK B: Required Document Presence ====================
    private List<PreliminaryVerificationCheck> checkRequiredDocuments(String bidId, BidderDocument doc,
                                                                        List<Requirement> requirements) {
        List<PreliminaryVerificationCheck> checks = new ArrayList<>();

        Set<String> requiredDocTypes = requirements.stream()
                .filter(r -> r.getSourceDoc() != null)
                .map(Requirement::getSourceDoc)
                .collect(Collectors.toSet());

        for (String requiredDoc : requiredDocTypes) {
            boolean found = documentsContainType(documentsWithBidId(bidId), requiredDoc);
            if (found) {
                checks.add(buildCheck(bidId, doc.getId().toString(), PreliminaryVerificationCheck.CheckType.REQUIRED_DOCUMENT,
                        PreliminaryVerificationCheck.CheckStatus.PASS,
                        "Required document '" + requiredDoc + "' found",
                        requiredDoc, doc.getFilename(), null, doc.getFilename(), null));
            } else {
                checks.add(buildCheck(bidId, doc.getId().toString(), PreliminaryVerificationCheck.CheckType.REQUIRED_DOCUMENT,
                        PreliminaryVerificationCheck.CheckStatus.MISSING,
                        "Required document '" + requiredDoc + "' not found in submission",
                        requiredDoc, null, null, doc.getFilename(), null));
            }
        }
        return checks;
    }

    private List<BidderDocument> documentsWithBidId(String bidId) {
        return documentRepository.findByBidIdOrderByUploadedAtDesc(bidId);
    }

    private boolean documentsContainType(List<BidderDocument> docs, String requiredType) {
        return docs.stream().anyMatch(d ->
                d.getFilename() != null && d.getFilename().toLowerCase().contains(requiredType.toLowerCase())
        );
    }

    // ==================== CHECK C: Expiry / Date Validation ====================
    private List<PreliminaryVerificationCheck> checkExpiryDates(String bidId, BidderDocument doc,
                                                                  List<BidderFact> facts) {
        List<PreliminaryVerificationCheck> checks = new ArrayList<>();

        List<BidderFact> docFacts = facts.stream()
                .filter(f -> doc.getFilename().equals(f.getSourceDocument()))
                .toList();

        for (BidderFact fact : docFacts) {
            String period = fact.getPeriod();
            if (period == null) continue;

            LocalDate expiryDate = parseExpiryDate(period);
            if (expiryDate == null) {
                checks.add(buildCheck(bidId, doc.getId().toString(), PreliminaryVerificationCheck.CheckType.EXPIRY_DATE,
                        PreliminaryVerificationCheck.CheckStatus.REVIEW,
                        "Could not parse expiry date from period: " + period,
                        fact.getFieldName(), period, null, doc.getFilename(), fact.getPageNumber()));
                continue;
            }

            LocalDate today = LocalDate.now();
            if (expiryDate.isBefore(today)) {
                checks.add(buildCheck(bidId, doc.getId().toString(), PreliminaryVerificationCheck.CheckType.EXPIRY_DATE,
                        PreliminaryVerificationCheck.CheckStatus.FAIL,
                        "Certificate expired on " + expiryDate,
                        fact.getFieldName(), period, expiryDate.toString(), doc.getFilename(), fact.getPageNumber()));
            } else if (expiryDate.isBefore(today.plusDays(30))) {
                checks.add(buildCheck(bidId, doc.getId().toString(), PreliminaryVerificationCheck.CheckType.EXPIRY_DATE,
                        PreliminaryVerificationCheck.CheckStatus.REVIEW,
                        "Certificate expires within 30 days on " + expiryDate,
                        fact.getFieldName(), period, expiryDate.toString(), doc.getFilename(), fact.getPageNumber()));
            } else {
                checks.add(buildCheck(bidId, doc.getId().toString(), PreliminaryVerificationCheck.CheckType.EXPIRY_DATE,
                        PreliminaryVerificationCheck.CheckStatus.PASS,
                        "Certificate valid until " + expiryDate,
                        fact.getFieldName(), period, expiryDate.toString(), doc.getFilename(), fact.getPageNumber()));
            }
        }
        return checks;
    }

    private LocalDate parseExpiryDate(String period) {
        if (period == null) return null;
        String[] patterns = {"yyyy-MM-dd", "dd/MM/yyyy", "MM/yyyy", "yyyy"};
        for (String pattern : patterns) {
            try {
                return LocalDate.parse(period, DateTimeFormatter.ofPattern(pattern));
            } catch (DateTimeParseException ignored) {}
        }
        Matcher m = Pattern.compile("\\b(20\\d{2})\\b").matcher(period);
        if (m.find()) {
            try {
                return LocalDate.of(Integer.parseInt(m.group(1)), 12, 31);
            } catch (Exception ignored) {}
        }
        return null;
    }

    // ==================== CHECK D: Cross-Page Consistency ====================
    private List<PreliminaryVerificationCheck> checkCrossPageConsistency(String bidId, BidderDocument doc,
                                                                          List<BidderFact> facts) {
        List<PreliminaryVerificationCheck> checks = new ArrayList<>();

        List<BidderFact> docFacts = facts.stream()
                .filter(f -> doc.getFilename().equals(f.getSourceDocument()))
                .toList();

        Map<String, List<BidderFact>> byField = docFacts.stream()
                .filter(f -> f.getFieldName() != null)
                .collect(Collectors.groupingBy(BidderFact::getFieldName));

        for (Map.Entry<String, List<BidderFact>> entry : byField.entrySet()) {
            String field = entry.getKey();
            List<BidderFact> fieldFacts = entry.getValue();

            if (fieldFacts.size() <= 1) continue;

            Map<String, List<BidderFact>> byValue = fieldFacts.stream()
                    .filter(f -> f.getDetectedValue() != null && !f.getDetectedValue().isBlank())
                    .collect(Collectors.groupingBy(f -> f.getDetectedValue().trim().toLowerCase()));

            if (byValue.size() > 1) {
                for (Map.Entry<String, List<BidderFact>> valEntry : byValue.entrySet()) {
                    BidderFact first = valEntry.getValue().get(0);
                    checks.add(buildCheck(bidId, doc.getId().toString(), PreliminaryVerificationCheck.CheckType.CROSS_PAGE_CONSISTENCY,
                            PreliminaryVerificationCheck.CheckStatus.CONFLICT,
                            "Conflicting values for '" + field + "': '" + valEntry.getKey() + "' appears on multiple pages",
                            field, valEntry.getKey(), null, doc.getFilename(), first.getPageNumber()));
                }
            }
        }
        return checks;
    }

    // ==================== CHECK E: Required Field Completeness ====================
    private List<PreliminaryVerificationCheck> checkFieldCompleteness(String bidId, BidderDocument doc,
                                                                       List<BidderFact> facts, List<Requirement> requirements) {
        List<PreliminaryVerificationCheck> checks = new ArrayList<>();

        List<BidderFact> docFacts = facts.stream()
                .filter(f -> doc.getFilename().equals(f.getSourceDocument()))
                .toList();

        Set<String> extractedFields = docFacts.stream()
                .filter(f -> f.getFieldName() != null)
                .map(BidderFact::getFieldName)
                .collect(Collectors.toSet());

        for (Requirement req : requirements) {
            if (!doc.getFilename().equals(req.getSourceDoc())) continue;

            String fieldName = inferFieldName(req);
            if (fieldName == null) continue;

            if (!extractedFields.contains(fieldName)) {
                checks.add(buildCheck(bidId, doc.getId().toString(), PreliminaryVerificationCheck.CheckType.FIELD_COMPLETENESS,
                        PreliminaryVerificationCheck.CheckStatus.MISSING,
                        "Required field '" + fieldName + "' not extracted from document",
                        fieldName, req.getRequiredValue(), null, doc.getFilename(), req.getPageNumber()));
            } else {
                Optional<BidderFact> fact = docFacts.stream()
                        .filter(f -> fieldName.equals(f.getFieldName()))
                        .findFirst();
                if (fact.isPresent() && (fact.get().getDetectedValue() == null || fact.get().getDetectedValue().isBlank())) {
                    checks.add(buildCheck(bidId, doc.getId().toString(), PreliminaryVerificationCheck.CheckType.FIELD_COMPLETENESS,
                            PreliminaryVerificationCheck.CheckStatus.REVIEW,
                            "Required field '" + fieldName + "' extracted but value is empty",
                            fieldName, req.getRequiredValue(), null, doc.getFilename(), fact.get().getPageNumber()));
                } else {
                    checks.add(buildCheck(bidId, doc.getId().toString(), PreliminaryVerificationCheck.CheckType.FIELD_COMPLETENESS,
                            PreliminaryVerificationCheck.CheckStatus.PASS,
                            "Required field '" + fieldName + "' extracted successfully",
                            fieldName, req.getRequiredValue(), fact.map(BidderFact::getDetectedValue).orElse(null),
                            doc.getFilename(), req.getPageNumber()));
                }
            }
        }
        return checks;
    }

    private String inferFieldName(Requirement req) {
        String desc = req.getRequirement().toLowerCase();
        if (desc.contains("gst")) return "gstin";
        if (desc.contains("turnover")) return "annual_turnover";
        if (desc.contains("net worth") || desc.contains("networth")) return "net_worth";
        if (desc.contains("cin")) return "cin";
        if (desc.contains("pan")) return "pan";
        if (desc.contains("iso")) return "iso_certification";
        if (desc.contains("cert-in") || desc.contains("cyber")) return "cert_in_certification";
        if (desc.contains("emd") || desc.contains("earnest")) return "emd_amount";
        if (desc.contains("validity") || desc.contains("period")) return "bid_validity";
        if (desc.contains("experience")) return "experience_details";
        if (desc.contains("integrity")) return "integrity_pact";
        if (desc.contains("signatory") || desc.contains("authorization")) return "authorized_signatory";
        if (desc.contains("format") || desc.contains("pdf")) return "file_format";
        return null;
    }

    private PreliminaryVerificationCheck buildCheck(String bidId, String documentId,
                                                     PreliminaryVerificationCheck.CheckType type,
                                                     PreliminaryVerificationCheck.CheckStatus status,
                                                     String message,
                                                     String fieldName, String expectedValue,
                                                     String actualValue, String docRef, Integer page) {
        return PreliminaryVerificationCheck.builder()
                .bidId(bidId)
                .documentId(documentId)
                .checkType(type)
                .status(status)
                .message(message)
                .fieldName(fieldName)
                .expectedValue(expectedValue != null ? expectedValue : "")
                .actualValue(actualValue != null ? actualValue : "")
                .evidenceReference(docRef != null ? docRef : "")
                .sourcePage(page)
                .build();
    }
}