"""
===============================================================================
SCRIPT: create_test_pdfs.py
===============================================================================
PURPOSE:
    Automatically generates synthetic PDF test files for Phase 1 verification:
    1. Normal text PDF (Tender sample)
    2. Multi-page document
    3. Document with a blank page
    4. Image-only / scanned PDF mockup (drawing graphics instead of embedded text glyphs)
===============================================================================
"""

from pathlib import Path
import pymupdf as fitz  # PyMuPDF library


def generate_test_files():
    """Generates all necessary test PDF files in input/ folder."""
    input_dir = Path("input")
    input_dir.mkdir(parents=True, exist_ok=True)

    # -------------------------------------------------------------------------
    # TEST PDF 1 & 2: Multi-page Tender Document with Normal Text
    # -------------------------------------------------------------------------
    pdf1_path = input_dir / "sample_tender.pdf"
    doc1 = fitz.open()

    # Page 1: Government Tender Header & Basic Details
    page1 = doc1.new_page()
    page1.insert_text(
        (50, 50),
        "GOVERNMENT OF INDIA - PROCUREMENT NOTICE\n\n"
        "Tender ID: SIH-2026-COMPLIANCE-001\n"
        "Subject: AI-Assisted Procurement Bid Compliance Verification System\n"
        "Department: Ministry of Electronics and Information Technology\n\n"
        "1. OVERVIEW\n"
        "The department invites bids from eligible technology providers for implementing\n"
        "an automated compliance verification platform.",
        fontsize=11
    )

    # Page 2: Eligibility Criteria & Technical Requirements
    page2 = doc1.new_page()
    page2.insert_text(
        (50, 50),
        "2. ELIGIBILITY CRITERIA\n\n"
        "Clause 2.1: Financial Turnover\n"
        "The bidder must have an average annual turnover of at least INR 5 Crore over the last 3 fiscal years.\n\n"
        "Clause 2.2: ISO Certification\n"
        "The bidder must hold a valid ISO 9001:2015 Quality Management certification.\n\n"
        "Clause 2.3: Security Clearance\n"
        "The bidder must submit a valid Cybersecurity Audit Certificate issued by CERT-In.",
        fontsize=11
    )

    # Page 3: Financial Requirements
    page3 = doc1.new_page()
    page3.insert_text(
        (50, 50),
        "3. SUBMISSION FORMAT & FINANCIAL PROPOSAL\n\n"
        "All proposals must be uploaded in PDF format.\n"
        "EMD (Earnest Money Deposit): INR 1,00,000 to be deposited via online transfer.\n"
        "Bid Validity: 180 days from the date of tender opening.",
        fontsize=11
    )

    doc1.save(str(pdf1_path))
    doc1.close()
    print(f"[CREATED] '{pdf1_path}' (3 pages normal text)")

    # -------------------------------------------------------------------------
    # TEST PDF 3: PDF with a Blank / Empty Page
    # -------------------------------------------------------------------------
    pdf2_path = input_dir / "tender_with_blank_page.pdf"
    doc2 = fitz.open()

    # Page 1: Normal Text
    p1 = doc2.new_page()
    p1.insert_text((50, 50), "Page 1: Title Page of Proposal", fontsize=12)

    # Page 2: Blank Page (no text inserted)
    p2 = doc2.new_page()

    # Page 3: Normal Text
    p3 = doc2.new_page()
    p3.insert_text((50, 50), "Page 3: Conclusion and Signatures", fontsize=12)

    doc2.save(str(pdf2_path))
    doc2.close()
    print(f"[CREATED] '{pdf2_path}' (3 pages with Page 2 empty)")

    # -------------------------------------------------------------------------
    # TEST PDF 5: Scanned / Image-Only PDF (Vector Drawing instead of font text)
    # -------------------------------------------------------------------------
    pdf3_path = input_dir / "scanned_doc.pdf"
    doc3 = fitz.open()
    p_scanned = doc3.new_page()
    
    # Draw shapes/graphics (pixels/lines) on the page to simulate a scanned document page without selectable text font
    p_scanned.draw_rect(fitz.Rect(50, 50, 300, 300), color=(0, 0, 1), fill=(0.9, 0.9, 0.9))
    p_scanned.draw_line((60, 60), (290, 290), color=(1, 0, 0), width=2)
    
    doc3.save(str(pdf3_path))
    doc3.close()
    print(f"[CREATED] '{pdf3_path}' (1 page simulated scanned/image PDF)")

    # Create an invalid text file renamed to .txt for testing non-PDF handling
    invalid_txt = input_dir / "invalid_doc.txt"
    invalid_txt.write_text("This is not a PDF file.", encoding="utf-8")
    print(f"[CREATED] '{invalid_txt}' (invalid extension test file)")


if __name__ == "__main__":
    generate_test_files()
