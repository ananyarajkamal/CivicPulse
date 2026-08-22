"""
Complaint Status History ORM model (TABLE 6 in implementation_plan.md).
"""

import uuid
from datetime import UTC, datetime

from sqlalchemy import DateTime, ForeignKey, Text
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.schemas.enums import ComplaintStatus


class ComplaintStatusHistory(Base):
    __tablename__ = "complaint_status_history"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    complaint_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("complaints.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    from_status: Mapped[ComplaintStatus | None] = mapped_column(
        SQLEnum(ComplaintStatus, name="status_enum", create_type=False),
        nullable=True,
    )
    to_status: Mapped[ComplaintStatus] = mapped_column(
        SQLEnum(ComplaintStatus, name="status_enum", create_type=False),
        nullable=False,
    )
    changed_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(tz=UTC),
        nullable=False,
    )

    # Relationships
    complaint = relationship("Complaint", back_populates="status_history")
