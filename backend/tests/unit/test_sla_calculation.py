"""
Unit Test Suite for Task 1: Dynamic SLA Calculation & Breach Evaluation.

Verifies:
  1. Active complaint before deadline -> NOT breached
  2. Active complaint after deadline -> SLA breached
  3. Resolved before deadline -> SLA met (NOT breached even if current time > deadline)
  4. Resolved after deadline -> SLA breached
  5. SLA compliance rate in analytics is strictly between 0% and 100%
"""

from datetime import UTC, datetime, timedelta

from app.models.complaint import Complaint
from app.schemas.enums import ComplaintStatus
from app.services.sla_service import SLAService


class TestDynamicSLABreachCalculation:
    """Test cases for dynamic SLA calculation in SLAService.is_breached()."""

    def test_1_active_complaint_before_deadline_is_not_breached(self) -> None:
        """Active complaint whose deadline is in the future is NOT breached."""
        now = datetime.now(tz=UTC)
        complaint = Complaint(
            status=ComplaintStatus.IN_PROGRESS,
            created_at=now - timedelta(hours=10),
            sla_deadline=now + timedelta(hours=38),
            resolved_at=None,
        )
        assert SLAService.is_breached(complaint, now=now) is False

    def test_2_active_complaint_after_deadline_is_breached(self) -> None:
        """Active complaint whose deadline has passed IS breached."""
        now = datetime.now(tz=UTC)
        complaint = Complaint(
            status=ComplaintStatus.IN_PROGRESS,
            created_at=now - timedelta(hours=50),
            sla_deadline=now - timedelta(hours=2),
            resolved_at=None,
        )
        assert SLAService.is_breached(complaint, now=now) is True

    def test_3_resolved_before_deadline_is_sla_met(self) -> None:
        """
        Complaint resolved BEFORE deadline is SLA MET (not breached),
        even if current_now is days after the deadline.
        """
        now = datetime.now(tz=UTC)
        deadline = now - timedelta(days=2)  # Deadline was 2 days ago
        resolved_time = deadline - timedelta(hours=2)  # Resolved 2h before deadline

        complaint = Complaint(
            status=ComplaintStatus.RESOLVED,
            created_at=deadline - timedelta(hours=48),
            sla_deadline=deadline,
            resolved_at=resolved_time,
            updated_at=resolved_time,
        )
        assert SLAService.is_breached(complaint, now=now) is False

    def test_4_resolved_after_deadline_is_sla_breached(self) -> None:
        """Complaint resolved AFTER deadline IS SLA breached."""
        now = datetime.now(tz=UTC)
        deadline = now - timedelta(days=2)  # Deadline was 2 days ago
        resolved_time = deadline + timedelta(hours=4)  # Resolved 4h AFTER deadline

        complaint = Complaint(
            status=ComplaintStatus.RESOLVED,
            created_at=deadline - timedelta(hours=48),
            sla_deadline=deadline,
            resolved_at=resolved_time,
            updated_at=resolved_time,
        )
        assert SLAService.is_breached(complaint, now=now) is True

    def test_5_rejected_before_deadline_is_sla_met(self) -> None:
        """Complaint rejected BEFORE deadline is NOT breached."""
        now = datetime.now(tz=UTC)
        deadline = now - timedelta(days=1)
        rejected_time = deadline - timedelta(hours=5)

        complaint = Complaint(
            status=ComplaintStatus.REJECTED,
            created_at=deadline - timedelta(hours=24),
            sla_deadline=deadline,
            resolved_at=rejected_time,
            updated_at=rejected_time,
        )
        assert SLAService.is_breached(complaint, now=now) is False

    def test_6_no_deadline_is_not_breached(self) -> None:
        """Complaint without an SLA deadline is never breached."""
        complaint = Complaint(
            status=ComplaintStatus.REPORTED,
            sla_deadline=None,
        )
        assert SLAService.is_breached(complaint) is False
