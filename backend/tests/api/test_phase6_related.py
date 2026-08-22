"""
API test suite for Phase 6 (Duplicate & Related Complaint Intelligence Endpoint).
"""

import uuid
from datetime import UTC, datetime

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.database import Base, get_db
from app.main import app
from app.models.category import ComplaintCategory
from app.models.complaint import Complaint
from app.models.department import Department
from app.models.related_complaint import RelatedComplaint
from app.models.user import User
from app.routers.v1.complaints import limiter
from app.schemas.enums import ComplaintPriority, ComplaintStatus, UserRole
from app.security.auth import create_access_token

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


@pytest.fixture(autouse=True)
def disable_limiter() -> None:
    """Disable rate limiter for tests."""
    limiter.enabled = False
    yield
    limiter.enabled = True


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
async def seed_data(setup_db: AsyncSession) -> dict:
    """Seed departments, officers, complaints, and related link."""
    d1 = Department(name="Roads Department", code="ROADS", default_sla_hours=48)
    d2 = Department(name="Water Department", code="WATER", default_sla_hours=24)
    setup_db.add_all([d1, d2])
    await setup_db.flush()

    c1 = ComplaintCategory(name="Pothole", department_id=d1.id)
    setup_db.add(c1)
    await setup_db.flush()

    officer1 = User(
        email="officer1@city.gov",
        password_hash="fakehash",
        full_name="Road Officer",
        role=UserRole.MUNICIPAL_OFFICER,
        department_id=d1.id,
    )
    admin = User(
        email="admin@city.gov",
        password_hash="fakehash",
        full_name="City Admin",
        role=UserRole.ADMIN,
    )
    setup_db.add_all([officer1, admin])
    await setup_db.flush()

    now = datetime.now(tz=UTC)
    comp1 = Complaint(
        tracking_id="CP-testp6comp111111111111",
        raw_text="Pothole on Main Street",
        category_id=c1.id,
        department_id=d1.id,
        status=ComplaintStatus.REPORTED,
        priority=ComplaintPriority.HIGH,
        created_at=now,
    )
    comp2 = Complaint(
        tracking_id="CP-testp6comp222222222222",
        raw_text="Pothole near 2nd Street",
        category_id=c1.id,
        department_id=d1.id,
        status=ComplaintStatus.REPORTED,
        priority=ComplaintPriority.HIGH,
        created_at=now,
    )
    setup_db.add_all([comp1, comp2])
    await setup_db.flush()

    rel = RelatedComplaint(
        complaint_id=comp1.id,
        related_id=comp2.id,
        similarity_score=0.92,
        detection_method="location_category",
    )
    setup_db.add(rel)
    await setup_db.commit()

    officer1_token = create_access_token(
        user_id=officer1.id, role=officer1.role.value, department_id=officer1.department_id
    )
    admin_token = create_access_token(
        user_id=admin.id, role=admin.role.value
    )

    return {
        "d1": d1,
        "d2": d2,
        "comp1": comp1,
        "comp2": comp2,
        "officer1_token": officer1_token,
        "admin_token": admin_token,
    }


class TestRelatedComplaintsEndpoint:
    """Test cases for GET /api/v1/complaints/{id}/related endpoint."""

    async def test_unauthenticated_request_returns_401(
        self, client: AsyncClient, seed_data: dict
    ) -> None:
        c1 = seed_data["comp1"]
        response = await client.get(f"/api/v1/complaints/{c1.id}/related")
        assert response.status_code == 401

    async def test_authorized_officer_fetches_related(
        self, client: AsyncClient, seed_data: dict
    ) -> None:
        c1 = seed_data["comp1"]
        c2 = seed_data["comp2"]
        token = seed_data["officer1_token"]

        response = await client.get(
            f"/api/v1/complaints/{c1.id}/related",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["complaint_id"] == str(c1.id)
        assert data[0]["related_id"] == str(c2.id)
        assert data[0]["related_tracking_id"] == c2.tracking_id
        assert data[0]["similarity_score"] == 0.92
        assert data[0]["detection_method"] == "location_category"

    async def test_nonexistent_complaint_returns_404(
        self, client: AsyncClient, seed_data: dict
    ) -> None:
        token = seed_data["admin_token"]
        fake_id = uuid.uuid4()

        response = await client.get(
            f"/api/v1/complaints/{fake_id}/related",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 404
