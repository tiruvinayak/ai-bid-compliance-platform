# AI-Assisted Procurement Bid Compliance Verification Platform
## Phase 1: PDF Document Processing Module

### Overview
This module represents **Phase 1** of the AI-Assisted Procurement Bid Compliance Verification System.
It provides a reliable, page-aware PDF text extraction engine that converts raw PDF documents into structured JSON objects containing page-level text and document metadata.

---

### Project Structure
```text
ai-service/
│
├── app/
│   ├── __init__.py           # Marks app directory as a Python package
│   ├── document_processor.py # Core PDF extraction & text cleaning logic
│   └── main.py               # Command Line Interface (CLI) runner
│
├── input/                    # Target PDF documents for processing
├── output/                   # Output structured JSON results
│
├── tests/
│   ├── create_test_pdfs.py   # Test PDF generator script
│   └── test_processor.py     # Automated unittest suite
│
├── requirements.txt          # Python dependencies (PyMuPDF)
└── README.md                 # Project documentation & guide
```

---

### Key Design Principles & Data Flow

#### Data Flow:
```text
PDF Document 
    ↓
File Path & Format Validation
    ↓
PyMuPDF (fitz) Document Parsing
    ↓
Page-by-Page Iteration (1-indexed page numbers)
    ↓
Text Cleaning & Whitespace Normalization
    ↓
Scanned Page / Low-Text Detection
    ↓
JSON-Serializable Output Dict
```

---

### Setup & Usage

#### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

#### 2. Run Test Generator & Test Suite
```bash
python tests/test_processor.py
```

#### 3. Run PDF Extraction CLI
```bash
python app/main.py input/sample_tender.pdf
```
Result will be printed to console and saved to `output/sample_tender.pdf.json`.
Phase-1 runing 
cd ai-service
pip install -r requirements.txt
python tests/test_processor.py
python app/main.py input/sample_tender.pdf