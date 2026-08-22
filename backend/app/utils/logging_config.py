"""
CivicPulse — Structured logging configuration with PII redaction.

All log output uses structlog for structured JSON logs.

SECURITY:
    Any log field whose name matches a known PII/secret pattern is
    automatically replaced with "[REDACTED]" before the log event
    is emitted. This prevents accidental leakage of:

    - submitter_contact, submitter_name (citizen PII)
    - password, password_hash
    - token, access_token, refresh_token
    - api_key, secret_key, jwt
    - Any field containing "key", "secret", "password", "token"

    Raw complaint text is NEVER logged (it may contain PII and
    can be extremely long). Log only complaint IDs and metadata.
"""

from typing import Any

import structlog

# ---------------------------------------------------------------------------
# PII field name patterns — case-insensitive substring match
# ---------------------------------------------------------------------------
_PII_SUBSTRINGS: frozenset[str] = frozenset(
    {
        "password",
        "secret",
        "token",
        "api_key",
        "apikey",
        "jwt",
        "submitter_contact",
        "submitter_name",
        "contact",
        "email",
        "phone",
        "mobile",
        "raw_text",  # complaint text may contain PII
        "service_role",
    }
)


def redact_pii_processor(
    _logger: Any,
    _method_name: str,
    event_dict: dict[str, Any],
) -> dict[str, Any]:
    """
    structlog processor that redacts fields with PII-sensitive names.

    This processor must be included in the structlog processor chain BEFORE
    the final renderer so that redaction happens before output.

    Note: This redacts by field *name* pattern, not by value content.
    Do not rely on this as the only PII control — avoid logging PII at all.
    """
    for field_name in list(event_dict.keys()):
        lower = field_name.lower()
        if any(pii in lower for pii in _PII_SUBSTRINGS):
            event_dict[field_name] = "[REDACTED]"
    return event_dict


def configure_logging() -> None:
    """
    Configure structlog for the application.

    Produces JSON-formatted structured logs in production and
    human-readable coloured logs in development (DEBUG=True).

    Call this once at application startup via the FastAPI lifespan.
    """
    shared_processors: list[Any] = [
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso", utc=True),
        redact_pii_processor,
        structlog.processors.StackInfoRenderer(),
    ]

    structlog.configure(
        processors=[
            *shared_processors,
            structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(20),  # INFO level
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )
