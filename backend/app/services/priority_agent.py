"""
Priority Agent — Deterministic Priority Scoring Formula.

Scoring Formula (Section 9 of Implementation Plan):
  base = 0

  + severity_score:
      critical = 40, high = 30, medium = 15, low = 5

  + safety_risk_bonus:
      is_safety_risk == true -> +20

  + recurrence_score:
      related complaints in last 30 days:
      >= 5 -> +15
      >= 2 -> +10
      < 2  -> +0

  + category_baseline:
      category.default_priority -> critical (+10), high (+5), medium (+2), low (+0)

  TOTAL SCORE MAPPING:
    >= 60 -> CRITICAL
    >= 40 -> HIGH
    >= 20 -> MEDIUM
    < 20  -> LOW
"""

from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.category import ComplaintCategory
from app.models.complaint import Complaint
from app.schemas.enums import ComplaintPriority, ComplaintStatus


class PriorityAgent:
    """Agent calculating deterministic priority scores and priority levels."""

    async def calculate_priority(
        self,
        complaint: Complaint,
        db: AsyncSession,
        ai_severity: str | None = None,
    ) -> tuple[int, ComplaintPriority]:
        """
        Calculate auditable priority score (0-100+) and ComplaintPriority level.

        Returns tuple of (priority_score, ComplaintPriority).
        """
        score = 0

        # 1. Severity Score
        sev = (ai_severity or "medium").lower()
        if sev == "critical":
            score += 40
        elif sev == "high":
            score += 30
        elif sev == "medium":
            score += 15
        else:
            score += 5

        # 2. Safety Risk Bonus
        if complaint.is_safety_risk:
            score += 20

        # 3. Recurrence Score (same category in last 30 days)
        if complaint.category_id:
            thirty_days_ago = datetime.now(tz=UTC) - timedelta(days=30)
            rec_res = await db.execute(
                select(func.count(Complaint.id)).where(
                    Complaint.category_id == complaint.category_id,
                    Complaint.created_at >= thirty_days_ago,
                    Complaint.status.not_in(
                        [ComplaintStatus.REJECTED, ComplaintStatus.CLOSED]
                    ),
                )
            )
            count = rec_res.scalar_one_or_none() or 0
            if count >= 5:
                score += 15
            elif count >= 2:
                score += 10

        # 4. Category Baseline Bonus
        if complaint.category_id:
            cat_res = await db.execute(
                select(ComplaintCategory).where(
                    ComplaintCategory.id == complaint.category_id
                )
            )
            cat = cat_res.scalar_one_or_none()
            if cat:
                cat_prio = cat.default_priority
                if cat_prio == ComplaintPriority.CRITICAL:
                    score += 10
                elif cat_prio == ComplaintPriority.HIGH:
                    score += 5
                elif cat_prio == ComplaintPriority.MEDIUM:
                    score += 2

        # 5. Map Total Score to ComplaintPriority Enum
        if score >= 60:
            priority_enum = ComplaintPriority.CRITICAL
        elif score >= 40:
            priority_enum = ComplaintPriority.HIGH
        elif score >= 20:
            priority_enum = ComplaintPriority.MEDIUM
        else:
            priority_enum = ComplaintPriority.LOW

        return score, priority_enum
