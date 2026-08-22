"""
API tests for authentication endpoints (/api/v1/auth).

Tests verify:
  - POST /auth/login with valid credentials returns access token + refresh cookie
  - POST /auth/login with invalid email/password returns 401
  - GET /auth/me returns authenticated user profile
  - GET /auth/me without bearer token returns 401
  - POST /auth/refresh rotates refresh token and returns new access token
  - POST /auth/logout revokes token and clears cookie
"""

import uuid

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.database import Base, get_db
from app.main import app
from app.models.user import User
from app.schemas.enums import UserRole
from app.security.auth import create_access_token, hash_password

# Use an in-memory SQLite database for async testing
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
    """Async test client with get_db overridden to use in-memory SQLite."""
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
async def seed_user(setup_db: AsyncSession) -> User:
    """Seed a test staff user into the in-memory database."""
    user = User(
        id=uuid.uuid4(),
        email="testofficer@civicpulse.gov",
        password_hash=hash_password("ValidPassword123!"),
        full_name="Test Officer",
        role=UserRole.MUNICIPAL_OFFICER,
        is_active=True,
    )
    setup_db.add(user)
    await setup_db.commit()
    await setup_db.refresh(user)
    return user


class TestLoginEndpoint:
    """Tests for POST /api/v1/auth/login."""

    async def test_login_success(self, client: AsyncClient, seed_user: User) -> None:
        response = await client.post(
            "/api/v1/auth/login",
            json={"email": "testofficer@civicpulse.gov", "password": "ValidPassword123!"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["expires_in"] == 900
        assert "refresh_token" in response.cookies

    async def test_login_invalid_password(self, client: AsyncClient, seed_user: User) -> None:
        response = await client.post(
            "/api/v1/auth/login",
            json={"email": "testofficer@civicpulse.gov", "password": "WrongPassword!"},
        )
        assert response.status_code == 401
        assert "Invalid email or password" in response.json()["detail"]

    async def test_login_nonexistent_email(self, client: AsyncClient, setup_db: AsyncSession) -> None:
        response = await client.post(
            "/api/v1/auth/login",
            json={"email": "nobody@civicpulse.gov", "password": "Password123!"},
        )
        assert response.status_code == 401


class TestMeEndpoint:
    """Tests for GET /api/v1/auth/me."""

    async def test_get_me_authenticated(self, client: AsyncClient, seed_user: User) -> None:
        token = create_access_token(user_id=str(seed_user.id), role=seed_user.role.value)
        response = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "testofficer@civicpulse.gov"
        assert data["full_name"] == "Test Officer"
        assert data["role"] == "municipal_officer"

    async def test_get_me_unauthenticated(self, client: AsyncClient) -> None:
        response = await client.get("/api/v1/auth/me")
        assert response.status_code == 401

    async def test_get_me_invalid_token(self, client: AsyncClient) -> None:
        response = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": "Bearer invalid.token.here"},
        )
        assert response.status_code == 401


class TestRefreshAndLogout:
    """Tests for POST /api/v1/auth/refresh and /auth/logout."""

    async def test_full_login_refresh_logout_lifecycle(
        self, client: AsyncClient, seed_user: User
    ) -> None:
        # 1. Login
        login_res = await client.post(
            "/api/v1/auth/login",
            json={"email": "testofficer@civicpulse.gov", "password": "ValidPassword123!"},
        )
        assert login_res.status_code == 200
        refresh_cookie = login_res.cookies.get("refresh_token")
        assert refresh_cookie is not None

        # 2. Refresh token
        client.cookies.set("refresh_token", refresh_cookie)
        refresh_res = await client.post("/api/v1/auth/refresh")
        assert refresh_res.status_code == 200
        new_data = refresh_res.json()
        assert "access_token" in new_data
        new_refresh_cookie = refresh_res.cookies.get("refresh_token")
        assert new_refresh_cookie is not None
        assert new_refresh_cookie != refresh_cookie  # Token rotated

        # 3. Old refresh token should now be rejected
        client.cookies.set("refresh_token", refresh_cookie)
        failed_refresh = await client.post("/api/v1/auth/refresh")
        assert failed_refresh.status_code == 401

        # 4. Logout using valid new token
        client.cookies.set("refresh_token", new_refresh_cookie)
        logout_res = await client.post("/api/v1/auth/logout")
        assert logout_res.status_code == 200

        # 5. Refresh after logout should fail
        after_logout = await client.post("/api/v1/auth/refresh")
        assert after_logout.status_code == 401
