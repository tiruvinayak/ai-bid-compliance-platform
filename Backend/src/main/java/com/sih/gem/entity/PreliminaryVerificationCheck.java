package com.sih.gem.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Preliminary integrity check result for a bidder document.
 * Runs before deep compliance analysis to catch document-level issues.
 */
@Entity
@Table(name = "preliminary_verification_checks")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PreliminaryVerificationCheck {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String bidId;

    private String documentId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CheckType checkType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CheckStatus status;

    private String message;

    private String fieldName;

    private String expectedValue;

    private String actualValue;

    private Integer sourcePage;

    private String evidenceReference;

    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        if (createdAt == null) createdAt = LocalDateTime.now();
    }

    public enum CheckType {
        DOCUMENT_VALIDITY,
        REQUIRED_DOCUMENT,
        EXPIRY_DATE,
        FIELD_COMPLETENESS,
        CROSS_PAGE_CONSISTENCY
    }

    public enum CheckStatus {
        PASS,
        REVIEW,
        FAIL,
        MISSING,
        CONFLICT
    }

    // Explicit getters/setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getBidId() { return bidId; }
    public void setBidId(String bidId) { this.bidId = bidId; }

    public String getDocumentId() { return documentId; }
    public void setDocumentId(String documentId) { this.documentId = documentId; }

    public CheckType getCheckType() { return checkType; }
    public void setCheckType(CheckType checkType) { this.checkType = checkType; }

    public CheckStatus getStatus() { return status; }
    public void setStatus(CheckStatus status) { this.status = status; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public String getFieldName() { return fieldName; }
    public void setFieldName(String fieldName) { this.fieldName = fieldName; }

    public String getExpectedValue() { return expectedValue; }
    public void setExpectedValue(String expectedValue) { this.expectedValue = expectedValue; }

    public String getActualValue() { return actualValue; }
    public void setActualValue(String actualValue) { this.actualValue = actualValue; }

    public Integer getSourcePage() { return sourcePage; }
    public void setSourcePage(Integer sourcePage) { this.sourcePage = sourcePage; }

    public String getEvidenceReference() { return evidenceReference; }
    public void setEvidenceReference(String evidenceReference) { this.evidenceReference = evidenceReference; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}