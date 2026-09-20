package com.sih.gem.repository;

import com.sih.gem.entity.Requirement;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RequirementRepository extends JpaRepository<Requirement, Long> {
    List<Requirement> findByBidId(String bidId);
    Optional<Requirement> findByBidIdAndRequirementId(String bidId, String requirementId);
    void deleteByBidId(String bidId);
}
