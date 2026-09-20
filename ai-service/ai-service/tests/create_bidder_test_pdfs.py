"""
===============================================================================
SCRIPT: create_bidder_test_pdfs.py
===============================================================================
PURPOSE:
    Automatically generates synthetic PDF test files for Phase 3 Bidder Document Intelligence:
    1. bidder_financial.pdf (Financial turnover INR 7 Crore)
    2. bidder_certificate.pdf (ISO 9001:2015, CERT-In, GSTIN)
    3. ambiguous_experience.pdf (Vague experience statement)
===============================================================================
"""

from pathlib import Path
import pymupdf as fitz  # PyMuPDF library


def generate_bidder_test_files():
    """Generates synthetic bidder PDF test files in input/ directory."""
    input_dir = Path("input")
    input_dir.mkdir(parents=True, exist_ok=True)

    # -------------------------------------------------------------------------
    # TEST PDF 1: Bidder Financial Report
    # -------------------------------------------------------------------------
    pdf1_path = input_dir / "bidder_financial.pdf"
    doc1 = fitz.open()
    page1 = doc1.new_page()
    page1.insert_text(
        (50, 50),
        "ABC TECHNOLOGIES PRIVATE LIMITED - AUDITED FINANCIAL REPORT\n\n"
        "1. EXECUTIVE SUMMARY\n"
        "ABC Technologies is a registered technology services provider.\n\n"
        "2. FINANCIAL PERFORMANCE\n"
        "ABC Technologies had an average annual turnover of INR 7 Crore over the last 3 fiscal years.\n"
        "Net worth: INR 2.5 Crore as of March 31, 2025.",
        fontsize=11
    )
    doc1.save(str(pdf1_path))
    doc1.close()
    print(f"[CREATED] '{pdf1_path}' (Financial report with INR 7 Crore turnover)")

    # -------------------------------------------------------------------------
    # TEST PDF 2: Bidder Certifications & Registration Document
    # -------------------------------------------------------------------------
    pdf2_path = input_dir / "bidder_certificate.pdf"
    doc2 = fitz.open()
    page2 = doc2.new_page()
    page2.insert_text(
        (50, 50),
        "ABC TECHNOLOGIES - COMPLIANCE & CERTIFICATE DOSSIER\n\n"
        "1. QUALITY CERTIFICATION\n"
        "ABC Technologies holds ISO 9001:2015 Quality Management certification.\n"
        "Certificate No: ISO-12345. Valid until 31 March 2027.\n\n"
        "2. SECURITY AUDIT\n"
        "Cybersecurity Audit Certificate issued by CERT-In.\n\n"
        "3. TAX REGISTRATION\n"
        "GST Registration Number: GSTIN29ABCDE1234F1Z5.",
        fontsize=11
    )
    doc2.save(str(pdf2_path))
    doc2.close()
    print(f"[CREATED] '{pdf2_path}' (Certifications: ISO, CERT-In, GSTIN)")

    # -------------------------------------------------------------------------
    # TEST PDF 3: Ambiguous Experience Document
    # -------------------------------------------------------------------------
    pdf3_path = input_dir / "ambiguous_experience.pdf"
    doc3 = fitz.open()
    page3 = doc3.new_page()
    page3.insert_text(
        (50, 50),
        "ABC TECHNOLOGIES - COMPANY PROFILE\n\n"
        "1. PAST EXPERIENCE OVERVIEW\n"
        "ABC Technologies has significant experience in government technology projects.",
        fontsize=11
    )
    doc3.save(str(pdf3_path))
    doc3.close()
    print(f"[CREATED] '{pdf3_path}' (Ambiguous experience document)")


if __name__ == "__main__":
    generate_bidder_test_files()
