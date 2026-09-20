package com.sih.gem.entity;

import jakarta.persistence.*;
import lombok.*;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "compliance_results")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ComplianceResult {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String bidId;
    private String requirementId;
    private String status;
    private String requiredValue;
    private String requiredUnit;
    private String requiredPeriod;
    private String detectedValue;
    private String detectedUnit;
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "compliance_fact_ids", joinColumns = @JoinColumn(name = "compliance_id"))
    @Column(name = "fact_id")
    @Builder.Default
    private List<String> factIds = new ArrayList<>();
    @Column(length = 100000)
    private String reason;
    private Double confidence;
    private Boolean mandatory;
    private Boolean requiresManualReview;
    private String ruleUsed;
}
