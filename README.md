# CivicPulse

> **AI-Powered Civic Complaint Management & City Intelligence Platform**

CivicPulse converts unstructured citizen complaints into structured, prioritized, routed, and trackable municipal action items and city-level operational intelligence.

---

## Overview

CivicPulse streamlines municipal complaint operations from citizen reporting to city-wide analytics:

```
Citizen Complaint 
  └─► AI Intelligence (Classification & Risk Detection)
        └─► Automated Department Routing
              └─► Proximity Duplicate Detection
                    └─► Priority Scoring & SLA Calculation
                          └─► Staff Resolution Workflow
                                └─► City Intelligence Analytics
```

---

## Problem & Solution

### The Civic Problem
* **Fragmented Channels**: Complaints arrive via disparate channels with incomplete details.
* **Manual Triage Bottlenecks**: Staff spend hundreds of hours manually categorizing complaints.
* **Duplicate Submissions**: Identical infrastructure issues get logged multiple times without correlation.
* **SLA Breaches**: High-urgency safety hazards get lost in unorganized queues.
* **Lack of Visibility**: Municipal leadership lacks real-time insight into city-wide complaint hotspots.

### The CivicPulse Solution
CivicPulse provides an automated end-to-end pipeline:
1. **Instant AI Intake**: Translates raw complaint text into categorized structured data.
2. **Deterministic Priority & Routing**: Assigns priority scores (0–100+) and routes complaints to target departments based on rule-based keyword matching.
3. **Proximity Duplicate Detection**: Clusters related complaints submitted within 7 days and geographic proximity.
4. **Staff Action Dashboard**: Enables municipal officers to manage statuses, assign staff, post internal notes, and track SLAs.
5. **City Intelligence Analytics**: Aggregates complaint volume trends, category breakdowns, and geographic hotspot clusters.

---

## Key Features

### Citizen Portal
* **Anonymous Intake**: Citizens submit complaints without mandatory registration.
* **Confidential Submitter Info**: Optional contact details are kept strictly internal and never exposed publicly.
* **Address Geocoding**: Integrated Nominatim reverse-geocoding backend proxy.
* **128-bit Cryptographic Tracking ID**: Secure tracking identifiers (`CP-{22 URL-safe chars}`) with zero sequential predictability.
* **Public Complaint Tracker**: Allows citizens to track complaint resolution progress via `CitizenComplaintResponse` public DTO.

### AI Intelligence Engine
* **Multi-Provider Architecture**: Native support for Google Gemini (`gemini-2.5-flash`), Groq (`llama-3.3-70b-versatile`), and deterministic `MockAIProvider`.
* **Prompt Injection Defense**: Separated system instruction boundaries preventing LLM override attacks.
* **Structured Output Audit**: Every LLM classification is logged in `ai_processing_logs` with token usage and latency metrics.

### Intelligent Processing Pipeline
* **Deterministic Priority Formula**: Computes priority scores based on severity (1–5), safety risk bonus (+25), recurrence bonus, and category baseline.
* **SLA Service**: Calculates resolution deadlines based on department SLA policies and flags SLA breaches automatically.
* **Proximity Duplicate Detection**: Flags duplicates within 7 days and geographic proximity using join table relationships (`related_complaints`).

### Municipal Operations Dashboard
* **Departmental RBAC**: Staff access is strictly scoped to their assigned municipal department.
* **Operational KPI Cards**: Real-time summary cards for Total, Unassigned, In Progress, Resolved, and SLA Breached complaints.
* **Status Workflow**: Enforces valid state transitions (`REPORTED` → `ASSIGNED` → `IN_PROGRESS` → `RESOLVED` → `CLOSED`) with audit history logging.
* **Officer Assignment**: Assigns complaints to active municipal officers within the same department.
* **Internal Staff Comments**: Threaded staff-only notes, HTML-escaped for XSS security.

### City Intelligence Analytics
* **Summary Analytics**: Category, department, priority, and status distributions.
* **SLA Compliance Tracking**: Computes city-wide and department-level SLA compliance percentages.
* **30-Day Trend Volume**: Time-series complaint volume aggregation.
* **Geographic Hotspots**: Aggregates complaint locations into cluster centroids without exposing submitter PII.

---

## Architecture

| Layer | Technology Stack |
|---|---|
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript, Vanilla CSS / Tailwind CSS |
| **Backend** | FastAPI, Python 3.11+, Pydantic v2, SQLAlchemy 2.0 (AsyncIO) |
| **Database** | PostgreSQL with Row Level Security (RLS) policies & Alembic migrations |
| **AI Providers** | Google Gemini API, Groq API, MockAIProvider fallback |
| **Geocoding** | Nominatim OpenStreetMap backend proxy |

---

## Security Architecture

* **Environment Secret Isolation**: Zero API keys or database passwords committed to Git (`.env` in `.gitignore`).
* **JWT & Refresh Tokens**: Short-lived access tokens stored in memory; httpOnly refresh token cookies.
* **PostgreSQL RLS Policies**: Row Level Security enabled across database tables.
* **Public vs. Staff DTO Separation**: Public tracking DTO strictly excludes 13 internal fields (PII, raw coordinates, priority score, officer identity, internal comments).
* **PII & Secret Log Redaction**: Automated `structlog` filters masking passwords, tokens, credentials, and submitter PII in server logs.
* **Rate Limiting**: Endpoint-level rate limiting via SlowAPI.

---

## API Overview

### Public Endpoints
```http
POST /api/v1/complaints                Submit an anonymous citizen complaint
GET  /api/v1/complaints/track/{id}     Track complaint status via 128-bit tracking ID
GET  /api/v1/geocode                    Geocode address or location string
GET  /api/v1/departments                List active municipal departments
GET  /api/v1/categories                 List active complaint categories
```

### Staff & Admin Endpoints (JWT Required)
```http
GET   /api/v1/complaints/kpi            Get operational KPI metrics summary
GET   /api/v1/complaints                Get filterable complaint queue
GET   /api/v1/complaints/{id}           Get full complaint detail & AI audit log
GET   /api/v1/complaints/{id}/related   Get linked related/duplicate complaints
PATCH /api/v1/complaints/{id}/status    Update complaint status with audit logging
POST  /api/v1/complaints/{id}/assign    Assign complaint to a department officer
POST  /api/v1/complaints/{id}/comments  Add an internal staff comment
GET   /api/v1/complaints/{id}/comments  Get internal staff comment thread
GET   /api/v1/analytics/summary         Get department & category analytics breakdown
GET   /api/v1/analytics/trends          Get 30-day complaint volume trends
GET   /api/v1/analytics/hotspots        Get geographic complaint concentration hotspots
```

---

## Project Structure

```
CivicPulse/
├── .env.example                     # Environment template file
├── .gitignore                        # Root Git ignore rules
├── LICENSE                           # MIT License
├── README.md                         # Project documentation
├── backend/                          # FastAPI Backend Application
│   ├── alembic/                      # Alembic database migrations
│   ├── app/
│   │   ├── ai/                       # Gemini / Groq / Mock AI providers
│   │   ├── middleware/               # Request logging & security headers
│   │   ├── models/                   # SQLAlchemy ORM database models
│   │   ├── routers/v1/               # Versioned FastAPI API routes
│   │   ├── schemas/                  # Pydantic validation schemas
│   │   ├── security/                 # Password hashing, JWT & PII redaction
│   │   ├── services/                 # Priority scoring, SLA & Duplicate services
│   │   ├── config.py                 # Application configuration
│   │   ├── database.py               # Database session setup
│   │   ├── dependencies.py           # Authentication dependencies
│   │   └── main.py                   # FastAPI application factory
│   └── tests/                        # Pytest unit, API & security test suites
└── frontend/                         # Next.js Frontend Application
    ├── src/
    │   ├── app/                      # Next.js App Router pages
    │   ├── components/               # React UI components
    │   ├── lib/                      # API client integration functions
    │   ├── store/                    # Zustand authentication state store
    │   └── types/                    # TypeScript interfaces
    └── package.json
```

---

## Local Setup & Installation

### Prerequisites
* Python 3.11+
* Node.js 18+
* PostgreSQL database (or local SQLite for testing)

### 1. Backend Setup
```bash
cd backend
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
# source .venv/bin/activate

pip install -r requirements-dev.txt
```

Create `.env` file from `.env.example`:
```bash
cp ../.env.example .env
```

Start backend development server:
```bash
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
The frontend application will be available at `http://localhost:3000`.

---

## Testing & Quality Verification

CivicPulse includes a complete test suite covering unit logic, API endpoints, RBAC authorization, and security hardening.

```bash
# Run backend pytest suite
cd backend
python -m pytest tests/

# Run backend code quality checks
python -m ruff check .
python -m mypy app

# Run frontend build & lint
cd ../frontend
npm run build
npm run lint
```

### Verified Test Results (Phase 8 Baseline)
* **Pytest**: `126 passed` (100% success rate)
* **Ruff**: `0 violations`
* **Mypy**: `0 errors in 55 source files`
* **Next.js Production Build**: `Compiled successfully`
* **ESLint**: `0 errors, 0 warnings`

---

## Future Roadmap

The following features are planned for future iterations beyond Phase 8:
* Citizen account registration & notification preferences
* Image/evidence attachment uploads
* Email/SMS/WhatsApp automated notification dispatch
* Predictive ML workload forecasting

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
Copyright (c) 2026 Ananya Raj.
