"""
API test suite for Phase 8 (City Intelligence & Analytics Endpoints).
"""

from datetime import UTC, datetime

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.database import Base, get_db
from app.main import app
from app.models.category import ComplaintCategory
from app.models.complaint import Complaint
from app.models.department import Department
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
async def seed_analytics_data(setup_db: AsyncSession) -> dict:
    """Seed test departments, categories, officers, and complaints."""
    d1 = Department(name="Roads Department", code="ROADS", default_sla_hours=48)
    d2 = Department(name="Sanitation Department", code="SANITATION", default_sla_hours=24)
    setup_db.add_all([d1, d2])
    await setup_db.flush()

    c1 = ComplaintCategory(name="Pothole", department_id=d1.id)
    c2 = ComplaintCategory(name="Garbage Dump", department_id=d2.id)
    setup_db.add_all([c1, c2])
    await setup_db.flush()

    officer1 = User(
        email="road_officer@city.gov",
        password_hash="fakehash",
        full_name="Road Officer",
        role=UserRole.MUNICIPAL_OFFICER,
        department_id=d1.id,
        is_active=True,
    )
    admin = User(
        email="admin@city.gov",
        password_hash="fakehash",
        full_name="City Admin",
        role=UserRole.ADMIN,
        is_active=True,
    )
    setup_db.add_all([officer1, admin])
    await setup_db.flush()

    now = datetime.now(tz=UTC)
    comp1 = Complaint(
        tracking_id="CP-testp8comp111111111111",
        raw_text="Pothole on Main Street",
        category_id=c1.id,
        department_id=d1.id,
        status=ComplaintStatus.REPORTED,
        priority=ComplaintPriority.HIGH,
        location_address="Main Street & 5th Ave",
        location_lat=40.7128,
        location_lng=-74.0060,
        sla_breached=False,
        created_at=now,
    )
    comp2 = Complaint(
        tracking_id="CP-testp8comp222222222222",
        raw_text="Uncollected trash on 2nd Street",
        category_id=c2.id,
        department_id=d2.id,
        status=ComplaintStatus.IN_PROGRESS,
        priority=ComplaintPriority.MEDIUM,
        location_address="2nd Street & Broadway",
        location_lat=40.7130,
        location_lng=-74.0065,
        sla_breached=False,
        created_at=now,
    )
    setup_db.add_all([comp1, comp2])
    await setup_db.commit()

    officer1_token = create_access_token(
        user_id=officer1.id, role=officer1.role.value, department_id=officer1.department_id
    )
    admin_token = create_access_token(user_id=admin.id, role=admin.role.value)

    return {
        "officer1_token": officer1_token,
        "admin_token": admin_token,
        "d1": d1,
        "d2": d2,
    }


class TestAnalyticsEndpoints:
    """Test cases for Phase 8 Analytics API."""

    async def test_unauthenticated_analytics_returns_401(self, client: AsyncClient) -> None:
        res = await client.get("/api/v1/analytics/summary")
        assert res.status_code == 401

    async def test_admin_gets_global_summary(self, client: AsyncClient, seed_analytics_data: dict) -> None:
        token = seed_analytics_data["admin_token"]
        res = await client.get(
            "/api/v1/analytics/summary",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["total_complaints"] == 2
        assert len(data["departments"]) == 2

    async def test_officer_gets_scoped_summary(self, client: AsyncClient, seed_analytics_data: dict) -> None:
        token = seed_analytics_data["officer1_token"]
        res = await client.get(
            "/api/v1/analytics/summary",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["total_complaints"] == 1
        assert len(data["departments"]) == 1
        assert data["departments"][0]["department_name"] == "Roads Department"

    async def test_analytics_trends(self, client: AsyncClient, seed_analytics_data: dict) -> None:
        token = seed_analytics_data["admin_token"]
        res = await client.get(
            "/api/v1/analytics/trends?days=30",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert res.status_code == 200
        trends = res.json()
        assert isinstance(trends, list)
        assert len(trends) >= 1

    async def test_analytics_hotspots(self, client: AsyncClient, seed_analytics_data: dict) -> None:
        token = seed_analytics_data["admin_token"]
        res = await client.get(
            "/api/v1/analytics/hotspots",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert res.status_code == 200
        hotspots = res.json()
        assert isinstance(hotspots, list)
        assert len(hotspots) == 2
