# CivicPulse: The Autonomous Smart City Complaint Resolution Platform

> **AI-Powered Multi-Channel Civic Resolution Sentinel, Municipal Routing and City Intelligence Platform**

CivicPulse monitors public civic channels (Reddit, Google News, OpenStreetMap, Web portals), translates unstructured complaints into prioritized municipal action items, routes them to the right departments, tracks SLAs, and provides real-time geographic intelligence for city planners.

---

## The Problem and The 5-Agent Solution

### The Civic Problem
Citizens report potholes, garbage, waterlogging, and broken streetlights across fragmented public channels, but complaints get lost in bureaucracy, delayed by manual triage, or ignored.

### The 5 Autonomous AI Agents in CivicPulse

```
[Agent 1: Ingestion Sentinel]
  ├── Monitors Reddit (r/delhi, r/bangalore, r/mumbai, r/patna, etc.)
  ├── Scrapes Google News India Civic RSS and OpenStreetMap Infrastructure Notes
  └── Public Citizen Portal Intake
        │
        ▼
[Agent 2: Classification Agent]
  ├── Categorizes issue (Roads, Water, Sanitation, Electrical, Safety)
  ├── Detects safety risks and urgency bonuses
  └── Geotags exact coordinates and ward via OpenStreetMap Nominatim
        │
        ▼
[Agent 3: Routing and Priority Agent]
  ├── Multi-factor Priority Scoring (Low, Medium, High, Critical)
  ├── Routes to right municipal department queue
  └── Dynamically calculates SLA resolution deadlines (+24h to +72h)
        │
        ▼
[Agent 4: Citizen Tracking Agent]
  ├── Generates 128-bit Cryptographic Tracking ID (CP-xxxx)
  ├── Real-time public status timeline (Reported -> Assigned -> In Progress -> Resolved)
  └── Follows up with citizens and displays resolution notes and photo proof
        │
        ▼
[Agent 5: City Planner Analytics Agent]
  ├── Proximity and DBSCAN clustering for chronic failure zones
  ├── City-wide geospatial heatmap
  └── Department SLA compliance and resolution velocity analytics
```

---

## Key Features and Highlights

* **Multi-Stream Social and News Ingestion**:
  * **Reddit Sentinel**: 60-second autonomous background scanner across Indian cities (r/delhi, r/bangalore, r/mumbai, r/hyderabad, r/patna) with direct thread links.
  * **Google News India Civic RSS**: Pulls breaking municipal reports with direct article links.
  * **OpenStreetMap Civic Notes**: Ingests infrastructure bug notes with map coordinate links.
* **Proximity Duplicate Detection**: Automatically links related complaints submitted within 7 days and 500m proximity.
* **Departmental RBAC**: Scopes staff access to assigned department queues (Roads, Water, Sanitation, Lighting, Safety).
* **Dynamic SLA Tracking**: Live breach flags and resolution countdowns.
* **City Planner Intelligence**: Live Leaflet heatmaps, category breakdowns, and recurring hotspot analytics.

---

## Technology Stack

| Layer | Technology Stack |
|---|---|
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, Leaflet |
| **Backend** | FastAPI (Python 3.11+), Pydantic v2, SQLAlchemy 2.0 (AsyncIO), Uvicorn |
| **Database** | PostgreSQL (Supabase / Render / Neon) with Alembic migrations |
| **AI Intelligence** | Gemini 2.5 Flash, Groq Llama-3.3, Built-in Deterministic NLP Engine |
| **Geocoding** | OpenStreetMap Nominatim Backend Proxy |
| **Open Streams** | Reddit Atom/RSS, Google News India RSS, OpenStreetMap Notes API |
| **Security** | JWT + httpOnly Refresh Cookies, Bcrypt Password Hashing, Department RBAC |

---

## Multi-Channel Ingestion Architecture

| Channel | Ingestion Type | Frequency / Trigger | Provenance and Tracking |
|---|---|---|---|
| **Reddit Social Stream** | Autonomous Atom/RSS Sentinel | Every 60 seconds across r/delhi, r/bangalore, r/mumbai, r/hyderabad, r/patna | Clickable View Original Reddit Post links |
| **Google News India Civic RSS** | Live News Syndicate | Continuous municipal query feed (potholes, waterlogging, garbage) | Clickable Read on Google News article links |
| **OpenStreetMap Civic Notes** | Public Geodata Bug Tracker | Regional bounding box API queries | Clickable View on OpenStreetMap coordinate links |
| **Public Citizen Web Portal** | OpenStreetMap Geotagged Form | Instant anonymous intake at / | 128-bit Cryptographic Tracking ID (CP-xxxx) |

---

## Environment Configuration

Configure environment variables in `.env` (refer to `.env.example`):

```bash
# Database
DATABASE_URL="postgresql+asyncpg://postgres:password@localhost:5432/civicpulse"
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key"

# Authentication
JWT_SECRET_KEY="your-random-32-byte-hex-jwt-secret"
JWT_ALGORITHM="HS256"
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7

# AI Intelligence Providers
GEMINI_API_KEY="your-google-gemini-api-key"
GROQ_API_KEY="your-groq-api-key"

# Frontend and CORS
NEXT_PUBLIC_API_BASE_URL="http://localhost:8000/api/v1"
ALLOWED_ORIGINS="http://localhost:3000"
```

---

## API Endpoints Overview

### Public Endpoints
```http
POST /api/v1/complaints                Submit an anonymous citizen complaint
GET  /api/v1/complaints/track/{id}     Track complaint status via 128-bit tracking ID
GET  /api/v1/geocode                    Geocode address or location string
GET  /api/v1/departments                List active municipal departments
GET  /api/v1/categories                 List active complaint categories
GET  /api/v1/ingest/agent-status        Get live autonomous background sentinel heartbeat
```

### Staff and Admin Endpoints (JWT Required)
```http
GET   /api/v1/complaints/kpi            Get operational KPI metrics summary
GET   /api/v1/complaints                Get filterable complaint queue
GET   /api/v1/complaints/{id}           Get full complaint detail and AI audit log
GET   /api/v1/complaints/{id}/related   Get linked related/duplicate complaints
PATCH /api/v1/complaints/{id}/status    Update complaint status with audit logging
POST  /api/v1/complaints/{id}/assign    Assign complaint to a department officer
POST  /api/v1/complaints/{id}/comments  Add an internal staff comment
GET   /api/v1/complaints/{id}/comments  Get internal staff comment thread
GET   /api/v1/analytics/summary         Get department and category analytics breakdown
GET   /api/v1/analytics/trends          Get 30-day complaint volume trends
GET   /api/v1/analytics/hotspots        Get geographic complaint concentration hotspots
```

---

## Local Setup and Installation

### Prerequisites
* Python 3.11+
* Node.js 18+
* PostgreSQL database

### 1. Backend Setup
```bash
cd backend
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
# source .venv/bin/activate

# Create .env from template
cp ../.env.example .env

pip install -r requirements.txt
alembic upgrade head
python -m app.db.seed
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
The frontend application will be available at `http://localhost:3000`.

### 3. Demo Staff Credentials

| Role | Department | Email | Password |
|---|---|---|---|
| **City Admin** | System Admin | `admin@civicpulse.gov` | `AdminPassword123!` |
| **Municipal Officer** | Roads and Infrastructure | `officer.roads@civicpulse.gov` | `OfficerPassword123!` |
| **Municipal Officer** | Water and Sanitation | `officer.water@civicpulse.gov` | `OfficerPassword123!` |
| **Municipal Officer** | Waste Management | `officer.waste@civicpulse.gov` | `OfficerPassword123!` |
| **Municipal Officer** | Public Lighting | `officer.lighting@civicpulse.gov` | `OfficerPassword123!` |
| **Municipal Officer** | Parks and Recreation | `officer.parks@civicpulse.gov` | `OfficerPassword123!` |
| **Municipal Officer** | Public Health and Safety | `officer.safety@civicpulse.gov` | `OfficerPassword123!` |
| **Municipal Officer** | Environmental Services | `officer.env@civicpulse.gov` | `OfficerPassword123!` |

---

## Testing and Quality Verification

```bash
# Run backend pytest suite (192 tests)
cd backend
python -m pytest tests/

# Run backend code quality checks
python -m ruff check .
python -m mypy app

# Run frontend build and lint
cd ../frontend
npm run build
npm run lint
```

### Verified Test Results
* **Pytest**: `192 passed` (100% success rate)
* **Ruff**: `0 violations`
* **Mypy**: `0 errors in 58 source files`
* **Next.js Production Build**: `Compiled successfully`
* **ESLint**: `0 errors, 0 warnings`

## License

This project is licensed under the MIT License.


