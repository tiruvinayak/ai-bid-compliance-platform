package com.sih.gem.config;

import com.sih.gem.entity.*;
import com.sih.gem.repository.*;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Configuration
@Profile("dev")
public class DataSeeder {

    @Value("${app.upload.dir}")
    private String uploadDir;

    @Bean
    @Order(50)
    CommandLineRunner seedData(UserRepository userRepository,
                               GovernmentInstructionRepository instructionRepository,
                               HelpdeskFAQRepository faqRepository,
                               BidRepository bidRepository,
                               RequirementRepository requirementRepository,
                               EvidenceDetailRepository evidenceRepository,
                               RiskCategorySummaryRepository riskRepository,
                               ConflictItemRepository conflictRepository,
                               AuditEventRepository auditRepository,
                               OfficerReviewRecordRepository reviewRepository,
                               ComplianceResultRepository complianceRepository,
                               PreliminaryVerificationCheckRepository preliminaryRepository,
                               BidderDocumentRepository documentRepository,
                               BidderFactRepository factRepository,
                               PasswordEncoder passwordEncoder) {
        return args -> {
            seedUsers(userRepository, passwordEncoder);
            seedInstructions(instructionRepository);
            seedFAQs(faqRepository);
            seedSampleBid(bidRepository, requirementRepository, evidenceRepository,
                    riskRepository, conflictRepository, auditRepository, reviewRepository);
            seedComparisonDemoBids(bidRepository, requirementRepository, evidenceRepository,
                    riskRepository, conflictRepository, auditRepository,
                    complianceRepository, preliminaryRepository, documentRepository, factRepository);
        };
    }

    private void seedUsers(UserRepository repo, PasswordEncoder encoder) {
        // Only create users if they don't already exist
        if (repo.findByEmail("user@demo.gov.in").isEmpty()) {
            repo.save(User.builder()
                    .email("user@demo.gov.in")
                    .password(encoder.encode("User@123"))
                    .name("Sathvik Reddy")
                    .designation("Authorized Bidder Representative")
                    .department("ABC Technologies Pvt Ltd")
                    .role("USER")
                    .accountStatus("Active")
                    .createdAt(LocalDateTime.now())
                    .build());
        }

        if (repo.findByEmail("officer@demo.gov.in").isEmpty()) {
            repo.save(User.builder()
                    .email("officer@demo.gov.in")
                    .password(encoder.encode("Officer@123"))
                    .name("Rajesh V. Sharma")
                    .designation("Senior Procurement Officer")
                    .department("Railway Procurement Department")
                    .officerId("OFF-RPD-DEMO-001")
                    .role("GOVERNMENT OFFICER")
                    .accountStatus("Active")
                    .createdAt(LocalDateTime.now())
                    .build());
        }
    }

    private void seedInstructions(GovernmentInstructionRepository repo) {
        if (repo.count() > 0) return;

        repo.saveAll(List.of(
                GovernmentInstruction.builder()
                        .title("GeM Procurement Guidelines")
                        .description("All procurement on GeM must follow the General Financial Rules (GFR) 2017 and GeM Procurement Policy. Bidders must be registered on the GeM portal.")
                        .category("Procurement Guidelines")
                        .sourceRef("GeM Policy 2024")
                        .isRestriction(false)
                        .build(),
                GovernmentInstruction.builder()
                        .title("Mandatory Document Submission")
                        .description("Bidders must submit GST certificate, PAN, company registration, audited financial statements, and technical compliance statement as part of the bid.")
                        .category("Document Requirements")
                        .sourceRef("RFP Clause 4.2")
                        .isRestriction(false)
                        .build(),
                GovernmentInstruction.builder()
                        .title("Turnover Requirement")
                        .description("Bidders must demonstrate a minimum average annual turnover as specified in the tender. Financial statements must be audited by a chartered accountant.")
                        .category("Financial Requirements")
                        .sourceRef("RFP Clause 5.1")
                        .isRestriction(false)
                        .build(),
                GovernmentInstruction.builder()
                        .title("Prior Experience Requirement")
                        .description("Bidders must provide work orders or experience certificates for at least one similar project in the last three years.")
                        .category("Experience Requirements")
                        .sourceRef("RFP Clause 5.2")
                        .isRestriction(false)
                        .build(),
                GovernmentInstruction.builder()
                        .title("Integrity Pact Requirement")
                        .description("Submission of a signed Integrity Pact / Undertaking is mandatory. Bids without this document will be summarily rejected.")
                        .category("Important Restrictions")
                        .sourceRef("RFP Clause 8.1")
                        .isRestriction(true)
                        .build(),
                GovernmentInstruction.builder()
                        .title("Blacklisting Restriction")
                        .description("Bidders blacklisted by any government department are ineligible to participate. A self-declaration of non-blacklisting is required.")
                        .category("Important Restrictions")
                        .sourceRef("GeM Policy 2024")
                        .isRestriction(true)
                        .build(),
                GovernmentInstruction.builder()
                        .title("How is compliance verified?")
                        .description("The system uses AI-assisted document analysis to extract and verify each requirement against submitted documents, flagging conflicts for human review.")
                        .category("Verification Guidance")
                        .sourceRef("System Documentation")
                        .isRestriction(false)
                        .build()
        ));
    }

    private void seedFAQs(HelpdeskFAQRepository repo) {
        if (repo.count() > 0) return;

        repo.saveAll(List.of(
                HelpdeskFAQ.builder()
                        .question("What document formats are supported for upload?")
                        .answer("We support PDF, DOCX, XLSX, CSV, PPTX, PNG and TXT files up to 50MB each.")
                        .category("Document Upload Help")
                        .build(),
                HelpdeskFAQ.builder()
                        .question("How long does document verification take?")
                        .answer("Verification typically completes within a few minutes after upload, depending on document size and complexity.")
                        .category("Verification Help")
                        .build(),
                HelpdeskFAQ.builder()
                        .question("What does a 'Review Required' status mean?")
                        .answer("It means the AI could not fully corroborate a requirement and a government officer needs to review the evidence manually.")
                        .category("Verification Help")
                        .build(),
                HelpdeskFAQ.builder()
                        .question("How do I reset my password?")
                        .answer("Contact the helpdesk with your registered email and a support ticket will be raised for password reset.")
                        .category("Account Help")
                        .build()
        ));
    }

    private void seedSampleBid(BidRepository bidRepo,
                               RequirementRepository reqRepo,
                               EvidenceDetailRepository evRepo,
                               RiskCategorySummaryRepository riskRepo,
                               ConflictItemRepository conflictRepo,
                               AuditEventRepository auditRepo,
                               OfficerReviewRecordRepository reviewRepo) {
        if (bidRepo.count() > 0) return;

        Bid bid = Bid.builder()
                .bidId("GEM-2026-001")
                .tenderId("TND-GEM-2026-1042")
                .tenderTitle("Supply and Installation of Network Infrastructure")
                .department("Railway Procurement Department")
                .bidderName("ABC Technologies Pvt Ltd")
                .registrationNo("CIN-U72900DL2019PTC345678")
                .gstin("07AABCT1234F1Z5")
                .category("IT & Networking")
                .tenderDate("2026-08-01")
                .closingDate("2026-09-15")
                .compliancePercentage(78.6)
                .riskLevel("MEDIUM")
                .status("Review Required")
                .totalRequirements(8)
                .passCount(5)
                .failCount(1)
                .reviewCount(2)
                .missingCount(1)
                .conflictCount(2)
                .createdAt(LocalDateTime.now())
                .build();
        bidRepo.save(bid);

        reqRepo.saveAll(List.of(
                req("GEM-2026-001", "REQ-001", "Financial", "Valid GST Registration Certificate",
                        "GSTIN present and valid", "07AABCT1234F1Z5", "PASS", "LOW", 95,
                        "GST_Certificate_2026.pdf", 1, true, "GSTIN extracted from certificate"),
                req("GEM-2026-001", "REQ-002", "Financial", "Audited Financial Statements (last 3 years)",
                        "Balance sheet & P&L for FY23-FY25", "Financial statements detected", "PASS", "MEDIUM", 88,
                        "Financial_Statement_FY25.pdf", 2, true, "Financial data detected in documents"),
                req("GEM-2026-001", "REQ-003", "Financial", "Minimum Annual Turnover",
                        "Turnover >= 10 crore", "Turnover: 12.5 crore", "REVIEW", "MEDIUM", 70,
                        "Financial_Statement_FY25.pdf", 3, true, "Turnover figure requires verification"),
                req("GEM-2026-001", "REQ-004", "Registration", "Company Registration (CIN)",
                        "Valid CIN number", "CIN-U72900DL2019PTC345678", "PASS", "LOW", 92,
                        "Registration_Certificate.pdf", 1, true, "CIN extracted"),
                req("GEM-2026-001", "REQ-005", "Registration", "PAN Card",
                        "Valid PAN", "AABCT1234F", "PASS", "LOW", 94,
                        "PAN_Card.pdf", 1, true, "PAN extracted"),
                req("GEM-2026-001", "REQ-006", "Experience", "Prior Government Contract Experience",
                        "At least 1 similar contract", "Work order detected", "REVIEW", "MEDIUM", 65,
                        "Work_Orders.pdf", 2, true, "Experience evidence requires review"),
                req("GEM-2026-001", "REQ-007", "Technical", "Technical Bid / Compliance Statement",
                        "Technical compliance declaration", "Technical declaration present", "PASS", "LOW", 90,
                        "Technical_Bid.pdf", 1, true, "Technical declaration present"),
                req("GEM-2026-001", "REQ-008", "Legal", "Integrity Pact / Undertaking",
                        "Signed integrity declaration", "Not found", "MISSING", "HIGH", 0,
                        "Undertaking.pdf", 1, true, "No integrity pact found")
        ));

        evRepo.saveAll(List.of(
                ev("GEM-2026-001:REQ-001", "Valid GST Registration Certificate", "GST_Certificate_2026.pdf",
                        1, "GSTIN 07AABCT1234F1Z5 verified against GSTN records.", "PASS", 95),
                ev("GEM-2026-001:REQ-003", "Minimum Annual Turnover", "Financial_Statement_FY25.pdf",
                        3, "Turnover of 12.5 crore detected in audited P&L statement.", "REVIEW", 70),
                ev("GEM-2026-001:REQ-008", "Integrity Pact / Undertaking", "Undertaking.pdf",
                        1, "No integrity pact document found in submission.", "MISSING", 0)
        ));

        riskRepo.saveAll(List.of(
                risk("GEM-2026-001", "Financial", "MEDIUM", 40, "Turnover verification pending"),
                risk("GEM-2026-001", "Documentation", "LOW", 10, "Most documents verified"),
                risk("GEM-2026-001", "Experience", "MEDIUM", 30, "Experience evidence under review"),
                risk("GEM-2026-001", "Registration", "LOW", 5, "Registration documents verified"),
                risk("GEM-2026-001", "Legal", "HIGH", 80, "Mandatory integrity pact missing")
        ));

        conflictRepo.saveAll(List.of(
                ConflictItem.builder()
                        .bidId("GEM-2026-001")
                        .requirementId("REQ-003")
                        .conflictId("CONFLICT-001")
                        .conflictType("financial_turnover")
                        .title("Turnover Figure Discrepancy")
                        .requirement("Minimum Annual Turnover")
                        .submittedDocument("Financial_Statement_FY25.pdf")
                        .submittedValue("INR 125,000,000")
                        .verificationSource("Turnover_Declaration_ABC.pdf")
                        .verificationValue("INR 118,000,000 Declared")
                        .status("MANUAL VERIFICATION REQUIRED")
                        .riskLevel("MEDIUM")
                        .sources(List.of("Financial_Statement_FY25.pdf", "Turnover_Declaration_ABC.pdf"))
                        .explanation("Cross-document discrepancy detected for TURNOVER: Financial_Statement_FY25.pdf reports 'INR 125,000,000', whereas Turnover_Declaration_ABC.pdf declares 'INR 118,000,000'.")
                        .requiresManualReview(true)
                        .build(),
                ConflictItem.builder()
                        .bidId("GEM-2026-001")
                        .requirementId("REQ-008")
                        .title("Mandatory document missing")
                        .requirement("Integrity Pact / Undertaking")
                        .submittedDocument("Undertaking.pdf")
                        .submittedValue("Not found")
                        .verificationSource("Document inventory")
                        .verificationValue("Required")
                        .status("HUMAN REVIEW REQUIRED")
                        .riskLevel("HIGH")
                        .sources(List.of("Undertaking.pdf"))
                        .explanation("Mandatory integrity pact not found in submission.")
                        .build()
        ));

        auditRepo.saveAll(List.of(
                audit("GEM-2026-001", "Rajesh V. Sharma", "GOVERNMENT OFFICER", "BID_CREATED", "Bid", "SUCCESS", "Bid GEM-2026-001 created"),
                audit("GEM-2026-001", "Sathvik Reddy", "USER", "DOCUMENT_UPLOADED", "Document", "SUCCESS", "GST_Certificate_2026.pdf uploaded"),
                audit("GEM-2026-001", "SYSTEM", "AI", "ANALYSIS_COMPLETED", "Bid", "SUCCESS", "Analysis completed: 8 requirements, 5 pass, 1 fail, 2 review, 1 missing, 2 conflicts"),
                audit("GEM-2026-001", "SYSTEM", "AI", "CONFLICT_DETECTED", "Conflict", "WARNING", "2 conflicts flagged for human review")
        ));

        reviewRepo.save(OfficerReviewRecord.builder()
                .bidId("GEM-2026-001")
                .officerName("Rajesh V. Sharma")
                .officerDesignation("Senior Procurement Officer")
                .recommendation("AI recommends review of turnover and integrity pact before approval.")
                .finalDecision("UNDER_REVIEW")
                .comment("Awaiting integrity pact submission.")
                .updatedAt(LocalDateTime.now())
                .build());
    }

    private Requirement req(String bidId, String reqId, String cat, String req, String reqVal,
                             String detVal, String status, String risk, double conf, String src,
                             int page, boolean mandatory, String reason) {
        return Requirement.builder()
                .bidId(bidId).requirementId(reqId).category(cat).requirement(req)
                .requiredValue(reqVal).detectedValue(detVal).status(status).risk(risk)
                .confidence(conf).sourceDoc(src).pageNumber(page).mandatory(mandatory).reason(reason)
                .build();
    }

    /**
     * Phase 4 — controlled demo bids for tender TND-GEM-2026-1042 so the
     * multi-bidder comparison has ≥2 bids with different factual outcomes.
     * Idempotent: runs only when GEM-2026-002 does not exist yet.
     */
    private void seedComparisonDemoBids(BidRepository bidRepo,
                                        RequirementRepository reqRepo,
                                        EvidenceDetailRepository evRepo,
                                        RiskCategorySummaryRepository riskRepo,
                                        ConflictItemRepository conflictRepo,
                                        AuditEventRepository auditRepo,
                                        ComplianceResultRepository complianceRepo,
                                        PreliminaryVerificationCheckRepository prelimRepo,
                                        BidderDocumentRepository docRepo,
                                        BidderFactRepository factRepo) {
        if (bidRepo.existsByBidId("GEM-2026-002")) return;

        final String tenderId = "TND-GEM-2026-1042";
        final String tenderTitle = "Supply and Installation of Network Infrastructure";
        final String dept = "Railway Procurement Department";

        // ---- Bid 002 — Bharat Networks Pvt Ltd (turnover FAIL, integrity MISSING) ----
        bidRepo.save(Bid.builder()
                .bidId("GEM-2026-002")
                .tenderId(tenderId)
                .tenderTitle(tenderTitle)
                .department(dept)
                .bidderName("Bharat Networks Pvt Ltd")
                .registrationNo("CIN-U31900MH2017PTC298765")
                .gstin("29AABCB9876M1Z3")
                .category("IT & Networking")
                .tenderDate("2026-08-01")
                .closingDate("2026-09-15")
                .compliancePercentage(62.5)
                .riskLevel("HIGH")
                .status("Review Required")
                .totalRequirements(8)
                .passCount(5)
                .failCount(1)
                .reviewCount(1)
                .missingCount(1)
                .conflictCount(1)
                .createdAt(LocalDateTime.now())
                .build());

        // ---- Bid 003 — Zenith IT Solutions Ltd (no fails, two reviews) ----
        bidRepo.save(Bid.builder()
                .bidId("GEM-2026-003")
                .tenderId(tenderId)
                .tenderTitle(tenderTitle)
                .department(dept)
                .bidderName("Zenith IT Solutions Ltd")
                .registrationNo("CIN-U72200KA2015PTC184321")
                .gstin("15AABCA5678K1Z9")
                .category("IT & Networking")
                .tenderDate("2026-08-01")
                .closingDate("2026-09-15")
                .compliancePercentage(75.0)
                .riskLevel("MEDIUM")
                .status("Review Required")
                .totalRequirements(8)
                .passCount(6)
                .failCount(0)
                .reviewCount(2)
                .missingCount(0)
                .conflictCount(0)
                .createdAt(LocalDateTime.now())
                .build());

        // ---- Requirements: same eight tender requirements, different outcomes ----
        reqRepo.saveAll(List.of(
                req("GEM-2026-002", "REQ-001", "Financial", "Valid GST Registration Certificate",
                        "GSTIN present and valid", "29AABCB9876M1Z3", "PASS", "LOW", 94,
                        "GST_Certificate_BN.pdf", 1, true, "GSTIN extracted from certificate"),
                req("GEM-2026-002", "REQ-002", "Financial", "Audited Financial Statements (last 3 years)",
                        "Balance sheet & P&L for FY23-FY25", "Financial statements detected", "PASS", "MEDIUM", 86,
                        "Financials_BN.pdf", 2, true, "Financial data detected in documents"),
                req("GEM-2026-002", "REQ-003", "Financial", "Minimum Annual Turnover",
                        "Turnover >= 10 crore", "Turnover: 6.2 crore", "FAIL", "HIGH", 91,
                        "Financials_BN.pdf", 3, true, "Turnover 6.2 crore is below the required 10 crore threshold"),
                req("GEM-2026-002", "REQ-004", "Registration", "Company Registration (CIN)",
                        "Valid CIN number", "CIN-U31900MH2017PTC298765", "PASS", "LOW", 90,
                        "Registration_BN.pdf", 1, true, "CIN extracted"),
                req("GEM-2026-002", "REQ-005", "Registration", "PAN Card",
                        "Valid PAN", "AABCB9876M", "PASS", "LOW", 93,
                        "PAN_BN.pdf", 1, true, "PAN extracted"),
                req("GEM-2026-002", "REQ-006", "Experience", "Prior Government Contract Experience",
                        "At least 1 similar contract", "Work order detected; relevance unconfirmed", "REVIEW", "MEDIUM", 62,
                        "Work_Orders_BN.pdf", 2, true, "Experience evidence requires review"),
                req("GEM-2026-002", "REQ-007", "Technical", "Technical Bid / Compliance Statement",
                        "Technical compliance declaration", "Technical declaration present", "PASS", "LOW", 88,
                        "Technical_Bid_BN.pdf", 1, true, "Technical declaration present"),
                req("GEM-2026-002", "REQ-008", "Legal", "Integrity Pact / Undertaking",
                        "Signed integrity declaration", "Not found", "MISSING", "HIGH", 0,
                        "Undertaking_BN.pdf", 1, true, "No integrity pact found"),

                req("GEM-2026-003", "REQ-001", "Financial", "Valid GST Registration Certificate",
                        "GSTIN present and valid", "15AABCA5678K1Z9", "PASS", "LOW", 96,
                        "GST_Certificate_ZI.pdf", 1, true, "GSTIN extracted from certificate"),
                req("GEM-2026-003", "REQ-002", "Financial", "Audited Financial Statements (last 3 years)",
                        "Balance sheet & P&L for FY23-FY25", "Financial statements detected", "PASS", "MEDIUM", 89,
                        "Financials_ZI.pdf", 2, true, "Financial data detected in documents"),
                req("GEM-2026-003", "REQ-003", "Financial", "Minimum Annual Turnover",
                        "Turnover >= 10 crore", "Turnover: 11.1 crore", "REVIEW", "MEDIUM", 72,
                        "Financials_ZI.pdf", 3, true, "Turnover figure requires verification"),
                req("GEM-2026-003", "REQ-004", "Registration", "Company Registration (CIN)",
                        "Valid CIN number", "CIN-U72200KA2015PTC184321", "PASS", "LOW", 93,
                        "Registration_ZI.pdf", 1, true, "CIN extracted"),
                req("GEM-2026-003", "REQ-005", "Registration", "PAN Card",
                        "Valid PAN", "AABCA5678K", "PASS", "LOW", 95,
                        "PAN_ZI.pdf", 1, true, "PAN extracted"),
                req("GEM-2026-003", "REQ-006", "Experience", "Prior Government Contract Experience",
                        "At least 1 similar contract", "2 work orders found; relevance unconfirmed", "REVIEW", "MEDIUM", 68,
                        "Work_Orders_ZI.pdf", 2, true, "Experience evidence requires review"),
                req("GEM-2026-003", "REQ-007", "Technical", "Technical Bid / Compliance Statement",
                        "Technical compliance declaration", "Technical declaration present", "PASS", "LOW", 91,
                        "Technical_Bid_ZI.pdf", 1, true, "Technical declaration present"),
                req("GEM-2026-003", "REQ-008", "Legal", "Integrity Pact / Undertaking",
                        "Signed integrity declaration", "Signed integrity pact found", "PASS", "LOW", 94,
                        "Integrity_Pact_ZI.pdf", 1, true, "Signed integrity pact found")
        ));

        // ---- Compliance results for all three bids (stored engine output) ----
        complianceRepo.saveAll(List.of(
                compliance("GEM-2026-001", "REQ-001", "PASS", "GSTIN present and valid", "07AABCT1234F1Z5",
                        "GSTIN verified", 95, false),
                compliance("GEM-2026-001", "REQ-002", "PASS", "Balance sheet & P&L for FY23-FY25", "Financial statements detected",
                        "Financial statements present", 88, false),
                compliance("GEM-2026-001", "REQ-003", "REVIEW", "Turnover >= 10 crore", "Turnover: 12.5 crore",
                        "Turnover figure requires verification", 70, true),
                compliance("GEM-2026-001", "REQ-004", "PASS", "Valid CIN number", "CIN-U72900DL2019PTC345678",
                        "CIN verified", 92, false),
                compliance("GEM-2026-001", "REQ-005", "PASS", "Valid PAN", "AABCT1234F",
                        "PAN verified", 94, false),
                compliance("GEM-2026-001", "REQ-006", "REVIEW", "At least 1 similar contract", "Work order detected",
                        "Experience evidence requires review", 65, true),
                compliance("GEM-2026-001", "REQ-007", "PASS", "Technical compliance declaration", "Technical declaration present",
                        "Technical declaration present", 90, false),
                compliance("GEM-2026-001", "REQ-008", "MISSING", "Signed integrity declaration", "Not found",
                        "No integrity pact found", 0, true),

                compliance("GEM-2026-002", "REQ-001", "PASS", "GSTIN present and valid", "29AABCB9876M1Z3",
                        "GSTIN verified", 94, false),
                compliance("GEM-2026-002", "REQ-002", "PASS", "Balance sheet & P&L for FY23-FY25", "Financial statements detected",
                        "Financial statements present", 86, false),
                compliance("GEM-2026-002", "REQ-003", "FAIL", "Turnover >= 10 crore", "Turnover: 6.2 crore",
                        "Turnover 6.2 crore below required 10 crore threshold", 91, true),
                compliance("GEM-2026-002", "REQ-004", "PASS", "Valid CIN number", "CIN-U31900MH2017PTC298765",
                        "CIN verified", 90, false),
                compliance("GEM-2026-002", "REQ-005", "PASS", "Valid PAN", "AABCB9876M",
                        "PAN verified", 93, false),
                compliance("GEM-2026-002", "REQ-006", "REVIEW", "At least 1 similar contract", "Work order detected; relevance unconfirmed",
                        "Experience evidence requires review", 62, true),
                compliance("GEM-2026-002", "REQ-007", "PASS", "Technical compliance declaration", "Technical declaration present",
                        "Technical declaration present", 88, false),
                compliance("GEM-2026-002", "REQ-008", "MISSING", "Signed integrity declaration", "Not found",
                        "No integrity pact found", 0, true),

                compliance("GEM-2026-003", "REQ-001", "PASS", "GSTIN present and valid", "15AABCA5678K1Z9",
                        "GSTIN verified", 96, false),
                compliance("GEM-2026-003", "REQ-002", "PASS", "Balance sheet & P&L for FY23-FY25", "Financial statements detected",
                        "Financial statements present", 89, false),
                compliance("GEM-2026-003", "REQ-003", "REVIEW", "Turnover >= 10 crore", "Turnover: 11.1 crore",
                        "Turnover figure requires verification", 72, true),
                compliance("GEM-2026-003", "REQ-004", "PASS", "Valid CIN number", "CIN-U72200KA2015PTC184321",
                        "CIN verified", 93, false),
                compliance("GEM-2026-003", "REQ-005", "PASS", "Valid PAN", "AABCA5678K",
                        "PAN verified", 95, false),
                compliance("GEM-2026-003", "REQ-006", "REVIEW", "At least 1 similar contract", "2 work orders found; relevance unconfirmed",
                        "Experience evidence requires review", 68, true),
                compliance("GEM-2026-003", "REQ-007", "PASS", "Technical compliance declaration", "Technical declaration present",
                        "Technical declaration present", 91, false),
                compliance("GEM-2026-003", "REQ-008", "PASS", "Signed integrity declaration", "Signed integrity pact found",
                        "Signed integrity pact found", 94, false)
        ));

        // ---- Evidence (composite bidId:requirementId keys) ----
        evRepo.saveAll(List.of(
                ev("GEM-2026-002:REQ-003", "Minimum Annual Turnover", "Financials_BN.pdf",
                        3, "Audited P&L reports turnover of 6.2 crore against a required minimum of 10 crore.", "FAIL", 91),
                ev("GEM-2026-002:REQ-008", "Integrity Pact / Undertaking", "Undertaking_BN.pdf",
                        1, "No integrity pact document found in submission.", "MISSING", 0),
                ev("GEM-2026-003:REQ-003", "Minimum Annual Turnover", "Financials_ZI.pdf",
                        3, "Turnover of 11.1 crore detected in audited P&L statement.", "REVIEW", 72),
                ev("GEM-2026-003:REQ-008", "Integrity Pact / Undertaking", "Integrity_Pact_ZI.pdf",
                        1, "Signed integrity pact found on page 1 with authorised signatory.", "PASS", 94)
        ));

        // ---- Risks ----
        riskRepo.saveAll(List.of(
                risk("GEM-2026-002", "Financial", "HIGH", 85, "Turnover 6.2 crore below required threshold"),
                risk("GEM-2026-002", "Legal", "HIGH", 80, "Mandatory integrity pact missing"),
                risk("GEM-2026-002", "Documentation", "MEDIUM", 45, "Experience evidence under review"),
                risk("GEM-2026-002", "Registration", "LOW", 10, "Registration documents verified"),
                risk("GEM-2026-003", "Financial", "MEDIUM", 35, "Turnover verification pending"),
                risk("GEM-2026-003", "Experience", "MEDIUM", 30, "Experience evidence under review"),
                risk("GEM-2026-003", "Documentation", "LOW", 10, "Most documents verified")
        ));

        // ---- Conflicts (002 has one; 003 has none) ----
        conflictRepo.save(ConflictItem.builder()
                .bidId("GEM-2026-002")
                .requirementId("REQ-003")
                .conflictId("CONFLICT-B2-001")
                .conflictType("financial_turnover")
                .title("Turnover below tender threshold")
                .requirement("Minimum Annual Turnover")
                .submittedDocument("Financials_BN.pdf")
                .submittedValue("INR 62,000,000")
                .verificationSource("Turnover_Declaration_BN.pdf")
                .verificationValue("INR 100,000,000 Required")
                .status("MANUAL VERIFICATION REQUIRED")
                .riskLevel("HIGH")
                .sources(List.of("Financials_BN.pdf", "Turnover_Declaration_BN.pdf"))
                .explanation("Declared turnover of INR 62,000,000 is below the tender threshold of INR 100,000,000.")
                .requiresManualReview(true)
                .build());

        // ---- Documents (distinct, realistic demo submission files per bid) ----
        // Each row writes a real PDF to ${app.upload.dir}/<bidId>/seed/<filename> so
        // downloads work, and carries unique extracted text consistent with the
        // seeded requirements, compliance results and bidder facts.
        final LocalDateTime seedTime = LocalDateTime.of(2026, 9, 2, 9, 30);
        List<BidderDocument> demoDocs = new ArrayList<>();
        int docIndex = 0;

        // ---- GEM-2026-001 — ABC Technologies Pvt Ltd (8 documents) ----
        demoDocs.add(doc("GEM-2026-001", "Company Registration (CIN)", "Registration_Certificate.pdf", 2,
                "Certificate of Incorporation of a Company\nCIN: U72900DL2019PTC345678\nCompany Name: ABC Technologies Pvt Ltd\nIncorporated: 19 September 2019, New Delhi\nClass of Company: Private Limited Company\nAuthorized Share Capital: INR 5,00,00,000\nRegistered Office: 42 Okhla Industrial Estate, New Delhi - 110020\nRegistrar of Companies: Delhi", seedTime.plusMinutes(docIndex++)));
        demoDocs.add(doc("GEM-2026-001", "GST Certificate", "GST_Certificate_2026.pdf", 1,
                "GST Registration Certificate (FORM GST REG-06)\nGSTIN: 07AABCT1234F1Z5\nLegal Name: ABC Technologies Pvt Ltd\nState: Delhi (07)\nConstitution of Business: Private Limited Company\nDate of Registration: 14/08/2019\nDate of Validity: 31/12/2027\nRegistration Type: Regular", seedTime.plusMinutes(docIndex++)));
        demoDocs.add(doc("GEM-2026-001", "Audited Financial Statement", "Financial_Statement_FY25.pdf", 24,
                "Audited Financial Statements FY2023-24 and FY2024-25\nBalance Sheet, Statement of Profit & Loss and Auditor's Report\nAnnual Turnover FY2024-25: INR 12.5 crore (INR 12,50,00,000)\nAnnual Turnover FY2023-24: INR 11.2 crore\nNet Worth as at 31/03/2025: INR 4.8 crore\nAuditor: M/s Sharma & Associates, Chartered Accountants (FRN 012345N)\nSigned by Authorised Signatory on 22/05/2025", seedTime.plusMinutes(docIndex++)));
        demoDocs.add(doc("GEM-2026-001", "PAN Card", "PAN_Card.pdf", 1,
                "Permanent Account Number Card\nPAN: AABCT1234F\nName: ABC Technologies Pvt Ltd\nCategory: Company\nIssued by: Income Tax Department, Government of India", seedTime.plusMinutes(docIndex++)));
        demoDocs.add(doc("GEM-2026-001", "Technical Bid", "Technical_Bid.pdf", 12,
                "Technical Bid and Compliance Statement\nAgainst RFP TND-GEM-2026-1042 for Supply and Installation of Network Infrastructure\nChapter 1: Company technical capability with ISO 9001 and ISO 27001 aligned processes\nChapter 2: Solution architecture covering enterprise routers, access switches and structured cabling\nChapter 3: Implementation plan with 90-day delivery schedule and 3-year onsite warranty\nChapter 4: Cybersecurity controls, centralised logging and SOC integration as per tender clauses\nAuthorised signatory declares all statements true and verifiable.", seedTime.plusMinutes(docIndex++)));
        demoDocs.add(doc("GEM-2026-001", "Experience Certificate", "Work_Orders.pdf", 8,
                "Work Orders and Prior Experience Certificates\nNorthern Railway Network Upgrade: work order WO/NR/2024/117 dated 11/07/2024, value INR 4.2 crore, status completed\nMetro Rail Corporation LAN Deployment: work order MR/METRO/2023/89 dated 02/02/2023, value INR 2.6 crore, status completed\nPSU Headquarters Office Networking: work order PSU/IT/2022/45 dated 19/09/2022, value INR 1.1 crore, status completed\nEmployer contact details provided for reference checks; relevance to the current tender to be confirmed by the evaluation committee.", seedTime.plusMinutes(docIndex++)));
        demoDocs.add(doc("GEM-2026-001", "BOQ / Financial Bid", "BOQ_Price_Schedule.pdf", 6,
                "Bill of Quantities and Price Schedule - RFP TND-GEM-2026-1042\nItem 1: Enterprise core routers, 48 units @ INR 4,50,000 = INR 2,16,00,000\nItem 2: Access layer switches, 120 units @ INR 1,20,000 = INR 1,44,00,000\nItem 3: Structured cabling, 8,000 points @ INR 8,000 = INR 64,00,000\nItem 4: Installation, testing and commissioning = INR 35,00,000\nItem 5: Annual maintenance for 3 years = INR 26,00,000\nTotal Bid Price: INR 4,85,00,000 inclusive of GST. Prices valid for 180 days.", seedTime.plusMinutes(docIndex++)));
        demoDocs.add(doc("GEM-2026-001", "Bank Statement", "Bank_Statement_FY25.pdf", 12,
                "Bank Statement - Current Account 50100234567890\nAccount Holder: ABC Technologies Pvt Ltd\nBank: HDFC Bank, Kalkaji Branch, New Delhi\nIFSC: HDFC0000123\nPeriod: 01/04/2024 to 31/03/2025\nAverage Quarterly Balance: INR 1,82,45,000\nNo overdraft or unsecured facilities utilised during the period\nStatement generated from branch audit trail and verified by the branch manager.", seedTime.plusMinutes(docIndex++)));
        demoDocs.add(doc("GEM-2026-001", "Turnover Declaration", "Turnover_Declaration_ABC.pdf", 2,
                "Signed Turnover Declaration Form - GeM Bid GEM-2026-001\nBidder: ABC Technologies Pvt Ltd\nDeclared annual turnover (self-certified) FY2024-25: INR 11,80,00,000 (11.8 crore)\nAudited financial statements report annual turnover of INR 12,50,00,000 (12.5 crore)\nTender requires minimum annual turnover of INR 10,00,00,000 (10 crore)\nDiscrepancy between audited statement and self-declaration flagged for officer verification.\nDeclared by: Sathvik Reddy, Director, on 28/08/2026.", seedTime.plusMinutes(docIndex++)));

        // ---- GEM-2026-002 — Bharat Networks Pvt Ltd (9 documents) ----
        demoDocs.add(doc("GEM-2026-002", "Company Registration (CIN)", "Registration_BN.pdf", 2,
                "Certificate of Incorporation of a Company\nCIN: U31900MH2017PTC298765\nCompany Name: Bharat Networks Pvt Ltd\nIncorporated: 03 January 2017, Mumbai\nClass of Company: Private Limited Company\nAuthorized Share Capital: INR 2,00,00,000\nRegistered Office: 7 Andheri East, Mumbai - 400069\nRegistrar of Companies: Maharashtra", seedTime.plusMinutes(docIndex++)));
        demoDocs.add(doc("GEM-2026-002", "GST Certificate", "GST_Certificate_BN.pdf", 1,
                "GST Registration Certificate (FORM GST REG-06)\nGSTIN: 29AABCB9876M1Z3\nLegal Name: Bharat Networks Pvt Ltd\nState Code: 29\nConstitution of Business: Private Limited Company\nDate of Registration: 03/01/2017\nValidity: certificate expired on 30/06/2026\nRegistration Type: Regular", seedTime.plusMinutes(docIndex++)));
        demoDocs.add(doc("GEM-2026-002", "Audited Financial Statement", "Financials_BN.pdf", 20,
                "Audited Financial Statements FY2023-24 and FY2024-25\nBalance Sheet and Statement of Profit & Loss\nAnnual Turnover FY2024-25: INR 6.2 crore (INR 6,20,00,000)\nAnnual Turnover FY2023-24: INR 5.8 crore\nNet Worth as at 31/03/2025: INR 1.4 crore\nTurnover is below the tender's minimum requirement of INR 10 crore\nAuditor: M/s Desai & Co, Chartered Accountants (FRN 023456W)", seedTime.plusMinutes(docIndex++)));
        demoDocs.add(doc("GEM-2026-002", "PAN Card", "PAN_BN.pdf", 1,
                "Permanent Account Number Card\nPAN: AABCB9876M\nName: Bharat Networks Pvt Ltd\nCategory: Company\nIssued by: Income Tax Department, Government of India", seedTime.plusMinutes(docIndex++)));
        demoDocs.add(doc("GEM-2026-002", "Experience Certificate", "Work_Orders_BN.pdf", 6,
                "Work Orders and Experience Certificates\nRegional Telecom Node Supply: work order RTN/2024/233 dated 14/05/2024, value INR 1.9 crore, status completed\nSingle prior contract of similar scope submitted; employer reference contact included\nRelevance to the current tender requires evaluator confirmation against the RFP experience clause.", seedTime.plusMinutes(docIndex++)));
        demoDocs.add(doc("GEM-2026-002", "Technical Bid", "Technical_Bid_BN.pdf", 10,
                "Technical Bid and Compliance Statement\nAgainst RFP TND-GEM-2026-1042\nChapter 1: Company profile and network integration capability\nChapter 2: Proposed equipment schedule - routers, switches and structured cabling\nChapter 3: Delivery schedule of 75 days with 1-year standard warranty\nChapter 4: Compliance declarations against tender clauses\nAuthorised signatory declares all statements true.", seedTime.plusMinutes(docIndex++)));
        demoDocs.add(doc("GEM-2026-002", "BOQ / Financial Bid", "BOQ_Price_Schedule_BN.pdf", 6,
                "Bill of Quantities and Price Schedule - RFP TND-GEM-2026-1042\nItem 1: Enterprise core routers, 50 units @ INR 4,40,000 = INR 2,20,00,000\nItem 2: Access layer switches, 130 units @ INR 1,10,000 = INR 1,43,00,000\nItem 3: Structured cabling, 9,000 points @ INR 8,500 = INR 76,50,000\nItem 4: Installation, testing and commissioning = INR 42,00,000\nItem 5: Annual maintenance for 2 years = INR 28,50,000\nTotal Bid Price: INR 5,10,50,000 inclusive of GST. Prices valid for 180 days.", seedTime.plusMinutes(docIndex++)));
        demoDocs.add(doc("GEM-2026-002", "Bank Statement", "Bank_Statement_BN.pdf", 12,
                "Bank Statement - Current Account 60200198765432\nAccount Holder: Bharat Networks Pvt Ltd\nBank: ICICI Bank, Andheri East Branch, Mumbai\nIFSC: ICIC0000029\nPeriod: 01/04/2024 to 31/03/2025\nAverage Quarterly Balance: INR 64,20,000\nNo overdraft facility utilised during the period\nStatement generated from branch audit trail and verified by the branch manager.", seedTime.plusMinutes(docIndex++)));
        demoDocs.add(doc("GEM-2026-002", "Turnover Declaration", "Turnover_Declaration_BN.pdf", 2,
                "GeM Turnover Declaration Form - Bid GEM-2026-002\nBidder: Bharat Networks Pvt Ltd\nDeclared annual turnover FY2024-25: INR 6,20,00,000 (6.2 crore)\nTender requires minimum annual turnover of INR 10,00,00,000 (10 crore)\nDeclared turnover is below the tender threshold - manual verification required.\nDeclared by: Meera Joshi, Director, on 26/08/2026.", seedTime.plusMinutes(docIndex++)));

        // ---- GEM-2026-003 — Zenith IT Solutions Ltd (9 documents) ----
        demoDocs.add(doc("GEM-2026-003", "Company Registration (CIN)", "Registration_ZI.pdf", 2,
                "Certificate of Incorporation of a Company\nCIN: U72200KA2015PTC184321\nCompany Name: Zenith IT Solutions Ltd\nIncorporated: 12 June 2015, Bengaluru\nClass of Company: Public Limited (unlisted)\nAuthorized Share Capital: INR 1,00,00,000\nRegistered Office: 18 MG Road, Bengaluru - 560001\nRegistrar of Companies: Karnataka", seedTime.plusMinutes(docIndex++)));
        demoDocs.add(doc("GEM-2026-003", "GST Certificate", "GST_Certificate_ZI.pdf", 1,
                "GST Registration Certificate (FORM GST REG-06)\nGSTIN: 15AABCA5678K1Z9\nLegal Name: Zenith IT Solutions Ltd\nState: Karnataka (15)\nConstitution of Business: Public Limited Company\nDate of Registration: 22/06/2015\nDate of Validity: 31/03/2028\nRegistration Type: Regular", seedTime.plusMinutes(docIndex++)));
        demoDocs.add(doc("GEM-2026-003", "Audited Financial Statement", "Financials_ZI.pdf", 26,
                "Audited Financial Statements FY2023-24 and FY2024-25\nBalance Sheet, Statement of Profit & Loss and Auditor's Report\nAnnual Turnover FY2024-25: INR 11.1 crore (INR 11,10,00,000)\nAnnual Turnover FY2023-24: INR 9.7 crore\nNet Worth as at 31/03/2025: INR 3.2 crore\nAuditor: M/s Iyer & Rao, Chartered Accountants (FRN 034567K)\nSigned by Authorised Signatory on 19/05/2025", seedTime.plusMinutes(docIndex++)));
        demoDocs.add(doc("GEM-2026-003", "PAN Card", "PAN_ZI.pdf", 1,
                "Permanent Account Number Card\nPAN: AABCA5678K\nName: Zenith IT Solutions Ltd\nCategory: Company\nIssued by: Income Tax Department, Government of India", seedTime.plusMinutes(docIndex++)));
        demoDocs.add(doc("GEM-2026-003", "Experience Certificate", "Work_Orders_ZI.pdf", 8,
                "Work Orders and Prior Experience Certificates\nIT Ministry Data Centre Augmentation: work order WO/DIT/2024/301 dated 06/03/2024, value INR 5.4 crore, status completed\nState University Campus Network: work order WO/EDU/2023/142 dated 21/11/2023, value INR 2.1 crore, status completed\nTwo prior contracts of similar scope submitted with employer contact details\nRelevance to the current tender pending evaluator confirmation.", seedTime.plusMinutes(docIndex++)));
        demoDocs.add(doc("GEM-2026-003", "Technical Bid", "Technical_Bid_ZI.pdf", 14,
                "Technical Bid and Compliance Statement\nAgainst RFP TND-GEM-2026-1042\nChapter 1: Company technical capability with ISO 27001 certified data centre processes\nChapter 2: Solution design covering core routing, access switching and secure WLAN\nChapter 3: Delivery plan of 75 days with 3-year annual maintenance contract\nChapter 4: Business continuity, disaster recovery and security monitoring commitments\nAuthorised signatory declares all statements true and verifiable.", seedTime.plusMinutes(docIndex++)));
        demoDocs.add(doc("GEM-2026-003", "Integrity Pact", "Integrity_Pact_ZI.pdf", 4,
                "Integrity Pact - Signed by Bidder\nI/We Zenith IT Solutions Ltd solemnly declare adherence to the integrity and transparency clauses of RFP TND-GEM-2026-1042\nNo bribery, collusion or inducement has been offered or accepted in connection with this bid\nThe bidder accepts debarment in case of breach of the integrity pact\nSigned: Ananya Rao, Director, on 24/08/2026 at Bengaluru\nWitness 1: R. Kumar, Notary Public", seedTime.plusMinutes(docIndex++)));
        demoDocs.add(doc("GEM-2026-003", "BOQ / Financial Bid", "BOQ_Price_Schedule_ZI.pdf", 6,
                "Bill of Quantities and Price Schedule - RFP TND-GEM-2026-1042\nItem 1: Enterprise core routers, 45 units @ INR 4,20,000 = INR 1,89,00,000\nItem 2: Access layer switches, 115 units @ INR 1,05,000 = INR 1,20,75,000\nItem 3: Structured cabling, 7,500 points @ INR 8,000 = INR 60,00,000\nItem 4: Installation, testing and commissioning = INR 38,00,000\nItem 5: Annual maintenance for 3 years = INR 30,00,000\nTotal Bid Price: INR 4,37,75,000 inclusive of GST. Prices valid for 180 days.", seedTime.plusMinutes(docIndex++)));
        demoDocs.add(doc("GEM-2026-003", "Bank Statement", "Bank_Statement_ZI.pdf", 12,
                "Bank Statement - Current Account 00400556677889\nAccount Holder: Zenith IT Solutions Ltd\nBank: Axis Bank, MG Road Branch, Bengaluru\nIFSC: UTIB0000040\nPeriod: 01/04/2024 to 31/03/2025\nAverage Quarterly Balance: INR 2,04,60,000\nNo overdraft facility utilised during the period\nStatement generated from branch audit trail and verified by the branch manager.", seedTime.plusMinutes(docIndex++)));
        docRepo.saveAll(demoDocs);

        // ---- Bidder facts (extracted values feeding the Bidder AI Assistant) ----
        factRepo.saveAll(List.of(
                fact("GEM-2026-001", "FACT-ABC-001", "registration", "gstin", "07AABCT1234F1Z5", null, "2027-12-31", 0.97,
                        "GST_Certificate_2026.pdf", 1, "GST Registration", "GSTIN 07AABCT1234F1Z5 valid until 31/12/2027 for ABC Technologies Pvt Ltd, Delhi."),
                fact("GEM-2026-001", "FACT-ABC-002", "registration", "cin", "U72900DL2019PTC345678", null, null, 0.96,
                        "Registration_Certificate.pdf", 1, "Incorporation", "CIN U72900DL2019PTC345678 issued by Registrar of Companies, Delhi."),
                fact("GEM-2026-001", "FACT-ABC-003", "registration", "pan", "AABCT1234F", null, null, 0.95,
                        "PAN_Card.pdf", 1, "PAN", "PAN AABCT1234F issued to ABC Technologies Pvt Ltd."),
                fact("GEM-2026-001", "FACT-ABC-004", "financial", "annual_turnover", "12.5", "INR crore", null, 0.92,
                        "Financial_Statement_FY25.pdf", 3, "Profit & Loss", "Annual turnover FY2024-25 of INR 12.5 crore reported in audited profit and loss statement."),
                fact("GEM-2026-001", "FACT-ABC-005", "financial", "declared_turnover", "11.8", "INR crore", null, 0.88,
                        "Turnover_Declaration_ABC.pdf", 1, "Declaration", "Self-certified turnover declaration of INR 11.8 crore differs from audited statement of INR 12.5 crore."),
                fact("GEM-2026-001", "FACT-ABC-006", "financial", "bank_average_balance", "18245000", "INR", null, 0.90,
                        "Bank_Statement_FY25.pdf", 1, "Account Summary", "Average quarterly balance of INR 1,82,45,000 for FY2024-25."),
                fact("GEM-2026-001", "FACT-ABC-007", "experience", "work_order_count", "3", "contracts", null, 0.85,
                        "Work_Orders.pdf", 2, "Work Orders", "Three prior work orders of values INR 4.2 crore, INR 2.6 crore and INR 1.1 crore submitted."),
                fact("GEM-2026-001", "FACT-ABC-008", "financial", "bid_price", "48500000", "INR", null, 0.91,
                        "BOQ_Price_Schedule.pdf", 6, "Price Schedule", "Total bid price of INR 4,85,00,000 across five bill of quantities items."),
                fact("GEM-2026-001", "FACT-ABC-009", "technical", "technical_declaration", "Present", null, null, 0.94,
                        "Technical_Bid.pdf", 1, "Compliance Statement", "Technical compliance declaration signed and present in the technical bid."),

                fact("GEM-2026-002", "FACT-BN-001", "registration", "gstin", "29AABCB9876M1Z3", null, "2026-06-30", 0.96,
                        "GST_Certificate_BN.pdf", 1, "GST Registration", "GSTIN 29AABCB9876M1Z3; registration certificate expired on 30/06/2026."),
                fact("GEM-2026-002", "FACT-BN-002", "registration", "cin", "U31900MH2017PTC298765", null, null, 0.95,
                        "Registration_BN.pdf", 1, "Incorporation", "CIN U31900MH2017PTC298765 issued by Registrar of Companies, Maharashtra."),
                fact("GEM-2026-002", "FACT-BN-003", "registration", "pan", "AABCB9876M", null, null, 0.94,
                        "PAN_BN.pdf", 1, "PAN", "PAN AABCB9876M issued to Bharat Networks Pvt Ltd."),
                fact("GEM-2026-002", "FACT-BN-004", "financial", "annual_turnover", "6.2", "INR crore", null, 0.90,
                        "Financials_BN.pdf", 3, "Profit & Loss", "Annual turnover FY2024-25 of INR 6.2 crore is below the required INR 10 crore threshold."),
                fact("GEM-2026-002", "FACT-BN-005", "financial", "declared_turnover", "6.2", "INR crore", null, 0.89,
                        "Turnover_Declaration_BN.pdf", 1, "Declaration", "Declared turnover of INR 6.2 crore against tender minimum of INR 10 crore."),
                fact("GEM-2026-002", "FACT-BN-006", "financial", "bank_average_balance", "6420000", "INR", null, 0.87,
                        "Bank_Statement_BN.pdf", 1, "Account Summary", "Average quarterly balance of INR 64,20,000 for FY2024-25."),
                fact("GEM-2026-002", "FACT-BN-007", "experience", "work_order_count", "1", "contracts", null, 0.80,
                        "Work_Orders_BN.pdf", 2, "Work Orders", "One prior work order RTN/2024/233 of INR 1.9 crore submitted."),
                fact("GEM-2026-002", "FACT-BN-008", "financial", "bid_price", "51050000", "INR", null, 0.90,
                        "BOQ_Price_Schedule_BN.pdf", 6, "Price Schedule", "Total bid price of INR 5,10,50,000 across five bill of quantities items."),

                fact("GEM-2026-003", "FACT-ZI-001", "registration", "gstin", "15AABCA5678K1Z9", null, "2028-03-31", 0.97,
                        "GST_Certificate_ZI.pdf", 1, "GST Registration", "GSTIN 15AABCA5678K1Z9 valid until 31/03/2028 for Zenith IT Solutions Ltd, Karnataka."),
                fact("GEM-2026-003", "FACT-ZI-002", "registration", "cin", "U72200KA2015PTC184321", null, null, 0.96,
                        "Registration_ZI.pdf", 1, "Incorporation", "CIN U72200KA2015PTC184321 issued by Registrar of Companies, Karnataka."),
                fact("GEM-2026-003", "FACT-ZI-003", "registration", "pan", "AABCA5678K", null, null, 0.95,
                        "PAN_ZI.pdf", 1, "PAN", "PAN AABCA5678K issued to Zenith IT Solutions Ltd."),
                fact("GEM-2026-003", "FACT-ZI-004", "financial", "annual_turnover", "11.1", "INR crore", null, 0.91,
                        "Financials_ZI.pdf", 3, "Profit & Loss", "Annual turnover FY2024-25 of INR 11.1 crore exceeds the required INR 10 crore threshold."),
                fact("GEM-2026-003", "FACT-ZI-005", "financial", "bank_average_balance", "20460000", "INR", null, 0.89,
                        "Bank_Statement_ZI.pdf", 1, "Account Summary", "Average quarterly balance of INR 2,04,60,000 for FY2024-25."),
                fact("GEM-2026-003", "FACT-ZI-006", "experience", "work_order_count", "2", "contracts", null, 0.84,
                        "Work_Orders_ZI.pdf", 2, "Work Orders", "Two prior work orders of INR 5.4 crore and INR 2.1 crore submitted."),
                fact("GEM-2026-003", "FACT-ZI-007", "financial", "bid_price", "43775000", "INR", null, 0.90,
                        "BOQ_Price_Schedule_ZI.pdf", 6, "Price Schedule", "Total bid price of INR 4,37,75,000 across five bill of quantities items."),
                fact("GEM-2026-003", "FACT-ZI-008", "legal", "integrity_pact", "Signed", null, null, 0.96,
                        "Integrity_Pact_ZI.pdf", 1, "Integrity Pact", "Integrity pact signed by Ananya Rao, Director, on 24/08/2026 with notary witness.")
        ));

        // ---- Preliminary integrity checks (stored Phase 2 results) ----
        prelimRepo.saveAll(List.of(
                prelim("GEM-2026-001", PreliminaryVerificationCheck.CheckType.DOCUMENT_VALIDITY,
                        PreliminaryVerificationCheck.CheckStatus.PASS, "Document successfully processed with 2 pages", "Registration_Certificate.pdf", 1),
                prelim("GEM-2026-001", PreliminaryVerificationCheck.CheckType.EXPIRY_DATE,
                        PreliminaryVerificationCheck.CheckStatus.PASS, "Certificate valid until 2027-12-31", "GST_Certificate_2026.pdf", 1),
                prelim("GEM-2026-001", PreliminaryVerificationCheck.CheckType.FIELD_COMPLETENESS,
                        PreliminaryVerificationCheck.CheckStatus.REVIEW, "Turnover field extracted but requires verification", "Financial_Statement_FY25.pdf", 3),
                prelim("GEM-2026-001", PreliminaryVerificationCheck.CheckType.CROSS_PAGE_CONSISTENCY,
                        PreliminaryVerificationCheck.CheckStatus.PASS, "No conflicting values detected across pages", "Financial_Statement_FY25.pdf", null),
                prelim("GEM-2026-001", PreliminaryVerificationCheck.CheckType.REQUIRED_DOCUMENT,
                        PreliminaryVerificationCheck.CheckStatus.MISSING, "Required document 'Integrity Pact' not found in submission", "Integrity_Pact.pdf", null),

                prelim("GEM-2026-002", PreliminaryVerificationCheck.CheckType.DOCUMENT_VALIDITY,
                        PreliminaryVerificationCheck.CheckStatus.PASS, "Document successfully processed with 2 pages", "Registration_BN.pdf", 1),
                prelim("GEM-2026-002", PreliminaryVerificationCheck.CheckType.EXPIRY_DATE,
                        PreliminaryVerificationCheck.CheckStatus.FAIL, "Certificate expired on 2026-06-30", "GST_Certificate_BN.pdf", 1),
                prelim("GEM-2026-002", PreliminaryVerificationCheck.CheckType.FIELD_COMPLETENESS,
                        PreliminaryVerificationCheck.CheckStatus.PASS, "Required field 'cin' extracted successfully", "Registration_BN.pdf", 1),
                prelim("GEM-2026-002", PreliminaryVerificationCheck.CheckType.CROSS_PAGE_CONSISTENCY,
                        PreliminaryVerificationCheck.CheckStatus.PASS, "No conflicting values detected across pages", "Financials_BN.pdf", null),
                prelim("GEM-2026-002", PreliminaryVerificationCheck.CheckType.REQUIRED_DOCUMENT,
                        PreliminaryVerificationCheck.CheckStatus.MISSING, "Required document 'Integrity Pact' not found in submission", "Integrity_Pact_BN.pdf", null),

                prelim("GEM-2026-003", PreliminaryVerificationCheck.CheckType.DOCUMENT_VALIDITY,
                        PreliminaryVerificationCheck.CheckStatus.PASS, "Document successfully processed with 2 pages", "Registration_ZI.pdf", 1),
                prelim("GEM-2026-003", PreliminaryVerificationCheck.CheckType.EXPIRY_DATE,
                        PreliminaryVerificationCheck.CheckStatus.PASS, "Certificate valid until 2028-03-31", "GST_Certificate_ZI.pdf", 1),
                prelim("GEM-2026-003", PreliminaryVerificationCheck.CheckType.FIELD_COMPLETENESS,
                        PreliminaryVerificationCheck.CheckStatus.PASS, "Required field 'cin' extracted successfully", "Registration_ZI.pdf", 1),
                prelim("GEM-2026-003", PreliminaryVerificationCheck.CheckType.CROSS_PAGE_CONSISTENCY,
                        PreliminaryVerificationCheck.CheckStatus.PASS, "No conflicting values detected across pages", "Financials_ZI.pdf", null),
                prelim("GEM-2026-003", PreliminaryVerificationCheck.CheckType.REQUIRED_DOCUMENT,
                        PreliminaryVerificationCheck.CheckStatus.PASS, "Required document 'Integrity Pact' found", "Integrity_Pact_ZI.pdf", 1)
        ));

        // ---- Audit trail for the new demo bids ----
        auditRepo.saveAll(List.of(
                audit("GEM-2026-002", "SYSTEM", "AI", "BID_CREATED", "Bid", "SUCCESS",
                        "Bid GEM-2026-002 created for tender TND-GEM-2026-1042"),
                audit("GEM-2026-003", "SYSTEM", "AI", "BID_CREATED", "Bid", "SUCCESS",
                        "Bid GEM-2026-003 created for tender TND-GEM-2026-1042")
        ));
    }

    private ComplianceResult compliance(String bidId, String reqId, String status, String requiredValue,
                                        String detectedValue, String reason, double confidence,
                                        boolean requiresManualReview) {
        return ComplianceResult.builder()
                .bidId(bidId)
                .requirementId(reqId)
                .status(status)
                .requiredValue(requiredValue)
                .detectedValue(detectedValue)
                .reason(reason)
                .confidence(confidence)
                .mandatory(true)
                .requiresManualReview(requiresManualReview)
                .build();
    }

    private BidderDocument doc(String bidId, String docType, String filename, int pages, String text,
                               LocalDateTime uploadedAt) {
        Path target = Paths.get(uploadDir, bidId, "seed", filename);
        Path written = writeDemoPdf(target, docType + " - " + filename, text, pages);
        String storedPath = written != null ? written.toAbsolutePath().toString() : null;
        String fileSize = (pages * 42) + " KB";
        if (written != null) {
            try {
                fileSize = Math.max(1, Files.size(written) / 1024) + " KB";
            } catch (IOException ignored) {
                // fall back to the deterministic estimate
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
                .uploadedBy("user@demo.gov.in")
                .storedPath(storedPath)
                .extractedText(text)
                .stages(new ArrayList<>())
                .build();
    }

    /**
     * Writes a small, valid multi-page PDF for a seeded demo document so the
     * download endpoint serves a real file. Returns null when writing fails,
     * leaving storedPath unset (the UI then reports the file as unavailable).
     */
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
                    cs.showText("SIH26100 National Procurement Verification Portal - demo submission copy");
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

    private BidderFact fact(String bidId, String factId, String category, String fieldName, String value,
                            String unit, String period, double confidence, String sourceDocument,
                            int page, String section, String sourceText) {
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

    private PreliminaryVerificationCheck prelim(String bidId,
                                                PreliminaryVerificationCheck.CheckType type,
                                                PreliminaryVerificationCheck.CheckStatus status,
                                                String message, String evidenceRef, Integer page) {
        return PreliminaryVerificationCheck.builder()
                .bidId(bidId)
                .documentId("demo")
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

    private EvidenceDetail ev(String reqId, String title, String src, int page, String snippet,
                              String decision, double conf) {
        return EvidenceDetail.builder()
                .requirementId(reqId).requirementTitle(title).sourceDocument(src).pageNumber(page)
                .extractedSnippet(snippet).requiredValue("As per RFP Specification")
                .detectedValue("Value extracted via OCR/RAG Pipeline").decision(decision)
                .reason("Document text corroborates requirement criteria.").confidence(conf)
                .verificationSource("Document OCR Extraction & NLP Matching")
                .build();
    }

    private RiskCategorySummary risk(String bidId, String cat, String level, int score, String summary) {
        return RiskCategorySummary.builder()
                .bidId(bidId).category(cat).riskLevel(level).score(score).summary(summary)
                .factors(List.of("AI risk assessment"))
                .build();
    }

    private AuditEvent audit(String bidId, String user, String role, String action, String entity,
                             String status, String details) {
        return AuditEvent.builder()
                .bidId(bidId).timestamp(LocalDateTime.now()).actor(user).userRole(role)
                .action(action).entity(entity).status(status).details(details)
                .build();
    }
}
