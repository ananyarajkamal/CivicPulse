"""
CivicPulse — Alembic migration environment.

This file is run by Alembic when executing migrations.

DATABASE_URL is loaded from the environment (via app.config.Settings),
NOT from alembic.ini — this prevents credentials from being stored in
version-controlled configuration files.

Phase 1: target_metadata is None (no tables yet).
Phase 2: Import Base.metadata from app.models to enable autogenerate.

Usage:
    cd backend/
    alembic upgrade head        # Apply all pending migrations
    alembic revision --autogenerate -m "description"  # Generate a new migration
    alembic downgrade -1        # Roll back one migration
"""

import asyncio
import os
import sys
from logging.config import fileConfig

from alembic import context
from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

# Ensure the app package is importable from alembic/
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

# Alembic Config object — access alembic.ini values
alembic_config = context.config

# Set up Python logging from alembic.ini [loggers] section
if alembic_config.config_file_name is not None:
    fileConfig(alembic_config.config_file_name)

# -----------------------------------------------------------------------
# Override DATABASE_URL from environment — never use alembic.ini value
# -----------------------------------------------------------------------
database_url = os.environ.get("DATABASE_URL")
if database_url:
    alembic_config.set_main_option("sqlalchemy.url", database_url)

# -----------------------------------------------------------------------
# Target metadata for --autogenerate
# -----------------------------------------------------------------------
from app.models import Base  # noqa: E402

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """
    Run migrations in 'offline' mode.

    This configures the context with just a URL, without an Engine.
    Migrations generate SQL scripts without connecting to the DB.
    """
    url = alembic_config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    """Run migrations using an active connection."""
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,        # Detect column type changes
        compare_server_default=True,  # Detect default value changes
    )
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """Run migrations using an async SQLAlchemy engine (asyncpg)."""
    connectable = async_engine_from_config(
        alembic_config.get_section(alembic_config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode (connected to the database)."""
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
