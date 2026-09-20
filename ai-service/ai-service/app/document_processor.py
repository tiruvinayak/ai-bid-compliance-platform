"""
===============================================================================
MODULE: document_processor.py
===============================================================================
PURPOSE:
    This module provides robust, page-aware text extraction from PDF documents
    for Phase 1 of our AI-assisted procurement bid compliance platform.

WHY PAGE-LEVEL METADATA MATTERS:
    In procurement compliance, AI cannot just state "The bidder is missing a ISO 9001
    certificate." The AI MUST cite the exact page number of the tender document where
    the requirement was stated, and the exact page of the bidder response. Preserving
    page numbers during extraction is critical for legal evidence traceability.

PHASE 1 SCOPE:
    PDF Input -> Page Extraction -> Text Cleaning -> Page Metadata -> JSON Output
===============================================================================
"""

# standard library import: os is used for checking file paths and extracting filenames
import os

# standard library import: re (regular expressions) is used for pattern-based text cleaning
import re

# standard library import: Path provides clean, cross-platform object-oriented file path operations
from pathlib import Path

# standard library import: typing helps us define expected input and output data types,
# making our code safer, self-documenting, and easier to maintain.
from typing import Dict, Any, List, Union

# PyMuPDF library import:
# We import 'pymupdf' and alias it as 'fitz' for backward compatibility.
# PyMuPDF is selected because it is extremely fast, highly reliable, lightweight,
# and allows page-by-page text extraction while keeping track of page numbers.
import pymupdf as fitz


def clean_extracted_text(raw_text: str) -> str:
    """
    Cleans raw text extracted from a PDF page while preserving essential formatting.

    WHAT IT DOES:
        1. Replaces tabs with single spaces.
        2. Normalizes multiple horizontal spaces into a single space.
        3. Reduces 3 or more consecutive newlines down to 2 newlines (preserving paragraphs).
        4. Strips leading and trailing whitespace from individual lines and the overall string.

    WHY WE CLEAN TEXT:
        PDF documents often contain messy formatting like excessive spaces, line breaks,
        and random tabs caused by PDF layout positioning tags. Cleaning normalizes this text
        so that downstream AI modules get clean text without extra noise.

    WHY WE DO NOT AGGRESSIVELY CLEAN:
        We deliberately keep line breaks and paragraph structure intact so that clause numbers,
        headings, and table items do not get smashed into one unreadable line. Evidence traceability
        requires keeping the original textual layout as accurate as possible.
    """
    # Return empty string immediately if the text is empty or None
    # WHY: Prevents string manipulation errors on null or empty input.
    if not raw_text:
        return ""

    # Replace horizontal tab characters (\t) with a single space ' '
    # WHY: Tabs in PDFs are often used for visual spacing; replacing them standardizes spacing.
    text = raw_text.replace("\t", " ")

    # Normalize multiple horizontal spaces (2 or more consecutive spaces) into 1 single space.
    # HOW: re.sub searches for regex pattern r'[ ]+' (one or more spaces) and replaces with ' '.
    # WHY: Removes unnecessary double/triple spaces without changing sentence wording.
    text = re.sub(r"[ ]+", " ", text)

    # Clean leading and trailing horizontal whitespace on each individual line.
    # HOW: We split text into lines, strip each line, and join them back together with newlines.
    # WHY: Ensures lines don't start or end with phantom spaces extracted from PDF margins.
    lines = [line.strip() for line in text.splitlines()]
    text = "\n".join(lines)

    # Reduce excessive consecutive blank lines (3 or more '\n') to at most 2 '\n' (one empty line).
    # HOW: re.sub matches 3 or more newlines r'\n{3,}' and replaces them with r'\n\n'.
    # WHY: Prevents huge vertical gaps between paragraphs while maintaining clear paragraph boundaries.
    text = re.sub(r"\n{3,}", "\n\n", text)

    # Return the final cleaned string after removing any overall leading/trailing whitespace.
    return text.strip()


def extract_pdf_text(pdf_path: Union[str, Path]) -> Dict[str, Any]:
    """
    Extracts structured page-by-page text and metadata from a PDF file.

    INPUT:
        pdf_path: The file path pointing to the target PDF document (string or Path object).

    OUTPUT:
        A JSON-serializable dictionary containing document metadata and page text, OR an error object.

    EXAMPLE SUCCESS OUTPUT:
        {
            "success": True,
            "document_name": "Tender_Notice.pdf",
            "page_count": 2,
            "pages": [
                {
                    "page_number": 1,
                    "text": "Government Tender Notice...",
                    "has_text": True
                },
                {
                    "page_number": 2,
                    "text": "Eligibility Criteria...",
                    "has_text": True
                }
            ]
        }

    EXAMPLE ERROR OUTPUT:
        {
            "success": False,
            "error_type": "FILE_NOT_FOUND",
            "message": "The specified file was not found.",
            "details": "Path: input/missing.pdf"
        }
    """

    # Convert string path to pathlib.Path object for standardized, safe path operations across OS (Windows/Mac/Linux).
    path_obj = Path(pdf_path)

    # -------------------------------------------------------------------------
    # ERROR CHECK 1: File Existence Validation
    # -------------------------------------------------------------------------
    # WHAT: Check if the file exists at the given path.
    # WHY: Attempting to open a non-existent file would cause a crash (FileNotFoundError).
    # HOW: path_obj.exists() returns True if the file exists on the filesystem.
    if not path_obj.exists():
        return {
            "success": False,
            "error_type": "FILE_NOT_FOUND",
            "message": f"File does not exist: '{pdf_path}'",
            "details": f"The path provided does not point to any existing file on the disk."
        }

    # -------------------------------------------------------------------------
    # ERROR CHECK 2: File Type Validation (Extension check)
    # -------------------------------------------------------------------------
    # WHAT: Verify that the file extension is '.pdf'.
    # WHY: Passing non-PDF files (e.g. .txt, .docx, .png) to PyMuPDF can cause unexpected behavior or errors.
    # HOW: path_obj.suffix returns the file extension in lowercase (e.g., '.pdf').
    if path_obj.suffix.lower() != ".pdf":
        return {
            "success": False,
            "error_type": "INVALID_FILE_TYPE",
            "message": f"File is not a PDF: '{path_obj.name}'",
            "details": f"Expected a file ending with '.pdf', but received '{path_obj.suffix}'."
        }

    # -------------------------------------------------------------------------
    # ERROR CHECK 3: Non-empty File Validation
    # -------------------------------------------------------------------------
    # WHAT: Check if the file size is greater than 0 bytes.
    # WHY: A zero-byte corrupted PDF file cannot be parsed.
    # HOW: path_obj.stat().st_size returns file size in bytes.
    if path_obj.stat().st_size == 0:
        return {
            "success": False,
            "error_type": "EMPTY_FILE",
            "message": f"File is empty (0 bytes): '{path_obj.name}'",
            "details": "The PDF file exists but contains zero bytes of data."
        }

    # Extract human-readable document name from the path object.
    # WHY: Downstream AI modules and report generators need to reference the original filename.
    document_name = path_obj.name

    # -------------------------------------------------------------------------
    # PDF OPENING AND PROCESSING
    # -------------------------------------------------------------------------
    # We wrap PDF opening inside a try-except block to catch parsing errors cleanly.
    try:
        # WHAT: Open the PDF document using PyMuPDF (fitz.open).
        # WHY: fitz.open loads the PDF structure into memory so we can iterate over its pages.
        # HOW: PyMuPDF parses the PDF header, cross-reference table, and page trees.
        doc = fitz.open(str(path_obj))

    except Exception as error:
        # WHAT: Catch any low-level PyMuPDF or file reading exceptions (e.g. corrupt header, password protection).
        # WHY: We must return a clean, user-friendly error object without exposing raw internal python stack traces.
        return {
            "success": False,
            "error_type": "PDF_OPEN_ERROR",
            "message": f"Failed to open PDF document: '{document_name}'",
            "details": str(error)
        }

    # Ensure document object is closed automatically when finished.
    # WHY: Failing to close fitz.open documents can leave file locks or memory unreleased.
    try:
        # -------------------------------------------------------------------------
        # ERROR CHECK 4: Zero Pages Validation
        # -------------------------------------------------------------------------
        # WHAT: Check if the PDF has at least one page.
        # WHY: A valid PDF header might exist, but if page count is 0, there is no content to process.
        # HOW: len(doc) returns the total number of pages in the document.
        page_count = len(doc)
        if page_count == 0:
            return {
                "success": False,
                "error_type": "ZERO_PAGES",
                "message": f"PDF document contains 0 pages: '{document_name}'",
                "details": "The document structure was parsed, but no pages were found."
            }

        # Initialize a list to hold page data dictionaries.
        # WHY: We need to store each page's extracted text alongside its 1-based page number.
        extracted_pages: List[Dict[str, Any]] = []

        # Track total text length across all pages to detect scanned/image-only PDFs.
        # WHY: If total text across all pages is 0, the PDF is likely scanned or image-based.
        total_document_text_length = 0

        # -------------------------------------------------------------------------
        # PAGE-BY-PAGE EXTRACTION LOOP
        # -------------------------------------------------------------------------
        # Iterate over zero-based page indices (0 to page_count - 1).
        # WHY: PyMuPDF internally indexes pages starting from 0, but human readers and legal docs start at 1.
        for page_index in range(page_count):
            
            # CONVERSION: Convert internal 0-based index to 1-based human/AI page number.
            # WHY VERY IMPORTANT: When AI points to evidence, "Page 1" must mean the first page of the PDF.
            page_number = page_index + 1

            # Load the current page object from the PyMuPDF document.
            # HOW: doc.load_page(page_index) returns the page representation.
            page = doc.load_page(page_index)

            # Extract raw text from the page using PyMuPDF's text engine.
            # HOW: page.get_text("text") extracts standard text content.
            raw_text = page.get_text("text")

            # Clean the extracted text using our safe helper function.
            cleaned_text = clean_extracted_text(raw_text)

            # -------------------------------------------------------------------------
            # ERROR CHECK 5 & SCANNED PDF HANDLING: Low / No Text Detection
            # -------------------------------------------------------------------------
            # WHAT: Check if the cleaned text is empty or contains no readable text.
            # WHY: Scanned PDFs contain page images instead of selectable text. PyMuPDF cannot extract text from images.
            # HOW: If cleaned_text is empty, we flag has_text as False and provide an explicit notice message.
            if not cleaned_text:
                has_text = False
                final_text = "No extractable text found. OCR will be added in a later phase."
            else:
                has_text = True
                final_text = cleaned_text
                # Update total character count for whole document sanity check
                total_document_text_length += len(cleaned_text)

            # Build the structured dictionary for this specific page.
            # WHY: This clear structure ensures downstream AI modules can access page_number and text independently.
            page_data = {
                "page_number": page_number,
                "text": final_text,
                "has_text": has_text
            }

            # Append the page dictionary to our master list of pages.
            extracted_pages.append(page_data)

        # -------------------------------------------------------------------------
        # SCANNED DOCUMENT WARNING / METADATA
        # -------------------------------------------------------------------------
        # WHAT: Determine if the entire document appears to be scanned / image-only.
        # WHY: Gives immediate feedback if OCR will be mandatory for this document in Phase 5.
        is_scanned_or_empty = (total_document_text_length == 0)

        # Build the final structured response dictionary.
        # WHY: This output format strictly matches the required specification for Phase 1.
        result = {
            "success": True,
            "document_name": document_name,
            "page_count": page_count,
            "is_scanned_or_empty": is_scanned_or_empty,
            "pages": extracted_pages
        }

        return result

    finally:
        # ALWAYS CLOSE THE PDF DOCUMENT
        # WHAT: Close the PyMuPDF document instance.
        # WHY: Guaranteed cleanup in both success and exception scenarios prevents memory leaks.
        doc.close()
