package com.sih.gem.service;

import com.sih.gem.entity.ConflictItem;
import com.sih.gem.repository.ConflictItemRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ConflictService {

    private final ConflictItemRepository conflictRepository;

    public ConflictService(ConflictItemRepository conflictRepository) {
        this.conflictRepository = conflictRepository;
    }

    public List<ConflictItem> getConflicts(String bidId) {
        return conflictRepository.findByBidId(bidId);
    }
}
