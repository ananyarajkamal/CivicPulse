"""
CivicPulse — Authentication Router (/api/v1/auth).

Endpoints:
    POST  /auth/login    — Staff login (email + password) → JWT + refresh cookie
    POST  /auth/refresh  — Rotate refresh token → new JWT + new httpOnly cookie
    POST  /auth/logout   — Revoke refresh token → clear httpOnly cookie
    GET   /auth/me       — Fetch own profile
    PATCH /auth/me       — Update own name / password
"""

import uuid
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.dependencies import get_current_officer, get_current_user
from app.models.refresh_token import RefreshToken
from app.models.user import User
from app.schemas.auth import LoginRequest, TokenResponse, UserResponse, UserUpdate
from app.schemas.enums import UserRole
from app.security.auth import (
    create_access_token,
    generate_refresh_token_string,
    hash_password,
    hash_refresh_token,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["auth"])
limiter = Limiter(key_func=get_remote_address)
settings = get_settings()

REFRESH_COOKIE_NAME = "refresh_token"


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Staff login",
    description="Authenticate staff credentials and issue access token.",
)
@limiter.limit("10/minute")
async def login(
    request: Request,
    payload: LoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """Authenticate staff email and password."""
    result = await db.execute(select(User).where(User.email == payload.email.lower()))
    user = result.scalar_one_or_none()

    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account is inactive.",
        )

    # Update last_login_at
    user.last_login_at = datetime.now(tz=UTC)

    # Generate JWT access token
    access_token = create_access_token(
        user_id=str(user.id),
        role=user.role.value,
        department_id=str(user.department_id) if user.department_id else None,
    )

    # Generate Refresh Token
    raw_refresh_token = generate_refresh_token_string()
    token_hash = hash_refresh_token(raw_refresh_token)
    expires_at = datetime.now(tz=UTC) + timedelta(
        days=settings.REFRESH_TOKEN_EXPIRE_DAYS
    )

    refresh_entry = RefreshToken(
        user_id=user.id,
        token_hash=token_hash,
        expires_at=expires_at,
    )
    db.add(refresh_entry)
    await db.commit()

    # Set httpOnly refresh cookie
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=raw_refresh_token,
        httponly=True,
        secure=not settings.DEBUG,  # Secure=True in production, False in dev
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        path="/api/v1/auth",
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post(
    "/refresh",
    response_model=TokenResponse,
    summary="Refresh access token",
    description="Rotate refresh token and issue new access token + refresh cookie.",
)
async def refresh_token(
    response: Response,
    refresh_token: str | None = Cookie(default=None, alias=REFRESH_COOKIE_NAME),
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """Rotate refresh token and issue new access token."""
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token cookie missing.",
        )

    token_hash = hash_refresh_token(refresh_token)
    result = await db.execute(
        select(RefreshToken).where(
            RefreshToken.token_hash == token_hash,
            RefreshToken.revoked.is_(False),
        )
    )
    db_token = result.scalar_one_or_none()

    expires_at = (
        db_token.expires_at.replace(tzinfo=UTC)
        if db_token and db_token.expires_at.tzinfo is None
        else db_token.expires_at if db_token else None
    )

    if not db_token or expires_at is None or expires_at < datetime.now(tz=UTC):
        if db_token:
            db_token.revoked = True
            await db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token.",
        )

    # Fetch user
    user_result = await db.execute(select(User).where(User.id == db_token.user_id))
    user = user_result.scalar_one_or_none()

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account inactive.",
        )

    # Revoke old token (rotation)
    db_token.revoked = True

    # Generate new refresh token
    new_raw_refresh = generate_refresh_token_string()
    new_token_hash = hash_refresh_token(new_raw_refresh)
    new_expires_at = datetime.now(tz=UTC) + timedelta(
        days=settings.REFRESH_TOKEN_EXPIRE_DAYS
    )

    new_db_token = RefreshToken(
        user_id=user.id,
        token_hash=new_token_hash,
        expires_at=new_expires_at,
    )
    db.add(new_db_token)
    await db.commit()

    # Generate new access token
    new_access_token = create_access_token(
        user_id=str(user.id),
        role=user.role.value,
        department_id=str(user.department_id) if user.department_id else None,
    )

    # Set new cookie
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=new_raw_refresh,
        httponly=True,
        secure=not settings.DEBUG,
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        path="/api/v1/auth",
    )

    return TokenResponse(
        access_token=new_access_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post(
    "/logout",
    status_code=status.HTTP_200_OK,
    summary="Staff logout",
    description="Revoke refresh token and clear httpOnly refresh cookie.",
)
async def logout(
    response: Response,
    refresh_token: str | None = Cookie(default=None, alias=REFRESH_COOKIE_NAME),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    """Revoke refresh token and clear cookie."""
    if refresh_token:
        token_hash = hash_refresh_token(refresh_token)
        result = await db.execute(
            select(RefreshToken).where(RefreshToken.token_hash == token_hash)
        )
        db_token = result.scalar_one_or_none()
        if db_token:
            db_token.revoked = True
            await db.commit()

    response.delete_cookie(key=REFRESH_COOKIE_NAME, path="/api/v1/auth")
    return {"detail": "Successfully logged out."}


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get own profile",
    description="Return authenticated user profile.",
)
async def get_me(current_user: User = Depends(get_current_user)) -> UserResponse:
    """Return own staff profile."""
    return UserResponse.model_validate(current_user)


@router.patch(
    "/me",
    response_model=UserResponse,
    summary="Update own profile",
    description="Update own full name or password.",
)
async def update_me(
    payload: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    """Update own name or password."""
    if payload.full_name is not None:
        current_user.full_name = payload.full_name

    if payload.password is not None:
        current_user.password_hash = hash_password(payload.password)

    current_user.updated_at = datetime.now(tz=UTC)
    await db.commit()
    await db.refresh(current_user)

    return UserResponse.model_validate(current_user)


@router.get(
    "/officers",
    response_model=list[UserResponse],
    summary="List active officers for assignment",
    description="Return active municipal officers for complaint assignment.",
)
async def list_officers(
    department_id: uuid.UUID | None = None,
    current_user: User = Depends(get_current_officer),
    db: AsyncSession = Depends(get_db),
) -> list[UserResponse]:
    """Return active officers. Officers only see their own department."""
    query = select(User).where(User.is_active.is_(True))

    if current_user.role == UserRole.MUNICIPAL_OFFICER and current_user.department_id:
        query = query.where(User.department_id == current_user.department_id)
    elif department_id:
        query = query.where(User.department_id == department_id)

    res = await db.execute(query.order_by(User.full_name))
    officers = res.scalars().all()
    return [UserResponse.model_validate(u) for u in officers]
