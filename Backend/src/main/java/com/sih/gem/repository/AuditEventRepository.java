package com.sih.gem.repository;

import com.sih.gem.entity.AuditEvent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AuditEventRepository extends JpaRepository<AuditEvent, Long> {
    List<AuditEvent> findByBidIdOrderByTimestampDesc(String bidId);
}
