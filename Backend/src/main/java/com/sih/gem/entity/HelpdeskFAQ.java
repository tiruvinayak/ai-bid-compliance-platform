package com.sih.gem.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "helpdesk_faqs")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HelpdeskFAQ {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String question;
    @Column(length = 100000)
    private String answer;

    private String category; // Document Upload Help / Verification Help / Account Help / General
}
