package com.sih.gem.repository;

import com.sih.gem.entity.Bid;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BidRepository extends JpaRepository<Bid, Long> {
    Optional<Bid> findByBidId(String bidId);
    List<Bid> findAllByOrderByCreatedAtDesc();
    boolean existsByBidId(String bidId);
}
