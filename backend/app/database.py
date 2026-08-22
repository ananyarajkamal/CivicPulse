"""
CivicPulse — Database session management.

Provides the async SQLAlchemy 2.0 engine, sessionmaker, declarative Base,
and the FastAPI dependency get_db() for async database sessions.

Database URL is loaded dynamically from Settings (DATABASE_URL).
Uses asyncpg driver for Supabase PostgreSQL.
"""

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


# ---------------------------------------------------------------------------
# Create async engine singleton
# ---------------------------------------------------------------------------
_settings = get_settings()

engine: AsyncEngine = create_async_engine(
    _settings.DATABASE_URL,
    echo=_settings.DEBUG,
    future=True,
    pool_pre_ping=True,  # Test connections before handing out from pool
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
