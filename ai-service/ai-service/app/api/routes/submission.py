# Imports os module for managing temporary disk files and paths.
# Required to perform safe temporary file cleanup after processing.
import os

# Imports tempfile module for secure temporary file creation.
# Required to write uploaded binary streams to disk for PyMuPDF parsing.
import tempfile

# Imports APIRouter, File, Form, UploadFile, and HTTPException from FastAPI.
# Required to declare multipart form parameters and HTTP exception handling.
from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status

# Imports dataclasses utilities to convert dataclass instances to plain dicts.
# Required to format requirements and facts into clean JSON dictionaries.
from dataclasses import is_dataclass, asdict

# Imports typing utilities for list type annotations.
# Required to declare multiple file upload form fields.
from typing import List

# Imports Phase 1 PDF text extraction function.
# Required to extract page text and metadata from tender and bidder documents.
from app.document_processor import extract_pdf_text

# Imports Phase 2 requirement extractor class.
# Required to extract structured tender requirements using LLM engine.
from app.requirement_extractor import RequirementExtractor

# Imports Phase 3 bidder document analyzer class.
# Required to extract bidder facts and evidence from uploaded documents.
from app.bidder_document_analyzer import BidderDocumentAnalyzer

# Imports Phase 4 compliance engine class.
# Required to execute rule-based compliance verification between requirements and facts.
from app.compliance_engine import ComplianceEngine

# Imports Phase 5 risk and conflict intelligence engine class.
# Required to evaluate risk levels, expired certificates, and evidence conflicts.
from app.risk_conflict_engine import RiskConflictEngine

# Instantiates router instance for full end-to-end submission endpoints.
# Required to register submission processing routes with FastAPI server.
router = APIRouter()


# Defines POST route decorator for /api/ai/process-submission endpoint.
# Required to execute complete end-to-end AI pipeline (Phase 1 -> 5) in a single API call.
@router.post("/process-submission")
async def process_submission(
    # Form parameter holding submission identifier string.
    # Required to associate processed evaluation results with the submission ID.
    submissionId: str = Form(...),
    # Multipart file upload holding the tender notice PDF file.
    # Required to supply tender document for Phase 1 + Phase 2 processing.
    tenderFile: UploadFile = File(...),
    # Multipart file uploads list holding bidder document PDF files.
    # Required to supply bidder documents for Phase 1 + Phase 3 processing.
    bidderFiles: List[UploadFile] = File(...)
):
    # Validates that submissionId parameter is non-empty string.
    # Required to return clean HTTP 400 error response for missing submission ID.
    if not submissionId or not submissionId.strip():
        # Raises HTTP 400 Bad Request exception for missing submission ID.
        # Required to reject invalid requests lacking submission identifier.
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"success": False, "error_code": "MISSING_SUBMISSION_ID", "message": "submissionId is required."}
        )

    # Validates that tender file object was provided in request.
    # Required to return clean HTTP 400 error response for missing tender file.
    if not tenderFile or not tenderFile.filename:
        # Raises HTTP 400 Bad Request exception for missing tender file.
        # Required to inform client that tender document file is mandatory.
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"success": False, "error_code": "MISSING_TENDER_FILE", "message": "tenderFile is required."}
        )

    # Validates that tender file has .pdf file extension.
    # Required to reject unsupported tender document file formats.
    if not tenderFile.filename.lower().endswith(".pdf"):
        # Raises HTTP 400 Bad Request exception for non-PDF tender file.
        # Required to enforce PDF file format requirement for tender parsing.
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"success": False, "error_code": "UNSUPPORTED_FORMAT", "message": "tenderFile must be a PDF document."}
        )

    # Validates that at least one bidder file was provided in request.
    # Required to return clean HTTP 400 error response for missing bidder files.
    if not bidderFiles or len(bidderFiles) == 0:
        # Raises HTTP 400 Bad Request exception for missing bidder files.
        # Required to inform client that bidder documents are mandatory.
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"success": False, "error_code": "MISSING_BIDDER_FILES", "message": "At least one bidderFile is required."}
        )

    if any(not file or not file.filename for file in bidderFiles):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"success": False, "error_code": "MISSING_BIDDER_FILE", "message": "Every bidderFile must have a filename."}
        )
    invalid_format = next((file for file in bidderFiles if not file.filename.lower().endswith(".pdf")), None)
    if invalid_format is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"success": False, "error_code": "UNSUPPORTED_FORMAT", "message": f"Bidder file '{invalid_format.filename}' must be a PDF document."}
        )

    # List holding active temporary file path strings created during execution.
    # Required to ensure clean deletion of all temp files in finally block.
    temp_files_to_cleanup: List[str] = []

    # Try block wrapping complete end-to-end execution pipeline.
    # Required to ensure all temp files are removed regardless of errors.
    try:
        # -------------------------------------------------------------------------
        # STEP 1: Tender Processing (Phase 1 -> Phase 2)
        # -------------------------------------------------------------------------
        # Reads binary content bytes of tender PDF file.
        # Required to check file size and save content to temporary file.
        tender_bytes = await tenderFile.read()
        # Validates that tender PDF content is non-empty (bytes size > 0).
        # Required to reject 0-byte tender file uploads.
        if not tender_bytes or len(tender_bytes) == 0:
            # Raises HTTP 400 Bad Request exception for empty tender file.
            # Required to stop processing empty tender document uploads.
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"success": False, "error_code": "EMPTY_FILE", "message": "tenderFile is empty (0 bytes)."}
            )

        # Creates temporary disk file for tender PDF content.
        # Required to pass filesystem file path to Phase 1 extractor.
        tender_temp = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
        # Appends temporary tender file path to cleanup list.
        # Required to track temporary file for deletion in finally block.
        temp_files_to_cleanup.append(tender_temp.name)
        # Writes tender binary bytes into temporary file.
        # Required to store tender content on filesystem.
        tender_temp.write(tender_bytes)
        # Closes tender temporary file handle.
        # Required to flush writes before calling PyMuPDF extraction.
        tender_temp.close()

        # Executes Phase 1 text extraction on tender document.
        # Required to extract page text and metadata from tender PDF.
        tender_p1 = extract_pdf_text(tender_temp.name)
        # Checks if Phase 1 PDF extraction failed for tender file.
        # Required to return clean failure response if tender PDF is corrupted.
        if not tender_p1.get("success", False):
            # Formats error message string from Phase 1 result.
            # Required to provide failure details in response.
            err_msg = tender_p1.get("error_message") or "Tender PDF processing failed."
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={"success": False, "error_code": "INVALID_DOCUMENT", "message": f"Tender PDF processing failed: {err_msg}"}
            )

        # Temporary storage paths are implementation details. Preserve the
        # original uploaded filename for requirement-to-document traceability.
        tender_p1["document_name"] = tenderFile.filename

        # Instantiates Phase 2 requirement extractor instance.
        # Required to analyze tender text and extract procurement requirements.
        req_extractor = RequirementExtractor()
        # Executes Phase 2 requirement extraction on Phase 1 tender output.
        # Required to extract requirement categories, descriptions, and values.
        tender_p2 = req_extractor.extract_from_phase1_json(tender_p1)

        if not tender_p2.get("success", False):
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail={"success": False, "error_code": "AI_PROCESSING_ERROR", "message": tender_p2.get("error_message") or "Tender requirement extraction failed."}
            )

        # Extracts raw requirement objects list from Phase 2 result.
        # Required to format requirement collection for submission response.
        raw_reqs = tender_p2.get("requirements", [])
        # Converts dataclass requirement items to dictionaries.
        # Required to standardize requirement representations for API JSON response.
        formatted_reqs = []
        # Iterates through extracted requirement items.
        # Required to bind original tender filename for document traceability.
        for req in raw_reqs:
            # Converts requirement item to dictionary.
            # Required to ensure dictionary format and JSON serializability.
            item_dict = asdict(req) if is_dataclass(req) else dict(req)
            # Sets original tender filename as source_document name.
            # Required to preserve document traceability in output JSON.
            item_dict["source_document"] = tenderFile.filename
            # Appends formatted requirement object to requirements list.
            # Required to build complete requirements collection.
            formatted_reqs.append(item_dict)

        # -------------------------------------------------------------------------
        # STEP 2: Bidder Document Processing (Phase 1 -> Phase 3)
        # -------------------------------------------------------------------------
        # Instantiates Phase 3 bidder document analyzer.
        # Required to extract facts, financials, and certifications from bidder files.
        bidder_analyzer = BidderDocumentAnalyzer()
        # List holding consolidated facts extracted across all bidder documents.
        # Required to collect complete bidder evidence fact inventory.
        consolidated_facts: List[dict] = []
        processed_bidder_files = 0

        # Iterates through each uploaded bidder document file.
        # Required to process all submitted bidder files in batch.
        for bidder_file in bidderFiles:
            # Reads binary content bytes of bidder PDF file.
            # Required to check file size and save content to temporary file.
            b_bytes = await bidder_file.read()
            # Validates that bidder PDF bytes are non-empty.
            # Required to reject invalid uploads instead of silently evaluating no evidence.
            if not b_bytes or len(b_bytes) == 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={"success": False, "error_code": "EMPTY_FILE", "message": f"Bidder file '{bidder_file.filename}' is empty."}
                )

            # Creates temporary disk file for bidder PDF content.
            # Required to provide filesystem path for PyMuPDF extraction.
            b_temp = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
            # Appends temporary file path to cleanup list.
            # Required to track temporary file for deletion in finally block.
            temp_files_to_cleanup.append(b_temp.name)
            # Writes bidder binary bytes into temporary file.
            # Required to store bidder file content on filesystem.
            b_temp.write(b_bytes)
            # Closes bidder temporary file handle.
            # Required to release file lock before Phase 1 extraction.
            b_temp.close()

            # Executes Phase 1 text extraction on bidder document.
            # Required to extract page text and layout structure.
            b_p1 = extract_pdf_text(b_temp.name)
            # Checks if Phase 1 extraction failed for this bidder file.
            # Required to skip corrupted bidder PDFs without failing batch.
            if not b_p1.get("success", False):
                continue

            # Overwrites phase1 document_name with original uploaded filename.
            # Required to pass clean uploaded filename into Phase 3 analyzer.
            b_p1["document_name"] = bidder_file.filename

            # Executes Phase 3 fact extraction on Phase 1 bidder output.
            # Required to extract company facts, financials, and certifications.
            b_p3 = bidder_analyzer.analyze_from_phase1_json(b_p1)

            if not b_p3.get("success", False):
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail={"success": False, "error_code": "AI_PROCESSING_ERROR", "message": b_p3.get("error_message") or f"Bidder document '{bidder_file.filename}' analysis failed."}
                )
            processed_bidder_files += 1

            # Extracts raw facts list from Phase 3 result dictionary.
            # Required to handle both 'facts' and 'extracted_facts' dictionary keys.
            raw_facts = b_p3.get("facts") or b_p3.get("extracted_facts", [])
            # Iterates through extracted facts from this bidder document.
            # Required to format facts and append to consolidated list.
            for fact in raw_facts:
                # Converts fact instance to dictionary if it is a dataclass object.
                # Required to ensure dictionary format and JSON serializability.
                f_dict = asdict(fact) if is_dataclass(fact) else dict(fact)
                # Overwrites source_document field with original uploaded filename.
                # Required to preserve source document traceability in API response.
                f_dict["source_document"] = bidder_file.filename
                # Appends formatted fact dictionary to consolidated facts collection.
                # Required to build complete fact inventory across all documents.
                consolidated_facts.append(f_dict)

        if processed_bidder_files == 0:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={"success": False, "error_code": "INVALID_BIDDER_DOCUMENTS", "message": "No bidder PDF could be processed."}
            )

        # -------------------------------------------------------------------------
        # STEP 3: Compliance Verification (Phase 4)
        # -------------------------------------------------------------------------
        # Constructs Phase 2 requirements dictionary structure for ComplianceEngine.
        # Required to match input schema expected by evaluate_bid_compliance().
        p2_input = {"success": True, "requirements": formatted_reqs}
        # Constructs Phase 3 bidder facts dictionary structure for ComplianceEngine.
        # Required to match input schema expected by evaluate_bid_compliance().
        p3_input = {"success": True, "facts": consolidated_facts}

        # Instantiates Phase 4 compliance engine instance.
        # Required to perform rule-based deterministic compliance evaluation.
        compliance_engine = ComplianceEngine()
        # Executes Phase 4 compliance verification on requirements and facts.
        # Required to generate transparent, auditable compliance decisions.
        compliance_res = compliance_engine.evaluate_bid_compliance(p2_input, p3_input)

        # -------------------------------------------------------------------------
        # STEP 4: Risk & Conflict Intelligence (Phase 5)
        # -------------------------------------------------------------------------
        # Instantiates Phase 5 risk and conflict intelligence engine.
        # Required to analyze compliance results for high-risk situations and conflicts.
        risk_engine = RiskConflictEngine()
        # Executes Phase 5 risk assessment on facts and Phase 4 compliance results.
        # Required to identify evidence conflicts, expired certs, and review priorities.
        risk_res = risk_engine.assess_bid_risk(p3_input, compliance_res)

        # Extracts conflicts list from Phase 5 risk assessment result dictionary.
        # Required to populate conflicts field in final submission response.
        conflicts = risk_res.get("conflicts", [])
        # Extracts risk assessment summary dictionary from Phase 5 output.
        # Required to include risk level metrics and review flags in response.
        # RiskConflictEngine returns the assessment fields at the top level.
        assessment = risk_res
        # Determines overall status string from Phase 4 compliance evaluation.
        # Required to communicate overarching submission status to Spring Boot.
        overall_status = compliance_res.get("overall_status", "REVIEW")

        # Returns complete structured submission evaluation JSON response.
        # Required to deliver end-to-end Phase 1-5 output to calling HTTP clients.
        return {
            "success": True,
            "submission_id": submissionId,
            "requirements": formatted_reqs,
            "bidder_facts": consolidated_facts,
            "compliance": compliance_res,
            "risk": assessment,
            "conflicts": conflicts,
            "overall_status": overall_status
        }

    except HTTPException:
        raise

    # Catch-all exception block for unexpected pipeline processing errors.
    # Required to return clean HTTP 500 JSON error responses.
    except Exception as e:
        # Raises HTTP 500 Internal Server Error for unhandled pipeline failures.
        # Required to inform calling backend of pipeline exception without crashing.
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"success": False, "error_code": "SUBMISSION_PROCESSING_ERROR", "message": f"Submission processing failed: {str(e)}"}
        )

    # Finally block guaranteeing cleanup of all created temporary disk files.
    # Required to prevent disk space leaks from temporary PDF files.
    finally:
        # Iterates through list of temporary file paths created during request.
        # Required to ensure unlinking of all temp files created during execution.
        for temp_path in temp_files_to_cleanup:
            # Checks if temporary file path exists on disk.
            # Required to avoid OSError when unlinking deleted files.
            if os.path.exists(temp_path):
                # Unlinks temporary disk file.
                # Required to delete temp file and free disk space.
                os.unlink(temp_path)
