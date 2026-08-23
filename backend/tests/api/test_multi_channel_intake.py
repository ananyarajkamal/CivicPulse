"""
Phase 2 Automated Test Suite: Multi-Channel Intake Foundation.

Verifies:
  1. Web Portal intake defaults source to 'web'
  2. Anonymous source spoofing attempt is safely overridden to 'web'
  3. Authenticated staff demo intake for whatsapp_demo, social_demo, municipal_demo
  4. Demo intake passes through full 6-agent pipeline (tracking_id, classification, priority, routing, SLA)
  5. Invalid source values are rejected
  6. Unauthenticated demo intake attempts return 401
  7. Staff queue/detail endpoints expose source field
  8. Public tracker strictly excludes internal source metadata
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
async def seed_data(setup_db: AsyncSession) -> dict:
    """Seed test department, category, and staff officer."""
    dept = Department(name="Roads & Infrastructure", code="ROADS", default_sla_hours=48)
    setup_db.add(dept)
    await setup_db.flush()

    cat = ComplaintCategory(name="Pothole Damage", department_id=dept.id)
    setup_db.add(cat)
    await setup_db.flush()

    officer = User(
        email="officer@city.gov",
        password_hash="fakehash",
        full_name="Municipal Admin",
        role=UserRole.ADMIN,
        department_id=dept.id,
        is_active=True,
    )
    setup_db.add(officer)
    await setup_db.commit()

    token = create_access_token(
        user_id=officer.id, role=officer.role.value, department_id=officer.department_id
    )

    return {
        "dept": dept,
        "cat": cat,
        "officer": officer,
        "token": token,
    }


class TestMultiChannelIntakeFoundation:
    """Test suite verifying backend multi-channel intake capabilities and safety."""

    async def test_web_portal_complaint_defaults_source_to_web(
        self, client: AsyncClient, seed_data: dict
    ) -> None:
        """Test A: Standard anonymous web intake persists source = 'web'."""
        token = seed_data["token"]
        res = await client.post(
            "/api/v1/complaints",
            json={
                "raw_text": "Large deep pothole on Main Street near 4th avenue.",
                "location_text": "Main Street & 4th Ave",
            },
        )
        assert res.status_code == 201
        data = res.json()
        tracking_id = data["tracking_id"]

        # Fetch detail as officer and verify source is 'web'
        q_res = await client.get(
            "/api/v1/complaints",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert q_res.status_code == 200
        queue = q_res.json()
        matched = [c for c in queue if c["tracking_id"] == tracking_id]
        assert len(matched) == 1
        assert matched[0]["source"] == "web"

    async def test_anonymous_source_spoofing_prevented(
        self, client: AsyncClient, seed_data: dict
    ) -> None:
        """Test B: Anonymous client passing source = 'municipal_demo' is overridden to 'web'."""
        token = seed_data["token"]
        res = await client.post(
            "/api/v1/complaints",
            json={
                "raw_text": "Attempting to spoof intake source from public endpoint.",
                "source": "municipal_demo",
            },
        )
        assert res.status_code == 201
        tracking_id = res.json()["tracking_id"]

        # Verify backend forced source to 'web'
        q_res = await client.get(
            "/api/v1/complaints",
            headers={"Authorization": f"Bearer {token}"},
        )
        queue = q_res.json()
        matched = [c for c in queue if c["tracking_id"] == tracking_id]
        assert len(matched) == 1
        assert matched[0]["source"] == "web"

    async def test_authenticated_whatsapp_demo_intake(
        self, client: AsyncClient, seed_data: dict
    ) -> None:
        """Test C: Authenticated staff WhatsApp demo intake executes 6-agent pipeline."""
        token = seed_data["token"]
        res = await client.post(
            "/api/v1/complaints/demo-intake",
            json={
                "source": "whatsapp_demo",
                "raw_text": "Huge pothole near Boring Road crossing. Two bikes almost fell today.",
                "location_text": "Boring Road, Patna",
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        assert res.status_code == 201
        data = res.json()
        assert data["source"] == "whatsapp_demo"
        assert data["tracking_id"].startswith("CP-")
        assert data["status"] == "reported"
        assert data["priority"] in ("low", "medium", "high", "critical")
        assert data["sla_deadline"] is not None

    async def test_authenticated_social_demo_intake(
        self, client: AsyncClient, seed_data: dict
    ) -> None:
        """Test D: Authenticated staff Social Media demo intake."""
        token = seed_data["token"]
        res = await client.post(
            "/api/v1/complaints/demo-intake",
            json={
                "source": "social_demo",
                "raw_text": "Streetlights are completely off in Ward 12 park area.",
                "location_text": "Ward 12 Park",
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        assert res.status_code == 201
        assert res.json()["source"] == "social_demo"

    async def test_authenticated_municipal_demo_intake(
        self, client: AsyncClient, seed_data: dict
    ) -> None:
        """Test E: Authenticated staff Municipal Portal demo intake."""
        token = seed_data["token"]
        res = await client.post(
            "/api/v1/complaints/demo-intake",
            json={
                "source": "municipal_demo",
                "raw_text": "Water pipeline leakage flooding the main boulevard.",
                "location_text": "Main Boulevard",
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        assert res.status_code == 201
        assert res.json()["source"] == "municipal_demo"

    async def test_invalid_source_rejected(
        self, client: AsyncClient, seed_data: dict
    ) -> None:
        """Test F: Invalid channel source returns 400/422 validation error."""
        token = seed_data["token"]
        res = await client.post(
            "/api/v1/complaints/demo-intake",
            json={
                "source": "invalid_channel_name",
                "raw_text": "Testing invalid channel name rejection.",
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        assert res.status_code in (400, 422)

    async def test_unauthenticated_demo_intake_rejected(
        self, client: AsyncClient
    ) -> None:
        """Test G: Unauthenticated demo intake call returns 401 Unauthorized."""
        res = await client.post(
            "/api/v1/complaints/demo-intake",
            json={
                "source": "whatsapp_demo",
                "raw_text": "Unauthenticated attempt to post demo complaint.",
            },
        )
        assert res.status_code == 401

    async def test_municipal_officer_demo_intake_forbidden(
        self, client: AsyncClient, setup_db: AsyncSession
    ) -> None:
        """Test H: Municipal officer calling demo intake receives 403 Forbidden."""
        officer = User(
            email="officer_no_admin@city.gov",
            password_hash="fakehash",
            full_name="Municipal Officer",
            role=UserRole.MUNICIPAL_OFFICER,
            is_active=True,
        )
        setup_db.add(officer)
        await setup_db.commit()

        token = create_access_token(
            user_id=str(officer.id), role=officer.role.value, department_id=str(officer.department_id) if officer.department_id else None
        )

        res = await client.post(
            "/api/v1/complaints/demo-intake",
            json={
                "source": "whatsapp_demo",
                "raw_text": "Municipal officer attempt to post demo complaint.",
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        assert res.status_code == 403

    async def test_public_tracker_excludes_source_metadata(
        self, client: AsyncClient, seed_data: dict
    ) -> None:
        """Test J: Public tracking boundary excludes internal source metadata."""
        token = seed_data["token"]
        res = await client.post(
            "/api/v1/complaints/demo-intake",
            json={
                "source": "whatsapp_demo",
                "raw_text": "Private channel complaint test for public boundary.",
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        tracking_id = res.json()["tracking_id"]

        track_res = await client.get(f"/api/v1/complaints/track/{tracking_id}")
        assert track_res.status_code == 200
        track_data = track_res.json()
        assert "source" not in track_data
