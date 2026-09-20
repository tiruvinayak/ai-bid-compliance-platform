# AI-Assisted Procurement Bid Compliance Verification Platform (SIH26100)

An AI-assisted platform for verifying bidder compliance against tender requirements in government procurement. The system processes tender documents and bidder submissions, extracts requirements and facts using local LLMs, and provides deterministic compliance verification with full evidence traceability.

## Overview

This platform assists procurement officers in analyzing tender requirements, bidder documents, compliance, evidence, risks, conflicts, and audit information. The system uses local LLMs via Ollama for document intelligence while keeping all data on-premise.

**Important**: This platform provides AI-assisted decision support and does not replace authorized procurement officers or applicable procurement rules. Final procurement decisions remain with authorized human officers.

## Key Features

- **Tender Document Processing**: PDF text extraction with page-level traceability
- **AI Requirement Extraction**: Structured requirement extraction from tender documents
- **Bidder Document Intelligence**: Financial, certification, experience, and registration fact extraction
- **Evidence Extraction**: Page-level evidence snippets with confidence scores
- **Requirement-to-Evidence Traceability**: Full traceability from requirement to evidence to document page
- **Deterministic Compliance Verification**: Rule-based PASS/FAIL/MISSING/REVIEW/CONFLICT decisions
- **Risk Analysis**: Financial, documentation, experience, registration, and legal risk categories
- **Conflict Detection**: Cross-document discrepancy detection with evidence
- **Government Knowledge RAG**: Grounded Q&A on procurement regulations (GFR, CVC, etc.)
- **Officer Review Workflow**: Human-in-the-loop decision recording with audit trail
- **Audit Trail**: Immutable audit log of all actions
- **Report Generation**: HTML/PDF compliance reports
- **JWT Authentication**: Role-based access (Bidder / Government Officer)
- **Local AI Only**: All AI inference runs locally via Ollama (no cloud API keys required)

## System Architecture

```
React Frontend (Vite + React 19 + Tailwind CSS)
       |
       v
Spring Boot Backend (Java 21, Spring Boot 3.4.5)
       |
       +------ PostgreSQL (via Spring Data JPA)
       |
       v
FastAPI AI Service (Python 3.9+, FastAPI)
       |
       v
Ollama (Local LLM Server)
       |
       +------ qwen2.5:3b (LLM for extraction/analysis)
       |
       +------ nomic-embed-text (Embeddings for RAG)
```

## Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, Vite 8, Tailwind CSS 4, React Router 7, Lucide Icons |
| Backend | Spring Boot 3.4.5, Java 21, Spring Data JPA, Spring Security, JWT (JJWT 0.12.6) |
| Database | PostgreSQL 18 (production), H2 (development) |
| AI Service | FastAPI 0.115, Python 3.9+, Pydantic 2 |
| AI Models | Ollama: qwen2.5:3b (LLM), nomic-embed-text (embeddings) |
| Document Processing | Apache PDFBox 3.0.3, Apache POI 5.3.0 |
| AI/ML | Custom deterministic compliance engine, RAG with nomic-embed-text |
| Build Tools | Maven 3.9.9, Vite 8, npm 10.8.2 |

## AI Pipeline

```
Tender PDF
    ↓
Document Processing (PDFBox/POI)
    ↓
Requirement Extraction (Ollama qwen2.5:3b)
    ↓
Structured Requirements
    ↓
Bidder Documents
    ↓
Fact Extraction (Ollama qwen2.5:3b)
    ↓
Structured Facts
    ↓
Deterministic Compliance Engine
    ↓
PASS / FAIL / MISSING / REVIEW / CONFLICT
    ↓
Evidence Mapping
    ↓
Risk / Conflict Analysis
```

## Evidence Traceability

The system maintains full traceability:

```
Requirement
    ↓
Detected Fact
    ↓
Evidence
    ↓
Bidder Document
    ↓
Page
    ↓
Compliance Decision
```

Every compliance decision traces back to specific document pages and extracted text snippets.

## Roles

### Bidder
- Register/login with email/password
- Browse available tenders
- Apply to tenders
- Upload supporting documents (PDF, DOCX, XLSX, etc.)
- Track document processing status
- Review compliance results before submission
- Submit bid for evaluation

### Government Officer
- Login with government officer role
- Dashboard with bid queue
- Open bid details with all documents
- View requirements with extracted facts
- Inspect compliance results (PASS/FAIL/REVIEW/MISSING/CONFLICT)
- View evidence snippets with document/page references
- Open PDF evidence viewer with page-level navigation
- Review risk analysis and conflicts
- Conduct officer review with decision (APPROVE/REJECT/REQUEST_CLARIFICATION/UNDER_REVIEW)
- View audit trail
- Generate compliance reports (HTML/PDF)
- Query Government Knowledge RAG for procurement guidance

## Local AI Setup

The platform uses **Ollama** for local LLM inference. No cloud API keys required.

### Required Models
```bash
# Pull required models
ollama pull qwen2.5:3b      # LLM for extraction/analysis
ollama pull nomic-embed-text  # Embeddings for RAG
```

### Ollama Configuration
```env
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:3b
OLLAMA_EMBEDDING_MODEL=nomic-embed-text
```

## Project Structure

```
SIH2/
├── Backend/                 # Spring Boot backend
│   ├── src/main/java/       # Spring Boot application
│   ├── src/main/resources/  # Configuration (application.yml, etc.)
│   ├── pom.xml              # Maven build file
│   └── target/              # Build output (ignored)
├── Frontend/
│   └── Frontend/            # React + Vite frontend
│       ├── src/             # React source
│       ├── public/          # Static assets
│       ├── package.json
│       └── vite.config.ts
├── ai-service/
│   └── ai-service/          # FastAPI AI service
│       ├── app/             # FastAPI application
│       ├── tests/           # Test suite
│       ├── requirements.txt
│       └── .env.example
├── .gitignore
└── README.md
```

## Setup Instructions

### Prerequisites
- Java 21+
- Maven 3.9+
- Node.js 20+ / npm 10+
- Python 3.9+
- PostgreSQL 18 (or use H2 dev profile)
- Ollama with models: `qwen2.5:3b`, `nomic-embed-text`

### 1. PostgreSQL Setup
```sql
CREATE DATABASE sih_bid_compliance;
CREATE USER postgres WITH ENCRYPTED PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE sih_bid_compliance TO postgres;
```
Or use the H2 in-memory dev profile (default): `SPRING_PROFILES_ACTIVE=dev`

### 2. Backend
```bash
cd Backend
mvn spring-boot:run -Dspring-boot.run.profiles=dev
# Runs on http://localhost:8080
```

### 3. AI Service
```bash
cd ai-service/ai-service
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python3 -m uvicorn app.api_server:app --host 0.0.0.0 --port 8000 --reload
# Runs on http://localhost:8000
```

### 4. Ollama
```bash
ollama serve
ollama pull qwen2.5:3b
ollama pull nomic-embed-text
```

### 5. Frontend
```bash
cd Frontend/Frontend
npm install
npm run dev
# Runs on http://localhost:5173
```

### 6. Access the Application
- Frontend: http://localhost:5173
- Backend API: http://localhost:8080/api
- AI Service: http://localhost:8000
- Ollama: http://localhost:11434

## Demo Credentials (Development)

| Role | Email | Password |
|------|-------|----------|
| Bidder | user@demo.gov.in | User@123 |
| Officer | officer@demo.gov.in | Officer@123 |

*These are seeded by the DataSeeder in dev profile.*

## Environment Variables

Create `.env` files from the provided `.env.example` templates.

### Backend (`Backend/.env`)
```env
SPRING_PROFILES_ACTIVE=postgres
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sih_bid_compliance
DB_USER=postgres
DB_PASSWORD=your_password
APP_JWT_SECRET=your_jwt_secret_at_least_64_chars
AI_SERVICE_BASE_URL=http://localhost:8000
```

### AI Service (`ai-service/ai-service/.env`)
```env
LLM_PROVIDER=ollama
OLLAMA_MODEL=qwen2.5:3b
OLLAMA_BASE_URL=http://localhost:11434
EMBEDDING_PROVIDER=ollama
OLLAMA_EMBEDDING_MODEL=nomic-embed-text
OLLAMA_BASE_URL=http://localhost:11434
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sih_bid_compliance
DB_USER=postgres
DB_PASSWORD=your_password
```

### Frontend (`Frontend/Frontend/.env`)
```env
VITE_API_BASE_URL=/api
```

### AI Service (`ai-service/ai-service/.env`)
```env
LLM_PROVIDER=ollama
OLLAMA_MODEL=qwen2.5:3b
OLLAMA_BASE_URL=http://localhost:11434
EMBEDDING_PROVIDER=ollama
OLLAMA_EMBEDDING_MODEL=nomic-embed-text
OLLAMA_BASE_URL=http://localhost:11434
```

## AI Pipeline Details

### Phase 1: Document Processing
- PDF text extraction via Apache PDFBox
- Page-level text extraction with coordinates
- Support for PDF, DOCX, XLSX, PPTX, CSV, TXT

### Phase 2: Requirement Extraction
- Page-by-page LLM extraction
- Structured output: requirement_id, category, description, required_value, unit, mandatory, ambiguous
- Source traceability: document_name, page_number, source_text

### Phase 3: Bidder Document Intelligence
- Page-by-page fact extraction
- Categories: FINANCIAL, CERTIFICATION, SECURITY, REGISTRATION, EXPERIENCE, TECHNICAL, IDENTITY, SUBMISSION, OTHER
- Normalized values (e.g., "INR 7 Crore" → 70000000 INR)
- Confidence scores (0.0-1.0)

### Phase 4: Deterministic Compliance Engine
- Rule-based evaluation (no LLM)
- Rules: MINIMUM_VALUE_COMPARISON, CERTIFICATION_MATCH, MISSING_EVIDENCE_RULE, etc.
- Statuses: PASS, FAIL, MISSING, REVIEW, CONFLICT
- Conflict detection across documents

### Phase 5: Risk & Conflict Intelligence
- Risk categories: Financial, Documentation, Experience, Registration, Legal, Security
- Scoring: 0-100 per category
- Cross-document conflict detection

### Phase 6: Government RAG
- Grounded retrieval from government documents (GFR, CVC, procurement manuals)
- Grounding check: INSUFFICIENT_GOVERNMENT_EVIDENCE if no supporting chunks
- Citations: document, page, section, similarity score

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/register/bidder` - Bidder registration
- `GET /api/auth/me` - Current user

### Bids
- `GET /api/bids` - List bids (officer)
- `GET /api/bids/{bidId}` - Get bid details
- `POST /api/bids` - Create bid (officer)

### Documents
- `POST /api/bids/{bidId}/documents` - Upload document
- `GET /api/bids/{bidId}/documents` - List documents

### Compliance
- `GET /api/bids/{bidId}/requirements` - List requirements
- `GET /api/bids/{bidId}/requirements/{reqId}` - Requirement detail
- `GET /api/bids/{bidId}/requirements/{reqId}/evidence` - Evidence for requirement

### Risk & Conflict
- `GET /api/bids/{bidId}/risks` - Risk categories
- `GET /api/bids/{bidId}/conflicts` - Conflicts

### Officer Review
- `GET /api/bids/{bidId}/review` - Review record
- `POST /api/bids/{bidId}/review` - Save review decision

### Audit & Reports
- `GET /api/bids/{bidId}/audit` - Audit trail
- `POST /api/bids/{bidId}/report/generate` - Generate report

### Government AI (RAG)
- `POST /api/government/ask` - Ask procurement question

### Government Instructions
- `GET /api/government-instructions` - List instructions
- `GET /api/government-instructions/restrictions` - Restrictions only

## Testing

### Backend
```bash
cd Backend
mvn test
```

### AI Service
```bash
cd ai-service/ai-service
python -m pytest tests/ -v
```

### Frontend
```bash
cd Frontend/Frontend
npm run build
```

## Ports

| Service | Port |
|---------|------|
| Frontend (Vite) | 5173 |
| Spring Boot | 8080 |
| FastAPI | 8000 |
| Ollama | 11434 |
| PostgreSQL | 5432 |

## Security

- All secrets via environment variables (`.env` files are gitignored)
- JWT authentication with 24h expiration
- Role-based access control (USER vs GOVERNMENT_OFFICER)
- No cloud API keys - all AI runs locally via Ollama
- `.env` files are gitignored; use `.env.example` templates

## License

No license has been specified for this project.

## Disclaimer

This platform provides AI-assisted decision support and does not replace authorized procurement officers or applicable procurement rules. All final procurement decisions remain the responsibility of authorized human officers.
