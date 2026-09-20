# GeM Bid Compliance & Verification System — Backend (SIH26100)

Spring Boot backend for the **AI-assisted Bid Compliance & Verification System**.
This service powers the React frontend with a full REST API, JWT authentication,
document processing, and an AI-assisted compliance analysis pipeline.

---

## Tech Stack

| Layer      | Technology                                   |
|------------|----------------------------------------------|
| Language   | Java 21 (runs on Java 25)                    |
| Framework  | Spring Boot 3.4.5                            |
| Security   | Spring Security + JWT (jjwt)                 |
| Database   | PostgreSQL (default) / H2 (embedded fallback)|
| ORM        | Spring Data JPA / Hibernate                  |
| Documents  | Apache PDFBox + Apache POI (text extraction) |
| Build      | Maven                                        |

---

## How to Run

### Option A — PostgreSQL (recommended, your setup)
```bash
# 1. Ensure PostgreSQL is running on localhost:7000 with database "Tender"
#    (username: postgres, password: admin123)

# 2. Build
mvn clean package -DskipTests

# 3. Run with the postgres profile
java -jar -Dspring.profiles.active=postgres target/gem-backend-1.0.0.jar
```

### Option B — Embedded H2 (zero setup, for demo)
```bash
mvn clean package -DskipTests
java -jar target/gem-backend-1.0.0.jar
```
H2 console: http://localhost:8080/h2-console (JDBC URL: `jdbc:h2:file:./data/gemdb`)

> The backend **auto-creates all tables** and **auto-seeds demo data** on first startup.
> You do NOT need to create tables manually.

---

## Demo Credentials

| Role                | Email                 | Password    |
|---------------------|-----------------------|-------------|
| Government Officer  | officer@demo.gov.in   | Officer@123 |
| Bidder (User)       | user@demo.gov.in      | User@123    |

---

## API Endpoints

### Authentication
| Method | Endpoint              | Description        |
|--------|-----------------------|--------------------|
| POST   | `/api/auth/login`     | Login, returns JWT |
| POST   | `/api/auth/register`  | Register new user  |
| GET    | `/api/auth/me`        | Current user       |

### Bids
| Method | Endpoint            | Description            |
|--------|---------------------|------------------------|
| GET    | `/api/bids`         | List all bids          |
| GET    | `/api/bids/{id}`    | Get bid by id          |
| POST   | `/api/bids`         | Create bid (officer)   |
| PUT    | `/api/bids/{id}`    | Update bid (officer)   |
| DELETE | `/api/bids/{id}`    | Delete bid (officer)   |

### Documents (multipart upload)
| Method | Endpoint                          | Description             |
|--------|-----------------------------------|-------------------------|
| GET    | `/api/bids/{id}/documents`        | Documents for a bid     |
| GET    | `/api/user/documents`             | Current user's docs     |
| POST   | `/api/bids/{id}/tender-document`  | Upload tender RFP       |
| POST   | `/api/bids/{id}/documents`        | Upload bidder document  |

### AI Analysis Pipeline
| Method | Endpoint                  | Description                    |
|--------|---------------------------|--------------------------------|
| POST   | `/api/bids/{id}/analyze`  | Run full compliance analysis   |
| GET    | `/api/bids/{id}/analysis` | Get analysis stage progress    |

### Compliance / Risk / Conflicts / Audit
| Method | Endpoint                              | Description              |
|--------|---------------------------------------|--------------------------|
| GET    | `/api/bids/{id}/requirements`         | Extracted requirements   |
| GET    | `/api/bids/{id}/requirements/{reqId}` | Single requirement       |
| GET    | `/api/requirements/{reqId}/evidence`  | Evidence for requirement |
| GET    | `/api/bids/{id}/risks`                | Risk category summary    |
| GET    | `/api/bids/{id}/conflicts`            | Conflict items           |
| GET    | `/api/bids/{id}/audit`                | Audit trail              |

### Review & Reports
| Method | Endpoint                          | Description              |
|--------|-----------------------------------|--------------------------|
| GET    | `/api/bids/{id}/review`           | Officer review record    |
| POST   | `/api/bids/{id}/review`           | Save officer review      |
| POST   | `/api/bids/{id}/report/generate`  | Generate HTML report     |
| GET    | `/api/reports/{filename}`         | Download generated report|

### Reference Data
| Method | Endpoint                              | Description          |
|--------|---------------------------------------|----------------------|
| GET    | `/api/government-instructions`        | Procurement guidance |
| GET    | `/api/government-instructions/restrictions` | Restrictions   |
| GET    | `/api/helpdesk/faqs`                  | FAQ list             |
| POST   | `/api/helpdesk/queries`               | Submit helpdesk query|

---

## Database Schema (auto-created)

- `users` — USER / GOVERNMENT OFFICER accounts
- `bids` — tender/bid records with compliance summary
- `bidder_documents` — uploaded files + extracted text + processing stages
- `requirements` — extracted compliance requirements per bid
- `evidence_details` — evidence for each requirement (snippet, confidence)
- `risk_category_summaries` — risk scoring per category
- `conflict_items` — cross-document discrepancies
- `audit_events` — full audit trail
- `officer_review_records` — human review decisions
- `government_instructions` — procurement guidelines
- `helpdesk_faqs` / `helpdesk_queries` — support content

---

## The AI Analysis Pipeline (6 stages)

1. **Tender Specification Parsing** — parse RFP structure
2. **Requirements Extraction** — identify financial/legal/experience/technical criteria
3. **Bidder Document Processing & OCR** — extract text from PDF/DOCX/XLSX/PPTX/CSV
4. **RAG Evidence Retrieval** — match document content against requirements
5. **Compliance & Risk Evaluation** — compute PASS/FAIL + risk scores + conflicts
6. **Verification Report Synthesis** — generate audit log + executive summary

The pipeline is architected with a clean extension point (`DocumentProcessor` interface
and `AnalysisService`) where the **LLM / OCR / RAG engine** will be plugged in next.

---

## Project Structure

```
src/main/java/com/sih/gem/
├── GemApplication.java
├── config/        # Security, CORS, exception handling, data seeder
├── controller/    # REST controllers
├── dto/           # Request/response DTOs
├── entity/        # JPA entities
├── repository/    # Spring Data repositories
├── security/      # JWT util, filter, user details service
└── service/       # Business logic + document processing + analysis
```
