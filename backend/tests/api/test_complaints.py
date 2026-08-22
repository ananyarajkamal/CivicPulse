"""
API tests for citizen complaint intake and public tracking endpoints (/api/v1/complaints, /geocode, /departments, /categories).

Tests verify:
  - POST /complaints creates an anonymous complaint and returns 128-bit tracking ID
  - GET /complaints/track/{tracking_id} returns 200 with CitizenComplaintResponse DTO
  - GET /complaints/track/{tracking_id} NEVER exposes internal/PII fields
  - Invalid tracking ID format returns 404
  - GET /departments and GET /categories return public lists
  - GET /geocode returns results or empty list gracefully
"""

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.database import Base, get_db
from app.main import app
from app.models.category import ComplaintCategory
from app.models.department import Department
from app.schemas.enums import ComplaintPriority
from app.utils.tracking import validate_tracking_id

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(TEST_DATABASE_URL, echo=False)
TestAsyncSessionLocal = async_sessionmaker(
    bind=test_engine, class_=AsyncSession, expire_on_commit=False
)


@pytest.fixture
async def setup_db() -> AsyncSession:
    """Create in-memory tables and yield session."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestAsyncSessionLocal() as session:
        yield session

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture
async def client(setup_db: AsyncSession) -> AsyncClient:
    """Async test client with get_db overridden."""
    async def override_get_db() -> AsyncSession:
        yield setup_db

    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest.fixture
async def seed_department_and_category(setup_db: AsyncSession) -> tuple[Department, ComplaintCategory]:
    """Seed sample department and category into test DB."""
    dept = Department(
        name="Roads & Infrastructure",
        code="ROADS",
        description="Road repairs",
        default_sla_hours=48,
    )
    setup_db.add(dept)
    await setup_db.flush()

    cat = ComplaintCategory(
        name="Pothole",
        department_id=dept.id,
        default_priority=ComplaintPriority.HIGH,
        default_sla_hours=24,
    )
    setup_db.add(cat)
    await setup_db.commit()
    await setup_db.refresh(dept)
    await setup_db.refresh(cat)
    return dept, cat


class TestPublicLists:
    """Tests for GET /departments and GET /categories."""

    async def test_list_departments(
        self, client: AsyncClient, seed_department_and_category: tuple[Department, ComplaintCategory]
    ) -> None:
        response = await client.get("/api/v1/departments")
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1
        assert data[0]["code"] == "ROADS"

    async def test_list_categories(
        self, client: AsyncClient, seed_department_and_category: tuple[Department, ComplaintCategory]
    ) -> None:
        response = await client.get("/api/v1/categories")
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1
        assert data[0]["name"] == "Pothole"


class TestComplaintSubmission:
    """Tests for POST /api/v1/complaints."""

    async def test_submit_anonymous_complaint_minimal(self, client: AsyncClient) -> None:
        response = await client.post(
            "/api/v1/complaints",
            json={"raw_text": "There is a deep hazardous pothole near 5th avenue."},
        )
        assert response.status_code == 201
        data = response.json()
        assert "tracking_id" in data
        tracking_id = data["tracking_id"]
        assert validate_tracking_id(tracking_id) is True
        assert data["status"] == "reported"

    async def test_submit_anonymous_complaint_full(
        self, client: AsyncClient, seed_department_and_category: tuple[Department, ComplaintCategory]
    ) -> None:
        dept, cat = seed_department_and_category
        payload = {
            "raw_text": "Large broken water pipe leaking on main street sidewalk.",
            "location_text": "Main St & 4th Ave",
            "location_lat": 40.7128,
            "location_lng": -74.0060,
            "location_address": "123 Main St, Cityville",
            "category_id": str(cat.id),
            "department_id": str(dept.id),
            "submitter_name": "Jane Citizen",
            "submitter_contact": "jane@example.com",
        }
        response = await client.post("/api/v1/complaints", json=payload)
        assert response.status_code == 201
        data = response.json()
        assert validate_tracking_id(data["tracking_id"]) is True

    async def test_submit_complaint_short_text_rejected(self, client: AsyncClient) -> None:
        response = await client.post(
            "/api/v1/complaints",
            json={"raw_text": "too short"},  # < 10 chars
        )
        assert response.status_code == 422


class TestComplaintTracking:
    """Tests for GET /api/v1/complaints/track/{tracking_id}."""

    async def test_track_existing_complaint(self, client: AsyncClient) -> None:
        # Submit complaint
        submit_res = await client.post(
            "/api/v1/complaints",
            json={"raw_text": "Water leakage in front of apartment building."},
        )
        tracking_id = submit_res.json()["tracking_id"]

        # Track complaint
        track_res = await client.get(f"/api/v1/complaints/track/{tracking_id}")
        assert track_res.status_code == 200
        data = track_res.json()

        # Check public boundary
        assert data["tracking_id"] == tracking_id
        assert data["status"] == "reported"
        assert "timeline" in data
        assert len(data["timeline"]) >= 1

        # Verify EXCLUDED fields never appear
        assert "id" not in data
        assert "raw_text" not in data
        assert "submitter_name" not in data
        assert "submitter_contact" not in data
        assert "assigned_to" not in data
        assert "location_lat" not in data
        assert "location_lng" not in data

    async def test_track_invalid_format_returns_404(self, client: AsyncClient) -> None:
        response = await client.get("/api/v1/complaints/track/INVALID-TRACKING-ID")
        assert response.status_code == 404

    async def test_track_nonexistent_valid_format_returns_404(self, client: AsyncClient) -> None:
        # Nonexistent 128-bit tracking ID
        fake_id = "CP-X7k2mN4qVpRsLwYzJb8nDg"
        response = await client.get(f"/api/v1/complaints/track/{fake_id}")
        assert response.status_code == 404


class TestGeocodingEndpoint:
    """Tests for GET /api/v1/geocode."""

    async def test_geocode_short_query_rejected(self, client: AsyncClient) -> None:
        response = await client.get("/api/v1/geocode?q=a")
        assert response.status_code == 422

    async def test_geocode_valid_query_returns_list(self, client: AsyncClient) -> None:
        response = await client.get("/api/v1/geocode?q=Main+Street")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
