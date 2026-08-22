"""
Routing Agent — Category & Keyword-based Department Routing.

Logic:
  1. Primary: Database-driven lookup via ComplaintCategory.department_id
  2. Secondary: Keyword-based matching against active Department codes and names
  3. Fallback: Returns None (unrouted state for manual admin review)
"""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.category import ComplaintCategory
from app.models.complaint import Complaint
from app.models.department import Department


class RoutingAgent:
    """Agent responsible for deterministic database-driven department routing."""

    async def route_complaint(
        self,
        complaint: Complaint,
        db: AsyncSession,
    ) -> uuid.UUID | None:
        """
        Determine target department_id for a complaint.

        Returns UUID of target department or None if unroutable.
        """
        # 1. Primary: Category-based routing
        if complaint.category_id:
            cat_res = await db.execute(
                select(ComplaintCategory).where(
                    ComplaintCategory.id == complaint.category_id
                )
            )
            cat = cat_res.scalar_one_or_none()
            if cat and cat.department_id:
                return cat.department_id

        # 2. If department_id is already assigned, preserve it
        if complaint.department_id:
            return complaint.department_id

        # 3. Secondary: Keyword matching against department codes/names in raw_text
        text_lower = complaint.raw_text.lower()
        dept_res = await db.execute(
            select(Department).where(Department.is_active.is_(True))
        )
        departments = dept_res.scalars().all()

        for dept in departments:
            if dept.code.lower() in text_lower or dept.name.lower() in text_lower:
                return dept.id

        # 4. Fallback: Unrouted state
        return None
