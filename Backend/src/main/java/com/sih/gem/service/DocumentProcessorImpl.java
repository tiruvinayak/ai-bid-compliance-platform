package com.sih.gem.service;

import com.sih.gem.entity.BidderDocument;
import com.sih.gem.entity.DocStage;
import com.sih.gem.repository.BidderDocumentRepository;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.hslf.usermodel.HSLFSlideShow;
import org.apache.poi.hslf.usermodel.HSLFSlideShowImpl;
import org.apache.poi.hssf.usermodel.HSSFWorkbook;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.apache.poi.xslf.usermodel.XMLSlideShow;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

/**
 * Default document processor. Extracts text and structural metadata from
 * PDF, DOCX, XLSX, PPTX, CSV and TXT files.
 * <p>
 * This is the extension point for the AI/OCR/RAG pipeline (SIH26100).
 */
@Service
public class DocumentProcessorImpl implements DocumentProcessor {

    private final BidderDocumentRepository documentRepository;

    public DocumentProcessorImpl(BidderDocumentRepository documentRepository) {
        this.documentRepository = documentRepository;
    }

    @Override
    public void process(BidderDocument document) {
        try {
            String path = document.getStoredPath();
            if (path == null || !Files.exists(Paths.get(path))) {
                markFailed(document, "Stored file not found");
                return;
            }

            String ext = document.getFileFormat() == null ? "" : document.getFileFormat().toLowerCase();
            String text = "";
            int count = 0;
            String unitLabel = "Pages";

            switch (ext) {
                case "pdf" -> {
                    try (PDDocument pd = Loader.loadPDF(new File(path))) {
                        count = pd.getNumberOfPages();
                        PDFTextStripper stripper = new PDFTextStripper();
                        text = stripper.getText(pd);
                    }
                    unitLabel = "Pages";
                }
                case "docx" -> {
                    try (FileInputStream fis = new FileInputStream(path);
                         XWPFDocument doc = new XWPFDocument(fis)) {
                        StringBuilder sb = new StringBuilder();
                        doc.getParagraphs().forEach(p -> sb.append(p.getText()).append("\n"));
                        doc.getTables().forEach(t -> t.getRows().forEach(r ->
                                r.getTableCells().forEach(c -> sb.append(c.getText()).append(" "))));
                        text = sb.toString();
                        count = doc.getParagraphs().size();
                    }
                    unitLabel = "Sections";
                }
                case "xlsx", "xls" -> {
                    try (FileInputStream fis = new FileInputStream(path);
                         Workbook wb = WorkbookFactory.create(fis)) {
                        StringBuilder sb = new StringBuilder();
                        count = wb.getNumberOfSheets();
                        for (Sheet sheet : wb) {
                            sb.append("Sheet: ").append(sheet.getSheetName()).append("\n");
                            sheet.forEach(row -> row.forEach(cell -> {
                                if (cell != null) sb.append(cell.toString()).append(" ");
                            }));
                            sb.append("\n");
                        }
                        text = sb.toString();
                    }
                    unitLabel = "Sheets";
                }
                case "pptx" -> {
                    try (FileInputStream fis = new FileInputStream(path);
                         XMLSlideShow ppt = new XMLSlideShow(fis)) {
                        count = ppt.getSlides().size();
                        StringBuilder sb = new StringBuilder();
                        ppt.getSlides().forEach(s -> s.getShapes().forEach(sh -> {
                            if (sh instanceof org.apache.poi.xslf.usermodel.XSLFTextShape ts) {
                                sb.append(ts.getText()).append("\n");
                            }
                        }));
                        text = sb.toString();
                    }
                    unitLabel = "Slides";
                }
                case "ppt" -> {
                    try (HSLFSlideShow ppt = new HSLFSlideShow(new HSLFSlideShowImpl(path))) {
                        count = ppt.getSlides().size();
                        StringBuilder sb = new StringBuilder();
                        ppt.getSlides().forEach(s -> s.getShapes().forEach(sh -> {
                            if (sh instanceof org.apache.poi.hslf.usermodel.HSLFTextShape ts) {
                                sb.append(ts.getText()).append("\n");
                            }
                        }));
                        text = sb.toString();
                    }
                    unitLabel = "Slides";
                }
                case "csv", "txt" -> {
                    text = Files.readString(Paths.get(path));
                    count = text.split("\n").length;
                    unitLabel = "Records";
                }
                default -> {
                    // Unsupported format - just store metadata
                    text = "";
                    count = 0;
                    unitLabel = "Pages";
                }
            }

            // Update document with extracted data
            document.setExtractedText(text);
            document.setUnitLabel(unitLabel);
            document.setProgressPercentage(100);
            document.setProcessingStatus("PROCESSED");
            document.setUploadStatus("COMPLETED");

            switch (unitLabel) {
                case "Pages" -> document.setPageCount(count);
                case "Sections" -> document.setSectionCount(count);
                case "Sheets" -> document.setSheetCount(count);
                case "Slides" -> document.setSlideCount(count);
                case "Records" -> document.setRecordCount(count);
            }

            List<DocStage> stages = new ArrayList<>(document.getStages() == null ? new ArrayList<>() : document.getStages());
            stages.add(stage(unitLabel + " Processed", true, count + " " + unitLabel.toLowerCase() + " extracted"));
            stages.add(stage("Ready for Verification", true, "Ready for compliance checks"));
            document.setStages(stages);

            documentRepository.save(document);
        } catch (Exception e) {
            markFailed(document, "Processing error: " + e.getMessage());
        }
    }

    private void markFailed(BidderDocument document, String reason) {
        document.setProcessingStatus("FAILED");
        document.setUploadStatus("FAILED");
        document.setProgressPercentage(0);
        List<DocStage> stages = new ArrayList<>(document.getStages() == null ? new ArrayList<>() : document.getStages());
        stages.add(stage("Processing Failed", false, reason));
        document.setStages(stages);
        documentRepository.save(document);
    }

    private DocStage stage(String name, boolean completed, String details) {
        return DocStage.builder()
                .name(name)
                .completed(completed)
                .timestamp(LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd MMM yyyy HH:mm")))
                .details(details)
                .build();
    }
}
