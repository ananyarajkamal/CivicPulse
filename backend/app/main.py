"""
CivicPulse — FastAPI application factory.

This module creates and configures the FastAPI application instance.
All middleware is registered here in the correct order.

Middleware order (outermost to innermost for requests):
    1. SecurityHeadersMiddleware  — adds security headers to every response
    2. RequestLoggingMiddleware   — logs request metadata (no bodies, no PII)
    3. CORSMiddleware             — innermost; handles preflight and CORS headers

For responses, processing is in reverse: route → CORS → Logging → Security.

Note: OpenAPI docs (/api/docs, /api/redoc) are only exposed when DEBUG=True.
      This prevents schema exposure in production environments.
"""

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.middleware.error_handler import setup_error_handlers
from app.middleware.request_logging import RequestLoggingMiddleware
from app.middleware.security_headers import SecurityHeadersMiddleware
from app.routers.v1.analytics import router as analytics_router
from app.routers.v1.auth import router as auth_router
from app.routers.v1.categories import router as categories_router
from app.routers.v1.complaints import router as complaints_router
from app.routers.v1.departments import router as departments_router
from app.routers.v1.geocode import router as geocode_router
from app.routers.v1.health import router as health_router
from app.utils.logging_config import configure_logging


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Application lifespan handler.

    Startup: Configure structured logging.
    Shutdown: (future) close DB connection pool, flush logs.
    """
    configure_logging()
    yield
    # Phase 2: await db_engine.dispose()


def create_app() -> FastAPI:
    """
    Create and configure the FastAPI application.

    Returns:
        A fully configured FastAPI instance with all middleware and routers.
    """
    settings = get_settings()

    app = FastAPI(
        title="CivicPulse API",
        description=(
            "The Agentic Civic Resolution Platform — "
            "backend API for citizen complaint processing and municipal intelligence."
        ),
        version=settings.APP_VERSION,
        # Only expose OpenAPI docs in DEBUG mode
        docs_url="/api/docs" if settings.DEBUG else None,
        redoc_url="/api/redoc" if settings.DEBUG else None,
        openapi_url="/api/openapi.json" if settings.DEBUG else None,
        lifespan=lifespan,
    )

    # -----------------------------------------------------------------------
    # Middleware (added in reverse execution order — last added = outermost)
    # -----------------------------------------------------------------------

    # Innermost: CORS — handles OPTIONS preflight requests first
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins_list,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
        expose_headers=["X-Request-ID"],
    )

    # Middle: Request logging — logs after CORS processes the request
    app.add_middleware(RequestLoggingMiddleware)

    # Outermost: Security headers — applied last, so headers are on ALL responses
    app.add_middleware(SecurityHeadersMiddleware)

    # -----------------------------------------------------------------------
    # Error handlers
    # -----------------------------------------------------------------------
    setup_error_handlers(app)

    # -----------------------------------------------------------------------
    # Routers (versioned under /api/v1/)
    # -----------------------------------------------------------------------
    app.include_router(health_router, prefix="/api/v1")
    app.include_router(auth_router, prefix="/api/v1")
    app.include_router(departments_router, prefix="/api/v1")
    app.include_router(categories_router, prefix="/api/v1")
    app.include_router(geocode_router, prefix="/api/v1")
    app.include_router(complaints_router, prefix="/api/v1")
    app.include_router(analytics_router, prefix="/api/v1")

    return app


# Application instance — used by uvicorn
app = create_app()
