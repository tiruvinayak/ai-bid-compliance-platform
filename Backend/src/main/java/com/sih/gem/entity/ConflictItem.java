package com.sih.gem.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "conflict_items")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConflictItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String bidId;
    private String requirementId;
    private String conflictId;
    private String conflictType;
    private Boolean requiresManualReview;
    private String title;
    private String requirement;
    private String submittedDocument;
    private String submittedValue;
    private String verificationSource;
    private String verificationValue;
    private String status; // HUMAN REVIEW REQUIRED / RESOLVED / UNRESOLVED
    private String riskLevel; // LOW / MEDIUM / HIGH

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "conflict_sources", joinColumns = @JoinColumn(name = "conflict_id"))
    @Column(name = "source")
    private List<String> sources = new ArrayList<>();

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "conflict_fact_ids", joinColumns = @JoinColumn(name = "conflict_id"))
    @Column(name = "fact_id")
    private List<String> factIds = new ArrayList<>();

    @Column(length = 100000)
    private String explanation;

    // Explicit Getters & Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getBidId() { return bidId; }
    public void setBidId(String bidId) { this.bidId = bidId; }

    public String getRequirementId() { return requirementId; }
    public void setRequirementId(String requirementId) { this.requirementId = requirementId; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getRequirement() { return requirement; }
    public void setRequirement(String requirement) { this.requirement = requirement; }

    public String getSubmittedDocument() { return submittedDocument; }
    public void setSubmittedDocument(String submittedDocument) { this.submittedDocument = submittedDocument; }

    public String getSubmittedValue() { return submittedValue; }
    public void setSubmittedValue(String submittedValue) { this.submittedValue = submittedValue; }

    public String getVerificationSource() { return verificationSource; }
    public void setVerificationSource(String verificationSource) { this.verificationSource = verificationSource; }

    public String getVerificationValue() { return verificationValue; }
    public void setVerificationValue(String verificationValue) { this.verificationValue = verificationValue; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getRiskLevel() { return riskLevel; }
    public void setRiskLevel(String riskLevel) { this.riskLevel = riskLevel; }

    public List<String> getSources() { return sources; }
    public void setSources(List<String> sources) { this.sources = sources; }

    public String getExplanation() { return explanation; }
    public void setExplanation(String explanation) { this.explanation = explanation; }
}
