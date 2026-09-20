package com.sih.gem.service;

import com.sih.gem.entity.BidderDocument;

/**
 * Abstraction for the document processing pipeline.
 * <p>
 * The default implementation performs lightweight text extraction and
 * metadata detection. This is the extension point where OCR / AI / RAG
 * capabilities will be plugged in (see DocumentProcessorImpl).
 */
public interface DocumentProcessor {

    /**
     * Process a stored document: extract text, detect structure (pages/sheets/slides),
     * and update the document's processing status and stages.
     */
    void process(BidderDocument document);
}
