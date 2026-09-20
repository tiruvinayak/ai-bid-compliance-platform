"""
===============================================================================
SCRIPT: create_government_test_pdf.py
===============================================================================
PURPOSE:
    Automatically generates synthetic test PDF files for Phase 6A (Government Knowledge Ingestion):
    1. procurement_guidelines.pdf (4 pages with 4 section headings)
    2. blank_gov.pdf (empty/blank pages)
    3. scanned_gov.pdf (simulated scanned image PDF)
    4. invalid_gov.txt (invalid extension test file)
===============================================================================
"""

from pathlib import Path
import pymupdf as fitz  # PyMuPDF library


def generate_government_test_files():
    """Generates synthetic government test PDF files in input/government/ directory."""
    gov_dir = Path("input/government")
    gov_dir.mkdir(parents=True, exist_ok=True)

    # -------------------------------------------------------------------------
    # TEST PDF 1: Normal 4-page Government Procurement Guidelines PDF
    # -------------------------------------------------------------------------
    pdf1_path = gov_dir / "procurement_guidelines.pdf"
    doc1 = fitz.open()

    # Page 1: Introduction
    p1 = doc1.new_page()
    p1.insert_text(
        (50, 50),
        "MINISTRY OF FINANCE - MANUAL FOR PROCUREMENT OF GOODS\n\n"
        "1. Introduction\n\n"
        "This manual contains official government procurement guidance for public procurement in India. "
        "All procuring entities, ministries, and public sector undertakings shall strictly comply with these rules. "
        "The objective of public procurement is to secure public money with transparency, fairness, and efficiency. "
        "Detailed procedural mechanisms for tendering, bid evaluation, and contract award are outlined herein.",
        fontsize=11
    )

    # Page 2: Eligibility Requirements
    p2 = doc1.new_page()
    p2.insert_text(
        (50, 50),
        "GENERAL FINANCIAL RULES (GFR) - COMPLIANCE MANDATE\n\n"
        "2. Eligibility Requirements\n\n"
        "The bidder must meet all statutory eligibility criteria specified in Rule 144 of General Financial Rules. "
        "Minimum financial turnover requirements must be proven through audited financial reports. "
        "Bidders from countries sharing a land border with India must be registered with the Competent Authority. "
        "Failure to submit proof of registration shall result in immediate disqualification.",
        fontsize=11
    )

    # Page 3: Bid Security
    p3 = doc1.new_page()
    p3.insert_text(
        (50, 50),
        "GENERAL FINANCIAL RULES - SECTION 3\n\n"
        "3. Bid Security\n\n"
        "Bid security (Earnest Money Deposit - EMD) shall normally range between 2% to 5% of the estimated contract value. "
        "Bid security shall be submitted in the form of Account Payee Demand Draft, Fixed Deposit Receipt, or Bank Guarantee. "
        "Micro and Small Enterprises (MSEs) registered with UDYAM are exempt from paying Earnest Money Deposit.",
        fontsize=11
    )

    # Page 4: Submission Requirements
    p4 = doc1.new_page()
    p4.insert_text(
        (50, 50),
        "PROCUREMENT GUIDELINES - SECTION 4\n\n"
        "4. Submission Requirements\n\n"
        "All proposals and tender documents must be submitted electronically through the Central Public Procurement Portal. "
        "Bids submitted after the deadline shall be rejected automatically by the portal. "
        "The bid validity period shall be specified in the tender document and shall normally be valid for 90 to 180 days.",
        fontsize=11
    )

    doc1.save(str(pdf1_path))
    doc1.close()
    print(f"[CREATED] '{pdf1_path}' (4 pages normal government PDF)")

    # -------------------------------------------------------------------------
    # TEST PDF 2: Blank Page PDF
    # -------------------------------------------------------------------------
    pdf2_path = gov_dir / "blank_gov.pdf"
    doc2 = fitz.open()
    doc2.new_page()
    doc2.new_page()
    doc2.save(str(pdf2_path))
    doc2.close()
    print(f"[CREATED] '{pdf2_path}' (2 empty pages)")

    # -------------------------------------------------------------------------
    # TEST PDF 3: Simulated Scanned Image PDF
    # -------------------------------------------------------------------------
    pdf3_path = gov_dir / "scanned_gov.pdf"
    doc3 = fitz.open()
    page = doc3.new_page()
    pix = fitz.Pixmap(fitz.csRGB, fitz.Rect(0, 0, 100, 100), False)
    page.insert_image(page.rect, pixmap=pix)
    doc3.save(str(pdf3_path))
    doc3.close()
    print(f"[CREATED] '{pdf3_path}' (1 page simulated scanned PDF)")

    # -------------------------------------------------------------------------
    # TEST FILE 4: Invalid Non-PDF File
    # -------------------------------------------------------------------------
    file4_path = gov_dir / "invalid_gov.txt"
    file4_path.write_text("This is a plain text file, not a PDF.", encoding="utf-8")
    print(f"[CREATED] '{file4_path}' (invalid text file)")


if __name__ == "__main__":
    generate_government_test_files()
