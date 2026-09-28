package com.sih.gem.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Phase 5A — Persisted outcome of one provider check for one bid.
 * Only masked / hashed references are stored — never raw government
 * identifiers (GSTIN, PAN, CIN) in plaintext.
 */
@Entity
@Table(name = "government_verification_results",
        uniqueConstraints = @UniqueConstraint(columnNames = {"bidId", "provider", "checkedAt"}))
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GovernmentVerificationResult {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String bidId;
    private String tenderId;

    /** Provider type code: GST / PAN / MCA / EPFO_ESIC / DIGILOCKER. */
    private String provider;

    /** VerificationStatus name: VERIFIED / NOT_VERIFIED / MISMATCH / UNAVAILABLE / SANDBOX / ERROR / PENDING. */
    private String status;

    private String referenceType;

    /** Masked reference only (e.g. 07*********F1Z5, AABCT****F). */
    private String referenceValue;

    private String verifiedName;
    private String verifiedStatus;
    private String verifiedDate;
    private String mismatchReason;
    private String source;

    @Column(length = 2000)
    private String message;

    private LocalDateTime checkedAt;
    private String evidenceReference;

    @PrePersist
    public void prePersist() {
        if (checkedAt == null) checkedAt = LocalDateTime.now();
    }
}
