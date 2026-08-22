"""
CivicPulse — Request logging middleware.

Logs all incoming HTTP requests and their responses using structlog.

SECURITY / PRIVACY RULES (strictly enforced here):
    - NEVER log request bodies (may contain complaint text with PII)
    - NEVER log response bodies (may contain internal data)
    - NEVER log authorization headers or cookies
    - NEVER log query parameters (may contain tracking IDs — use with care)
    - Log only: method, path, status code, response time, client IP

    The structlog PII redaction processor (redact_pii_processor) provides
    a secondary safety net, but the primary control is simply not logging
    sensitive data in the first place.
"""

import time

import structlog
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

logger: structlog.stdlib.BoundLogger = structlog.get_logger(__name__)


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Log method, path, status code, and duration for every request."""

    async def dispatch(
        self,
        request: Request,
        call_next: RequestResponseEndpoint,
    ) -> Response:
        start = time.perf_counter()

        response = await call_next(request)

        duration_ms = round((time.perf_counter() - start) * 1000, 2)

        # Log only safe, non-PII metadata
        logger.info(
            "http_request",
            method=request.method,
            path=request.url.path,
            status_code=response.status_code,
            duration_ms=duration_ms,
            # client_ip is logged for rate-limit debugging; consider GDPR
            # requirements for production deployments outside this MVP.
            client_ip=request.client.host if request.client else "unknown",
        )

        return response
