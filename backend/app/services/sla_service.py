"""
SLA Service — Computation of SLA Resolution Deadlines & Breach Status.

Config Hierarchy:
  1. Category default_sla_hours (if explicitly configured)
  2. Department default_sla_hours (if department assigned)
  3. Global fallback (48 hours)
"""

from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.category import ComplaintCategory
from app.models.complaint import Complaint
from app.models.department import Department
from app.schemas.enums import ComplaintStatus


class SLAService:
    """Service computing SLA resolution deadlines and breach statuses."""

    @staticmethod
    def is_breached(complaint: Complaint, now: datetime | None = None) -> bool:
        """
        Dynamically evaluate if a complaint is SLA breached.

        Rules (per Task 1):
        - If sla_deadline is None -> False (not breached)
        - If complaint is in terminal status (RESOLVED, CLOSED, REJECTED):
            Breached if completion timestamp > sla_deadline.
            Completion timestamp is complaint.resolved_at if present,
            else complaint.updated_at.
        - If complaint is active (REPORTED, ASSIGNED, IN_PROGRESS):
            Breached if current UTC time > sla_deadline.
        """
        if not complaint.sla_deadline:
            return False

        current_now = now or datetime.now(tz=UTC)

        deadline = (
            complaint.sla_deadline.replace(tzinfo=UTC)
            if complaint.sla_deadline.tzinfo is None
            else complaint.sla_deadline
        )

        is_terminal = complaint.status in (
            ComplaintStatus.RESOLVED,
            ComplaintStatus.CLOSED,
            ComplaintStatus.REJECTED,
        )

        if is_terminal:
            completion_time = complaint.resolved_at or complaint.updated_at
            if not completion_time:
                return False
            comp_dt = (
                completion_time.replace(tzinfo=UTC)
                if completion_time.tzinfo is None
                else completion_time
            )
            return comp_dt > deadline
        else:
            return current_now > deadline

    async def calculate_sla(
        self,
        complaint: Complaint,
        db: AsyncSession,
    ) -> tuple[datetime, bool]:
        """
        Calculate SLA deadline timestamp and breach status.

        Returns tuple of (sla_deadline, sla_breached).
        """
        sla_hours = 48  # Global fallback default

        # 1. Category SLA override
        if complaint.category_id:
            cat_res = await db.execute(
                select(ComplaintCategory).where(
                    ComplaintCategory.id == complaint.category_id
                )
            )
            cat = cat_res.scalar_one_or_none()
            if cat and cat.default_sla_hours is not None:
                sla_hours = cat.default_sla_hours
            elif cat and cat.department_id:
                dept_res = await db.execute(
                    select(Department).where(Department.id == cat.department_id)
                )
                dept = dept_res.scalar_one_or_none()
                if dept and dept.default_sla_hours:
                    sla_hours = dept.default_sla_hours

        # 2. Department SLA fallback
        elif complaint.department_id:
            dept_res = await db.execute(
                select(Department).where(Department.id == complaint.department_id)
            )
            dept = dept_res.scalar_one_or_none()
            if dept and dept.default_sla_hours:
                sla_hours = dept.default_sla_hours

        # 3. Compute deadline timestamp
        created = complaint.created_at or datetime.now(tz=UTC)
        sla_deadline = created + timedelta(hours=sla_hours)
        complaint.sla_deadline = sla_deadline

        # 4. Compute breached flag dynamically
        sla_breached = self.is_breached(complaint)

        return sla_deadline, sla_breached
