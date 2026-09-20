package com.sih.gem.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "requirements")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Requirement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String bidId;

    @Column(nullable = false)
    private String requirementId; // e.g. REQ-001

    private String category; // Financial / Registration / Experience / Technical / Legal / Identity
    private String requirement;
    private String requiredValue;
    private String unit;
    private String period;
    private Boolean ambiguous;
    private String detectedValue;
    private String status;   // PASS / FAIL / REVIEW / MISSING / CONFLICT
    private String risk;     // LOW / MEDIUM / HIGH
    private Double confidence;
    private String sourceDoc;
    private Integer pageNumber;
    @Column(length = 100000)
    private String sourceText;
    private Boolean mandatory;
    private String reason;

    // Explicit Getters & Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getBidId() { return bidId; }
    public void setBidId(String bidId) { this.bidId = bidId; }

    public String getRequirementId() { return requirementId; }
    public void setRequirementId(String requirementId) { this.requirementId = requirementId; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getRequirement() { return requirement; }
    public void setRequirement(String requirement) { this.requirement = requirement; }

    public String getRequiredValue() { return requiredValue; }
    public void setRequiredValue(String requiredValue) { this.requiredValue = requiredValue; }

    public String getUnit() { return unit; }
    public void setUnit(String unit) { this.unit = unit; }

    public String getPeriod() { return period; }
    public void setPeriod(String period) { this.period = period; }

    public Boolean getAmbiguous() { return ambiguous; }
    public void setAmbiguous(Boolean ambiguous) { this.ambiguous = ambiguous; }

    public String getDetectedValue() { return detectedValue; }
    public void setDetectedValue(String detectedValue) { this.detectedValue = detectedValue; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getRisk() { return risk; }
    public void setRisk(String risk) { this.risk = risk; }

    public Double getConfidence() { return confidence; }
    public void setConfidence(Double confidence) { this.confidence = confidence; }

    public String getSourceDoc() { return sourceDoc; }
    public void setSourceDoc(String sourceDoc) { this.sourceDoc = sourceDoc; }

    public Integer getPageNumber() { return pageNumber; }
    public void setPageNumber(Integer pageNumber) { this.pageNumber = pageNumber; }

    public String getSourceText() { return sourceText; }
    public void setSourceText(String sourceText) { this.sourceText = sourceText; }

    public Boolean getMandatory() { return mandatory; }
    public void setMandatory(Boolean mandatory) { this.mandatory = mandatory; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
}
