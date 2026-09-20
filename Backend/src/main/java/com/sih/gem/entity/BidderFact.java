package com.sih.gem.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "bidder_facts")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BidderFact {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String bidId;
    private String factId;
    private String category;
    private String fieldName;
    private String detectedValue;
    private String unit;
    private String period;
    private Double confidence;
    private Boolean ambiguous;
    private String sourceDocument;
    private Integer pageNumber;
    private String sectionName;
    @Column(length = 100000)
    private String sourceText;
}
