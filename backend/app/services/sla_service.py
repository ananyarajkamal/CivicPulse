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

        # 4. Compute breached flag
        now = datetime.now(tz=UTC)
        is_terminal = complaint.status in (
            ComplaintStatus.RESOLVED,
            ComplaintStatus.CLOSED,
            ComplaintStatus.REJECTED,
        )
        sla_breached = not is_terminal and (now > sla_deadline)

        return sla_deadline, sla_breached
