package com.sih.gem.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "evidence_details")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EvidenceDetail {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String requirementId;
    private String factId;

    private String requirementTitle;
    private String sourceDocument;
    private Integer pageNumber;
    private String sectionName;

    @Column(length = 100000)
    private String extractedSnippet;

    private String requiredValue;
    private String detectedValue;
    private String decision; // PASS / FAIL / REVIEW / MISSING / CONFLICT
    private String reason;
    private Double confidence;
    private String verificationSource;

    @Column(length = 100000)
    private String contextBefore;

    @Column(length = 100000)
    private String contextAfter;

    // Explicit Getters & Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getRequirementId() { return requirementId; }
    public void setRequirementId(String requirementId) { this.requirementId = requirementId; }

    public String getFactId() { return factId; }
    public void setFactId(String factId) { this.factId = factId; }

    public String getRequirementTitle() { return requirementTitle; }
    public void setRequirementTitle(String requirementTitle) { this.requirementTitle = requirementTitle; }

    public String getSourceDocument() { return sourceDocument; }
    public void setSourceDocument(String sourceDocument) { this.sourceDocument = sourceDocument; }

    public Integer getPageNumber() { return pageNumber; }
    public void setPageNumber(Integer pageNumber) { this.pageNumber = pageNumber; }

    public String getSectionName() { return sectionName; }
    public void setSectionName(String sectionName) { this.sectionName = sectionName; }

    public String getExtractedSnippet() { return extractedSnippet; }
    public void setExtractedSnippet(String extractedSnippet) { this.extractedSnippet = extractedSnippet; }

    public String getRequiredValue() { return requiredValue; }
    public void setRequiredValue(String requiredValue) { this.requiredValue = requiredValue; }

    public String getDetectedValue() { return detectedValue; }
    public void setDetectedValue(String detectedValue) { this.detectedValue = detectedValue; }

    public String getDecision() { return decision; }
    public void setDecision(String decision) { this.decision = decision; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public Double getConfidence() { return confidence; }
    public void setConfidence(Double confidence) { this.confidence = confidence; }

    public String getVerificationSource() { return verificationSource; }
    public void setVerificationSource(String verificationSource) { this.verificationSource = verificationSource; }

    public String getContextBefore() { return contextBefore; }
    public void setContextBefore(String contextBefore) { this.contextBefore = contextBefore; }

    public String getContextAfter() { return contextAfter; }
    public void setContextAfter(String contextAfter) { this.contextAfter = contextAfter; }
}
