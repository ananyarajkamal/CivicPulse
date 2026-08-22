"""
CivicPulse — Database session management.

Provides the async SQLAlchemy 2.0 engine, sessionmaker, declarative Base,
and the FastAPI dependency get_db() for async database sessions.

Database URL is loaded dynamically from Settings (DATABASE_URL).
Uses asyncpg driver for Supabase PostgreSQL.
"""

import re
from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.config import get_settings


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy ORM models."""

    pass



_settings = get_settings()
_db_url = _settings.DATABASE_URL

# Auto-strip brackets around password if present (e.g. postgres:[pass]@host)
_m = re.match(r"^(postgresql(?:\+asyncpg)?://[^:]+:)(\[[^\]]+\])(@.+)$", _db_url)
if _m:
    _db_url = _m.group(1) + _m.group(2)[1:-1] + _m.group(3)

if _db_url.startswith("postgresql://"):
    _db_url = _db_url.replace("postgresql://", "postgresql+asyncpg://", 1)
elif _db_url.startswith("postgres://"):
    _db_url = _db_url.replace("postgres://", "postgresql+asyncpg://", 1)

engine: AsyncEngine = create_async_engine(
    _db_url,
    echo=_settings.DEBUG,
    future=True,
    pool_size=10,
    max_overflow=20,
    pool_recycle=1800,
    pool_pre_ping=False,
)

# Async session factory
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency that yields an async database session.

    Session is automatically closed after the request completes.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
