package com.sih.gem.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "risk_category_summaries")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RiskCategorySummary {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String bidId;
    private String category; // Financial / Documentation / Experience / Registration / Identity
    private String riskId;
    private String requirementId;
    private String conflictId;
    private Boolean requiresManualReview;
    private String recommendedAction;
    private String riskLevel; // LOW / MEDIUM / HIGH
    private Integer score;    // 0-100
    private String summary;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "risk_factors", joinColumns = @JoinColumn(name = "risk_id"))
    @Column(name = "factor")
    private List<String> factors = new ArrayList<>();

    // Explicit Getters & Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getBidId() { return bidId; }
    public void setBidId(String bidId) { this.bidId = bidId; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getRiskLevel() { return riskLevel; }
    public void setRiskLevel(String riskLevel) { this.riskLevel = riskLevel; }

    public Integer getScore() { return score; }
    public void setScore(Integer score) { this.score = score; }

    public String getSummary() { return summary; }
    public void setSummary(String summary) { this.summary = summary; }

    public List<String> getFactors() { return factors; }
    public void setFactors(List<String> factors) { this.factors = factors; }
}
