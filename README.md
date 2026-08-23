# 🏛️ CivicPulse — The Autonomous Smart City Complaint Resolution Platform

> **AI-Powered Multi-Channel Civic Resolution Sentinel, Municipal Routing & City Intelligence Platform**

CivicPulse monitors public civic channels (Reddit, Google News, OpenStreetMap, WhatsApp, Web portals), translates unstructured complaints into prioritized municipal action items, routes them to the right departments, tracks SLAs, and provides real-time geographic intelligence for city planners.

---

## 🎯 The Problem & The 5-Agent Solution

### The Civic Problem
Citizens report potholes, garbage, waterlogging, and broken streetlights across fragmented social and messaging channels — but complaints get lost in bureaucracy, delayed by manual triage, or ignored.

### The 5 Autonomous AI Agents in CivicPulse

```
[Agent 1: Ingestion Sentinel]
  ├── Monitors Reddit (r/delhi, r/bangalore, r/mumbai, r/patna, etc.)
  ├── Scrapes Google News India Civic RSS & OpenStreetMap Infrastructure Notes
  ├── Receives WhatsApp Cloud API & Telegram Bot Webhooks
  └── Public Citizen Portal Intake
        │
        ▼
[Agent 2: Classification Agent]
  ├── Categorizes issue (Roads, Water, Sanitation, Electrical, Safety)
  ├── Detects safety risks & urgency bonuses
  └── Geotags exact coordinates & ward via OpenStreetMap Nominatim
        │
        ▼
[Agent 3: Routing & Priority Agent]
  ├── Multi-factor Priority Scoring (Low, Medium, High, Critical)
  ├── Routes to right municipal department queue
  └── Dynamically calculates SLA resolution deadlines (+24h to +72h)
        │
        ▼
[Agent 4: Citizen Tracking Agent]
  ├── Generates 128-bit Cryptographic Tracking ID (`CP-xxxx`)
  ├── Real-time public status timeline (Reported → Assigned → In Progress → Resolved)
  └── Follows up with citizens and displays resolution notes & photo proof
        │
        ▼
[Agent 5: City Planner Analytics Agent]
  ├── Proximity & DBSCAN clustering for chronic failure zones
  ├── City-wide geospatial heatmap
  └── Department SLA compliance and resolution velocity analytics
```

---

## ✨ Key Features & Highlights

* **100% Free & Open Intake (0 API Keys Required)**:
  * **Reddit Sentinel**: 60-second autonomous background scanner across Indian cities (`r/delhi`, `r/bangalore`, `r/mumbai`, `r/hyderabad`, `r/patna`) with direct thread links.
  * **Google News India Civic RSS**: Pulls breaking municipal reports with direct article links.
  * **OpenStreetMap Civic Notes**: Ingests infrastructure bug notes with map coordinate links.
  * **Meta WhatsApp Cloud API**: Webhook listener (`/api/v1/ingest/whatsapp`) + 1-click interactive simulator.
* **Proximity Duplicate Detection**: Automatically links related complaints submitted within 7 days and 500m proximity.
* **Departmental RBAC**: Scopes staff access to assigned department queues (Roads, Water, Sanitation, Lighting, Safety).
* **Dynamic SLA Tracking**: Live breach flags and resolution countdowns.
* **City Planner Intelligence**: Live Leaflet heatmaps, category breakdowns, and recurring hotspot analytics.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
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

### 3. Demo Staff Credentials

The database comes pre-seeded with sample municipal accounts for testing staff operations:

| Role | Department | Email | Password |
|---|---|---|---|
| **City Admin** | System Admin | `admin@civicpulse.gov` | `AdminPassword123!` |
| **Municipal Officer** | Roads & Infrastructure | `officer.roads@civicpulse.gov` | `OfficerPassword123!` |
| **Municipal Officer** | Water & Sanitation | `officer.water@civicpulse.gov` | `OfficerPassword123!` |
| **Municipal Officer** | Waste Management | `officer.waste@civicpulse.gov` | `OfficerPassword123!` |
| **Municipal Officer** | Public Lighting | `officer.lighting@civicpulse.gov` | `OfficerPassword123!` |
| **Municipal Officer** | Parks & Recreation | `officer.parks@civicpulse.gov` | `OfficerPassword123!` |
| **Municipal Officer** | Public Health & Safety | `officer.safety@civicpulse.gov` | `OfficerPassword123!` |
| **Municipal Officer** | Environmental Services | `officer.env@civicpulse.gov` | `OfficerPassword123!` |

---

## Testing & Quality Verification

CivicPulse includes a complete test suite covering unit logic, API endpoints, RBAC authorization, workflow state machines, and security hardening.

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

### Verified Test Results
* **Pytest**: `192 passed` (100% success rate)
* **Ruff**: `0 violations`
* **Mypy**: `0 errors in 56 source files`
* **Next.js Production Build**: `Compiled successfully`
* **ESLint**: `0 errors, 0 warnings`

---

## 🌐 Cloud Deployment Guide (Vercel + Render)

### Architecture
```
┌────────────────────────────────┐         ┌─────────────────────────────────┐
│     FRONTEND (Next.js 16)      │  HTTP   │       BACKEND (FastAPI)         │
│       Deployed on VERCEL       │ ──────► │       Deployed on RENDER        │
└────────────────────────────────┘         └─────────────────────────────────┘
                                                            │
                                                            │ AsyncIO (SQLAlchemy)
                                                            ▼
                                                   ┌─────────────────┐
                                                   │   PostgreSQL    │
                                                   │ (Supabase/Neon) │
                                                   └─────────────────┘
```

### 1. Deploy Database (Supabase / Neon / Render PostgreSQL)
1. Create a database on [Supabase](https://supabase.com) or [Neon](https://neon.tech).
2. Copy your connection string: `postgresql+asyncpg://postgres:PASSWORD@HOST:5432/postgres`.

### 2. Deploy Backend on Render
1. Go to [Render](https://render.com) $\rightarrow$ **New Web Service** $\rightarrow$ Connect `CivicPulse` GitHub repo.
2. Settings:
   * **Root Directory**: `backend`
   * **Runtime**: `Python 3`
   * **Build Command**: `pip install -r requirements.txt && alembic upgrade head && python -m app.db.seed`
   * **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
3. Environment Variables:
   * `DATABASE_URL`: your PostgreSQL asyncpg URL
   * `JWT_SECRET`: 64-character random string
   * `ALLOWED_ORIGINS`: `https://your-app.vercel.app,http://localhost:3000`
   * `ENVIRONMENT`: `production`

### 3. Deploy Frontend on Vercel
1. Go to [Vercel](https://vercel.com) $\rightarrow$ **Import Repository** (`CivicPulse`).
2. Settings:
   * **Framework Preset**: `Next.js`
   * **Root Directory**: `frontend`
3. Environment Variables:
   * `NEXT_PUBLIC_API_BASE_URL`: `https://your-backend.onrender.com/api/v1`
4. Click **Deploy**.

---

## License

This project is licensed under the MIT License — Built for the Smart City Civic Resolution Hackathon.

