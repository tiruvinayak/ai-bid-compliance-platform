package com.sih.gem.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "officer_review_records")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OfficerReviewRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String bidId;

    private String officerName;
    private String officerDesignation;
    @Column(length = 100000)
    private String recommendation;

    private String finalDecision; // APPROVED / REJECTED / REQUEST_CLARIFICATION / UNDER_REVIEW
    @Column(length = 100000)
    private String comment;

    private LocalDateTime updatedAt;

    @PrePersist
    public void prePersist() {
        if (updatedAt == null) updatedAt = LocalDateTime.now();
    }
}
