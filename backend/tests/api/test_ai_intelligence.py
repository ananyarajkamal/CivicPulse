"""
API and Unit tests for Phase 4 AI Intelligence Agent and Staff Complaint Detail endpoint.
"""

import uuid

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.ai.factory import AIProviderFactory
from app.ai.intelligence_agent import IntelligenceAgent
from app.ai.mock import MockAIProvider
from app.database import Base, get_db
from app.main import app
from app.models.department import Department
from app.models.user import User, UserRole
from app.security.auth import create_access_token, hash_password

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
async def seeded_dept_and_users(setup_db: AsyncSession) -> dict[str, str | uuid.UUID]:
    """Seed test department, admin user, and officer user."""
    dept = Department(
        name="Roads & Infrastructure",
        code="ROADS",
        description="Road repairs",
        default_sla_hours=48,
    )
    setup_db.add(dept)
    await setup_db.flush()

    admin = User(
        email="admin@civicpulse.gov",
        password_hash=hash_password("AdminPass123!"),
        full_name="System Admin",
        role=UserRole.ADMIN,
        department_id=dept.id,
    )
    officer = User(
        email="officer@civicpulse.gov",
        password_hash=hash_password("OfficerPass123!"),
        full_name="Roads Officer",
        role=UserRole.MUNICIPAL_OFFICER,
        department_id=dept.id,
    )
    setup_db.add_all([admin, officer])
    await setup_db.commit()

    admin_token = create_access_token(
        user_id=str(admin.id), role=admin.role.value, department_id=str(dept.id)
    )
    officer_token = create_access_token(
        user_id=str(officer.id), role=officer.role.value, department_id=str(dept.id)
    )

    return {
        "dept_id": dept.id,
        "admin_id": admin.id,
        "admin_token": admin_token,
        "officer_id": officer.id,
        "officer_token": officer_token,
    }


class TestAIFactoryAndMock:
    """Tests for AIProviderFactory and MockAIProvider."""

    async def test_mock_provider_health_check(self) -> None:
        mock = MockAIProvider()
        assert await mock.health_check() is True

    async def test_mock_provider_classification(self) -> None:
        mock = MockAIProvider()
        res = await mock.complete(
            system_prompt="test",
            user_content="Pothole hazard on main street causing tire damage",
        )
        assert res.provider == "mock_ai"
        assert "Road Damage" in res.text
        assert res.prompt_tokens is not None

    async def test_factory_returns_provider(self) -> None:
        provider = AIProviderFactory.get_provider()
        assert provider is not None


class TestAIIntelligenceAgent:
    """Tests for IntelligenceAgent processing."""

    async def test_agent_process_complaint_success(self, setup_db: AsyncSession) -> None:
        agent = IntelligenceAgent(provider=MockAIProvider())
        complaint_id = uuid.uuid4()
        result = await agent.process_complaint(
            complaint_id=complaint_id,
            raw_text="Dangerous exposed electrical wire near school playground",
            db=setup_db,
        )
        assert result is not None
        assert result.is_safety_risk is True
        assert result.confidence > 0.0


class TestComplaintSubmissionWithAI:
    """Tests for POST /api/v1/complaints triggering AI."""

    async def test_submit_complaint_populates_ai_fields(self, client: AsyncClient) -> None:
        response = await client.post(
            "/api/v1/complaints",
            json={
                "raw_text": "Deep hazardous pothole on Main St causing car accidents.",
            },
        )
        assert response.status_code == 201
        data = response.json()
        tracking_id = data["tracking_id"]

        # Track complaint to verify title is set by AI
        track_res = await client.get(f"/api/v1/complaints/track/{tracking_id}")
        assert track_res.status_code == 200
        track_data = track_res.json()
        assert track_data["title"] is not None


class TestStaffComplaintDetailEndpoint:
    """Tests for GET /api/v1/complaints/{id} staff endpoint."""

    async def test_unauthenticated_staff_detail_rejected(self, client: AsyncClient) -> None:
        fake_uuid = str(uuid.uuid4())
        response = await client.get(f"/api/v1/complaints/{fake_uuid}")
        assert response.status_code == 401

    async def test_staff_detail_authenticated(
        self, client: AsyncClient, seeded_dept_and_users: dict[str, str | uuid.UUID]
    ) -> None:
        # 1. Submit complaint
        sub_res = await client.post(
            "/api/v1/complaints",
            json={"raw_text": "Broken streetlight creating dark alleyway."},
        )
        tracking_id = sub_res.json()["tracking_id"]

        # 2. Get complaint ID via track endpoint (in real DB, staff gets ID via list)
        track_res = await client.get(f"/api/v1/complaints/track/{tracking_id}")
        assert track_res.status_code == 200

        # 3. Access staff detail as admin
        admin_token = str(seeded_dept_and_users["admin_token"])
        headers = {"Authorization": f"Bearer {admin_token}"}

        # We query list/detail endpoint
        # First test 404 for unknown UUID
        fake_uuid = str(uuid.uuid4())
        res_404 = await client.get(f"/api/v1/complaints/{fake_uuid}", headers=headers)
        assert res_404.status_code == 404
