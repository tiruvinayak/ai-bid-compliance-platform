# Imports os module for filesystem operations and temporary file cleanup.
# Required to safely manage uploaded tender PDF files during processing.
import os

# Imports tempfile module for creating secure temporary files.
# Required to save uploaded binary PDF stream to disk for PyMuPDF extraction.
import tempfile

# Imports APIRouter, File, UploadFile, and HTTPException from FastAPI.
# Required to handle multipart form uploads and HTTP error status codes.
from fastapi import APIRouter, File, HTTPException, UploadFile, status

# Imports dataclasses utility for converting dataclass models to dictionaries.
# Required to format requirement dataclass objects into clean JSON dictionaries.
from dataclasses import is_dataclass, asdict

# Imports Phase 1 PDF text extraction function.
# Required to extract page-by-page text and metadata from uploaded tender documents.
from app.document_processor import extract_pdf_text

# Imports Phase 2 requirement extractor class.
# Required to extract structured procurement requirements using LLM engine.
from app.requirement_extractor import RequirementExtractor

# Instantiates router instance for tender processing endpoints.
# Required to register route handlers with the primary FastAPI application.
router = APIRouter()


# Defines POST route decorator for /api/ai/process-tender endpoint.
# Required to process tender PDFs and return structured requirements to Spring Boot.
@router.post("/process-tender")
async def process_tender(
    # Accepts multipart form file upload under the parameter key 'tenderFile'.
    # Required to receive the tender document PDF file from HTTP clients.
    tenderFile: UploadFile = File(...)
):
    # Validates that an uploaded file object was provided in the request.
    # Required to return clean HTTP 400 error response if file field is missing.
    if not tenderFile or not tenderFile.filename:
        # Raises HTTP 400 Bad Request exception for missing tender file.
        # Required to inform client that a valid file parameter is mandatory.
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"success": False, "error_code": "MISSING_FILE", "message": "No tender file provided."}
        )

    # Validates file extension to ensure uploaded file is a PDF document.
    # Required to prevent unsupported file formats from failing during PDF processing.
    if not tenderFile.filename.lower().endswith(".pdf"):
        # Raises HTTP 400 Bad Request exception for non-PDF file formats.
        # Required to reject invalid file types with clear error messages.
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"success": False, "error_code": "UNSUPPORTED_FORMAT", "message": "Only PDF files are supported for tender processing."}
        )

    # Reads uploaded binary file stream into memory bytes buffer.
    # Required to check file size and write file content to temporary storage.
    file_bytes = await tenderFile.read()

    # Validates that uploaded file content is non-empty (bytes size > 0).
    # Required to prevent processing empty 0-byte uploaded files.
    if not file_bytes or len(file_bytes) == 0:
        # Raises HTTP 400 Bad Request exception for zero-byte files.
        # Required to reject empty uploads before calling document processors.
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"success": False, "error_code": "EMPTY_FILE", "message": "Uploaded tender file is empty (0 bytes)."}
        )

    # Creates temporary PDF file on disk to pass file path to PyMuPDF.
    # Required because extract_pdf_text expects a filesystem file path parameter.
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
    # Tries block to ensure temporary file is cleaned up after execution.
    # Required to prevent leftover temp files from accumulating on disk.
    try:
        # Writes binary bytes of uploaded PDF into temporary file.
        # Required to store binary content on filesystem for PyMuPDF reader.
        temp_file.write(file_bytes)
        # Closes temporary file handle so PyMuPDF can safely read it.
        # Required to flush writes and release file lock before extraction.
        temp_file.close()

        # Calls Phase 1 document processor to extract text and page metadata.
        # Required to convert PDF pages into page-by-page JSON structure.
        phase1_result = extract_pdf_text(temp_file.name)

        # Checks if Phase 1 extraction encountered unrecoverable file errors.
        # Required to handle corrupted or unreadable PDF files gracefully.
        if not phase1_result.get("success", False):
            # Formats error message string from Phase 1 result dictionary.
            # Required to provide clear failure details to calling client.
            err_msg = phase1_result.get("error_message") or phase1_result.get("message") or "PDF processing failed."
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={"success": False, "error_code": "INVALID_DOCUMENT", "message": f"Tender PDF processing failed: {err_msg}"}
            )

        # Instantiates Phase 2 requirement extractor using configured LLM provider.
        # Required to analyze extracted text and isolate procurement requirements.
        extractor = RequirementExtractor()
        # Executes Phase 2 requirement extraction on Phase 1 JSON output.
        # Required to extract structured requirements with categories and values.
        phase2_result = extractor.extract_from_phase1_json(phase1_result)

        # Checks if Phase 2 requirement extraction encountered an LLM or processing failure.
        # Required to raise HTTP 500 error if LLM parsing or execution fails.
        if not phase2_result.get("success", True):
            # Formats error detail message from Phase 2 result.
            # Required to convey LLM execution failure details.
            err_detail = phase2_result.get("error_message") or "Phase 2 requirement extraction failed."
            # Raises HTTP 500 Internal Server Error for LLM processing failure.
            # Required to return structured JSON error status for AI failures.
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail={"success": False, "error_code": "AI_PROCESSING_ERROR", "message": f"Tender requirement extraction failed: {err_detail}"}
            )

        # Extracts raw requirement object list from Phase 2 output dictionary.
        # Required to format requirement items into standardized JSON output.
        raw_reqs = phase2_result.get("requirements", [])
        # Converts dataclass requirement instances into plain dictionaries.
        # Required to ensure dictionary format and json serializability.
        formatted_reqs = []
        # Iterates through extracted requirement items.
        # Required to preserve mandatory requirement schema keys.
        for req in raw_reqs:
            # Converts item to dict if it is a dataclass object.
            # Required to standardize requirement dictionary representations.
            item_dict = asdict(req) if is_dataclass(req) else dict(req)
            # Sets original uploaded file basename as source_document name.
            # Required to maintain document traceability in API responses.
            item_dict["source_document"] = tenderFile.filename
            # Appends formatted requirement object to response list.
            # Required to compile complete requirement collection for response.
            formatted_reqs.append(item_dict)

        # Returns structured success JSON response containing extracted requirements.
        # Required to deliver complete Phase 1 + Phase 2 output to calling clients.
        return {
            "success": True,
            "document_name": tenderFile.filename,
            "page_count": phase1_result.get("page_count", 0),
            "requirements": formatted_reqs,
            "total_requirements": len(formatted_reqs),
            "errors": None
        }

    # Catch-all exception block to handle unexpected extraction errors.
    # Required to prevent unhandled exceptions from exposing stack traces.
    except HTTPException:
        raise
    except Exception as e:
        # Raises HTTP 500 Internal Server Error for unhandled exceptions.
        # Required to return structured error message for unexpected failures.
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"success": False, "error_code": "AI_PROCESSING_ERROR", "message": f"Tender processing failed: {str(e)}"}
        )

    # Finally block executing cleanup for temporary file.
    # Required to ensure temporary file removal regardless of success or failure.
    finally:
        # Checks if temporary file path exists on disk.
        # Required to avoid OSError when removing non-existent temp files.
        if os.path.exists(temp_file.name):
            # Unlinks and deletes temporary file from filesystem.
            # Required to free disk space and clean up scratch directory.
            os.unlink(temp_file.name)
