"""
Department-Scoped RBAC Test Suite.

Proves (per requirements PART 21):
  1.  Admin queue can access all authorized departments.
  2.  Admin department filter works correctly.
  3.  Roads officer queue contains only Roads complaints.
  4.  Water officer queue contains only Water complaints.
  5.  Roads officer cannot retrieve Water complaint detail (403).
  6.  Water officer cannot retrieve Roads complaint detail (403).
  7.  Roads officer cannot bypass scope using department query param.
  8.  Water officer cannot bypass scope using department query param.
  9.  Assignment options respect department (cross-department assignment rejected).
  10. Officer analytics summary is department-scoped.
  11. Admin analytics remain city-wide.
  12. Channel Simulator remains admin-only (403 for officer, 401 for anon).
  13. Public tracking remains unaffected.
  14. Terminal complaint status prevents further transitions.
  15. Public privacy boundary excludes internal fields.
"""

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.database import Base, get_db
from app.main import app
from app.models.complaint import Complaint
from app.models.department import Department
from app.models.user import User
from app.routers.v1.complaints import limiter
from app.schemas.enums import ComplaintPriority, ComplaintStatus, UserRole
from app.security.auth import create_access_token
from app.utils.tracking import generate_tracking_id

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
    """
    Seed two departments (Roads, Water), one admin, two officers, and
    one complaint per department.
    """
    roads_dept = Department(
        name="Roads & Infrastructure",
        code="ROADS",
        description="Road and infrastructure complaints",
        default_sla_hours=48,
    )
    water_dept = Department(
        name="Water & Sanitation",
        code="WATER",
        description="Water and sanitation complaints",
        default_sla_hours=24,
    )
    setup_db.add_all([roads_dept, water_dept])
    await setup_db.flush()

    admin = User(
        email="admin@civicpulse.gov",
        password_hash="hashed",
        full_name="City Administrator",
        role=UserRole.ADMIN,
        is_active=True,
    )
    roads_officer = User(
        email="roads@civicpulse.gov",
        password_hash="hashed",
        full_name="Roads Officer",
        role=UserRole.MUNICIPAL_OFFICER,
        department_id=roads_dept.id,
        is_active=True,
    )
    water_officer = User(
        email="water@civicpulse.gov",
        password_hash="hashed",
        full_name="Water Officer",
        role=UserRole.MUNICIPAL_OFFICER,
        department_id=water_dept.id,
        is_active=True,
    )
    setup_db.add_all([admin, roads_officer, water_officer])
    await setup_db.flush()

    roads_complaint = Complaint(
        tracking_id=generate_tracking_id(),
        raw_text="Large pothole blocking the road near Bailey Road.",
        title="Pothole — Bailey Road",
        department_id=roads_dept.id,
        status=ComplaintStatus.REPORTED,
        priority=ComplaintPriority.HIGH,
    )
    water_complaint = Complaint(
        tracking_id=generate_tracking_id(),
        raw_text="Water main burst on Central Avenue causing flooding.",
        title="Water Main Burst — Central Ave",
        department_id=water_dept.id,
        status=ComplaintStatus.REPORTED,
        priority=ComplaintPriority.CRITICAL,
    )
    setup_db.add_all([roads_complaint, water_complaint])
    await setup_db.commit()

    admin_token = create_access_token(user_id=admin.id, role=admin.role.value)
    roads_token = create_access_token(
        user_id=roads_officer.id,
        role=roads_officer.role.value,
        department_id=roads_officer.department_id,
    )
    water_token = create_access_token(
        user_id=water_officer.id,
        role=water_officer.role.value,
        department_id=water_officer.department_id,
    )

    return {
        "admin_token": admin_token,
        "roads_token": roads_token,
        "water_token": water_token,
        "admin": admin,
        "roads_officer": roads_officer,
        "water_officer": water_officer,
        "roads_dept": roads_dept,
        "water_dept": water_dept,
        "roads_complaint": roads_complaint,
        "water_complaint": water_complaint,
    }


class TestDepartmentRBACQueue:
    """Part 21: Tests 1-8 -- Queue scoping and bypass prevention."""

    async def test_1_admin_queue_sees_all_departments(
        self, client: AsyncClient, seed_data: dict
    ) -> None:
        """Test 1: Admin receives complaints from all departments."""
        res = await client.get(
            "/api/v1/complaints",
            headers={"Authorization": f"Bearer {seed_data['admin_token']}"},
        )
        assert res.status_code == 200
        ids = {c["id"] for c in res.json()}
        assert str(seed_data["roads_complaint"].id) in ids
        assert str(seed_data["water_complaint"].id) in ids

    async def test_2_admin_department_filter_works(
        self, client: AsyncClient, seed_data: dict
    ) -> None:
        """Test 2: Admin can filter queue by a specific department."""
        roads_dept_id = str(seed_data["roads_dept"].id)
        res = await client.get(
            f"/api/v1/complaints?department_id={roads_dept_id}",
            headers={"Authorization": f"Bearer {seed_data['admin_token']}"},
        )
        assert res.status_code == 200
        data = res.json()
        assert len(data) == 1
        assert data[0]["id"] == str(seed_data["roads_complaint"].id)

    async def test_3_roads_officer_queue_contains_only_roads(
        self, client: AsyncClient, seed_data: dict
    ) -> None:
        """Test 3: Roads officer receives only Roads department complaints."""
        res = await client.get(
            "/api/v1/complaints",
            headers={"Authorization": f"Bearer {seed_data['roads_token']}"},
        )
        assert res.status_code == 200
        data = res.json()
        assert len(data) == 1
        assert data[0]["id"] == str(seed_data["roads_complaint"].id)

    async def test_4_water_officer_queue_contains_only_water(
        self, client: AsyncClient, seed_data: dict
    ) -> None:
        """Test 4: Water officer receives only Water department complaints."""
        res = await client.get(
            "/api/v1/complaints",
            headers={"Authorization": f"Bearer {seed_data['water_token']}"},
        )
        assert res.status_code == 200
        data = res.json()
        assert len(data) == 1
        assert data[0]["id"] == str(seed_data["water_complaint"].id)

    async def test_7_roads_officer_cannot_bypass_with_dept_param(
        self, client: AsyncClient, seed_data: dict
    ) -> None:
        """Test 7: Roads officer sending water dept_id param still only sees Roads."""
        water_dept_id = str(seed_data["water_dept"].id)
        res = await client.get(
            f"/api/v1/complaints?department_id={water_dept_id}",
            headers={"Authorization": f"Bearer {seed_data['roads_token']}"},
        )
        assert res.status_code == 200
        data = res.json()
        # Backend must ignore the department_id param for officers and scope by their own dept
        assert all(
            c["department_id"] == str(seed_data["roads_dept"].id) for c in data
        )
        # Water complaint must NOT appear
        assert str(seed_data["water_complaint"].id) not in {c["id"] for c in data}

    async def test_8_water_officer_cannot_bypass_with_dept_param(
        self, client: AsyncClient, seed_data: dict
    ) -> None:
        """Test 8: Water officer sending roads dept_id param still only sees Water."""
        roads_dept_id = str(seed_data["roads_dept"].id)
        res = await client.get(
            f"/api/v1/complaints?department_id={roads_dept_id}",
            headers={"Authorization": f"Bearer {seed_data['water_token']}"},
        )
        assert res.status_code == 200
        data = res.json()
        assert all(
            c["department_id"] == str(seed_data["water_dept"].id) for c in data
        )
        assert str(seed_data["roads_complaint"].id) not in {c["id"] for c in data}


class TestDepartmentRBACDetail:
    """Part 21: Tests 5-6 -- Complaint detail cross-department denial."""

    async def test_5_roads_officer_cannot_view_water_complaint(
        self, client: AsyncClient, seed_data: dict
    ) -> None:
        """Test 5: Roads officer gets 403 when fetching a Water complaint by ID."""
        water_id = str(seed_data["water_complaint"].id)
        res = await client.get(
            f"/api/v1/complaints/{water_id}",
            headers={"Authorization": f"Bearer {seed_data['roads_token']}"},
        )
        assert res.status_code == 403
        assert "department" in res.json()["detail"].lower()

    async def test_6_water_officer_cannot_view_roads_complaint(
        self, client: AsyncClient, seed_data: dict
    ) -> None:
        """Test 6: Water officer gets 403 when fetching a Roads complaint by ID."""
        roads_id = str(seed_data["roads_complaint"].id)
        res = await client.get(
            f"/api/v1/complaints/{roads_id}",
            headers={"Authorization": f"Bearer {seed_data['water_token']}"},
        )
        assert res.status_code == 403
        assert "department" in res.json()["detail"].lower()

    async def test_roads_officer_can_view_own_complaint(
        self, client: AsyncClient, seed_data: dict
    ) -> None:
        """Roads officer can view their own department complaint."""
        roads_id = str(seed_data["roads_complaint"].id)
        res = await client.get(
            f"/api/v1/complaints/{roads_id}",
            headers={"Authorization": f"Bearer {seed_data['roads_token']}"},
        )
        assert res.status_code == 200
        assert res.json()["id"] == roads_id

    async def test_water_officer_can_view_own_complaint(
        self, client: AsyncClient, seed_data: dict
    ) -> None:
        """Water officer can view their own department complaint."""
        water_id = str(seed_data["water_complaint"].id)
        res = await client.get(
            f"/api/v1/complaints/{water_id}",
            headers={"Authorization": f"Bearer {seed_data['water_token']}"},
        )
        assert res.status_code == 200
        assert res.json()["id"] == water_id

    async def test_admin_can_view_any_complaint(
        self, client: AsyncClient, seed_data: dict
    ) -> None:
        """Admin can view complaints from both departments."""
        for complaint in [seed_data["roads_complaint"], seed_data["water_complaint"]]:
            res = await client.get(
                f"/api/v1/complaints/{complaint.id}",
                headers={"Authorization": f"Bearer {seed_data['admin_token']}"},
            )
            assert res.status_code == 200


class TestDepartmentRBACAssignment:
    """Part 21: Test 9 — Assignment options respect department."""

    async def test_9_cross_department_assignment_rejected(
        self, client: AsyncClient, seed_data: dict
    ) -> None:
        """Test 9: Assigning a Water officer to a Roads complaint is rejected."""
        roads_id = str(seed_data["roads_complaint"].id)
        water_officer_id = str(seed_data["water_officer"].id)

        res = await client.post(
            f"/api/v1/complaints/{roads_id}/assign",
            json={"officer_id": water_officer_id},
            headers={"Authorization": f"Bearer {seed_data['roads_token']}"},
        )
        assert res.status_code == 400
        assert "department" in res.json()["detail"].lower()


class TestDepartmentRBACAnalytics:
    """Part 21: Tests 10-11 -- Analytics department scoping."""

    async def test_10_officer_analytics_are_department_scoped(
        self, client: AsyncClient, seed_data: dict
    ) -> None:
        """Test 10: Roads officer analytics reflects only Roads department data."""
        res = await client.get(
            "/api/v1/analytics/summary",
            headers={"Authorization": f"Bearer {seed_data['roads_token']}"},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["total_complaints"] == 1
        assert len(data["departments"]) == 1
        assert "Roads" in data["departments"][0]["department_name"]

    async def test_11_admin_analytics_remain_city_wide(
        self, client: AsyncClient, seed_data: dict
    ) -> None:
        """Test 11: Admin analytics reflects all departments."""
        res = await client.get(
            "/api/v1/analytics/summary",
            headers={"Authorization": f"Bearer {seed_data['admin_token']}"},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["total_complaints"] == 2
        assert len(data["departments"]) == 2


class TestChannelSimulatorAccess:
    """Part 21: Test 12 — Channel Simulator admin-only."""

    async def test_12_admin_can_submit_demo_intake(
        self, client: AsyncClient, seed_data: dict
    ) -> None:
        """Test 12a: Admin can submit via channel simulator."""
        res = await client.post(
            "/api/v1/complaints/demo-intake",
            json={
                "source": "whatsapp_demo",
                "raw_text": "Test admin channel simulator access with valid complaint text.",
            },
            headers={"Authorization": f"Bearer {seed_data['admin_token']}"},
        )
        assert res.status_code == 201

    async def test_12_officer_cannot_submit_demo_intake(
        self, client: AsyncClient, seed_data: dict
    ) -> None:
        """Test 12b: Municipal officer receives 403 from channel simulator."""
        res = await client.post(
            "/api/v1/complaints/demo-intake",
            json={
                "source": "whatsapp_demo",
                "raw_text": "Officer attempting to use admin-only simulator.",
            },
            headers={"Authorization": f"Bearer {seed_data['roads_token']}"},
        )
        assert res.status_code == 403

    async def test_12_anonymous_cannot_submit_demo_intake(
        self, client: AsyncClient, seed_data: dict
    ) -> None:
        """Test 12c: Unauthenticated request returns 401."""
        res = await client.post(
            "/api/v1/complaints/demo-intake",
            json={
                "source": "whatsapp_demo",
                "raw_text": "Anonymous attempt to use admin-only simulator.",
            },
        )
        assert res.status_code == 401


class TestPublicPrivacyBoundary:
    """Part 21: Tests 13 & 15 — Public tracker and privacy boundary."""

    async def test_13_public_tracking_unaffected(
        self, client: AsyncClient, seed_data: dict
    ) -> None:
        """Test 13: Public tracker returns data without authentication."""
        tracking_id = seed_data["roads_complaint"].tracking_id
        res = await client.get(f"/api/v1/complaints/track/{tracking_id}")
        assert res.status_code == 200
        data = res.json()
        assert data["tracking_id"] == tracking_id
        assert data["status"] is not None

    async def test_15_public_tracker_excludes_internal_fields(
        self, client: AsyncClient, seed_data: dict
    ) -> None:
        """Test 15: Public tracker never exposes internal/PII fields."""
        tracking_id = seed_data["roads_complaint"].tracking_id
        res = await client.get(f"/api/v1/complaints/track/{tracking_id}")
        assert res.status_code == 200
        data = res.json()
        forbidden_fields = [
            "source",
            "submitter_name",
            "submitter_contact",
            "assigned_to",
            "raw_text",
            "ai_classification_raw",
        ]
        for field in forbidden_fields:
            assert field not in data, f"Protected field '{field}' leaked in public tracker"


class TestTerminalStatusRBAC:
    """Part 21: Test 14 — Terminal complaint status blocks transitions."""

    async def test_14_rejected_complaint_cannot_transition(
        self, client: AsyncClient, setup_db: AsyncSession, seed_data: dict
    ) -> None:
        """Test 14: REJECTED complaint cannot be transitioned to any new status."""
        # Set roads complaint to rejected first via a valid transition chain
        roads_id = str(seed_data["roads_complaint"].id)
        # Transition: reported -> rejected
        res = await client.patch(
            f"/api/v1/complaints/{roads_id}/status",
            json={"to_status": "rejected", "note": "Outside jurisdiction"},
            headers={"Authorization": f"Bearer {seed_data['roads_token']}"},
        )
        assert res.status_code == 200
        assert res.json()["status"] == "rejected"

        # Attempt further transition from rejected — must be rejected
        res2 = await client.patch(
            f"/api/v1/complaints/{roads_id}/status",
            json={"to_status": "in_progress", "note": "Attempting invalid transition"},
            headers={"Authorization": f"Bearer {seed_data['roads_token']}"},
        )
        assert res2.status_code == 400
