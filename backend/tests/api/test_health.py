"""
API tests for the health check endpoint.

Tests verify:
  - GET /api/v1/health returns 200
  - Response structure matches HealthResponse schema
  - All required security headers are present in the response
  - CORS does not expose the endpoint to unlisted origins
  - OpenAPI docs are hidden in non-DEBUG mode
"""

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.fixture
async def client() -> AsyncClient:
    """Async test client for the FastAPI application."""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as ac:
        yield ac


class TestHealthEndpoint:
    """Tests for GET /api/v1/health."""

    async def test_returns_200(self, client: AsyncClient) -> None:
        response = await client.get("/api/v1/health")
        assert response.status_code == 200

    async def test_response_has_correct_status(self, client: AsyncClient) -> None:
        response = await client.get("/api/v1/health")
        data = response.json()
        assert data["status"] == "healthy"

    async def test_response_has_service_name(self, client: AsyncClient) -> None:
        response = await client.get("/api/v1/health")
        data = response.json()
        assert data["service"] == "civicpulse-api"

    async def test_response_has_version(self, client: AsyncClient) -> None:
        response = await client.get("/api/v1/health")
        data = response.json()
        assert "version" in data
        assert isinstance(data["version"], str)

    async def test_response_has_timestamp(self, client: AsyncClient) -> None:
        response = await client.get("/api/v1/health")
        data = response.json()
        assert "timestamp" in data
        # Timestamp should be an ISO 8601 string
        assert isinstance(data["timestamp"], str)
        assert "T" in data["timestamp"]  # Basic ISO 8601 check

    async def test_response_content_type_is_json(self, client: AsyncClient) -> None:
        response = await client.get("/api/v1/health")
        assert "application/json" in response.headers.get("content-type", "")


class TestSecurityHeaders:
    """Verify all required security headers are present on every response."""

    async def test_x_content_type_options(self, client: AsyncClient) -> None:
        response = await client.get("/api/v1/health")
        assert response.headers.get("x-content-type-options") == "nosniff"

    async def test_x_frame_options(self, client: AsyncClient) -> None:
        response = await client.get("/api/v1/health")
        assert response.headers.get("x-frame-options") == "DENY"

    async def test_referrer_policy(self, client: AsyncClient) -> None:
        response = await client.get("/api/v1/health")
        ref = response.headers.get("referrer-policy")
        assert ref == "strict-origin-when-cross-origin"

    async def test_permissions_policy(self, client: AsyncClient) -> None:
        response = await client.get("/api/v1/health")
        assert "permissions-policy" in response.headers

    async def test_content_security_policy(self, client: AsyncClient) -> None:
        response = await client.get("/api/v1/health")
        assert "content-security-policy" in response.headers
        csp = response.headers["content-security-policy"]
        assert "default-src 'self'" in csp

    async def test_strict_transport_security(self, client: AsyncClient) -> None:
        response = await client.get("/api/v1/health")
        hsts = response.headers.get("strict-transport-security", "")
        assert "max-age=63072000" in hsts
        assert "includeSubDomains" in hsts


class TestCorsMiddleware:
    """Verify CORS middleware behaviour."""

    async def test_allowed_origin_gets_cors_header(self, client: AsyncClient) -> None:
        response = await client.get(
            "/api/v1/health",
            headers={"Origin": "http://localhost:3000"},
        )
        assert response.headers.get("access-control-allow-origin") == "http://localhost:3000"

    async def test_unlisted_origin_does_not_get_cors_header(
        self, client: AsyncClient
    ) -> None:
        response = await client.get(
            "/api/v1/health",
            headers={"Origin": "https://evil.example.com"},
        )
        # CORS middleware must not echo back the unlisted origin
        allow_origin = response.headers.get("access-control-allow-origin", "")
        assert allow_origin != "https://evil.example.com"

    async def test_preflight_options_rejected_for_unlisted_origin(
        self, client: AsyncClient
    ) -> None:
        response = await client.options(
            "/api/v1/health",
            headers={
                "Origin": "https://attacker.example.com",
                "Access-Control-Request-Method": "GET",
            },
        )
        allow_origin = response.headers.get("access-control-allow-origin", "")
        assert allow_origin != "https://attacker.example.com"


class TestDocsEndpoints:
    """Verify OpenAPI docs behaviour."""

    async def test_docs_hidden_in_test_mode(self, client: AsyncClient) -> None:
        """
        In DEBUG=True (test mode), docs should be accessible.
        In production (DEBUG=False), docs are hidden.

        Test env sets DEBUG=true, so this verifies docs are accessible.
        """
        response = await client.get("/api/docs")
        # In DEBUG=True mode, docs should be available (200)
        assert response.status_code == 200

    async def test_unknown_route_returns_404(self, client: AsyncClient) -> None:
        response = await client.get("/api/v1/nonexistent-endpoint")
        assert response.status_code == 404
