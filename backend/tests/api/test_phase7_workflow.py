"""
API test suite for Phase 7 (Status Workflow, Officer Assignment, Internal Comments, KPIs).
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
async def seed_data(setup_db: AsyncSession) -> dict:
    """Seed departments, officers, complaints, and tokens."""
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
        full_name="Road Officer 1",
        role=UserRole.MUNICIPAL_OFFICER,
        department_id=d1.id,
        is_active=True,
    )
    officer2 = User(
        email="officer2@city.gov",
        password_hash="fakehash",
        full_name="Water Officer 2",
        role=UserRole.MUNICIPAL_OFFICER,
        department_id=d2.id,
        is_active=True,
    )
    admin = User(
        email="admin@city.gov",
        password_hash="fakehash",
        full_name="City Admin",
        role=UserRole.ADMIN,
        is_active=True,
    )
    setup_db.add_all([officer1, officer2, admin])
    await setup_db.flush()

    now = datetime.now(tz=UTC)
    comp1 = Complaint(
        tracking_id="CP-testp7comp111111111111",
        raw_text="Pothole on Main Street",
        category_id=c1.id,
        department_id=d1.id,
        status=ComplaintStatus.REPORTED,
        priority=ComplaintPriority.HIGH,
        created_at=now,
    )
    setup_db.add(comp1)
    await setup_db.commit()

    officer1_token = create_access_token(
        user_id=officer1.id, role=officer1.role.value, department_id=officer1.department_id
    )
    officer2_token = create_access_token(
        user_id=officer2.id, role=officer2.role.value, department_id=officer2.department_id
    )
    admin_token = create_access_token(user_id=admin.id, role=admin.role.value)

    return {
        "d1": d1,
        "d2": d2,
        "c1": c1,
        "officer1": officer1,
        "officer2": officer2,
        "comp1": comp1,
        "officer1_token": officer1_token,
        "officer2_token": officer2_token,
        "admin_token": admin_token,
    }


class TestStatusWorkflow:
    """Test cases for complaint status transitions."""

    async def test_valid_status_transition(
        self, client: AsyncClient, seed_data: dict
    ) -> None:
        comp1 = seed_data["comp1"]
        token = seed_data["officer1_token"]

        # REPORTED -> IN_PROGRESS
        res = await client.patch(
            f"/api/v1/complaints/{comp1.id}/status",
            json={"to_status": "in_progress", "notes": "Starting inspection"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "in_progress"

    async def test_invalid_status_transition_rejected(
        self, client: AsyncClient, seed_data: dict
    ) -> None:
        comp1 = seed_data["comp1"]
        token = seed_data["officer1_token"]

        # First resolve
        await client.patch(
            f"/api/v1/complaints/{comp1.id}/status",
            json={"to_status": "resolved"},
            headers={"Authorization": f"Bearer {token}"},
        )

        # RESOLVED -> REPORTED (Illegal)
        res = await client.patch(
            f"/api/v1/complaints/{comp1.id}/status",
            json={"to_status": "reported"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert res.status_code == 400

    async def test_cross_department_status_update_forbidden(
        self, client: AsyncClient, seed_data: dict
    ) -> None:
        comp1 = seed_data["comp1"]
        officer2_token = seed_data["officer2_token"]

        res = await client.patch(
            f"/api/v1/complaints/{comp1.id}/status",
            json={"to_status": "in_progress"},
            headers={"Authorization": f"Bearer {officer2_token}"},
        )
        assert res.status_code == 403


class TestOfficerAssignment:
    """Test cases for officer assignment endpoint."""

    async def test_assign_officer_success(
        self, client: AsyncClient, seed_data: dict
    ) -> None:
        comp1 = seed_data["comp1"]
        officer1 = seed_data["officer1"]
        token = seed_data["officer1_token"]

        res = await client.post(
            f"/api/v1/complaints/{comp1.id}/assign",
            json={"officer_id": str(officer1.id)},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["assigned_to"] == str(officer1.id)
        assert data["status"] == "assigned"

    async def test_assign_cross_department_officer_rejected(
        self, client: AsyncClient, seed_data: dict
    ) -> None:
        comp1 = seed_data["comp1"]
        officer2 = seed_data["officer2"]
        token = seed_data["admin_token"]

        res = await client.post(
            f"/api/v1/complaints/{comp1.id}/assign",
            json={"officer_id": str(officer2.id)},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert res.status_code == 400


class TestInternalComments:
    """Test cases for internal staff comments."""

    async def test_create_and_fetch_internal_comments(
        self, client: AsyncClient, seed_data: dict
    ) -> None:
        comp1 = seed_data["comp1"]
        token = seed_data["officer1_token"]

        post_res = await client.post(
            f"/api/v1/complaints/{comp1.id}/comments",
            json={"content": "Inspection scheduled for tomorrow morning."},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert post_res.status_code == 201
        c_data = post_res.json()
        assert c_data["content"] == "Inspection scheduled for tomorrow morning."
        assert c_data["is_internal"] is True

        get_res = await client.get(
            f"/api/v1/complaints/{comp1.id}/comments",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert get_res.status_code == 200
        comments_list = get_res.json()
        assert len(comments_list) == 1
        assert comments_list[0]["content"] == "Inspection scheduled for tomorrow morning."

    async def test_public_tracking_does_not_expose_comments_or_assigned_officer(
        self, client: AsyncClient, seed_data: dict
    ) -> None:
        comp1 = seed_data["comp1"]
        token = seed_data["officer1_token"]

        # Assign and comment
        await client.post(
            f"/api/v1/complaints/{comp1.id}/assign",
            json={"officer_id": str(seed_data["officer1"].id)},
            headers={"Authorization": f"Bearer {token}"},
        )
        await client.post(
            f"/api/v1/complaints/{comp1.id}/comments",
            json={"content": "Top Secret Internal Comment"},
            headers={"Authorization": f"Bearer {token}"},
        )

        # Public tracking
        track_res = await client.get(f"/api/v1/complaints/track/{comp1.tracking_id}")
        assert track_res.status_code == 200
        data = track_res.json()

        assert "assigned_to" not in data
        assert "comments" not in data
        assert "Top Secret Internal Comment" not in str(data)


class TestKPIEndpoint:
    """Test cases for GET /api/v1/complaints/kpi endpoint."""

    async def test_get_kpis(self, client: AsyncClient, seed_data: dict) -> None:
        token = seed_data["officer1_token"]

        res = await client.get(
            "/api/v1/complaints/kpi",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert res.status_code == 200
        kpis = res.json()
        assert kpis["total_complaints"] == 1
        assert kpis["unassigned_complaints"] == 1
        assert kpis["in_progress_complaints"] == 0
        assert kpis["resolved_complaints"] == 0
