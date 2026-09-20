package com.sih.gem.repository;

import com.sih.gem.entity.ConflictItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ConflictItemRepository extends JpaRepository<ConflictItem, Long> {
    List<ConflictItem> findByBidId(String bidId);
    void deleteByBidId(String bidId);
}
