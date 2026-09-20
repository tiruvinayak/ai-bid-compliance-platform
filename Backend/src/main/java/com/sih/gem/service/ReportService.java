package com.sih.gem.service;

import com.sih.gem.entity.*;
import com.sih.gem.repository.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class ReportService {

    private final BidRepository bidRepository;
    private final RequirementRepository requirementRepository;
    private final RiskCategorySummaryRepository riskRepository;
    private final ConflictItemRepository conflictRepository;
    private final OfficerReviewRecordRepository reviewRepository;

    @Value("${app.upload.dir}")
    private String uploadDir;

    public ReportService(BidRepository bidRepository,
                         RequirementRepository requirementRepository,
                         RiskCategorySummaryRepository riskRepository,
                         ConflictItemRepository conflictRepository,
                         OfficerReviewRecordRepository reviewRepository) {
        this.bidRepository = bidRepository;
        this.requirementRepository = requirementRepository;
        this.riskRepository = riskRepository;
        this.conflictRepository = conflictRepository;
        this.reviewRepository = reviewRepository;
    }

    public ReportResult generateReport(String bidId) {
        Bid bid = bidRepository.findByBidId(bidId)
                .orElseThrow(() -> new RuntimeException("Bid not found: " + bidId));

        List<Requirement> reqs = requirementRepository.findByBidId(bidId);
        List<RiskCategorySummary> risks = riskRepository.findByBidId(bidId);
        List<ConflictItem> conflicts = conflictRepository.findByBidId(bidId);
        OfficerReviewRecord review = reviewRepository.findByBidId(bidId).orElse(null);

        String html = buildHtml(bid, reqs, risks, conflicts, review);

        try {
            Path dir = Paths.get(uploadDir, "reports");
            Files.createDirectories(dir);
            String filename = "report_" + bidId + "_" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss")) + ".html";
            Path file = dir.resolve(filename);
            Files.writeString(file, html);
            return new ReportResult("/api/reports/" + filename, LocalDateTime.now().toString());
        } catch (IOException e) {
            throw new RuntimeException("Failed to generate report: " + e.getMessage(), e);
        }
    }

    private String buildHtml(Bid bid, List<Requirement> reqs, List<RiskCategorySummary> risks,
                             List<ConflictItem> conflicts, OfficerReviewRecord review) {
        StringBuilder sb = new StringBuilder();
        sb.append("<!DOCTYPE html><html><head><meta charset='UTF-8'><title>Bid Verification Report</title>");
        sb.append("<style>body{font-family:Arial,sans-serif;margin:40px;color:#1f2937} ");
        sb.append("h1{color:#1e3a8a} h2{color:#1e40af;border-bottom:2px solid #e5e7eb;padding-bottom:6px} ");
        sb.append("table{border-collapse:collapse;width:100%;margin:12px 0} th,td{border:1px solid #d1d5db;padding:8px;text-align:left} ");
        sb.append("th{background:#f3f4f6} .pass{color:#047857;font-weight:bold} .fail{color:#b91c1c;font-weight:bold} ");
        sb.append(".review{color:#b45309;font-weight:bold} .missing{color:#6b7280;font-weight:bold} ");
        sb.append(".badge{display:inline-block;padding:4px 10px;border-radius:12px;color:#fff;font-size:12px} ");
        sb.append(".high{background:#dc2626}.medium{background:#d97706}.low{background:#059669}</style></head><body>");

        sb.append("<h1>Bid Compliance &amp; Verification Report</h1>");
        sb.append("<p><strong>Bid ID:</strong> ").append(escapeHtml(bid.getBidId())).append("</p>");
        sb.append("<p><strong>Tender:</strong> ").append(escapeHtml(bid.getTenderTitle())).append("</p>");
        sb.append("<p><strong>Department:</strong> ").append(escapeHtml(bid.getDepartment())).append("</p>");
        sb.append("<p><strong>Bidder:</strong> ").append(escapeHtml(bid.getBidderName())).append("</p>");
        sb.append("<p><strong>Compliance:</strong> ").append(escapeHtml(bid.getCompliancePercentage())).append("%</p>");
        sb.append("<p><strong>Risk Level:</strong> <span class='badge ").append(cssClass(bid.getRiskLevel()))
                .append("'>").append(escapeHtml(bid.getRiskLevel())).append("</span></p>");
        sb.append("<p><strong>Status:</strong> ").append(escapeHtml(bid.getStatus())).append("</p>");

        sb.append("<h2>Requirements Summary</h2>");
        sb.append("<table><tr><th>ID</th><th>Category</th><th>Requirement</th><th>Detected</th><th>Status</th><th>Confidence</th></tr>");
        for (Requirement r : reqs) {
            sb.append("<tr><td>").append(escapeHtml(r.getRequirementId())).append("</td>")
              .append("<td>").append(escapeHtml(r.getCategory())).append("</td>")
              .append("<td>").append(escapeHtml(r.getRequirement())).append("</td>")
              .append("<td>").append(escapeHtml(r.getDetectedValue())).append("</td>")
              .append("<td class='").append(cssClass(r.getStatus())).append("'>").append(escapeHtml(r.getStatus())).append("</td>")
              .append("<td>").append(escapeHtml(r.getConfidence())).append("%</td></tr>");
        }
        sb.append("</table>");

        sb.append("<h2>Risk Assessment</h2>");
        sb.append("<table><tr><th>Category</th><th>Risk</th><th>Score</th><th>Summary</th></tr>");
        for (RiskCategorySummary r : risks) {
            sb.append("<tr><td>").append(escapeHtml(r.getCategory())).append("</td>")
              .append("<td><span class='badge ").append(cssClass(r.getRiskLevel())).append("'>").append(escapeHtml(r.getRiskLevel())).append("</span></td>")
              .append("<td>").append(escapeHtml(r.getScore())).append("</td>")
              .append("<td>").append(escapeHtml(r.getSummary())).append("</td></tr>");
        }
        sb.append("</table>");

        if (!conflicts.isEmpty()) {
            sb.append("<h2>Conflicts Requiring Review</h2>");
            sb.append("<table><tr><th>Title</th><th>Submitted</th><th>Expected</th><th>Status</th></tr>");
            for (ConflictItem c : conflicts) {
                sb.append("<tr><td>").append(escapeHtml(c.getTitle())).append("</td>")
                  .append("<td>").append(escapeHtml(c.getSubmittedValue())).append("</td>")
                  .append("<td>").append(escapeHtml(c.getVerificationValue())).append("</td>")
                  .append("<td>").append(escapeHtml(c.getStatus())).append("</td></tr>");
            }
            sb.append("</table>");
        }

        if (review != null) {
            sb.append("<h2>Officer Review</h2>");
            sb.append("<p><strong>Officer:</strong> ").append(escapeHtml(review.getOfficerName())).append("</p>");
            sb.append("<p><strong>Decision:</strong> ").append(escapeHtml(review.getFinalDecision())).append("</p>");
            sb.append("<p><strong>Comment:</strong> ").append(escapeHtml(review.getComment())).append("</p>");
        }

        sb.append("<p style='margin-top:40px;color:#6b7280;font-size:12px'>Generated by GeM Bid Compliance &amp; Verification System (SIH26100) on ")
          .append(LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd MMM yyyy HH:mm"))).append("</p>");
        sb.append("</body></html>");
        return sb.toString();
    }

    private String escapeHtml(Object value) {
        if (value == null) return "";
        return value.toString().replace("&", "&amp;").replace("<", "&lt;")
                .replace(">", "&gt;").replace("\"", "&quot;").replace("'", "&#39;");
    }

    private String cssClass(String value) {
        return value == null ? "" : value.toLowerCase().replaceAll("[^a-z0-9_-]", "");
    }

    public record ReportResult(String downloadUrl, String generatedAt) {}
}
