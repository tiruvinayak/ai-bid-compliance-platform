package com.sih.gem.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "bids")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Bid {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @JsonIgnore
    private Long id;

    @Column(unique = true, nullable = false)
    private String bidId; // e.g. GEM-2026-001

    private String tenderId;
    private String tenderTitle;
    private String department;
    private String bidderName;
    private String registrationNo;
    private String gstin;
    private String category;
    private String tenderDate;
    private String closingDate;

    private Double compliancePercentage;
    private String riskLevel; // LOW / MEDIUM / HIGH
    private String status;    // Draft / Analyzing / Review Required / Verified / Rejected
    private Integer overallRiskScore;
    private String reviewPriority;
    private Boolean manualReviewRequired;

    private Integer totalRequirements;
    private Integer passCount;
    private Integer failCount;
    private Integer reviewCount;
    private Integer missingCount;
    private Integer conflictCount;

    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (compliancePercentage == null) compliancePercentage = 0.0;
        if (riskLevel == null) riskLevel = "MEDIUM";
        if (status == null) status = "Draft";
        if (totalRequirements == null) totalRequirements = 0;
        if (passCount == null) passCount = 0;
        if (failCount == null) failCount = 0;
        if (reviewCount == null) reviewCount = 0;
        if (missingCount == null) missingCount = 0;
        if (conflictCount == null) conflictCount = 0;
    }

    // Explicit Getters & Setters
    @JsonIgnore
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    // API callers use the stable business ID in URL paths, not the database key.
    @JsonProperty("id")
    public String getApiId() { return bidId; }

    public String getBidId() { return bidId; }
    public void setBidId(String bidId) { this.bidId = bidId; }

    public String getTenderId() { return tenderId; }
    public void setTenderId(String tenderId) { this.tenderId = tenderId; }

    public String getTenderTitle() { return tenderTitle; }
    public void setTenderTitle(String tenderTitle) { this.tenderTitle = tenderTitle; }

    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }

    public String getBidderName() { return bidderName; }
    public void setBidderName(String bidderName) { this.bidderName = bidderName; }

    public String getRegistrationNo() { return registrationNo; }
    public void setRegistrationNo(String registrationNo) { this.registrationNo = registrationNo; }

    public String getGstin() { return gstin; }
    public void setGstin(String gstin) { this.gstin = gstin; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getTenderDate() { return tenderDate; }
    public void setTenderDate(String tenderDate) { this.tenderDate = tenderDate; }

    public String getClosingDate() { return closingDate; }
    public void setClosingDate(String closingDate) { this.closingDate = closingDate; }

    public Double getCompliancePercentage() { return compliancePercentage; }
    public void setCompliancePercentage(Double compliancePercentage) { this.compliancePercentage = compliancePercentage; }

    public String getRiskLevel() { return riskLevel; }
    public void setRiskLevel(String riskLevel) { this.riskLevel = riskLevel; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Integer getTotalRequirements() { return totalRequirements; }
    public void setTotalRequirements(Integer totalRequirements) { this.totalRequirements = totalRequirements; }

    public Integer getPassCount() { return passCount; }
    public void setPassCount(Integer passCount) { this.passCount = passCount; }

    public Integer getFailCount() { return failCount; }
    public void setFailCount(Integer failCount) { this.failCount = failCount; }

    public Integer getReviewCount() { return reviewCount; }
    public void setReviewCount(Integer reviewCount) { this.reviewCount = reviewCount; }

    public Integer getMissingCount() { return missingCount; }
    public void setMissingCount(Integer missingCount) { this.missingCount = missingCount; }

    public Integer getConflictCount() { return conflictCount; }
    public void setConflictCount(Integer conflictCount) { this.conflictCount = conflictCount; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
