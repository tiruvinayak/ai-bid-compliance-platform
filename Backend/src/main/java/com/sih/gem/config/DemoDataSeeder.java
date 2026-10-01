package com.sih.gem.config;

import com.sih.gem.entity.*;
import com.sih.gem.repository.*;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Configuration
public class DemoDataSeeder {

    private static final Logger log = LoggerFactory.getLogger(DemoDataSeeder.class);

    private static final String TENDER_A = "TND-GEM-DEMO-1042";
    private static final String TENDER_B = "TND-RIP-DEMO-2047";
    private static final String TENDER_A_TITLE = "Supply of Railway Track Maintenance Equipment";
    private static final String TENDER_B_TITLE = "Procurement of Railway Safety Inspection Equipment";
    private static final String TENDER_A_DATE = "2026-10-01";
    private static final String TENDER_A_CLOSE = "2026-11-30";
    private static final String TENDER_B_DATE = "2026-11-01";
    private static final String TENDER_B_CLOSE = "2026-12-15";
    private static final String DEPT_NAME = "Railway Procurement Department";
    private static final String TENDER_DOC = "DEMO_TENDER_RAIL_1042.pdf";

    private static final String BID_ACME = "DEMO-BID-001";
    private static final String BID_BHARAT = "DEMO-BID-002";
    private static final String BID_NOVA = "DEMO-BID-003";
    private static final String BID_ACME_2 = "DEMO-BID-004";
    private static final String BID_BHARAT_2 = "DEMO-BID-005";

    private static final String ORG_ACME = "Acme Infra Pvt Ltd";
    private static final String ORG_BHARAT = "Bharat Rail Systems Pvt Ltd";
    private static final String ORG_NOVA = "Nova Engineering Solutions";
    private static final String REG_ACME = "REG-8891-DEMO";
    private static final String REG_BHARAT = "REG-8892-DEMO";
    private static final String REG_NOVA = "REG-8893-DEMO";
    private static final String GST_ACME = "SYNTHETIC-DEMO-ACME-001";
    private static final String GST_BHARAT = "SYNTHETIC-DEMO-BHARAT-002";
    private static final String GST_NOVA = "SYNTHETIC-DEMO-NOVA-003";
    private static final String USER_DEMO = "user@demo.gov.in";
    private static final String OFFICER_DEMO = "officer@demo.gov.in";
    private static final String UPLOADER_BHARAT = "demo-bharat@demo.local";
    private static final String UPLOADER_NOVA = "demo-nova@demo.local";

    @Value("${app.upload.dir}")
    private String uploadDir;

    @Bean
    @Order(200)
    CommandLineRunner seedDemoProcurementData(
            TenderRepository tenderRepository,
            BidRepository bidRepository,
            RequirementRepository requirementRepository,
            ComplianceResultRepository complianceResultRepository,
            EvidenceDetailRepository evidenceDetailRepository,
            BidderFactRepository bidderFactRepository,
            RiskCategorySummaryRepository riskCategorySummaryRepository,
            ConflictItemRepository conflictItemRepository,
            AuditEventRepository auditEventRepository,
            PreliminaryVerificationCheckRepository preliminaryVerificationCheckRepository,
            OfficerReviewRecordRepository officerReviewRecordRepository,
            BidderDocumentRepository bidderDocumentRepository,
            DepartmentRepository departmentRepository,
            UserRepository userRepository) {
        return args -> {
            Department rpd = departmentRepository.findByNameIgnoreCase(DEPT_NAME).orElse(null);
            if (rpd == null) {
                log.warn("Demo procurement data skipped: department '{}' not found", DEPT_NAME);
                return;
            }
            User officer = userRepository.findByEmail(OFFICER_DEMO).orElse(null);
            Long officerId = officer != null ? officer.getId() : null;
            String officerName = officer != null ? officer.getName() : "Rajesh V. Sharma";

            int tendersBefore = tenderRepository.findAllByOrderByCreatedAtDesc().size();
            int bidsBefore = (int) bidRepository.findAll().stream()
                    .filter(b -> b.getBidId() != null && b.getBidId().startsWith("DEMO-BID-")).count();

            seedTenderIfAbsent(tenderRepository, TENDER_A, TENDER_A_TITLE, rpd,
                    "Infrastructure", TENDER_A_DATE, TENDER_A_CLOSE, officerId, officerName);
            seedTenderIfAbsent(tenderRepository, TENDER_B, TENDER_B_TITLE, rpd,
                    "Safety & Inspection", TENDER_B_DATE, TENDER_B_CLOSE, officerId, officerName);

            seedBidIfAbsent(bidRepository, Bid.builder()
                    .bidId(BID_ACME).tenderId(TENDER_A).tenderTitle(TENDER_A_TITLE)
                    .department(DEPT_NAME).bidderName(ORG_ACME).registrationNo(REG_ACME)
                    .gstin(GST_ACME).category("Infrastructure")
                    .tenderDate(TENDER_A_DATE).closingDate(TENDER_A_CLOSE)
                    .compliancePercentage(83.3).riskLevel("LOW").status("REVIEW_REQUIRED")
                    .totalRequirements(6).passCount(5).failCount(0).reviewCount(1)
                    .missingCount(0).conflictCount(0)
                    .createdAt(LocalDateTime.now()).build());

            seedBidIfAbsent(bidRepository, Bid.builder()
                    .bidId(BID_BHARAT).tenderId(TENDER_A).tenderTitle(TENDER_A_TITLE)
                    .department(DEPT_NAME).bidderName(ORG_BHARAT).registrationNo(REG_BHARAT)
                    .gstin(GST_BHARAT).category("Infrastructure")
                    .tenderDate(TENDER_A_DATE).closingDate(TENDER_A_CLOSE)
                    .compliancePercentage(33.3).riskLevel("HIGH").status("REVIEW_REQUIRED")
                    .totalRequirements(6).passCount(2).failCount(1).reviewCount(2)
                    .missingCount(1).conflictCount(1)
                    .createdAt(LocalDateTime.now()).build());

            seedBidIfAbsent(bidRepository, Bid.builder()
                    .bidId(BID_NOVA).tenderId(TENDER_A).tenderTitle(TENDER_A_TITLE)
                    .department(DEPT_NAME).bidderName(ORG_NOVA).registrationNo(REG_NOVA)
                    .gstin(GST_NOVA).category("Infrastructure")
                    .tenderDate(TENDER_A_DATE).closingDate(TENDER_A_CLOSE)
                    .compliancePercentage(83.3).riskLevel("MEDIUM").status("REVIEW_REQUIRED")
                    .totalRequirements(6).passCount(5).failCount(0).reviewCount(1)
                    .missingCount(0).conflictCount(0)
                    .createdAt(LocalDateTime.now()).build());

            seedBidIfAbsent(bidRepository, Bid.builder()
                    .bidId(BID_ACME_2).tenderId(TENDER_B).tenderTitle(TENDER_B_TITLE)
                    .department(DEPT_NAME).bidderName(ORG_ACME).registrationNo(REG_ACME)
                    .gstin(GST_ACME).category("Safety & Inspection")
                    .tenderDate(TENDER_B_DATE).closingDate(TENDER_B_CLOSE)
                    .compliancePercentage(0.0).riskLevel("MEDIUM").status("Draft")
                    .totalRequirements(0).passCount(0).failCount(0).reviewCount(0)
                    .missingCount(0).conflictCount(0)
                    .createdAt(LocalDateTime.now()).build());

            seedBidIfAbsent(bidRepository, Bid.builder()
                    .bidId(BID_BHARAT_2).tenderId(TENDER_B).tenderTitle(TENDER_B_TITLE)
                    .department(DEPT_NAME).bidderName(ORG_BHARAT).registrationNo(REG_BHARAT)
                    .gstin(GST_BHARAT).category("Safety & Inspection")
                    .tenderDate(TENDER_B_DATE).closingDate(TENDER_B_CLOSE)
                    .compliancePercentage(0.0).riskLevel("MEDIUM").status("Draft")
                    .totalRequirements(0).passCount(0).failCount(0).reviewCount(0)
                    .missingCount(0).conflictCount(0)
                    .createdAt(LocalDateTime.now()).build());

            seedAcme(requirementRepository, complianceResultRepository, evidenceDetailRepository,
                    bidderFactRepository, riskCategorySummaryRepository, auditEventRepository,
                    preliminaryVerificationCheckRepository, bidderDocumentRepository);
            seedBharat(requirementRepository, complianceResultRepository, evidenceDetailRepository,
                    bidderFactRepository, riskCategorySummaryRepository, conflictItemRepository,
                    auditEventRepository, preliminaryVerificationCheckRepository,
                    bidderDocumentRepository, officerReviewRecordRepository);
            seedNova(requirementRepository, complianceResultRepository, evidenceDetailRepository,
                    bidderFactRepository, riskCategorySummaryRepository, auditEventRepository,
                    preliminaryVerificationCheckRepository, bidderDocumentRepository);

            int tendersAfter = tenderRepository.findAllByOrderByCreatedAtDesc().size();
            int bidsAfter = (int) bidRepository.findAll().stream()
                    .filter(b -> b.getBidId() != null && b.getBidId().startsWith("DEMO-BID-")).count();
            log.info("Demo procurement data ready: tenders {} -> {}, demo bids {} -> {}",
                    tendersBefore, tendersAfter, bidsBefore, bidsAfter);
        };
    }

    private void seedTenderIfAbsent(TenderRepository repo, String tenderId, String title,
                                    Department department, String category, String tenderDate,
                                    String closingDate, Long officerId, String officerName) {
        if (repo.existsByTenderId(tenderId)) return;
        repo.save(Tender.builder()
                .tenderId(tenderId)
                .title(title)
                .department(department)
                .category(category)
                .tenderDate(tenderDate)
                .closingDate(closingDate)
                .status("ACTIVE")
                .assignedOfficerId(officerId)
                .assignedOfficerName(officerName)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build());
    }

    private void seedBidIfAbsent(BidRepository repo, Bid bid) {
        if (repo.existsByBidId(bid.getBidId())) return;
        repo.save(bid);
    }

    private void seedAcme(RequirementRepository requirementRepository,
                          ComplianceResultRepository complianceResultRepository,
                          EvidenceDetailRepository evidenceDetailRepository,
                          BidderFactRepository bidderFactRepository,
                          RiskCategorySummaryRepository riskCategorySummaryRepository,
                          AuditEventRepository auditEventRepository,
                          PreliminaryVerificationCheckRepository preliminaryVerificationCheckRepository,
                          BidderDocumentRepository bidderDocumentRepository) {
        List<ReqSpec> specs = List.of(
                new ReqSpec("REQ-DEMO-001", "Experience", "Minimum Relevant Experience",
                        ">= 5 years", "7 years relevant experience", "PASS", "LOW", 94, 2,
                        "7 years of relevant railway experience detected in certificate"),
                new ReqSpec("REQ-DEMO-002", "Technical", "Technical Specification Compliance",
                        "Fully compliant with technical specifications", "Fully compliant", "PASS", "LOW", 92, 3,
                        "Technical compliance statement verified"),
                new ReqSpec("REQ-DEMO-003", "Legal", "Signed Declaration & Integrity Pact",
                        "Signed declaration present", "Signed declaration present", "PASS", "LOW", 95, 4,
                        "Signed declaration found in submission"),
                new ReqSpec("REQ-DEMO-004", "Document", "Required Supporting Document",
                        "Eligibility document present", "Eligibility documents present", "PASS", "LOW", 91, 4,
                        "Eligibility documents present in submission"),
                new ReqSpec("REQ-DEMO-005", "Financial", "Document Validity Requirement",
                        "Valid at submission deadline", "Validity period requires manual verification",
                        "REVIEW", "MEDIUM", 70, 5, "Certificate validity requires confirmation against deadline"),
                new ReqSpec("REQ-DEMO-006", "Experience", "Relevant Project Experience",
                        "At least 1 similar project", "2 similar projects found", "PASS", "LOW", 90, 5,
                        "Two similar railway projects found")
        );
        seedRequirementGroup(requirementRepository, complianceResultRepository, BID_ACME, specs,
                java.util.Map.of(
                        "REQ-DEMO-001", List.of("FACT-DEMO-ACME-001"),
                        "REQ-DEMO-002", List.of("FACT-DEMO-ACME-004"),
                        "REQ-DEMO-003", List.of("FACT-DEMO-ACME-003")));

        if (evidenceDetailRepository.findByRequirementId(BID_ACME + ":REQ-DEMO-001").isEmpty()) {
            evidenceDetailRepository.save(ev(BID_ACME, "REQ-DEMO-001", "Minimum Relevant Experience",
                    "DEMO_EXPERIENCE_ACME.pdf", 1,
                    "Experience certificate confirms 7 years of relevant railway infrastructure work.",
                    "PASS", 94, ">= 5 years", "7 years relevant experience",
                    "Experience value meets the minimum threshold"));
        }
        if (evidenceDetailRepository.findByRequirementId(BID_ACME + ":REQ-DEMO-005").isEmpty()) {
            evidenceDetailRepository.save(ev(BID_ACME, "REQ-DEMO-005", "Document Validity Requirement",
                    "DEMO_FINANCIAL_ACME.pdf", 1,
                    "Certificate validity period ends 2027-03-31; manual confirmation against the submission deadline is required.",
                    "REVIEW", 70, "Valid at submission deadline",
                    "Validity period requires manual verification",
                    "Validity dates detected but need manual confirmation"));
        }

        if (bidderFactRepository.findByBidId(BID_ACME).isEmpty()) {
            bidderFactRepository.saveAll(List.of(
                    fact(BID_ACME, "FACT-DEMO-ACME-001", "Experience", "experience_years", "7",
                            "years", null, 94, "DEMO_EXPERIENCE_ACME.pdf", 1,
                            "Experience Certificate",
                            "Certificate confirms 7 years of relevant railway infrastructure experience."),
                    fact(BID_ACME, "FACT-DEMO-ACME-002", "Financial", "annual_turnover", "6.0",
                            "INR crore", "FY2025-26", 92, "DEMO_FINANCIAL_ACME.pdf", 1,
                            "Financial Summary",
                            "Reported annual turnover for FY2025-26 is 6.0 INR crore."),
                    fact(BID_ACME, "FACT-DEMO-ACME-003", "Legal", "declaration_status",
                            "Signed declaration present", null, null, 95,
                            "DEMO_DECLARATION_ACME.pdf", 1, "Declaration",
                            "Signed declaration and integrity pact found on page 1."),
                    fact(BID_ACME, "FACT-DEMO-ACME-004", "Technical", "technical_spec",
                            "Fully compliant", null, null, 93, "DEMO_TECHNICAL_ACME.pdf", 1,
                            "Technical Compliance Statement",
                            "Technical compliance statement confirms full compliance with the RFP.")));
        }

        if (riskCategorySummaryRepository.findByBidId(BID_ACME).isEmpty()) {
            riskCategorySummaryRepository.saveAll(List.of(
                    risk(BID_ACME, "Experience", "LOW", 10, "7 years of experience exceeds the 5-year minimum"),
                    risk(BID_ACME, "Documentation", "LOW", 8, "All required documents present in submission")));
        }

        if (preliminaryVerificationCheckRepository.findByBidId(BID_ACME).isEmpty()) {
            preliminaryVerificationCheckRepository.saveAll(List.of(
                    prelim(BID_ACME, "DEMO_FINANCIAL_ACME.pdf",
                            PreliminaryVerificationCheck.CheckType.DOCUMENT_VALIDITY,
                            PreliminaryVerificationCheck.CheckStatus.PASS,
                            "Financial documents valid through 2027-03-31",
                            "DEMO_FINANCIAL_ACME.pdf", 1),
                    prelim(BID_ACME, "DEMO_ELIGIBILITY_ACME.pdf",
                            PreliminaryVerificationCheck.CheckType.REQUIRED_DOCUMENT,
                            PreliminaryVerificationCheck.CheckStatus.PASS,
                            "All mandatory documents present in submission",
                            "DEMO_ELIGIBILITY_ACME.pdf", 1)));
        }

        saveDocIfAbsent(bidderDocumentRepository, demoDoc(BID_ACME, "Tender RFP Specification",
                TENDER_DOC, 6,
                "SYNTHETIC DEMO DATA - Tender RFP for " + TENDER_A_TITLE + "\n"
                        + "Tender ID: " + TENDER_A + "\n"
                        + "Minimum Relevant Experience: >= 5 years\n"
                        + "Technical Specification Compliance: fully compliant with RFP\n"
                        + "Signed Declaration & Integrity Pact: signed declaration present\n"
                        + "Required Supporting Document: eligibility document present\n"
                        + "Document Validity Requirement: valid at submission deadline\n"
                        + "Relevant Project Experience: at least 1 similar project\n"
                        + "Issued by the Railway Procurement Department for demonstration purposes.",
                LocalDateTime.now(), OFFICER_DEMO));
        saveDocIfAbsent(bidderDocumentRepository, demoDoc(BID_ACME, "Eligibility & Submission Documents",
                "DEMO_ELIGIBILITY_ACME.pdf", 2,
                "SYNTHETIC DEMO DATA - Eligibility and Submission Documents\n"
                        + "Bidder: " + ORG_ACME + " (" + REG_ACME + ")\n"
                        + "All mandatory eligibility documents are attached to this synthetic submission.",
                LocalDateTime.now(), USER_DEMO));
        saveDocIfAbsent(bidderDocumentRepository, demoDoc(BID_ACME, "Technical Specification Compliance",
                "DEMO_TECHNICAL_ACME.pdf", 3,
                "SYNTHETIC DEMO DATA - Technical Compliance Statement\n"
                        + "Bidder: " + ORG_ACME + "\n"
                        + "The offered equipment is fully compliant with all technical specifications\n"
                        + "listed in " + TENDER_A_TITLE + " (" + TENDER_A + ").",
                LocalDateTime.now(), USER_DEMO));
        saveDocIfAbsent(bidderDocumentRepository, demoDoc(BID_ACME, "Financial Statements & Validity",
                "DEMO_FINANCIAL_ACME.pdf", 3,
                "SYNTHETIC DEMO DATA - Financial Summary\n"
                        + "Bidder: " + ORG_ACME + "\n"
                        + "Annual turnover FY2025-26: 6.0 INR crore\n"
                        + "Certificate validity: valid through 2027-03-31 (confirmation against the\n"
                        + "submission deadline is recommended during manual review).",
                LocalDateTime.now(), USER_DEMO));
        saveDocIfAbsent(bidderDocumentRepository, demoDoc(BID_ACME, "Prior Project Experience Certificate",
                "DEMO_EXPERIENCE_ACME.pdf", 2,
                "SYNTHETIC DEMO DATA - Experience Certificate\n"
                        + "Bidder: " + ORG_ACME + "\n"
                        + "Relevant experience: 7 years in railway infrastructure maintenance.\n"
                        + "Similar projects delivered: 2 (both for public sector rail clients).",
                LocalDateTime.now(), USER_DEMO));
        saveDocIfAbsent(bidderDocumentRepository, demoDoc(BID_ACME, "Signed Declaration & Integrity Pact",
                "DEMO_DECLARATION_ACME.pdf", 2,
                "SYNTHETIC DEMO DATA - Signed Declaration and Integrity Pact\n"
                        + "Bidder: " + ORG_ACME + "\n"
                        + "Declaration signed by an authorised signatory; integrity pact attached.",
                LocalDateTime.now(), USER_DEMO));

        saveAuditIfAbsent(auditEventRepository, TENDER_A, audit(TENDER_A, OFFICER_DEMO,
                "GOVT OFFICER", "TENDER_CREATED", "Tender", "SUCCESS",
                "Synthetic demo tender " + TENDER_A + " created for SIH demo data"));
        saveAuditIfAbsent(auditEventRepository, BID_ACME, audit(BID_ACME, USER_DEMO,
                "USER", "BID_SUBMITTED", "Bid", "SUCCESS",
                "Bid " + BID_ACME + " submitted for tender " + TENDER_A));
        saveAuditIfAbsent(auditEventRepository, BID_ACME, audit(BID_ACME, "SYSTEM",
                "AI", "REQUIREMENTS_EXTRACTED", "Requirement", "SUCCESS",
                "6 requirements extracted for bid " + BID_ACME));
    }

    private void seedBharat(RequirementRepository requirementRepository,
                            ComplianceResultRepository complianceResultRepository,
                            EvidenceDetailRepository evidenceDetailRepository,
                            BidderFactRepository bidderFactRepository,
                            RiskCategorySummaryRepository riskCategorySummaryRepository,
                            ConflictItemRepository conflictItemRepository,
                            AuditEventRepository auditEventRepository,
                            PreliminaryVerificationCheckRepository preliminaryVerificationCheckRepository,
                            BidderDocumentRepository bidderDocumentRepository,
                            OfficerReviewRecordRepository officerReviewRecordRepository) {
        List<ReqSpec> specs = List.of(
                new ReqSpec("REQ-DEMO-001", "Experience", "Minimum Relevant Experience",
                        ">= 5 years", "3 years relevant experience", "FAIL", "HIGH", 96, 2,
                        "3 years of experience is below the required 5-year minimum"),
                new ReqSpec("REQ-DEMO-002", "Technical", "Technical Specification Compliance",
                        "Fully compliant with technical specifications", "Compliant", "PASS", "LOW", 90, 3,
                        "Technical compliance statement verified"),
                new ReqSpec("REQ-DEMO-003", "Legal", "Signed Declaration & Integrity Pact",
                        "Signed declaration present", "Signed declaration present", "PASS", "LOW", 93, 4,
                        "Signed declaration found in submission"),
                new ReqSpec("REQ-DEMO-004", "Document", "Required Supporting Document",
                        "Eligibility document present", "Not found", "MISSING", "HIGH", 0, 4,
                        "No eligibility document found in submission"),
                new ReqSpec("REQ-DEMO-005", "Financial", "Document Validity Requirement",
                        "Valid at submission deadline", "Validity period unclear", "REVIEW", "MEDIUM", 65, 5,
                        "Validity dates could not be confirmed from submitted documents"),
                new ReqSpec("REQ-DEMO-006", "Experience", "Relevant Project Experience",
                        "At least 1 similar project", "1 project found; relevance unconfirmed",
                        "REVIEW", "MEDIUM", 62, 5, "Experience relevance requires manual review")
        );
        seedRequirementGroup(requirementRepository, complianceResultRepository, BID_BHARAT, specs,
                java.util.Map.of(
                        "REQ-DEMO-001", List.of("FACT-DEMO-BHARAT-001"),
                        "REQ-DEMO-005", List.of("FACT-DEMO-BHARAT-002")));

        if (evidenceDetailRepository.findByRequirementId(BID_BHARAT + ":REQ-DEMO-001").isEmpty()) {
            evidenceDetailRepository.save(ev(BID_BHARAT, "REQ-DEMO-001", "Minimum Relevant Experience",
                    "DEMO_EXPERIENCE_BHARAT.pdf", 1,
                    "Experience certificate states only 3 years of relevant work against a 5-year minimum.",
                    "FAIL", 96, ">= 5 years", "3 years relevant experience",
                    "Experience value is below the required minimum"));
        }
        if (evidenceDetailRepository.findByRequirementId(BID_BHARAT + ":REQ-DEMO-004").isEmpty()) {
            evidenceDetailRepository.save(ev(BID_BHARAT, "REQ-DEMO-004", "Required Supporting Document",
                    null, null,
                    "No eligibility document was uploaded with this submission.",
                    "MISSING", 0, "Eligibility document present", "Not found",
                    "Required document not found in submission inventory"));
        }
        if (evidenceDetailRepository.findByRequirementId(BID_BHARAT + ":REQ-DEMO-005").isEmpty()) {
            evidenceDetailRepository.save(ev(BID_BHARAT, "REQ-DEMO-005", "Document Validity Requirement",
                    "DEMO_FINANCIAL_BHARAT.pdf", 1,
                    "Validity dates could not be confirmed from the submitted financial documents.",
                    "REVIEW", 65, "Valid at submission deadline", "Validity period unclear",
                    "Validity confirmation requires manual review"));
        }

        if (bidderFactRepository.findByBidId(BID_BHARAT).isEmpty()) {
            bidderFactRepository.saveAll(List.of(
                    fact(BID_BHARAT, "FACT-DEMO-BHARAT-001", "Experience", "experience_years", "3",
                            "years", null, 96, "DEMO_EXPERIENCE_BHARAT.pdf", 1,
                            "Experience Certificate",
                            "Certificate states 3 years of relevant railway experience."),
                    fact(BID_BHARAT, "FACT-DEMO-BHARAT-002", "Financial", "annual_turnover", "4.2",
                            "INR crore", "FY2025-26", 90, "DEMO_FINANCIAL_BHARAT.pdf", 1,
                            "Financial Summary",
                            "Reported annual turnover for FY2025-26 is 4.2 INR crore.")));
        }

        if (riskCategorySummaryRepository.findByBidId(BID_BHARAT).isEmpty()) {
            riskCategorySummaryRepository.saveAll(List.of(
                    risk(BID_BHARAT, "Experience", "HIGH", 85, "Experience below the minimum threshold"),
                    risk(BID_BHARAT, "Documentation", "MEDIUM", 45, "Supporting eligibility document missing"),
                    risk(BID_BHARAT, "Financial", "MEDIUM", 40, "Document validity requires verification")));
        }

        if (conflictItemRepository.findByBidId(BID_BHARAT).isEmpty()) {
            conflictItemRepository.save(ConflictItem.builder()
                    .bidId(BID_BHARAT)
                    .requirementId("REQ-DEMO-001")
                    .conflictId("DEMO-CONFLICT-001")
                    .conflictType("experience_discrepancy")
                    .requiresManualReview(true)
                    .title("Experience Claim Discrepancy")
                    .requirement("Minimum Relevant Experience")
                    .submittedDocument("DEMO_EXPERIENCE_BHARAT.pdf")
                    .submittedValue("3 years relevant experience")
                    .verificationSource("Bidder Self-Declaration (submission form)")
                    .verificationValue("Declared 5.5 years of experience")
                    .status("HUMAN REVIEW REQUIRED")
                    .riskLevel("HIGH")
                    .sources(List.of("DEMO_EXPERIENCE_BHARAT.pdf",
                            "Bidder Self-Declaration (submission form)"))
                    .factIds(List.of("FACT-DEMO-BHARAT-001"))
                    .explanation("SYNTHETIC DEMO DATA: submitted certificate (3 years) conflicts with the "
                            + "self-declared experience value (5.5 years); officer verification required.")
                    .build());
        }

        if (preliminaryVerificationCheckRepository.findByBidId(BID_BHARAT).isEmpty()) {
            preliminaryVerificationCheckRepository.saveAll(List.of(
                    prelim(BID_BHARAT, "DEMO_FINANCIAL_BHARAT.pdf",
                            PreliminaryVerificationCheck.CheckType.DOCUMENT_VALIDITY,
                            PreliminaryVerificationCheck.CheckStatus.REVIEW,
                            "Certificate validity period unclear for manual review",
                            "DEMO_FINANCIAL_BHARAT.pdf", 1),
                    prelim(BID_BHARAT, "DEMO_ELIGIBILITY_BHARAT.pdf",
                            PreliminaryVerificationCheck.CheckType.REQUIRED_DOCUMENT,
                            PreliminaryVerificationCheck.CheckStatus.MISSING,
                            "Eligibility document not found in submission",
                            null, null)));
        }

        if (officerReviewRecordRepository.findByBidId(BID_BHARAT).isEmpty()) {
            officerReviewRecordRepository.save(OfficerReviewRecord.builder()
                    .bidId(BID_BHARAT)
                    .officerName("Rajesh V. Sharma")
                    .officerDesignation("Senior Procurement Officer")
                    .recommendation("Recheck the experience certificate before shortlisting "
                            + BID_BHARAT + " (SYNTHETIC DEMO DATA)")
                    .finalDecision("UNDER_REVIEW")
                    .comment("Experience discrepancy flagged for manual verification.")
                    .updatedAt(LocalDateTime.now())
                    .build());
        }

        saveDocIfAbsent(bidderDocumentRepository, demoDoc(BID_BHARAT, "Prior Project Experience Certificate",
                "DEMO_EXPERIENCE_BHARAT.pdf", 2,
                "SYNTHETIC DEMO DATA - Experience Certificate\n"
                        + "Bidder: " + ORG_BHARAT + " (" + REG_BHARAT + ")\n"
                        + "Relevant experience: 3 years in railway signalling equipment supply.\n"
                        + "The bid self-declaration claims 5.5 years; this certificate states 3 years.",
                LocalDateTime.now(), UPLOADER_BHARAT));
        saveDocIfAbsent(bidderDocumentRepository, demoDoc(BID_BHARAT, "Financial Statements & Validity",
                "DEMO_FINANCIAL_BHARAT.pdf", 2,
                "SYNTHETIC DEMO DATA - Financial Summary\n"
                        + "Bidder: " + ORG_BHARAT + "\n"
                        + "Annual turnover FY2025-26: 4.2 INR crore\n"
                        + "Certificate validity dates could not be determined from this document.",
                LocalDateTime.now(), UPLOADER_BHARAT));

        saveAuditIfAbsent(auditEventRepository, BID_BHARAT, audit(BID_BHARAT, "SYSTEM",
                "AI", "BID_CREATED", "Bid", "SUCCESS",
                "Bid " + BID_BHARAT + " created for tender " + TENDER_A));
        saveAuditIfAbsent(auditEventRepository, BID_BHARAT, audit(BID_BHARAT, "SYSTEM",
                "AI", "COMPLIANCE_VERIFICATION_COMPLETED", "ComplianceResult", "SUCCESS",
                "Compliance verification completed for bid " + BID_BHARAT));
        saveAuditIfAbsent(auditEventRepository, BID_BHARAT, audit(BID_BHARAT, OFFICER_DEMO,
                "GOVT OFFICER", "OFFICER_REVIEWED_EVIDENCE", "Bid", "WARNING",
                "Experience discrepancy flagged for manual review on bid " + BID_BHARAT));
    }

    private void seedNova(RequirementRepository requirementRepository,
                          ComplianceResultRepository complianceResultRepository,
                          EvidenceDetailRepository evidenceDetailRepository,
                          BidderFactRepository bidderFactRepository,
                          RiskCategorySummaryRepository riskCategorySummaryRepository,
                          AuditEventRepository auditEventRepository,
                          PreliminaryVerificationCheckRepository preliminaryVerificationCheckRepository,
                          BidderDocumentRepository bidderDocumentRepository) {
        List<ReqSpec> specs = List.of(
                new ReqSpec("REQ-DEMO-001", "Experience", "Minimum Relevant Experience",
                        ">= 5 years", "6 years relevant experience", "PASS", "LOW", 93, 2,
                        "6 years of relevant railway experience detected in certificate"),
                new ReqSpec("REQ-DEMO-002", "Technical", "Technical Specification Compliance",
                        "Fully compliant with technical specifications", "Minor clarifications pending",
                        "REVIEW", "MEDIUM", 68, 3, "Minor technical clarifications require manual review"),
                new ReqSpec("REQ-DEMO-003", "Legal", "Signed Declaration & Integrity Pact",
                        "Signed declaration present", "Signed declaration present", "PASS", "LOW", 94, 4,
                        "Signed declaration found in submission"),
                new ReqSpec("REQ-DEMO-004", "Document", "Required Supporting Document",
                        "Eligibility document present", "Eligibility documents present", "PASS", "LOW", 92, 4,
                        "Eligibility documents present in submission"),
                new ReqSpec("REQ-DEMO-005", "Financial", "Document Validity Requirement",
                        "Valid at submission deadline", "Valid at submission deadline", "PASS", "LOW", 89, 5,
                        "Documents valid at the submission deadline"),
                new ReqSpec("REQ-DEMO-006", "Experience", "Relevant Project Experience",
                        "At least 1 similar project", "1 similar project found", "PASS", "LOW", 88, 5,
                        "One similar railway project found")
        );
        seedRequirementGroup(requirementRepository, complianceResultRepository, BID_NOVA, specs,
                java.util.Map.of(
                        "REQ-DEMO-001", List.of("FACT-DEMO-NOVA-001"),
                        "REQ-DEMO-002", List.of("FACT-DEMO-NOVA-002")));

        if (evidenceDetailRepository.findByRequirementId(BID_NOVA + ":REQ-DEMO-002").isEmpty()) {
            evidenceDetailRepository.save(ev(BID_NOVA, "REQ-DEMO-002", "Technical Specification Compliance",
                    "DEMO_TECHNICAL_NOVA.pdf", 1,
                    "Two minor technical clarifications remain open for manual review.",
                    "REVIEW", 68, "Fully compliant with technical specifications",
                    "Minor clarifications pending",
                    "Clarifications must be resolved by an officer before final decision"));
        }

        if (bidderFactRepository.findByBidId(BID_NOVA).isEmpty()) {
            bidderFactRepository.saveAll(List.of(
                    fact(BID_NOVA, "FACT-DEMO-NOVA-001", "Experience", "experience_years", "6",
                            "years", null, 95, "DEMO_EXPERIENCE_NOVA.pdf", 1,
                            "Experience Certificate",
                            "Certificate confirms 6 years of relevant railway inspection experience."),
                    fact(BID_NOVA, "FACT-DEMO-NOVA-002", "Technical", "technical_spec",
                            "Minor clarifications pending", null, null, 70,
                            "DEMO_TECHNICAL_NOVA.pdf", 1, "Technical Compliance Statement",
                            "Two minor technical clarifications are listed for manual review.")));
        }

        if (riskCategorySummaryRepository.findByBidId(BID_NOVA).isEmpty()) {
            riskCategorySummaryRepository.saveAll(List.of(
                    risk(BID_NOVA, "Technical", "MEDIUM", 35, "Minor technical clarifications pending")));
        }

        if (preliminaryVerificationCheckRepository.findByBidId(BID_NOVA).isEmpty()) {
            preliminaryVerificationCheckRepository.saveAll(List.of(
                    prelim(BID_NOVA, "DEMO_EXPERIENCE_NOVA.pdf",
                            PreliminaryVerificationCheck.CheckType.CROSS_PAGE_CONSISTENCY,
                            PreliminaryVerificationCheck.CheckStatus.PASS,
                            "Experience values consistent across pages",
                            "DEMO_EXPERIENCE_NOVA.pdf", 1),
                    prelim(BID_NOVA, "DEMO_TECHNICAL_NOVA.pdf",
                            PreliminaryVerificationCheck.CheckType.REQUIRED_DOCUMENT,
                            PreliminaryVerificationCheck.CheckStatus.PASS,
                            "Mandatory documents present in submission",
                            "DEMO_TECHNICAL_NOVA.pdf", 1)));
        }

        saveDocIfAbsent(bidderDocumentRepository, demoDoc(BID_NOVA, "Technical Specification Compliance",
                "DEMO_TECHNICAL_NOVA.pdf", 3,
                "SYNTHETIC DEMO DATA - Technical Compliance Statement\n"
                        + "Bidder: " + ORG_NOVA + " (" + REG_NOVA + ")\n"
                        + "Two minor technical clarifications are pending review against the RFP\n"
                        + "specifications for " + TENDER_A_TITLE + ".",
                LocalDateTime.now(), UPLOADER_NOVA));
        saveDocIfAbsent(bidderDocumentRepository, demoDoc(BID_NOVA, "Prior Project Experience Certificate",
                "DEMO_EXPERIENCE_NOVA.pdf", 2,
                "SYNTHETIC DEMO DATA - Experience Certificate\n"
                        + "Bidder: " + ORG_NOVA + "\n"
                        + "Relevant experience: 6 years in railway safety inspection systems.\n"
                        + "Similar projects delivered: 1.",
                LocalDateTime.now(), UPLOADER_NOVA));
    }

    private void seedRequirementGroup(RequirementRepository requirementRepository,
                                      ComplianceResultRepository complianceResultRepository,
                                      String bidId,
                                      List<ReqSpec> specs,
                                      java.util.Map<String, List<String>> factLinks) {
        if (requirementRepository.findByBidId(bidId).isEmpty()) {
            List<Requirement> requirements = new ArrayList<>();
            for (ReqSpec spec : specs) {
                requirements.add(Requirement.builder()
                        .bidId(bidId)
                        .requirementId(spec.reqId())
                        .category(spec.category())
                        .requirement(spec.requirement())
                        .requiredValue(spec.requiredValue())
                        .detectedValue(spec.detectedValue())
                        .status(spec.status())
                        .risk(spec.risk())
                        .confidence(spec.confidence())
                        .sourceDoc(TENDER_DOC)
                        .pageNumber(spec.page())
                        .mandatory(true)
                        .reason(spec.reason())
                        .build());
            }
            requirementRepository.saveAll(requirements);
        }
        if (complianceResultRepository.findByBidId(bidId).isEmpty()) {
            List<ComplianceResult> results = new ArrayList<>();
            for (ReqSpec spec : specs) {
                String rule;
                if ("MISSING".equals(spec.status())) {
                    rule = "MISSING_EVIDENCE_RULE";
                } else if ("Experience".equals(spec.category()) || "Financial".equals(spec.category())) {
                    rule = "MINIMUM_VALUE_COMPARISON";
                } else {
                    rule = "TEXT_MISMATCH_RULE";
                }
                results.add(ComplianceResult.builder()
                        .bidId(bidId)
                        .requirementId(spec.reqId())
                        .status(spec.status())
                        .requiredValue(spec.requiredValue())
                        .detectedValue(spec.detectedValue())
                        .reason(spec.reason())
                        .confidence(spec.confidence())
                        .mandatory(true)
                        .requiresManualReview(!"PASS".equals(spec.status()))
                        .ruleUsed(rule)
                        .factIds(factLinks.getOrDefault(spec.reqId(), List.of()))
                        .build());
            }
            complianceResultRepository.saveAll(results);
        }
    }

    private void saveAuditIfAbsent(AuditEventRepository repo, String key, AuditEvent event) {
        boolean exists = repo.findByBidIdOrderByTimestampDesc(key).stream()
                .anyMatch(e -> e.getDetails() != null && e.getDetails().equals(event.getDetails()));
        if (!exists) {
            repo.save(event);
        }
    }

    private void saveDocIfAbsent(BidderDocumentRepository repo, BidderDocument doc) {
        boolean exists = repo.findByBidIdOrderByUploadedAtDesc(doc.getBidId()).stream()
                .anyMatch(d -> doc.getFilename().equals(d.getFilename()));
        if (!exists) {
            repo.save(doc);
        }
    }

    private BidderDocument demoDoc(String bidId, String docType, String filename, int pages,
                                   String text, LocalDateTime uploadedAt, String uploadedBy) {
        Path target = Paths.get(uploadDir, bidId, "seed", filename);
        Path written = writeDemoPdf(target, docType + " - " + filename, text, pages);
        String storedPath = written != null ? written.toAbsolutePath().toString() : null;
        String fileSize = (pages * 42) + " KB";
        if (written != null) {
            try {
                fileSize = Math.max(1, Files.size(written) / 1024) + " KB";
            } catch (IOException ignored) {
            }
        }
        return BidderDocument.builder()
                .bidId(bidId)
                .filename(filename)
                .docType(docType)
                .fileFormat("PDF")
                .fileSize(fileSize)
                .uploadStatus("UPLOADED")
                .processingStatus("COMPLETED")
                .pageCount(pages)
                .uploadedAt(uploadedAt)
                .uploadedBy(uploadedBy)
                .storedPath(storedPath)
                .extractedText(text)
                .stages(new ArrayList<>())
                .build();
    }

    private EvidenceDetail ev(String bidId, String reqId, String title, String src, Integer page,
                              String snippet, String decision, double conf, String requiredValue,
                              String detectedValue, String reason) {
        return EvidenceDetail.builder()
                .requirementId(bidId + ":" + reqId)
                .requirementTitle(title)
                .sourceDocument(src)
                .pageNumber(page)
                .extractedSnippet(snippet)
                .requiredValue(requiredValue)
                .detectedValue(detectedValue)
                .decision(decision)
                .reason(reason)
                .confidence(conf)
                .verificationSource("Document OCR Extraction & NLP Matching")
                .build();
    }

    private BidderFact fact(String bidId, String factId, String category, String fieldName,
                            String value, String unit, String period, double confidence,
                            String sourceDocument, int page, String section, String sourceText) {
        return BidderFact.builder()
                .bidId(bidId)
                .factId(factId)
                .category(category)
                .fieldName(fieldName)
                .detectedValue(value)
                .unit(unit)
                .period(period)
                .confidence(confidence)
                .ambiguous(false)
                .sourceDocument(sourceDocument)
                .pageNumber(page)
                .sectionName(section)
                .sourceText(sourceText)
                .build();
    }

    private RiskCategorySummary risk(String bidId, String cat, String level, int score, String summary) {
        return RiskCategorySummary.builder()
                .bidId(bidId).category(cat).riskLevel(level).score(score).summary(summary)
                .factors(List.of("AI risk assessment"))
                .build();
    }

    private PreliminaryVerificationCheck prelim(String bidId, String documentId,
                                                PreliminaryVerificationCheck.CheckType type,
                                                PreliminaryVerificationCheck.CheckStatus status,
                                                String message, String evidenceRef, Integer page) {
        return PreliminaryVerificationCheck.builder()
                .bidId(bidId)
                .documentId(documentId)
                .checkType(type)
                .status(status)
                .message(message)
                .expectedValue("")
                .actualValue("")
                .evidenceReference(evidenceRef)
                .sourcePage(page)
                .createdAt(LocalDateTime.now())
                .build();
    }

    private AuditEvent audit(String bidId, String actor, String role, String action, String entity,
                             String status, String details) {
        return AuditEvent.builder()
                .bidId(bidId).timestamp(LocalDateTime.now()).actor(actor).userRole(role)
                .action(action).entity(entity).status(status).details(details)
                .build();
    }

    private record ReqSpec(String reqId, String category, String requirement, String requiredValue,
                           String detectedValue, String status, String risk, double confidence,
                           int page, String reason) {
    }

    private Path writeDemoPdf(Path target, String title, String body, int pages) {
        if (Files.isRegularFile(target)) return target;
        try {
            Files.createDirectories(target.getParent());
        } catch (IOException e) {
            return null;
        }
        try (PDDocument pdf = new PDDocument()) {
            String[] lines = wrapAscii(body, 92);
            for (int p = 1; p <= Math.max(1, pages); p++) {
                PDPage page = new PDPage(PDRectangle.A4);
                pdf.addPage(page);
                try (PDPageContentStream cs = new PDPageContentStream(pdf, page)) {
                    cs.beginText();
                    cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD), 13);
                    cs.setLeading(17f);
                    cs.newLineAtOffset(50, 792);
                    cs.showText(sanitizeAscii(title));
                    cs.newLine();
                    cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 9);
                    cs.showText("SIH26100 National Procurement Verification Portal - synthetic demo document");
                    cs.newLine();
                    cs.showText("Page " + p + " of " + Math.max(1, pages));
                    cs.endText();

                    cs.beginText();
                    cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 10);
                    cs.setLeading(13f);
                    cs.newLineAtOffset(50, 740);
                    int start = (int) ((long) (p - 1) * lines.length / Math.max(1, pages));
                    int end = (int) ((long) p * lines.length / Math.max(1, pages));
                    if (start >= end) {
                        cs.showText("(Continuation page of the paginated demo document.)");
                    } else {
                        for (int i = start; i < end; i++) {
                            cs.showText(lines[i]);
                            cs.newLine();
                        }
                    }
                    cs.endText();
                }
            }
            pdf.save(target.toFile());
            return target;
        } catch (IOException | RuntimeException e) {
            return null;
        }
    }

    private String[] wrapAscii(String text, int width) {
        List<String> out = new ArrayList<>();
        for (String paragraph : text.split("\n")) {
            String line = sanitizeAscii(paragraph);
            while (line.length() > width) {
                int cut = line.lastIndexOf(' ', width);
                if (cut <= 0) cut = width;
                out.add(line.substring(0, cut));
                line = line.substring(cut).stripLeading();
            }
            out.add(line);
        }
        return out.toArray(new String[0]);
    }

    private String sanitizeAscii(String value) {
        StringBuilder sb = new StringBuilder(value.length());
        for (char c : value.toCharArray()) {
            sb.append(c >= 32 && c < 127 ? c : '?');
        }
        return sb.toString();
    }
}
