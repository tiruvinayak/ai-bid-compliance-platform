package com.sih.gem.config;

import com.sih.gem.entity.*;
import com.sih.gem.repository.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.List;

@Configuration
@Profile("dev")
public class DataSeeder {

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
                               PasswordEncoder passwordEncoder) {
        return args -> {
            seedUsers(userRepository, passwordEncoder);
            seedInstructions(instructionRepository);
            seedFAQs(faqRepository);
            seedSampleBid(bidRepository, requirementRepository, evidenceRepository,
                    riskRepository, conflictRepository, auditRepository, reviewRepository);
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
                        .requirementId("REQ-001")
                        .conflictId("CONFLICT-001")
                        .conflictType("financial_turnover")
                        .title("Turnover Figure Discrepancy")
                        .requirement("Minimum Annual Turnover")
                        .submittedDocument("bidder_financial.pdf")
                        .submittedValue("INR 70,000,000")
                        .verificationSource("bidder_certificate.pdf")
                        .verificationValue("INR 50,000,000 Required")
                        .status("MANUAL VERIFICATION REQUIRED")
                        .riskLevel("MEDIUM")
                        .sources(List.of("bidder_financial.pdf", "bidder_certificate.pdf"))
                        .explanation("Cross-document discrepancy detected for TURNOVER: bidder_financial.pdf reports 'INR 70,000,000', whereas minimum required threshold is 'INR 50,000,000'.")
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
