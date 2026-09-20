package com.sih.gem.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "government_instructions")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GovernmentInstruction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;
    @Column(length = 100000)
    private String description;

    private String category;
    private String sourceRef;
    private String sourceUrl;
    private LocalDateTime lastUpdated;
    private Boolean isRestriction;

    @PrePersist
    public void prePersist() {
        if (lastUpdated == null) lastUpdated = LocalDateTime.now();
        if (isRestriction == null) isRestriction = false;
    }
}
