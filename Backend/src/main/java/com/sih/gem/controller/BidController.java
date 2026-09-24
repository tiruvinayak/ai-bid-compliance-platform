package com.sih.gem.controller;

import com.sih.gem.entity.Bid;
import com.sih.gem.service.BidService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/bids")
public class BidController {

    private final BidService bidService;

    public BidController(BidService bidService) {
        this.bidService = bidService;
    }

    @GetMapping
    public ResponseEntity<List<Bid>> getAllBids() {
        return ResponseEntity.ok(bidService.getAllBids());
    }

    @GetMapping("/{bidId}")
    public ResponseEntity<Bid> getBid(@PathVariable String bidId) {
        return bidService.getBidByBidId(bidId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('GOVERNMENT_OFFICER', 'GOVT_OFFICER', 'CENTRAL_ADMIN', 'ADMIN', 'SECTOR_USER', 'USER', 'BIDDER')")
    public ResponseEntity<Bid> createBid(@RequestBody Bid bid) {
        return ResponseEntity.ok(bidService.createBid(bid));
    }

    @PutMapping("/{bidId}")
    @PreAuthorize("hasAnyRole('GOVERNMENT_OFFICER', 'GOVT_OFFICER', 'CENTRAL_ADMIN', 'ADMIN')")
    public ResponseEntity<Bid> updateBid(@PathVariable String bidId, @RequestBody Bid bid) {
        bid.setBidId(bidId);
        return ResponseEntity.ok(bidService.updateBid(bid));
    }

    @DeleteMapping("/{bidId}")
    @PreAuthorize("hasAnyRole('GOVERNMENT_OFFICER', 'GOVT_OFFICER', 'CENTRAL_ADMIN', 'ADMIN')")
    public ResponseEntity<Void> deleteBid(@PathVariable String bidId) {
        bidService.deleteBid(bidId);
        return ResponseEntity.noContent().build();
    }
}
