# Imports os module for managing temporary disk files and paths.
# Required to perform safe temporary file cleanup during document processing.
import os

# Imports tempfile module for secure temporary file creation.
# Required to write uploaded binary streams to disk for PyMuPDF parsing.
import tempfile

# Imports APIRouter, File, UploadFile, and HTTPException from FastAPI.
# Required to declare multipart file upload route handlers and error responses.
from fastapi import APIRouter, File, HTTPException, UploadFile, status

# Imports dataclasses utilities to convert dataclass model objects to dictionaries.
# Required to convert BidderFactItem instances into plain JSON dictionaries.
from dataclasses import is_dataclass, asdict

# Imports typing utilities for list parameters.
# Required to annotate multiple file upload parameters.
from typing import List

# Imports Phase 1 PDF text extraction function.
# Required to extract page text and metadata from bidder documents.
from app.document_processor import extract_pdf_text

# Imports Phase 3 bidder document intelligence analyzer class.
# Required to extract structured facts and evidence from bidder files.
from app.bidder_document_analyzer import BidderDocumentAnalyzer

# Instantiates router instance for bidder document processing endpoints.
# Required to register bidder routes with the FastAPI server application.
router = APIRouter()


# Defines POST route decorator for /api/ai/process-bidder endpoint.
# Required to process bidder PDFs and return extracted facts to Spring Boot.
@router.post("/process-bidder")
async def process_bidder(
    # Accepts list of uploaded multipart files under parameter key 'bidderFiles'.
    # Required to support batch upload of multiple bidder document PDFs.
    bidderFiles: List[UploadFile] = File(...)
):
    # Validates that at least one bidder file was uploaded in the request.
    # Required to return clean HTTP 400 error response for missing file inputs.
    if not bidderFiles or len(bidderFiles) == 0:
        # Raises HTTP 400 Bad Request exception for missing bidder file uploads.
        # Required to inform client that bidder files are mandatory.
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"success": False, "error_code": "MISSING_FILE", "message": "No bidder files provided."}
        )

    # List holding processed document name strings.
    # Required to return document inventory list in API response.
    processed_docs: List[str] = []
    # List holding all consolidated bidder fact dictionaries.
    # Required to aggregate extracted facts across all uploaded bidder files.
    consolidated_facts: List[dict] = []
    # List holding error message strings encountered during processing.
    # Required to collect warnings or errors across batch processing.
    processing_errors: List[str] = []

    # Instantiates Phase 3 bidder document analyzer.
    # Required to extract financial, technical, and experience facts.
    analyzer = BidderDocumentAnalyzer()

    # Iterates through each uploaded bidder document file.
    # Required to process multiple bidder files in batch sequence.
    for upload_file in bidderFiles:
        # Validates that uploaded file has non-empty filename string.
        # Required to skip invalid or unnamed file uploads.
        if not upload_file or not upload_file.filename:
            continue

        # Validates file extension to ensure uploaded file is a PDF document.
        # Required to prevent unsupported file formats from being processed.
        if not upload_file.filename.lower().endswith(".pdf"):
            # Appends error message for non-PDF file format.
            # Required to record file format warnings for client reporting.
            processing_errors.append(f"File '{upload_file.filename}' is not a PDF and was skipped.")
            continue

        # Reads uploaded binary file stream into memory bytes buffer.
        # Required to verify content length and write to temporary file.
        file_bytes = await upload_file.read()

        # Validates that file content bytes are non-empty.
        # Required to skip 0-byte empty file uploads.
        if not file_bytes or len(file_bytes) == 0:
            # Appends warning message for zero-byte file upload.
            # Required to inform client about skipped empty files.
            processing_errors.append(f"File '{upload_file.filename}' is empty (0 bytes) and was skipped.")
            continue

        # Creates temporary file on disk to save uploaded PDF bytes.
        # Required to provide file path parameter for PyMuPDF parser.
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
        # Try block to guarantee temporary file cleanup after processing.
        # Required to prevent disk space leaks from leftover temp files.
        try:
            # Writes uploaded binary bytes into temporary file.
            # Required to store file content on filesystem for Phase 1.
            temp_file.write(file_bytes)
            # Closes temporary file handle to flush writes.
            # Required to release file lock before Phase 1 extraction.
            temp_file.close()

            # Calls Phase 1 document processor to extract text and page structure.
            # Required to parse PDF pages into structured text JSON.
            phase1_res = extract_pdf_text(temp_file.name)

            # Checks if Phase 1 PDF extraction failed for this document.
            # Required to skip corrupted or unreadable PDF files gracefully.
            if not phase1_res.get("success", False):
                # Formats extraction failure error message string.
                # Required to detail failure reason in processing errors list.
                err_msg = phase1_res.get("error_message") or "Phase 1 PDF extraction failed."
                # Appends error message for failed document.
                # Required to log document failure in output errors field.
                processing_errors.append(f"Document '{upload_file.filename}': {err_msg}")
                continue

            # Overwrites phase1 document_name with original uploaded filename.
            # Required to pass clean uploaded filename into Phase 3 analyzer.
            phase1_res["document_name"] = upload_file.filename

            # Executes Phase 3 fact extraction on Phase 1 JSON output.
            # Required to extract company facts, financials, and certifications.
            phase3_res = analyzer.analyze_from_phase1_json(phase1_res)

            # Record document name in processed documents list.
            # Required to build list of successfully analyzed files.
            processed_docs.append(upload_file.filename)

            # Extracts facts list from Phase 3 result dictionary.
            # Required to handle both 'facts' and 'extracted_facts' dictionary keys.
            raw_facts = phase3_res.get("facts") or phase3_res.get("extracted_facts", [])

            # Iterates through extracted facts from this document.
            # Required to format facts and append to consolidated list.
            for fact in raw_facts:
                # Converts fact instance to dictionary if it is a dataclass object.
                # Required to ensure dictionary format and JSON serializability.
                item_dict = asdict(fact) if is_dataclass(fact) else dict(fact)
                # Overwrites source_document field with original uploaded filename.
                # Required to guarantee source document traceability in API output.
                item_dict["source_document"] = upload_file.filename
                # Appends formatted fact dictionary to consolidated facts collection.
                # Required to build complete fact inventory across all documents.
                consolidated_facts.append(item_dict)

        # Catch-all exception block for processing errors on this file.
        # Required to isolate file processing failures without breaking full batch.
        except Exception as file_err:
            # Appends exception message to processing errors list.
            # Required to log file-level failure details for reporting.
            processing_errors.append(f"Failed to process '{upload_file.filename}': {str(file_err)}")

        # Finally block ensuring temporary file removal.
        # Required to clean up disk resources after file processing.
        finally:
            # Checks if temporary file exists on disk.
            # Required to avoid unlinking non-existent files.
            if os.path.exists(temp_file.name):
                # Unlinks temporary disk file.
                # Required to delete temp file and free disk space.
                os.unlink(temp_file.name)

    # Checks if no bidder documents were successfully processed.
    # Required to return clean error status if all uploaded files failed.
    if not processed_docs and processing_errors:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"success": False, "error_code": "INVALID_BIDDER_DOCUMENTS", "message": "No bidder document could be processed.", "details": processing_errors}
        )

    # Returns structured success JSON response containing consolidated facts.
    # Required to deliver complete Phase 1 + Phase 3 output to Spring Boot.
    return {
        "success": True,
        "documents": processed_docs,
        "facts": consolidated_facts,
        "total_facts": len(consolidated_facts),
        "errors": " | ".join(processing_errors) if processing_errors else None
    }
