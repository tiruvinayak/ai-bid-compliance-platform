# AI-Assisted Procurement Bid Compliance Verification Platform

> **SIH26100 — Smart India Hackathon**

An AI-assisted procurement platform designed to help government procurement officers and bidders analyze tender requirements, verify bid documents, identify compliance issues, assess risk, detect conflicts, and compare multiple bids using an evidence-driven workflow.

The platform combines **document intelligence, deterministic compliance verification, local AI/RAG, preliminary integrity checks, risk analysis, conflict detection, evidence traceability, and multi-bidder comparison** into a unified procurement workflow.

---

## 📌 Project Overview

Government procurement processes involve large volumes of tender documents, bidder submissions, certificates, financial records, technical documents, and eligibility requirements.

Manual verification can require officers to:

* Read lengthy tender documents
* Extract individual requirements
* Examine multiple bidder documents
* Verify dates and document validity
* Cross-check information across pages
* Determine whether evidence satisfies requirements
* Identify missing or contradictory information
* Compare multiple bidders
* Document the reasoning behind verification decisions

This project aims to assist that workflow through an integrated AI and rule-based verification platform.

The system does **not replace the authorized procurement officer**. Instead, it provides structured evidence, automated checks, explanations, and decision-support information.

---

# 🎯 Objectives

The platform is designed to:

* Extract structured requirements from tender documents
* Process bidder documents automatically
* Extract relevant facts from submitted documents
* Perform preliminary document-integrity checks
* Verify bidder compliance against tender requirements
* Detect missing and conflicting information
* Assess procurement risk
* Maintain evidence traceability
* Provide a tender-aware AI assistant for bidders
* Compare multiple bids belonging to the same tender
* Maintain audit records of important procurement actions
* Provide government officers with structured decision-support information

---

# 🏗️ System Architecture

```text
                         ┌─────────────────────────┐
                         │    Central Government   │
                         └────────────┬────────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    │                 │                 │
                Railways           Finance          Defence
                    │
              Petroleum & Energy
                    │
              Departments
                    │
                 Tenders
                    │
             Procurement Officers
                    │
        ┌───────────┴───────────┐
        │                       │
     Bidders              Bid Documents
                                │
                                ▼
                    ┌─────────────────────┐
                    │ PDF Document Engine  │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Requirement         │
                    │ Extraction           │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Bidder Fact         │
                    │ Extraction           │
                    └──────────┬──────────┘
                               │
                               ▼
             ┌─────────────────────────────────┐
             │ Preliminary Integrity — Stage 0 │
             ├─────────────────────────────────┤
             │ • Document validity             │
             │ • Required evidence             │
             │ • Expiry validation             │
             │ • Cross-page consistency        │
             │ • Required fields               │
             └───────────────┬─────────────────┘
                             │
                             ▼
             ┌─────────────────────────────────┐
             │ Deep Compliance Verification    │
             └───────────────┬─────────────────┘
                             │
               ┌─────────────┼─────────────┐
               ▼             ▼             ▼
            Evidence        Risk        Conflicts
               │             │             │
               └─────────────┼─────────────┘
                             ▼
                 ┌────────────────────────┐
                 │ Multi-Bidder Comparison│
                 └────────────┬───────────┘
                              │
                              ▼
                    Government Officer
                         Decision
```

---

# 🔄 End-to-End Workflow

```text
Tender Upload
      ↓
PDF Processing
      ↓
Requirement Extraction
      ↓
Bidder Document Upload
      ↓
Bidder Fact Extraction
      ↓
Preliminary Integrity Verification
      ↓
Deep Compliance Verification
      ↓
Risk Assessment
      ↓
Conflict Detection
      ↓
Evidence Traceability
      ↓
Officer Review
      ↓
Multi-Bidder Comparison
      ↓
Audit & Report Generation
```

---

# 🚀 Implemented Phases

## Phase 1 — Government Hierarchy

**Status: ✅ Complete**

The platform supports a government procurement hierarchy:

```text
Central Government
      ↓
Sector
      ↓
Department
      ↓
Tender
      ↓
Procurement Officer
      ↓
Bid
```

Supported demonstration sectors include:

* Railways
* Finance
* Defence
* Petroleum & Energy

The hierarchy is integrated with role-based access control.

### Verified

```text
Hierarchy E2E: 13/13 PASS
```

---

# Phase 2 — Preliminary Compliance & Document Integrity

**Status: ✅ Complete**

A deterministic preliminary verification layer operates before deep compliance analysis.

### Checks

| Check                  | Description                                                    |
| ---------------------- | -------------------------------------------------------------- |
| Document Validity      | Verifies successful document processing and technical validity |
| Required Evidence      | Checks whether required evidence is available                  |
| Expiry Validation      | Detects expired or ambiguous validity dates                    |
| Cross-Page Consistency | Detects contradictory values across document pages             |
| Required Fields        | Identifies missing information required for verification       |

### Result States

```text
PASS
REVIEW
FAIL
MISSING
CONFLICT
```

The results are stored in PostgreSQL and displayed in the compliance dashboard.

---

# Phase 3 — Bidder AI Assistant

**Status: ✅ Complete**

The platform includes a **tender-aware AI assistant** for bidders.

The assistant uses local AI and retrieves information from the selected tender and bidder context.

### Example Questions

```text
What documents are required?

Which documents am I missing?

Why is my bid under review?

What are the eligibility requirements?

Is my certificate valid?

Why did this requirement fail?

What should I correct before submission?
```

### AI Architecture

```text
React
  ↓
Spring Boot
  ↓
FastAPI
  ↓
Local RAG / Retrieval
  ↓
Ollama
  ├── qwen2.5:3b
  └── nomic-embed-text
```

The assistant provides citations to supporting requirements, documents, evidence, and pages where available.

### Verified

```text
Phase 3 Assistant E2E: 3/3 PASS
```

The assistant has been tested using the real local Ollama model rather than a mock LLM provider.

---

# Phase 4 — Multi-Bidder Comparison & Decision Support

**Status: ✅ Complete**

Government officers can compare multiple bids belonging to the same tender.

### Comparison Features

* Bidder summary
* Preliminary integrity status
* Requirement-by-requirement comparison
* Compliance status
* Coverage percentage
* Risk summary
* Conflict information
* Document coverage
* Evidence references
* Bid detail navigation
* Filtering
* Neutral sorting

Example:

```text
                    Bidder A     Bidder B     Bidder C
--------------------------------------------------------
Preliminary           PASS         REVIEW       PASS
Requirements          8/9          6/9          8/9
Review                  1            2            1
Failed                  0            1            0
Missing                 0            1            0
Conflicts               0            2            0
```

The system intentionally does **not** automatically declare a winner or procurement award decision.

The authorized government officer remains responsible for the final decision.

### Performance

Comparison is deterministic database aggregation and does not require an LLM.

Observed response time:

```text
~10–45 ms
```

### Verified

```text
Phase 4 E2E: 10/10 PASS
```

---

# 🤖 AI & Document Intelligence

The platform uses a hybrid architecture combining:

### Deterministic Processing

Used for:

* Date comparisons
* Required-field validation
* Document metadata
* Compliance rules
* Preliminary verification
* Risk rules
* Conflict detection
* Bid comparison

### Local AI

Used for:

* Requirement extraction
* Document understanding
* Semantic retrieval
* Tender-aware bidder assistance
* Evidence-grounded explanations

This separation helps keep critical verification decisions deterministic and traceable.

---

# 🔍 Evidence Traceability

A core design principle is that verification results should be explainable.

The platform maintains a chain such as:

```text
Requirement
     ↓
Compliance Result
     ↓
Fact
     ↓
Evidence
     ↓
Document
     ↓
Page
```

For example:

```text
Requirement R-04
      ↓
PASS
      ↓
Turnover = ₹8 crore
      ↓
Financial Statement
      ↓
Page 4
```

The system avoids inventing page numbers or evidence when source information is unavailable.

---

# ⚠️ Risk & Conflict Analysis

The platform contains an existing risk-analysis layer and conflict-detection engine.

### Risk

Risk information can include:

* High-risk factors
* Medium-risk factors
* Low-risk factors
* Risk category summaries
* Evidence supporting risk findings

### Conflicts

The system can identify conflicting information such as:

```text
Page 2:
Turnover = ₹8 crore

Page 7:
Turnover = ₹3 crore
```

Conflict information can include:

* Conflict type
* Affected field
* Source documents
* Supporting evidence

---

# 🏛️ Role-Based Access Control

The platform supports role-based access.

Conceptually:

```text
CENTRAL_ADMIN
      │
      ├── All authorized sectors
      │
      └── Government administration

SECTOR_USER
      │
      └── Assigned sector

GOVERNMENT OFFICER
      │
      └── Assigned department/tender scope

BIDDER
      │
      └── Own bids/documents
```

Access is enforced on the backend and frontend.

Hierarchy restrictions are applied to government users.

Bidder access is isolated from other bidders' private information.

---

# 🧑‍💼 Government Officer Workflow

```text
Login
  ↓
Government Dashboard
  ↓
Sector
  ↓
Department
  ↓
Tender
  ↓
Bid
  ↓
Preliminary Integrity
  ↓
Compliance
  ↓
Risk
  ↓
Conflicts
  ↓
Evidence
  ↓
Compare Bids
  ↓
Audit / Report
```

---

# 👤 Bidder Workflow

```text
Bidder Login
     ↓
My Bids
     ↓
Select Tender
     ↓
Upload Documents
     ↓
Document Processing
     ↓
Compliance Analysis
     ↓
Preliminary Verification
     ↓
AI Assistant
     ↓
Review Missing / Problematic Documents
     ↓
Correct Submission
```

---

# 🛠️ Technology Stack

## Frontend

* React 19
* Vite
* TypeScript
* Tailwind CSS
* React Router
* Axios

## Backend

* Java 21
* Spring Boot
* Spring Security
* JWT
* Spring Data JPA
* Hibernate
* Maven

## Database

* PostgreSQL 18.x

## AI Service

* Python
* FastAPI
* Uvicorn
* Ollama

## Local AI Models

```text
qwen2.5:3b
nomic-embed-text
```

## Testing

* JUnit / Spring Boot tests
* Pytest
* Playwright
* Frontend build validation

---

# 🏗️ Repository Structure

```text
SIH2/
│
├── Backend/
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/
│   │   │   └── resources/
│   │   └── test/
│   └── pom.xml
│
├── Frontend/
│   └── Frontend/
│       ├── src/
│       ├── tests/
│       ├── package.json
│       └── vite.config.*
│
├── ai-service/
│   ├── app/
│   ├── tests/
│   └── requirements.txt
│
├── .gitignore
├── .env.example
└── README.md
```

---

# ⚙️ Local Architecture

The current development environment uses:

```text
React / Vite
     │
     │ :5173
     ▼
Spring Boot
     │
     │ :8080
     ▼
PostgreSQL
     │
     │
     ▼
FastAPI
     │
     │ :8000
     ▼
Ollama
     │
     ├── qwen2.5:3b
     └── nomic-embed-text
```

---

# 🔐 Security Principles

The project follows several security principles:

* JWT-based authentication
* Role-based authorization
* Department/sector access control
* Bid ownership validation
* Backend authorization before AI context retrieval
* No cloud LLM API keys
* No secrets committed to Git
* Sensitive identifiers should be masked where appropriate
* No credentials stored in source code
* Audit logging for important government actions

Before publishing the repository, verify that:

```text
.env
credentials
private keys
API secrets
private bidder documents
real government identifiers
```

are not committed.

---

# 📊 Current Verification Status

Latest verified regression baseline after Phase 4:

| Test Suite            |           Result |
| --------------------- | ---------------: |
| Backend               |   **24/24 PASS** |
| AI                    | **125/125 PASS** |
| Frontend Build        |         **PASS** |
| Hierarchy E2E         |   **13/13 PASS** |
| Phase 2 Regression    |         **PASS** |
| Phase 3 Assistant E2E |     **3/3 PASS** |
| Phase 4 E2E           |   **10/10 PASS** |
| Lint                  |     **0 errors** |

---

# 🔬 Phase 5 — In Progress

The next development phase extends the platform with:

## External Government Verification

Planned provider categories:

```text
GST
PAN / Income Tax
MCA
EPFO / ESIC
DigiLocker
```

The implementation will distinguish between:

```text
VERIFIED
NOT_VERIFIED
MISMATCH
UNAVAILABLE
SANDBOX
ERROR
PENDING
```

The platform will **not claim live government verification unless an authorized, functioning provider actually performs the verification**.

---

## ML Risk Layer

The architecture also provides for a machine-learning risk layer.

Potential feature categories include:

```text
Requirements passed
Requirements requiring review
Requirements failed
Requirements missing
Preliminary integrity issues
Expired documents
Conflict count
Risk factor counts
Document count
Evidence coverage
```

Potential model families:

```text
Logistic Regression
Random Forest
XGBoost
```

However, a production ML model should only be trained when a legitimate, appropriately labelled historical dataset is available.

The project will not fabricate model accuracy, predictions, or training data.

---

# 🧭 Future Roadmap

```text
Phase 1
Government Hierarchy
✅ COMPLETE

Phase 2
Preliminary Compliance & Integrity
✅ COMPLETE

Phase 3
Bidder AI Assistant
✅ COMPLETE

Phase 4
Multi-Bidder Comparison
✅ COMPLETE

Phase 5
External Verification + ML Risk Layer
🚧 IN PROGRESS

Phase 6
Deployment + Final E2E + Production Hardening
⏳ PLANNED
```

---

# 🎓 Smart India Hackathon

**Problem Statement:** `SIH26100`

**Project:** AI-Assisted Procurement Bid Compliance Verification Platform

The system is designed as an assistive procurement technology platform focused on:

* Transparency
* Evidence traceability
* Automated document analysis
* Consistent compliance checking
* Risk identification
* Procurement workflow efficiency
* Human-in-the-loop decision making

---

# ⚠️ Important Design Principle

This platform is a **decision-support system**.

It does not autonomously:

* Award contracts
* Reject bidders
* Declare a procurement winner
* Make legal determinations
* Claim government verification without an actual provider response

Automated results are presented with supporting evidence so authorized officers can review the underlying information and make the final procurement decision.

---

# 🚀 Getting Started

## Prerequisites

Install:

* Java 21
* Maven
* Node.js
* npm
* Python 3.x
* PostgreSQL
* Ollama

Verify:

```bash
java -version
mvn -version
node -v
npm -v
python3 --version
psql --version
ollama --version
```

---

## Start PostgreSQL

Ensure PostgreSQL is running and the configured database is available.

Example:

```text
Database:
sih_bid_compliance

Port:
5432
```

Use your local environment configuration rather than committing credentials.

---

## Start Ollama

Ensure the required models are available:

```bash
ollama list
```

Required models:

```text
qwen2.5:3b
nomic-embed-text
```

---

## Start AI Service

From the AI service directory:

```bash
cd ai-service
```

Activate the project's Python environment if applicable and start FastAPI using the project's configured command.

Expected service:

```text
http://localhost:8000
```

---

## Start Backend

```bash
cd Backend
mvn spring-boot:run
```

Expected:

```text
http://localhost:8080
```

---

## Start Frontend

```bash
cd Frontend/Frontend
npm install
npm run dev
```

Expected:

```text
http://localhost:5173
```

---

# 🧪 Testing

## Backend

```bash
cd Backend
mvn test
```

## AI Service

```bash
cd ai-service
pytest tests/
```

## Frontend Build

```bash
cd Frontend/Frontend
npm run build
```

## E2E

Use the project's configured Playwright/E2E command.

---

# 📄 License

This repository is developed as part of the **Smart India Hackathon (SIH)** project.

Add the final repository license here once the project team has selected the appropriate license for public distribution.

---

# 👨‍💻 Project

**AI-Assisted Procurement Bid Compliance Verification Platform**

**SIH Problem Statement:** `SIH26100`

Built using:

**React · Spring Boot · PostgreSQL · FastAPI · Ollama · Local AI · RAG · Document Intelligence**

---

> **Built to assist procurement teams with evidence-driven, explainable, and human-supervised bid verification.**
