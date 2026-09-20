package com.sih.gem.repository;

import com.sih.gem.entity.BidderDocument;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BidderDocumentRepository extends JpaRepository<BidderDocument, Long> {
    List<BidderDocument> findByBidIdOrderByUploadedAtDesc(String bidId);
    List<BidderDocument> findByUploadedByOrderByUploadedAtDesc(String uploadedBy);
}
