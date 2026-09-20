package com.sih.gem.controller;

import com.sih.gem.service.ReportService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.Files;

@RestController
@RequestMapping("/api")
public class ReportController {

    private final ReportService reportService;

    @Value("${app.upload.dir}")
    private String uploadDir;

    public ReportController(ReportService reportService) {
        this.reportService = reportService;
    }

    @PostMapping("/bids/{bidId}/report/generate")
    @PreAuthorize("hasRole('GOVERNMENT_OFFICER')")
    public ResponseEntity<ReportService.ReportResult> generateReport(@PathVariable String bidId) {
        return ResponseEntity.ok(reportService.generateReport(bidId));
    }

    @GetMapping("/reports/{filename}")
    @PreAuthorize("hasAnyRole('GOVERNMENT_OFFICER', 'GOVT_OFFICER')")
    public ResponseEntity<Resource> downloadReport(@PathVariable String filename) {
        try {
            Path reportsDir = Paths.get(uploadDir, "reports").toAbsolutePath().normalize();
            Path file = reportsDir.resolve(filename).normalize();
            if (!file.startsWith(reportsDir) || !filename.equals(file.getFileName().toString())) {
                return ResponseEntity.notFound().build();
            }
            Resource resource = new UrlResource(file.toUri());
            if (resource.exists() && resource.isReadable() && Files.isRegularFile(file)) {
                return ResponseEntity.ok()
                        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                        .contentType(MediaType.TEXT_HTML)
                        .body(resource);
            }
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }
}
