"""
End-to-End Integration Flow Test Suite (Phase 10).

Validates complete civic lifecycle:
    Anonymous Submission -> Citizen Tracking (REPORTED) -> Officer Inspection ->
    Officer Assignment (ASSIGNED) -> Work Progression (IN_PROGRESS -> RESOLVED) ->
    Internal Staff Comments -> Citizen Tracking Reflection (RESOLVED) -> KPI Updates
"""


import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.database import Base, get_db
from app.main import app
from app.models.category import ComplaintCategory
from app.models.department import Department
from app.models.user import User
from app.routers.v1.complaints import limiter
from app.schemas.enums import UserRole
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
async def seed_e2e_data(setup_db: AsyncSession) -> dict:
    """Seed department, category, and officer user."""
    dept = Department(name="Roads & Public Works", code="ROADS", default_sla_hours=48)
    setup_db.add(dept)
    await setup_db.flush()

    category = ComplaintCategory(name="Pothole Repair", department_id=dept.id)
    setup_db.add(category)
    await setup_db.flush()

    officer = User(
        email="officer@city.gov",
        password_hash="fakehash",
        full_name="Jane Officer",
        role=UserRole.ADMIN,
        department_id=dept.id,
        is_active=True,
    )
    setup_db.add(officer)
    await setup_db.commit()

    officer_token = create_access_token(
        user_id=officer.id, role=officer.role.value, department_id=officer.department_id
    )

    return {
        "dept": dept,
        "category": category,
        "officer": officer,
        "officer_token": officer_token,
    }


class TestEndToEndLifecycleFlow:
    """Complete end-to-end integration flow from submission to resolution."""

    async def test_complete_civic_complaint_lifecycle(
        self, client: AsyncClient, seed_e2e_data: dict
    ) -> None:
        officer_token = seed_e2e_data["officer_token"]
        officer = seed_e2e_data["officer"]

        # Step 1: Anonymous citizen submits a complaint
        submit_res = await client.post(
            "/api/v1/complaints",
            json={
                "raw_text": "Hazardous deep pothole on Main Street near 5th Avenue causing traffic congestion.",
                "submitter_name": "Jane Citizen",
                "submitter_contact": "jane@citizen.org",
                "location_text": "Main Street & 5th Avenue",
            },
        )
        assert submit_res.status_code == 201
        submit_data = submit_res.json()

        tracking_id = submit_data["tracking_id"]
        assert tracking_id.startswith("CP-")
        assert len(tracking_id) == 25

        # Step 2: Citizen tracks initial complaint status (REPORTED)
        track_initial = await client.get(f"/api/v1/complaints/track/{tracking_id}")
        assert track_initial.status_code == 200
        track_data = track_initial.json()
        assert track_data["status"] == "reported"
        # Verify public DTO boundary excludes PII and internal fields
        assert "submitter_name" not in track_data
        assert "submitter_contact" not in track_data
        assert "assigned_to" not in track_data

        # Step 3: Officer views staff complaint queue
        queue_res = await client.get(
            "/api/v1/complaints",
            headers={"Authorization": f"Bearer {officer_token}"},
        )
        assert queue_res.status_code == 200
        queue = queue_res.json()
        assert len(queue) == 1
        complaint_id = queue[0]["id"]

        # Step 4: Officer inspects full complaint detail including submitter info
        detail_res = await client.get(
            f"/api/v1/complaints/{complaint_id}",
            headers={"Authorization": f"Bearer {officer_token}"},
        )
        assert detail_res.status_code == 200
        detail = detail_res.json()
        assert detail["submitter_name"] == "Jane Citizen"
        assert detail["submitter_contact"] == "jane@citizen.org"

        # Step 5: Officer assigns self to complaint -> Status becomes ASSIGNED
        assign_res = await client.post(
            f"/api/v1/complaints/{complaint_id}/assign",
            json={"officer_id": str(officer.id)},
            headers={"Authorization": f"Bearer {officer_token}"},
        )
        assert assign_res.status_code == 200
        assert assign_res.json()["status"] == "assigned"
        assert assign_res.json()["assigned_to"] == str(officer.id)

        # Step 6: Officer transitions status to IN_PROGRESS
        prog_res = await client.patch(
            f"/api/v1/complaints/{complaint_id}/status",
            json={"to_status": "in_progress", "notes": "Repair crew dispatched."},
            headers={"Authorization": f"Bearer {officer_token}"},
        )
        assert prog_res.status_code == 200
        assert prog_res.json()["status"] == "in_progress"

        # Step 7: Officer posts internal staff comment
        comment_res = await client.post(
            f"/api/v1/complaints/{complaint_id}/comments",
            json={"content": "Asphalt patch applied to pothole at 10:00 AM."},
            headers={"Authorization": f"Bearer {officer_token}"},
        )
        assert comment_res.status_code == 201
        assert comment_res.json()["is_internal"] is True

        # Step 8: Officer resolves complaint -> Status becomes RESOLVED
        resolve_res = await client.patch(
            f"/api/v1/complaints/{complaint_id}/status",
            json={"to_status": "resolved", "notes": "Pothole filled and road repaved."},
            headers={"Authorization": f"Bearer {officer_token}"},
        )
        assert resolve_res.status_code == 200
        assert resolve_res.json()["status"] == "resolved"
        assert resolve_res.json()["resolved_at"] is not None

        # Step 9: Citizen tracks final complaint status -> Reflects RESOLVED
        track_final = await client.get(f"/api/v1/complaints/track/{tracking_id}")
        assert track_final.status_code == 200
        final_data = track_final.json()
        assert final_data["status"] == "resolved"
        # Public tracking still strictly excludes internal staff notes & assigned officer
        assert "comments" not in final_data
        assert "assigned_to" not in final_data
        assert "Jane Citizen" not in str(final_data)

        # Step 10: Operational KPIs update correctly
        kpi_res = await client.get(
            "/api/v1/complaints/kpi",
            headers={"Authorization": f"Bearer {officer_token}"},
        )
        assert kpi_res.status_code == 200
        kpis = kpi_res.json()
        assert kpis["total_complaints"] == 1
        assert kpis["resolved_complaints"] == 1
        assert kpis["in_progress_complaints"] == 0
