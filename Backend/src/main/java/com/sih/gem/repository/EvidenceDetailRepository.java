package com.sih.gem.repository;

import com.sih.gem.entity.EvidenceDetail;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface EvidenceDetailRepository extends JpaRepository<EvidenceDetail, Long> {
    Optional<EvidenceDetail> findByRequirementId(String requirementId);
    void deleteByRequirementId(String requirementId);
}
