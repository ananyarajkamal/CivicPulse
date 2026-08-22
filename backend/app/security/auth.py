"""
CivicPulse — Authentication & Cryptographic Security Services.

SECURITY:
    - Password hashing: bcrypt via PassLib
    - JWT access tokens: 15-minute TTL, HS256 algorithm
    - Refresh tokens: 256-bit secure random hex tokens (token string)
    - Refresh token storage: ONLY SHA-256 hash stored in DB (token_hash)
"""

import hashlib
import secrets
from datetime import UTC, datetime, timedelta
from typing import Any

from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, ConfigDict

from app.config import get_settings

# CryptContext for password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class TokenPayload(BaseModel):
    """Payload decoded from a verified JWT access token."""

    model_config = ConfigDict(frozen=True)

    sub: str  # User ID (UUID string)
    role: str  # UserRole enum value string
    department_id: str | None = None
    exp: int


def hash_password(password: str) -> str:
    """Hash a plaintext password using bcrypt."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plaintext password against a bcrypt hash."""
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(
    user_id: str,
    role: str,
    department_id: str | None = None,
    expires_delta: timedelta | None = None,
) -> str:
    """
    Generate a signed JWT access token.

    Args:
        user_id: User's UUID string (becomes 'sub' claim)
        role: User's role string ('admin' or 'municipal_officer')
        department_id: Optional department UUID string for officers
        expires_delta: Custom TTL or default (15 minutes)

    Returns:
        Encoded JWT bearer token string.
    """
    settings = get_settings()

    if expires_delta:
        expire = datetime.now(tz=UTC) + expires_delta
    else:
        expire = datetime.now(tz=UTC) + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )

    to_encode: dict[str, Any] = {
        "sub": str(user_id),
        "role": role,
        "department_id": str(department_id) if department_id else None,
        "exp": int(expire.timestamp()),
        "iat": int(datetime.now(tz=UTC).timestamp()),
    }

    return str(
        jwt.encode(
            to_encode,
            settings.JWT_SECRET_KEY,
            algorithm=settings.JWT_ALGORITHM,
        )
    )


def decode_access_token(token: str) -> TokenPayload | None:
    """
    Decode and verify a JWT access token.

    Returns:
        TokenPayload if valid, None if invalid or expired.
    """
    settings = get_settings()
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
        user_id: str | None = payload.get("sub")
        role: str | None = payload.get("role")
        exp: int | None = payload.get("exp")

        if not user_id or not role or not exp:
            return None

        return TokenPayload(
            sub=user_id,
            role=role,
            department_id=payload.get("department_id"),
            exp=exp,
        )
    except JWTError:
        return None


def generate_refresh_token_string() -> str:
    """
    Generate a 256-bit cryptographically secure raw refresh token string.

    Returns:
        64-character hex string.
    """
    return secrets.token_hex(32)


def hash_refresh_token(token_string: str) -> str:
    """
    Compute SHA-256 hash of a refresh token string for database storage.

    Returns:
        64-character lowercase hex string.
    """
    return hashlib.sha256(token_string.encode("utf-8")).hexdigest()
