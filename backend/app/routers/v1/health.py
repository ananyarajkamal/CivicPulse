"""
CivicPulse — Health check endpoint.

GET /api/v1/health

This endpoint is public and unauthenticated. It is used by:
  - Load balancers / orchestrators to determine service liveness
  - Developers to verify the service is running
  - CI/CD pipelines for smoke testing after deployment

Phase 1: Returns service metadata only. No database connectivity check.
Phase 2: /health/db (admin-only) will check database connectivity.
"""

from datetime import UTC, datetime

from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict

router = APIRouter(tags=["health"])


class HealthResponse(BaseModel):
    """Health check response schema."""

    model_config = ConfigDict(frozen=True)

    status: str
    service: str
    version: str
    timestamp: datetime


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Service liveness check",
    description=(
        "Returns the current health status of the CivicPulse API. "
        "This endpoint is public and does not require authentication."
    ),
)
async def health_check() -> HealthResponse:
    """Return service health status."""
    return HealthResponse(
        status="healthy",
        service="civicpulse-api",
        version="0.1.0",
        timestamp=datetime.now(tz=UTC),
    )
