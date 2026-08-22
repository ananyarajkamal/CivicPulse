"""
Unit tests for authentication & security utilities.

Verifies:
  - Password hashing and verification via bcrypt
  - JWT access token generation and decoding
  - JWT payload claims ('sub', 'role', 'department_id', 'exp')
  - Invalid / tampered / expired JWT rejection
  - 256-bit secure hex refresh token generation
  - SHA-256 refresh token hashing
"""

from datetime import timedelta

from app.security.auth import (
    create_access_token,
    decode_access_token,
    generate_refresh_token_string,
    hash_password,
    hash_refresh_token,
    verify_password,
)


class TestPasswordHashing:
    """Verify bcrypt password hashing."""

    def test_hash_password_produces_bcrypt_hash(self) -> None:
        hashed = hash_password("SecretPassword123!")
        assert hashed.startswith("$2b$") or hashed.startswith("$2a$")
        assert hashed != "SecretPassword123!"

    def test_verify_password_correct(self) -> None:
        hashed = hash_password("SecretPassword123!")
        assert verify_password("SecretPassword123!", hashed) is True

    def test_verify_password_incorrect(self) -> None:
        hashed = hash_password("SecretPassword123!")
        assert verify_password("WrongPassword!", hashed) is False


class TestJwtAccessTokens:
    """Verify JWT access token encoding and decoding."""

    def test_create_and_decode_valid_token(self) -> None:
        user_id = "123e4567-e89b-12d3-a456-426614174000"
        role = "admin"
        token = create_access_token(user_id=user_id, role=role)

        payload = decode_access_token(token)
        assert payload is not None
        assert payload.sub == user_id
        assert payload.role == role
        assert payload.department_id is None

    def test_token_with_department_id(self) -> None:
        user_id = "123e4567-e89b-12d3-a456-426614174000"
        dept_id = "987e6543-e89b-12d3-a456-426614174000"
        token = create_access_token(user_id=user_id, role="municipal_officer", department_id=dept_id)

        payload = decode_access_token(token)
        assert payload is not None
        assert payload.department_id == dept_id

    def test_expired_token_rejected(self) -> None:
        user_id = "123e4567-e89b-12d3-a456-426614174000"
        # Create token that expired 10 seconds ago
        token = create_access_token(
            user_id=user_id,
            role="admin",
            expires_delta=timedelta(seconds=-10),
        )

        payload = decode_access_token(token)
        assert payload is None

    def test_tampered_token_rejected(self) -> None:
        token = create_access_token(user_id="123e4567-e89b-12d3-a456-426614174000", role="admin")
        tampered = token[:-5] + "XXXXX"
        payload = decode_access_token(tampered)
        assert payload is None

    def test_invalid_string_rejected(self) -> None:
        assert decode_access_token("invalid-jwt-token") is None


class TestRefreshTokens:
    """Verify refresh token generation and hashing."""

    def test_generate_token_length(self) -> None:
        token = generate_refresh_token_string()
        assert len(token) == 64  # 32 bytes hex encoded = 64 chars

    def test_uniqueness(self) -> None:
        tokens = {generate_refresh_token_string() for _ in range(1000)}
        assert len(tokens) == 1000

    def test_hash_refresh_token_deterministic(self) -> None:
        raw = generate_refresh_token_string()
        hash1 = hash_refresh_token(raw)
        hash2 = hash_refresh_token(raw)
        assert hash1 == hash2
        assert len(hash1) == 64
        assert hash1 != raw
