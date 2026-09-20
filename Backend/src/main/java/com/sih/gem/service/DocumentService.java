package com.sih.gem.service;

import com.sih.gem.entity.BidderDocument;
import com.sih.gem.entity.DocStage;
import com.sih.gem.repository.BidderDocumentRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class DocumentService {

    private final BidderDocumentRepository documentRepository;
    private final DocumentProcessor documentProcessor;

    @Value("${app.upload.dir}")
    private String uploadDir;

    public DocumentService(BidderDocumentRepository documentRepository,
                           DocumentProcessor documentProcessor) {
        this.documentRepository = documentRepository;
        this.documentProcessor = documentProcessor;
    }

    public List<BidderDocument> getDocumentsForBid(String bidId) {
        return documentRepository.findByBidIdOrderByUploadedAtDesc(bidId);
    }

    public List<BidderDocument> getUserDocuments(String email) {
        if (email == null || email.isBlank()) {
            return List.of();
        }
        return documentRepository.findByUploadedByOrderByUploadedAtDesc(email);
    }

    public DocumentDownload getDownload(Long documentId, String requester, boolean officer) {
        BidderDocument document = documentRepository.findById(documentId)
                .orElseThrow(() -> new IllegalArgumentException("Document was not found."));
        if (!officer && (document.getUploadedBy() == null || !document.getUploadedBy().equalsIgnoreCase(requester))) {
            throw new org.springframework.security.access.AccessDeniedException("You cannot download another bidder's document.");
        }
        try {
            Path path = Paths.get(document.getStoredPath()).toAbsolutePath().normalize();
            if (!Files.isRegularFile(path)) throw new IllegalArgumentException("The document file is unavailable.");
            return new DocumentDownload(new UrlResource(path.toUri()), document.getFilename());
        } catch (IOException | RuntimeException ex) {
            if (ex instanceof org.springframework.security.access.AccessDeniedException accessDenied) throw accessDenied;
            throw new IllegalArgumentException("The document file is unavailable.");
        }
    }

    public BidderDocument uploadDocument(String bidId, MultipartFile file, String docType, String uploadedBy) {
        try {
            if (bidId == null || !bidId.matches("[A-Za-z0-9][A-Za-z0-9._-]{0,63}")) {
                throw new IllegalArgumentException("Invalid bid identifier.");
            }
            if (file == null || file.isEmpty()) {
                throw new IllegalArgumentException("The uploaded document is empty.");
            }
            // 1. Save file to disk
            String originalName = file.getOriginalFilename() == null ? "document" : file.getOriginalFilename();
            String ext = getExtension(originalName);
            if (!"pdf".equals(ext)) {
                throw new IllegalArgumentException("Only PDF documents are supported by the current AI pipeline.");
            }
            try (var input = file.getInputStream()) {
                byte[] signature = input.readNBytes(5);
                if (signature.length < 5 || !"%PDF-".equals(new String(signature, java.nio.charset.StandardCharsets.US_ASCII))) {
                    throw new IllegalArgumentException("The uploaded file is not a valid PDF document.");
                }
            }
            // Keep the original basename for downstream AI provenance while
            // isolating each upload in a unique directory.
            String safeOriginalName = originalName.replaceAll("[^A-Za-z0-9._-]", "_");
            Path dir = Paths.get(uploadDir, bidId, UUID.randomUUID().toString());
            Files.createDirectories(dir);
            Path target = dir.resolve(safeOriginalName);
            file.transferTo(target.toAbsolutePath());

            // 2. Build document entity
            BidderDocument doc = BidderDocument.builder()
                    .bidId(bidId)
                    .filename(originalName)
                    .docType(docType == null || docType.isBlank() ? "Bidder Certificate" : docType)
                    .fileFormat(ext.toUpperCase())
                    .fileSize(formatSize(file.getSize()))
                    .uploadStatus("UPLOADED")
                    .processingStatus("PROCESSING")
                    .uploadedAt(LocalDateTime.now())
                    .uploadedBy(uploadedBy)
                    .storedPath(target.toAbsolutePath().toString())
                    .progressPercentage(10)
                    .stages(new ArrayList<>())
                    .build();

            doc.getStages().add(stage("Uploaded", true, "File uploaded successfully"));
            doc.getStages().add(stage("Content Detected", true, ext.toUpperCase() + " format recognized"));
            documentRepository.save(doc);

            // 3. Process document synchronously / pipeline
            documentProcessor.process(doc);

            return doc;
        } catch (IOException e) {
            throw new RuntimeException("Failed to store document: " + e.getMessage(), e);
        }
    }

    private DocStage stage(String name, boolean completed, String details) {
        return DocStage.builder()
                .name(name)
                .completed(completed)
                .timestamp(LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd MMM yyyy HH:mm")))
                .details(details)
                .build();
    }

    private String getExtension(String filename) {
        int idx = filename.lastIndexOf('.');
        return idx >= 0 ? filename.substring(idx + 1).toLowerCase() : "pdf";
    }

    private String formatSize(long bytes) {
        double mb = bytes / (1024.0 * 1024.0);
        return String.format("%.1f MB", mb);
    }

    public record DocumentDownload(Resource resource, String filename) {}
}
