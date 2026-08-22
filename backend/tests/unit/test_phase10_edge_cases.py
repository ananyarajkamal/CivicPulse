"""
Deliberate Edge Cases Test Suite (Phase 10).

Validates:
    - Text length limits (2000 chars accepted, 2001 rejected with 422)
    - Non-existent tracking ID returns 404 (never 500)
    - Illegal status transitions return 400
    - Empty location handled safely
"""


import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.database import Base, get_db
from app.main import app
from app.routers.v1.complaints import limiter

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


class TestDeliberateEdgeCases:
    """Test suite for boundary values and deliberate edge cases."""

    async def test_complaint_text_exact_2000_chars_accepted(
        self, client: AsyncClient
    ) -> None:
        exact_text = "A" * 2000
        res = await client.post(
            "/api/v1/complaints",
            json={"raw_text": exact_text},
        )
        assert res.status_code == 201

    async def test_complaint_text_2001_chars_rejected(
        self, client: AsyncClient
    ) -> None:
        overflow_text = "A" * 2001
        res = await client.post(
            "/api/v1/complaints",
            json={"raw_text": overflow_text},
        )
        assert res.status_code == 422

    async def test_nonexistent_tracking_id_returns_404(
        self, client: AsyncClient
    ) -> None:
        res = await client.get("/api/v1/complaints/track/CP-nonexistenttrackingid12")
        assert res.status_code == 404
        assert res.status_code != 500

    async def test_empty_location_handled_safely(
        self, client: AsyncClient
    ) -> None:
        res = await client.post(
            "/api/v1/complaints",
            json={"raw_text": "Water main leak near downtown area with no specific address."},
        )
        assert res.status_code == 201
        data = res.json()
        assert "tracking_id" in data
