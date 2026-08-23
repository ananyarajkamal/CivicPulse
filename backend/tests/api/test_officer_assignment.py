"""
Tests for Officer Assignment API and Officer Listing Endpoint.
"""

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.database import Base, get_db
from app.main import app
from app.models.complaint import Complaint, ComplaintStatus
from app.models.department import Department
from app.models.user import User, UserRole
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
async def seed_data(
    setup_db: AsyncSession,
) -> dict[str, str | User | Department | Complaint]:
    """Seed test department, officers, and complaint."""
    dept = Department(
        name="Roads & Infrastructure",
        code="ROADS",
        description="Road repairs",
        default_sla_hours=48,
    )
    setup_db.add(dept)
    await setup_db.flush()

    admin = User(
        email="admin_test@civicpulse.gov",
        password_hash="hashed_pw",
        full_name="Admin Tester",
        role=UserRole.ADMIN,
        is_active=True,
    )
    officer1 = User(
        email="roads_officer1@civicpulse.gov",
        password_hash="hashed_pw",
        full_name="Roads Officer One",
        role=UserRole.MUNICIPAL_OFFICER,
        department_id=dept.id,
        is_active=True,
    )
    officer2 = User(
        email="roads_officer2@civicpulse.gov",
        password_hash="hashed_pw",
        full_name="Roads Officer Two",
        role=UserRole.MUNICIPAL_OFFICER,
        department_id=dept.id,
        is_active=True,
    )
    setup_db.add_all([admin, officer1, officer2])
    await setup_db.flush()

    complaint = Complaint(
        tracking_id="CP-test123456789012345678",
        raw_text="Test complaint text for officer assignment.",
        title="Test Road Issue",
        department_id=dept.id,
        status=ComplaintStatus.REPORTED,
    )
    setup_db.add(complaint)
    await setup_db.commit()

    admin_token = create_access_token(user_id=str(admin.id), role=admin.role.value)
    officer_token = create_access_token(
        user_id=str(officer1.id), role=officer1.role.value, department_id=str(dept.id)
    )

    return {
        "admin_headers": {"Authorization": f"Bearer {admin_token}"},
        "officer_headers": {"Authorization": f"Bearer {officer_token}"},
        "dept": dept,
        "admin": admin,
        "officer1": officer1,
        "officer2": officer2,
        "complaint": complaint,
    }


@pytest.mark.asyncio
async def test_get_officers_endpoint(
    client: AsyncClient,
    seed_data: dict,
) -> None:
    """Verify /api/v1/auth/officers returns active staff with safe fields."""
    response = await client.get(
        "/api/v1/auth/officers",
        headers=seed_data["admin_headers"],
    )
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 2

    for user in data:
        assert "id" in user
        assert "full_name" in user
        assert "email" in user
        assert "role" in user
        assert "department_id" in user
        assert "password_hash" not in user
        assert "token_hash" not in user


@pytest.mark.asyncio
async def test_get_officers_unauthenticated(
    client: AsyncClient,
) -> None:
    """Verify /api/v1/auth/officers requires authentication."""
    response = await client.get("/api/v1/auth/officers")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_assign_valid_officer_success(
    client: AsyncClient,
    setup_db: AsyncSession,
    seed_data: dict,
) -> None:
    """Verify assigning a valid same-department officer updates record and status."""
    complaint = seed_data["complaint"]
    target_officer = seed_data["officer2"]

    payload = {"officer_id": str(target_officer.id)}
    response = await client.post(
        f"/api/v1/complaints/{complaint.id}/assign",
        json=payload,
        headers=seed_data["officer_headers"],
    )
    assert response.status_code == 200
    data = response.json()

    assert data["assigned_to"] == str(target_officer.id)
    assert data["status"] == "assigned"


@pytest.mark.asyncio
async def test_assign_cross_department_officer_rejected(
    client: AsyncClient,
    setup_db: AsyncSession,
    seed_data: dict,
) -> None:
    """Verify assigning an officer from a different department is rejected."""
    complaint = seed_data["complaint"]

    # Create another officer in a different department
    other_dept = Department(name="Waste Management", code="WASTE", description="Waste")
    setup_db.add(other_dept)
    await setup_db.flush()

    other_officer = User(
        email="waste_officer@civicpulse.gov",
        password_hash="hashed_pw",
        full_name="Waste Officer",
        role=UserRole.MUNICIPAL_OFFICER,
        department_id=other_dept.id,
        is_active=True,
    )
    setup_db.add(other_officer)
    await setup_db.commit()

    payload = {"officer_id": str(other_officer.id)}
    response = await client.post(
        f"/api/v1/complaints/{complaint.id}/assign",
        json=payload,
        headers=seed_data["officer_headers"],
    )
    assert response.status_code == 400
    assert "different department" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_assign_inactive_officer_rejected(
    client: AsyncClient,
    setup_db: AsyncSession,
    seed_data: dict,
) -> None:
    """Verify assigning an inactive officer is rejected with 400 Bad Request."""
    complaint = seed_data["complaint"]
    dept = seed_data["dept"]

    inactive_officer = User(
        email="inactive_officer@civicpulse.gov",
        password_hash="hashed_pw",
        full_name="Inactive Officer",
        role=UserRole.MUNICIPAL_OFFICER,
        department_id=dept.id,
        is_active=False,
    )
    setup_db.add(inactive_officer)
    await setup_db.commit()

    payload = {"officer_id": str(inactive_officer.id)}
    response = await client.post(
        f"/api/v1/complaints/{complaint.id}/assign",
        json=payload,
        headers=seed_data["officer_headers"],
    )
    assert response.status_code == 400
    assert "inactive" in response.json()["detail"].lower()
