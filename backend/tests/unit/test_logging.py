"""
Unit tests for the PII redaction logging processor.

Verifies that the redact_pii_processor correctly redacts sensitive
field names before log events are emitted.
"""

from typing import Any

from app.utils.logging_config import redact_pii_processor


def _run(event_dict: dict[str, Any]) -> dict[str, Any]:
    """Helper: run the processor and return the result."""
    return redact_pii_processor(None, "info", event_dict.copy())


class TestPiiRedaction:
    """Verify PII field redaction in the logging processor."""

    def test_submitter_contact_is_redacted(self) -> None:
        result = _run({"submitter_contact": "user@example.com", "event": "test"})
        assert result["submitter_contact"] == "[REDACTED]"

    def test_submitter_name_is_redacted(self) -> None:
        result = _run({"submitter_name": "John Doe", "event": "test"})
        assert result["submitter_name"] == "[REDACTED]"

    def test_password_is_redacted(self) -> None:
        result = _run({"password": "secret123", "event": "test"})
        assert result["password"] == "[REDACTED]"

    def test_password_hash_is_redacted(self) -> None:
        result = _run({"password_hash": "$2b$12$...", "event": "test"})
        assert result["password_hash"] == "[REDACTED]"

    def test_token_is_redacted(self) -> None:
        result = _run({"token": "eyJhbGci...", "event": "test"})
        assert result["token"] == "[REDACTED]"

    def test_access_token_is_redacted(self) -> None:
        result = _run({"access_token": "eyJhbGci...", "event": "test"})
        assert result["access_token"] == "[REDACTED]"

    def test_api_key_is_redacted(self) -> None:
        result = _run({"api_key": "sk-...", "event": "test"})
        assert result["api_key"] == "[REDACTED]"

    def test_jwt_is_redacted(self) -> None:
        result = _run({"jwt": "eyJhbGci...", "event": "test"})
        assert result["jwt"] == "[REDACTED]"

    def test_secret_is_redacted(self) -> None:
        result = _run({"secret": "super-secret", "event": "test"})
        assert result["secret"] == "[REDACTED]"

    def test_raw_text_is_redacted(self) -> None:
        """Complaint raw_text must be redacted — it may contain PII."""
        data = {
            "raw_text": "My name is John and I live at 123 Main St",
            "event": "test",
        }
        result = _run(data)
        assert result["raw_text"] == "[REDACTED]"

    def test_service_role_key_is_redacted(self) -> None:
        result = _run({"service_role_key": "eyJ...", "event": "test"})
        assert result["service_role_key"] == "[REDACTED]"

    def test_safe_fields_are_not_redacted(self) -> None:
        result = _run({
            "event": "complaint_created",
            "complaint_id": "CP-X7k2mN4qVpRsLwYzJb8nDg",
            "status": "reported",
            "department_id": "some-uuid",
            "duration_ms": 42.5,
        })
        assert result["event"] == "complaint_created"
        assert result["complaint_id"] == "CP-X7k2mN4qVpRsLwYzJb8nDg"
        assert result["status"] == "reported"
        assert result["department_id"] == "some-uuid"
        assert result["duration_ms"] == 42.5

    def test_event_key_is_not_redacted(self) -> None:
        """The 'event' key itself must never be redacted."""
        result = _run({"event": "user_login_attempt"})
        assert result["event"] == "user_login_attempt"

    def test_multiple_pii_fields_all_redacted(self) -> None:
        result = _run({
            "event": "test",
            "submitter_contact": "user@example.com",
            "password": "hunter2",
            "token": "abc",
            "safe_field": "this is fine",
        })
        assert result["submitter_contact"] == "[REDACTED]"
        assert result["password"] == "[REDACTED]"
        assert result["token"] == "[REDACTED]"
        assert result["safe_field"] == "this is fine"
