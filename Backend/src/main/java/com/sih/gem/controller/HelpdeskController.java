package com.sih.gem.controller;

import com.sih.gem.entity.HelpdeskFAQ;
import com.sih.gem.entity.HelpdeskQuery;
import com.sih.gem.service.HelpdeskService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/helpdesk")
public class HelpdeskController {

    private final HelpdeskService helpdeskService;

    public HelpdeskController(HelpdeskService helpdeskService) {
        this.helpdeskService = helpdeskService;
    }

    @GetMapping("/faqs")
    public ResponseEntity<List<HelpdeskFAQ>> getFAQs() {
        return ResponseEntity.ok(helpdeskService.getFAQs());
    }

    @PostMapping("/queries")
    public ResponseEntity<Map<String, Object>> submitQuery(@RequestBody HelpdeskQuery query) {
        HelpdeskQuery saved = helpdeskService.submitQuery(query);
        String ticketId = "TKT-" + String.format("%06d", saved.getId());
        return ResponseEntity.ok(Map.of("success", true, "ticketId", ticketId));
    }
}
