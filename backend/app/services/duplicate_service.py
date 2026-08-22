"""
Duplicate Detection Service — Deterministic Location & Category Clustering.

Logic (Section 9 of Implementation Plan):
  SELECT id FROM complaints
  WHERE category_id = :new_category
    AND (ward = :new_ward OR distance < 500m)
    AND created_at > now() - interval '7 days'
    AND status NOT IN ('rejected', 'closed')

  - If 1 result: link in related_complaints join table
  - If >= 3 results: mark as likely duplicate (set duplicate_of FK)
"""

import uuid
from datetime import UTC, datetime, timedelta
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.complaint import Complaint
from app.models.related_complaint import RelatedComplaint
from app.schemas.enums import ComplaintStatus


class DuplicateService:
    """Service performing deterministic duplicate detection and linking."""

    async def process_duplicates(
        self,
        complaint: Complaint,
        db: AsyncSession,
    ) -> tuple[uuid.UUID | None, int]:
        """
        Check for duplicate/related complaints within 7-day window.

        Returns tuple of (duplicate_of_id, count_of_related).
        """
        if not complaint.category_id:
            return None, 0

        seven_days_ago = datetime.now(tz=UTC) - timedelta(days=7)

        query = select(Complaint).where(
            Complaint.id != complaint.id,
            Complaint.category_id == complaint.category_id,
            Complaint.created_at >= seven_days_ago,
            Complaint.status.not_in(
                [ComplaintStatus.REJECTED, ComplaintStatus.CLOSED]
            ),
        )
        res = await db.execute(query)
        candidates = res.scalars().all()

        related_matches: list[Complaint] = []

        for cand in candidates:
            is_match = False
            method = "category"
            sim = Decimal("0.7000")

            # Check lat/lng proximity (< 0.005 degrees ~ 500m)
            if (
                complaint.location_lat is not None
                and complaint.location_lng is not None
                and cand.location_lat is not None
                and cand.location_lng is not None
            ):
                lat_diff = abs(float(complaint.location_lat) - float(cand.location_lat))
                lng_diff = abs(float(complaint.location_lng) - float(cand.location_lng))
                if lat_diff < 0.005 and lng_diff < 0.005:
                    is_match = True
                    method = "location_category"
                    sim = Decimal("0.9000")

            # Check location text match
            elif (
                complaint.location_address
                and cand.location_address
                and (
                    complaint.location_address.strip().lower()
                    == cand.location_address.strip().lower()
                )
            ):
                is_match = True
                method = "address_match"
                sim = Decimal("0.9500")

            if is_match:
                related_matches.append(cand)
                # Link in related_complaints table
                link = RelatedComplaint(
                    complaint_id=complaint.id,
                    related_id=cand.id,
                    similarity_score=sim,
                    detection_method=method,
                )
                db.add(link)

        await db.flush()

        duplicate_of_id: uuid.UUID | None = None
        if len(related_matches) >= 3:
            # Point to earliest candidate as canonical duplicate
            earliest = min(related_matches, key=lambda c: c.created_at)
            duplicate_of_id = earliest.id

        return duplicate_of_id, len(related_matches)
