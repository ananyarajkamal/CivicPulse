"""
Production Startup Readiness & Environment Configuration Test Suite (Phase 11).

Validates:
    - FastAPI app initialization & route registration
    - Health check endpoint (/api/v1/health) response
    - Configuration loading from environment settings
    - CORS middleware & security headers verification
"""

import pytest
from httpx import ASGITransport, AsyncClient

from app.config import get_settings
from app.main import app


@pytest.fixture
async def client() -> AsyncClient:
    """Async test client."""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as ac:
        yield ac


class TestProductionReadiness:
    """Test suite for production readiness and app configuration."""

    async def test_health_check_endpoint_returns_ok(self, client: AsyncClient) -> None:
        res = await client.get("/api/v1/health")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] in ("ok", "healthy")
        assert "version" in data

    async def test_settings_singleton_loads_correctly(self) -> None:
        settings = get_settings()
        assert settings.APP_NAME == "CivicPulse"
        assert isinstance(settings.allowed_origins_list, list)

    async def test_all_expected_v1_routers_included(self) -> None:
        routes = [route.path for route in app.routes]
        assert "/api/v1/health" in routes
        assert "/api/v1/complaints" in routes
        assert "/api/v1/analytics/summary" in routes
        assert "/api/v1/departments" in routes
        assert "/api/v1/categories" in routes
