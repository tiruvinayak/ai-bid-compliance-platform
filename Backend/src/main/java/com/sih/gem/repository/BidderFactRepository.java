package com.sih.gem.repository;

import com.sih.gem.entity.BidderFact;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BidderFactRepository extends JpaRepository<BidderFact, Long> {
    void deleteByBidId(String bidId);
}
