package com.sih.gem.service;

import com.sih.gem.entity.Bid;
import com.sih.gem.entity.Department;
import com.sih.gem.entity.Tender;
import com.sih.gem.entity.User;
import com.sih.gem.repository.BidRepository;
import com.sih.gem.repository.DepartmentRepository;
import com.sih.gem.repository.TenderRepository;
import com.sih.gem.repository.UserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;
import java.util.Optional;

@Service
public class BidService {

    private final BidRepository bidRepository;
    private final TenderRepository tenderRepository;
    private final DepartmentRepository departmentRepository;
    private final UserRepository userRepository;

    public BidService(BidRepository bidRepository,
                      TenderRepository tenderRepository,
                      DepartmentRepository departmentRepository,
                      UserRepository userRepository) {
        this.bidRepository = bidRepository;
        this.tenderRepository = tenderRepository;
        this.departmentRepository = departmentRepository;
        this.userRepository = userRepository;
    }

    public List<Bid> getAllBids() {
        return bidRepository.findAllByOrderByCreatedAtDesc();
    }

    public Optional<Bid> getBidByBidId(String bidId) {
        return bidRepository.findByBidId(bidId);
    }

    @Transactional
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
        Bid saved = bidRepository.save(bid);
        syncTenderFromBid(saved);
        return saved;
    }

    @Transactional
    public Bid updateBid(Bid bid) {
        Bid saved = bidRepository.save(bid);
        syncTenderFromBid(saved);
        return saved;
    }

    public void deleteBid(String bidId) {
        bidRepository.findByBidId(bidId).ifPresent(bidRepository::delete);
    }

    /**
     * Keeps the hierarchy Tender record aligned with bid tender metadata
     * without changing the AI pipeline (which continues to use Bid fields).
     */
    private void syncTenderFromBid(Bid bid) {
        if (bid.getTenderId() == null || bid.getTenderId().isBlank()) {
            return;
        }

        Optional<Tender> existing = tenderRepository.findByTenderId(bid.getTenderId());
        Department department = resolveDepartment(bid);

        if (existing.isPresent()) {
            Tender tender = existing.get();
            if (bid.getTenderTitle() != null && !bid.getTenderTitle().isBlank()) {
                tender.setTitle(bid.getTenderTitle());
            }
            if (bid.getCategory() != null) tender.setCategory(bid.getCategory());
            if (bid.getTenderDate() != null) tender.setTenderDate(bid.getTenderDate());
            if (bid.getClosingDate() != null) tender.setClosingDate(bid.getClosingDate());
            if (department != null) tender.setDepartment(department);
            applyOfficerIfPresent(tender);
            tender.setStatus(mapBidStatusToTenderStatus(bid.getStatus()));
            tenderRepository.save(tender);
            return;
        }

        if (department == null) {
            // Cannot create hierarchy tender without a department mapping.
            return;
        }

        Tender tender = Tender.builder()
                .tenderId(bid.getTenderId())
                .title(bid.getTenderTitle() != null ? bid.getTenderTitle() : bid.getTenderId())
                .department(department)
                .category(bid.getCategory())
                .tenderDate(bid.getTenderDate())
                .closingDate(bid.getClosingDate())
                .status(mapBidStatusToTenderStatus(bid.getStatus()))
                .build();
        applyOfficerIfPresent(tender);
        tenderRepository.save(tender);
    }

    private Department resolveDepartment(Bid bid) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getName() != null) {
            Optional<User> user = userRepository.findByEmail(auth.getName())
                    .or(() -> userRepository.findByEmail(auth.getName().toLowerCase(Locale.ROOT)));
            if (user.isPresent() && user.get().getDepartmentId() != null) {
                Optional<Department> byOfficer = departmentRepository.findById(user.get().getDepartmentId());
                if (byOfficer.isPresent()) return byOfficer.get();
            }
        }
        if (bid.getDepartment() != null && !bid.getDepartment().isBlank()) {
            return departmentRepository.findByNameIgnoreCase(bid.getDepartment().trim()).orElse(null);
        }
        return null;
    }

    private void applyOfficerIfPresent(Tender tender) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getName() == null) return;
        userRepository.findByEmail(auth.getName())
                .or(() -> userRepository.findByEmail(auth.getName().toLowerCase(Locale.ROOT)))
                .ifPresent(user -> {
                    String role = user.getRole() == null ? "" : user.getRole().toUpperCase(Locale.ROOT);
                    if (role.contains("OFFICER") || role.contains("ADMIN") || role.contains("SECTOR")) {
                        tender.setAssignedOfficerId(user.getId());
                        tender.setAssignedOfficerName(user.getName());
                    }
                });
    }

    private static String mapBidStatusToTenderStatus(String bidStatus) {
        if (bidStatus == null) return "ACTIVE";
        String s = bidStatus.trim().toUpperCase(Locale.ROOT).replace(' ', '_');
        if (s.equals("VERIFIED") || s.equals("REJECTED") || s.equals("COMPLETED") || s.equals("CLOSED")) {
            return "COMPLETED";
        }
        if (s.equals("DRAFT")) return "DRAFT";
        return "ACTIVE";
    }
}
