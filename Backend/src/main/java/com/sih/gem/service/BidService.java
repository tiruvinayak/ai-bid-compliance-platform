package com.sih.gem.service;

import com.sih.gem.entity.Bid;
import com.sih.gem.repository.BidRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class BidService {

    private final BidRepository bidRepository;

    public BidService(BidRepository bidRepository) {
        this.bidRepository = bidRepository;
    }

    public List<Bid> getAllBids() {
        return bidRepository.findAllByOrderByCreatedAtDesc();
    }

    public Optional<Bid> getBidByBidId(String bidId) {
        return bidRepository.findByBidId(bidId);
    }

    public Bid createBid(Bid bid) {
        if (bid.getBidId() == null || bid.getBidId().isBlank()) {
            // Generate a stable business ID and avoid reuse after deletions.
            long sequence = bidRepository.count() + 1;
            String candidate;
            do {
                candidate = String.format("GEM-2026-%03d", sequence++);
            } while (bidRepository.existsByBidId(candidate));
            bid.setBidId(candidate);
        }
        return bidRepository.save(bid);
    }

    public Bid updateBid(Bid bid) {
        return bidRepository.save(bid);
    }

    public void deleteBid(String bidId) {
        bidRepository.findByBidId(bidId).ifPresent(bidRepository::delete);
    }
}
