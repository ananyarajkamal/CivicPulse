"""
Unit tests verifying CitizenComplaintResponse is a correct public boundary.

These tests verify that:
  1. CitizenComplaintResponse contains ONLY the 12 approved fields
  2. CitizenComplaintResponse does NOT contain any of the 13 excluded fields
  3. The schema is correctly configured (frozen, from_attributes)
  4. The tracking_id field validates against the canonical format
  5. Optional voluntary contact fields are absent from the schema

These are static/structural tests — they do not require a database connection.
"""

from datetime import UTC, datetime

import pytest
from pydantic import ValidationError

from app.schemas.complaint import CitizenComplaintResponse
from app.schemas.enums import ComplaintPriority, ComplaintStatus

# Fields that MUST be in CitizenComplaintResponse
REQUIRED_PUBLIC_FIELDS = {
    "tracking_id",
    "status",
    "title",
    "category",
    "department",
    "priority",
    "location_address",
    "sla_deadline",
    "sla_breached",
    "created_at",
    "updated_at",
    "timeline",
}

# Fields that MUST NOT be in CitizenComplaintResponse under any circumstances
PROHIBITED_FIELDS = {
    "id",
    "raw_text",
    "submitter_name",
    "submitter_contact",
    "ai_classification_raw",
    "ai_confidence",
    "priority_score",
    "duplicate_of",
    "assigned_to",
    "location_lat",
    "location_lng",
    "ward",
    "resolution_notes",
}


class TestCitizenComplaintResponseStructure:
    """Verify the public DTO structure is correct."""

    def test_all_approved_fields_are_present(self) -> None:
        schema_fields = set(CitizenComplaintResponse.model_fields.keys())
        missing = REQUIRED_PUBLIC_FIELDS - schema_fields
        assert not missing, (
            f"Required public fields missing from CitizenComplaintResponse: {missing}"
        )

    def test_no_prohibited_fields_are_present(self) -> None:
        """
        CRITICAL: Verify that no internal/PII fields leak into the public DTO.

        This test is the static enforcement of the column-level exposure boundary.
        If this test fails, internal data may be exposed to anonymous users.
        """
        schema_fields = set(CitizenComplaintResponse.model_fields.keys())
        exposed = schema_fields & PROHIBITED_FIELDS
        assert not exposed, (
            f"SECURITY: Internal/PII fields exposed: {exposed}\n"
            "These fields must NEVER appear in the public tracking response."
        )

    def test_submitter_contact_not_exposed(self) -> None:
        """Explicit targeted test for voluntary contact PII."""
        assert "submitter_contact" not in CitizenComplaintResponse.model_fields

    def test_submitter_name_not_exposed(self) -> None:
        """Explicit targeted test for voluntary name PII."""
        assert "submitter_name" not in CitizenComplaintResponse.model_fields

    def test_raw_text_not_exposed(self) -> None:
        """Complaint text must never be in the public response."""
        assert "raw_text" not in CitizenComplaintResponse.model_fields

    def test_assigned_to_not_exposed(self) -> None:
        """Officer identity must never be in the public response."""
        assert "assigned_to" not in CitizenComplaintResponse.model_fields

    def test_internal_uuid_not_exposed(self) -> None:
        """Internal database UUID must never be exposed."""
        assert "id" not in CitizenComplaintResponse.model_fields

    def test_raw_coordinates_not_exposed(self) -> None:
        """Raw lat/lng must not be exposed — only display address."""
        assert "location_lat" not in CitizenComplaintResponse.model_fields
        assert "location_lng" not in CitizenComplaintResponse.model_fields

    def test_schema_is_frozen(self) -> None:
        """Schema must be immutable after construction."""
        assert CitizenComplaintResponse.model_config.get("frozen") is True

    def test_schema_has_from_attributes(self) -> None:
        """Schema must support construction from ORM objects."""
        assert CitizenComplaintResponse.model_config.get("from_attributes") is True

    def test_tracking_id_pattern_validation(self) -> None:
        """tracking_id field must validate against the canonical pattern."""
        now = datetime.now(tz=UTC)
        valid = CitizenComplaintResponse(
            tracking_id="CP-X7k2mN4qVpRsLwYzJb8nDg",
            status=ComplaintStatus.REPORTED,
            priority=ComplaintPriority.MEDIUM,
            sla_breached=False,
            created_at=now,
            timeline=[],
        )
        assert valid.tracking_id == "CP-X7k2mN4qVpRsLwYzJb8nDg"

    def test_invalid_tracking_id_rejected(self) -> None:
        """Schema must reject tracking IDs that don't match the canonical pattern."""
        now = datetime.now(tz=UTC)
        with pytest.raises(ValidationError):
            CitizenComplaintResponse(
                tracking_id="INVALID-ID",
                status=ComplaintStatus.REPORTED,
                priority=ComplaintPriority.MEDIUM,
                sla_breached=False,
                created_at=now,
                timeline=[],
            )

    def test_old_48bit_tracking_id_rejected(self) -> None:
        """The old 48-bit / 10-char format must be rejected by the schema."""
        now = datetime.now(tz=UTC)
        with pytest.raises(ValidationError):
            CitizenComplaintResponse(
                tracking_id="CP-K7MXQ2NVPF",  # Old 48-bit format
                status=ComplaintStatus.REPORTED,
                priority=ComplaintPriority.MEDIUM,
                sla_breached=False,
                created_at=now,
                timeline=[],
            )

    def test_optional_fields_default_to_none(self) -> None:
        """Optional fields must have sensible defaults (None or [])."""
        now = datetime.now(tz=UTC)
        response = CitizenComplaintResponse(
            tracking_id="CP-X7k2mN4qVpRsLwYzJb8nDg",
            status=ComplaintStatus.REPORTED,
            priority=ComplaintPriority.LOW,
            sla_breached=False,
            created_at=now,
            timeline=[],
        )
        assert response.title is None
        assert response.category is None
        assert response.department is None
        assert response.location_address is None
        assert response.sla_deadline is None
        assert response.updated_at is None
        assert response.timeline == []
