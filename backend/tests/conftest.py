"""
CivicPulse test suite — root conftest.

IMPORTANT: Environment variables MUST be set before any app modules
are imported, because get_settings() uses @lru_cache.

These values are TEST-ONLY placeholders. They do not connect to any
real database or service during Phase 1 tests.
"""

import os

# --- Set test environment variables before any app imports ---
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://test:test@localhost:5432/civicpulse_test")
os.environ.setdefault("SUPABASE_URL", "https://test-project.supabase.co")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key-not-real")
os.environ.setdefault("SUPABASE_ANON_KEY", "test-anon-key-not-real")
os.environ.setdefault(
    "JWT_SECRET_KEY",
    "test-jwt-secret-key-minimum-32-characters-long-for-testing",
)
os.environ.setdefault("DEBUG", "true")
os.environ.setdefault("ALLOWED_ORIGINS", "http://localhost:3000")

import pytest

from app.config import get_settings


@pytest.fixture(autouse=True)
def _reset_settings_cache() -> None:
    """
    Clear the settings lru_cache before each test.
    Ensures test env vars are picked up fresh for every test.
    """
    get_settings.cache_clear()
    yield  # type: ignore[misc]
    get_settings.cache_clear()
