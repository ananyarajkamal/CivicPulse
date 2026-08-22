"""
CivicPulse — Centralised error handlers.

All unhandled exceptions are caught here and converted to safe,
generic HTTP responses. Stack traces and internal details are
NEVER returned to the client.

Error response contract:
    { "detail": "<human-readable message>" }

Status codes:
    422 — request validation failed (field-level errors included)
    401 — authentication required
    403 — insufficient permissions
    404 — resource not found
    500 — unexpected internal error (generic message only)
"""

import structlog
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger: structlog.stdlib.BoundLogger = structlog.get_logger(__name__)


def setup_error_handlers(app: FastAPI) -> None:
    """Register all exception handlers on the FastAPI application."""

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(
        request: Request,
        exc: StarletteHTTPException,
    ) -> JSONResponse:
        """Pass through HTTP exceptions with their original status and detail."""
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail},
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request,
        exc: RequestValidationError,
    ) -> JSONResponse:
        """
        Return a 422 with field-level validation errors.

        Validation errors are safe to return — they reference the request
        schema fields, not internal state.
        """
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "detail": "Request validation failed",
                "errors": exc.errors(),
            },
        )

    @app.exception_handler(Exception)
    async def generic_exception_handler(
        request: Request,
        exc: Exception,
    ) -> JSONResponse:
        """
        Catch-all for unhandled exceptions.

        Logs the exception type (but NOT the message, which may contain
        sensitive data) and returns a generic 500 response.

        Never returns stack traces, exception messages, or internal state.
        """
        logger.error(
            "unhandled_exception",
            exc_type=type(exc).__name__,
            path=request.url.path,
            method=request.method,
        )
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "detail": (
                    "An unexpected error occurred. "
                    "Please try again later or contact support."
                )
            },
        )
