"""
Unit and API test suite for Phase 5 (Priority Scoring, Routing Agent, SLA Service, Duplicate Detection).
"""

from datetime import UTC, datetime, timedelta

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.database import Base, get_db
from app.main import app
from app.models.category import ComplaintCategory
from app.models.complaint import Complaint
from app.models.department import Department
from app.routers.v1.complaints import limiter
from app.schemas.enums import ComplaintPriority, ComplaintStatus
from app.services.duplicate_service import DuplicateService
from app.services.priority_agent import PriorityAgent
from app.services.routing_agent import RoutingAgent
from app.services.sla_service import SLAService

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
async def seed_dept_and_cat(
    setup_db: AsyncSession,
) -> tuple[Department, ComplaintCategory]:
    """Seed test department and category."""
    dept = Department(
        name="Water Supply & Sewerage",
        code="WATER",
        description="Water supply department",
        default_sla_hours=24,
    )
    setup_db.add(dept)
    await setup_db.flush()

    cat = ComplaintCategory(
        name="Water Leakage",
        department_id=dept.id,
        default_priority=ComplaintPriority.HIGH,
        default_sla_hours=12,
    )
    setup_db.add(cat)
    await setup_db.commit()
    await setup_db.refresh(dept)
    await setup_db.refresh(cat)
    return dept, cat


class TestPriorityAgent:
    """Unit tests for PriorityAgent deterministic scoring formula."""

    async def test_low_priority_score(self, setup_db: AsyncSession) -> None:
        agent = PriorityAgent()
        complaint = Complaint(
            tracking_id="CP-testlow12345678901234",
            raw_text="Minor tree leaves on curb.",
            is_safety_risk=False,
            status=ComplaintStatus.REPORTED,
        )
        score, prio = await agent.calculate_priority(
            complaint, setup_db, ai_severity="low"
        )
        assert score < 20
        assert prio == ComplaintPriority.LOW

    async def test_critical_priority_score(
        self,
        setup_db: AsyncSession,
        seed_dept_and_cat: tuple[Department, ComplaintCategory],
    ) -> None:
        _, cat = seed_dept_and_cat
        agent = PriorityAgent()
        complaint = Complaint(
            tracking_id="CP-testcrit1234567890123",
            raw_text="Major water main burst causing street flooding and danger.",
            category_id=cat.id,
            is_safety_risk=True,
            status=ComplaintStatus.REPORTED,
        )
        # 30 (high severity) + 20 (safety) + 5 (cat baseline) = 55+
        score, prio = await agent.calculate_priority(
            complaint, setup_db, ai_severity="critical"
        )
        assert score >= 60
        assert prio == ComplaintPriority.CRITICAL


class TestRoutingAgent:
    """Unit tests for RoutingAgent."""

    async def test_category_routing(
        self,
        setup_db: AsyncSession,
        seed_dept_and_cat: tuple[Department, ComplaintCategory],
    ) -> None:
        dept, cat = seed_dept_and_cat
        agent = RoutingAgent()
        complaint = Complaint(
            tracking_id="CP-testroute123456789012",
            raw_text="Water pipe issue",
            category_id=cat.id,
        )
        routed_dept = await agent.route_complaint(complaint, setup_db)
        assert routed_dept == dept.id

    async def test_keyword_fallback_routing(
        self,
        setup_db: AsyncSession,
        seed_dept_and_cat: tuple[Department, ComplaintCategory],
    ) -> None:
        dept, _ = seed_dept_and_cat
        agent = RoutingAgent()
        complaint = Complaint(
            tracking_id="CP-testroutekw1234567890",
            raw_text="Heavy WATER leakage on main street",
            category_id=None,
        )
        routed_dept = await agent.route_complaint(complaint, setup_db)
        assert routed_dept == dept.id


class TestSLAService:
    """Unit tests for SLAService calculation."""

    async def test_sla_calculation(
        self,
        setup_db: AsyncSession,
        seed_dept_and_cat: tuple[Department, ComplaintCategory],
    ) -> None:
        _, cat = seed_dept_and_cat
        service = SLAService()
        now = datetime.now(tz=UTC)
        complaint = Complaint(
            tracking_id="CP-testsla12345678901234",
            raw_text="Water pipe leak",
            category_id=cat.id,
            created_at=now,
            status=ComplaintStatus.REPORTED,
        )
        deadline, breached = await service.calculate_sla(complaint, setup_db)
        assert deadline > now
        assert breached is False

    async def test_sla_breach_detection(self, setup_db: AsyncSession) -> None:
        service = SLAService()
        past = datetime.now(tz=UTC) - timedelta(hours=72)
        complaint = Complaint(
            tracking_id="CP-testslaold123456789012",
            raw_text="Old unassigned issue",
            created_at=past,
            status=ComplaintStatus.REPORTED,
        )
        _deadline, breached = await service.calculate_sla(complaint, setup_db)
        assert breached is True


class TestDuplicateService:
    """Unit tests for DuplicateService clustering."""

    async def test_duplicate_detection_proximity(
        self,
        setup_db: AsyncSession,
        seed_dept_and_cat: tuple[Department, ComplaintCategory],
    ) -> None:
        _, cat = seed_dept_and_cat
        dupe_service = DuplicateService()
        now = datetime.now(tz=UTC)

        # Existing complaint
        c1 = Complaint(
            tracking_id="CP-testdup111111111111111",
            raw_text="Water pipe burst near 5th ave",
            category_id=cat.id,
            location_lat=40.7128,
            location_lng=-74.0060,
            status=ComplaintStatus.REPORTED,
            created_at=now,
        )
        setup_db.add(c1)
        await setup_db.commit()

        # New complaint at same location
        c2 = Complaint(
            tracking_id="CP-testdup222222222222222",
            raw_text="Water pipe leaking 5th ave",
            category_id=cat.id,
            location_lat=40.7129,
            location_lng=-74.0061,
            status=ComplaintStatus.REPORTED,
            created_at=now,
        )
        setup_db.add(c2)
        await setup_db.flush()

        _dupe_id, count = await dupe_service.process_duplicates(c2, setup_db)
        assert count == 1


class TestPhase5EndToEndIntakePipeline:
    """End-to-end API test for Phase 5 intake pipeline."""

    async def test_complaint_intake_populates_phase5_fields(
        self, client: AsyncClient
    ) -> None:
        response = await client.post(
            "/api/v1/complaints",
            json={
                "raw_text": "Hazardous road collapse on main street causing major safety risk.",
                "location_text": "Main Street & 4th Avenue",
            },
        )
        assert response.status_code == 201
        data = response.json()
        tracking_id = data["tracking_id"]

        # Track complaint to verify public boundary
        track_res = await client.get(f"/api/v1/complaints/track/{tracking_id}")
        assert track_res.status_code == 200
        track_data = track_res.json()

        # Public fields present
        assert track_data["priority"] in ["low", "medium", "high", "critical"]
        assert track_data["sla_deadline"] is not None
        assert "sla_breached" in track_data

        # Internal Phase 5 fields strictly excluded from public DTO
        assert "priority_score" not in track_data
        assert "duplicate_of" not in track_data
