package com.sih.gem.controller;

import com.sih.gem.entity.BidderDocument;
import com.sih.gem.service.DocumentService;
import org.springframework.http.ResponseEntity;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api")
public class DocumentController {

    private final DocumentService documentService;

    public DocumentController(DocumentService documentService) {
        this.documentService = documentService;
    }

    @GetMapping("/bids/{bidId}/documents")
    public ResponseEntity<List<BidderDocument>> getDocuments(@PathVariable String bidId) {
        return ResponseEntity.ok(documentService.getDocumentsForBid(bidId));
    }

    @GetMapping("/user/documents")
    public ResponseEntity<List<BidderDocument>> getUserDocuments(Authentication authentication) {
        return ResponseEntity.ok(documentService.getUserDocuments(authentication.getName()));
    }

    @PostMapping("/bids/{bidId}/tender-document")
    @PreAuthorize("hasAnyRole('GOVERNMENT_OFFICER', 'GOVT_OFFICER')")
    public ResponseEntity<BidderDocument> uploadTender(@PathVariable String bidId,
                                                       @RequestParam("file") MultipartFile file,
                                                       Authentication authentication) {
        return ResponseEntity.ok(documentService.uploadDocument(bidId, file, "Tender RFP Specification", authentication.getName()));
    }

    @PostMapping("/bids/{bidId}/documents")
    @PreAuthorize("hasAnyRole('GOVERNMENT_OFFICER', 'GOVT_OFFICER', 'USER', 'BIDDER')")
    public ResponseEntity<BidderDocument> uploadDocument(@PathVariable String bidId,
                                                         @RequestParam("file") MultipartFile file,
                                                         @RequestParam(value = "docType", required = false) String docType,
                                                         Authentication authentication) {
        return ResponseEntity.ok(documentService.uploadDocument(bidId, file, docType, authentication.getName()));
    }

    @GetMapping("/documents/{documentId}/download")
    @PreAuthorize("hasAnyRole('GOVERNMENT_OFFICER', 'GOVT_OFFICER', 'USER', 'BIDDER')")
    public ResponseEntity<Resource> downloadDocument(@PathVariable Long documentId, Authentication authentication) {
        boolean officer = authentication.getAuthorities().stream()
                .anyMatch(authority -> authority.getAuthority().equals("ROLE_GOVERNMENT_OFFICER")
                        || authority.getAuthority().equals("ROLE_GOVT_OFFICER"));
        DocumentService.DocumentDownload download = documentService.getDownload(documentId, authentication.getName(), officer);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + download.filename().replaceAll("[^A-Za-z0-9._-]", "_") + "\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(download.resource());
    }
}
