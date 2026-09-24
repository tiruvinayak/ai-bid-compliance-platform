package com.sih.gem.repository;

import com.sih.gem.entity.PreliminaryVerificationCheck;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PreliminaryVerificationCheckRepository extends JpaRepository<PreliminaryVerificationCheck, Long> {
    List<PreliminaryVerificationCheck> findByBidId(String bidId);
    List<PreliminaryVerificationCheck> findByBidIdAndDocumentId(String bidId, String documentId);
    void deleteByBidId(String bidId);
}