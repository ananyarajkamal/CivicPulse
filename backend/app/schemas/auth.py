"""
Authentication request and response schemas.
"""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.schemas.enums import UserRole


class LoginRequest(BaseModel):
    """Staff login payload."""

    model_config = ConfigDict(frozen=True)

    email: EmailStr = Field(description="Staff user email address")
    password: str = Field(min_length=8, description="Staff user password")


class TokenResponse(BaseModel):
    """Login success payload."""

    model_config = ConfigDict(frozen=True)

    access_token: str = Field(description="JWT Bearer access token (15-min TTL)")
    token_type: str = Field(default="bearer", description="Token type")
    expires_in: int = Field(description="Access token TTL in seconds")


class UserResponse(BaseModel):
    """Staff user profile payload."""

    model_config = ConfigDict(from_attributes=True, frozen=True)

    id: uuid.UUID
    email: EmailStr
    full_name: str
    role: UserRole
    department_id: uuid.UUID | None = None
    is_active: bool
    last_login_at: datetime | None = None
    created_at: datetime


class UserUpdate(BaseModel):
    """Self-update payload for /auth/me."""

    model_config = ConfigDict(frozen=True)

    full_name: str | None = Field(default=None, min_length=2, max_length=255)
    password: str | None = Field(default=None, min_length=8, max_length=100)
