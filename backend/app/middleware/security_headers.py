"""
CivicPulse — Security headers middleware.

Adds the required HTTP security headers to every response.

Headers applied (see implementation_plan.md §10):
    Strict-Transport-Security   — enforces HTTPS
    X-Content-Type-Options      — prevents MIME sniffing
    X-Frame-Options             — prevents clickjacking
    Referrer-Policy             — controls referrer information
    Permissions-Policy          — restricts browser feature access
    Content-Security-Policy     — restricts resource loading origins

These headers are applied AFTER the route handler runs, meaning they
are always present regardless of the response status code.
"""

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Inject security headers into every HTTP response."""

    async def dispatch(
        self,
        request: Request,
        call_next: RequestResponseEndpoint,
    ) -> Response:
        response = await call_next(request)

        # Enforce HTTPS for 2 years, including subdomains
        response.headers["Strict-Transport-Security"] = (
            "max-age=63072000; includeSubDomains"
        )

        # Prevent MIME type sniffing
        response.headers["X-Content-Type-Options"] = "nosniff"

        # Prevent the page from being embedded in iframes (clickjacking)
        response.headers["X-Frame-Options"] = "DENY"

        # Limit referrer information to origin only when crossing origins
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # Restrict browser API access — only geolocation is permitted
        # (for complaint form)
        response.headers["Permissions-Policy"] = "geolocation=(self)"

        # Restrict resource loading to same origin. Maps (OpenStreetMap tiles)
        # and fonts will require explicit additions in Phase 6.
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "img-src 'self' data: https://*.tile.openstreetmap.org; "
            "font-src 'self' https://fonts.gstatic.com; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "script-src 'self'"
        )

        return response
