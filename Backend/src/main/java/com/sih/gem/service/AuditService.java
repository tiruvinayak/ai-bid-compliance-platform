package com.sih.gem.service;

import com.sih.gem.entity.AuditEvent;
import com.sih.gem.repository.AuditEventRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AuditService {

    private final AuditEventRepository auditRepository;

    public AuditService(AuditEventRepository auditRepository) {
        this.auditRepository = auditRepository;
    }

    public List<AuditEvent> getAuditTrail(String bidId) {
        return auditRepository.findByBidIdOrderByTimestampDesc(bidId);
    }
}
