package com.sih.gem.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "bidder_documents")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BidderDocument {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String bidId;

    @Column(nullable = false)
    private String filename;

    private String docType;
    private String fileFormat; // PDF, DOCX, XLSX, CSV, PPTX, PNG
    private String fileSize;
    private String uploadStatus;   // UPLOADING / UPLOADED / PROCESSING / PROCESSED / COMPLETED / FAILED
    private String processingStatus;

    private LocalDateTime uploadedAt;

    private Integer pageCount;
    private Integer sectionCount;
    private Integer sheetCount;
    private Integer slideCount;
    private Integer recordCount;
    private String unitLabel;
    private Integer progressPercentage;
    private String uploadedBy;

    // Path where the original file is stored on disk
    @JsonIgnore
    private String storedPath;

    // Extracted raw text (populated by the document processing pipeline)
    @JsonIgnore
    @Column(length = 100000)
    private String extractedText;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "doc_stages", joinColumns = @JoinColumn(name = "document_id"))
    private List<DocStage> stages = new ArrayList<>();

    @PrePersist
    public void prePersist() {
        if (uploadedAt == null) uploadedAt = LocalDateTime.now();
        if (uploadStatus == null) uploadStatus = "UPLOADED";
        if (processingStatus == null) processingStatus = "PROCESSED";
        if (progressPercentage == null) progressPercentage = 100;
    }

    // Explicit Getters & Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getBidId() { return bidId; }
    public void setBidId(String bidId) { this.bidId = bidId; }

    public String getFilename() { return filename; }
    public void setFilename(String filename) { this.filename = filename; }

    public String getDocType() { return docType; }
    public void setDocType(String docType) { this.docType = docType; }

    public String getFileFormat() { return fileFormat; }
    public void setFileFormat(String fileFormat) { this.fileFormat = fileFormat; }

    public String getFileSize() { return fileSize; }
    public void setFileSize(String fileSize) { this.fileSize = fileSize; }

    public String getUploadStatus() { return uploadStatus; }
    public void setUploadStatus(String uploadStatus) { this.uploadStatus = uploadStatus; }

    public String getProcessingStatus() { return processingStatus; }
    public void setProcessingStatus(String processingStatus) { this.processingStatus = processingStatus; }

    public LocalDateTime getUploadedAt() { return uploadedAt; }
    public void setUploadedAt(LocalDateTime uploadedAt) { this.uploadedAt = uploadedAt; }

    public Integer getPageCount() { return pageCount; }
    public void setPageCount(Integer pageCount) { this.pageCount = pageCount; }

    public Integer getSectionCount() { return sectionCount; }
    public void setSectionCount(Integer sectionCount) { this.sectionCount = sectionCount; }

    public Integer getSheetCount() { return sheetCount; }
    public void setSheetCount(Integer sheetCount) { this.sheetCount = sheetCount; }

    public Integer getSlideCount() { return slideCount; }
    public void setSlideCount(Integer slideCount) { this.slideCount = slideCount; }

    public Integer getRecordCount() { return recordCount; }
    public void setRecordCount(Integer recordCount) { this.recordCount = recordCount; }

    public String getUnitLabel() { return unitLabel; }
    public void setUnitLabel(String unitLabel) { this.unitLabel = unitLabel; }

    public Integer getProgressPercentage() { return progressPercentage; }
    public void setProgressPercentage(Integer progressPercentage) { this.progressPercentage = progressPercentage; }

    public String getUploadedBy() { return uploadedBy; }
    public void setUploadedBy(String uploadedBy) { this.uploadedBy = uploadedBy; }

    public String getStoredPath() { return storedPath; }
    public void setStoredPath(String storedPath) { this.storedPath = storedPath; }

    public String getExtractedText() { return extractedText; }
    public void setExtractedText(String extractedText) { this.extractedText = extractedText; }

    public List<DocStage> getStages() { return stages; }
    public void setStages(List<DocStage> stages) { this.stages = stages; }
}
