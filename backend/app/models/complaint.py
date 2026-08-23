"""
Complaint ORM model (TABLE 4 in implementation_plan.md).

KEY DECISIONS PRESERVED:
    - tracking_id is VARCHAR(30) (128-bit entropy, CP-{22 chars})
    - submitter_name & submitter_contact are optional (NULLABLE)
    - submitted_by column does NOT exist (no citizen identity)
    - raw_text max 2000 chars
"""

import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy import (
    Enum as SQLEnum,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.schemas.enums import ComplaintPriority, ComplaintSource, ComplaintStatus


class Complaint(Base):
    __tablename__ = "complaints"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    tracking_id: Mapped[str] = mapped_column(
        String(30),
        unique=True,
        nullable=False,
        index=True,
    )
    submitter_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    submitter_contact: Mapped[str | None] = mapped_column(String(255), nullable=True)
    raw_text: Mapped[str] = mapped_column(Text, nullable=False)
    title: Mapped[str | None] = mapped_column(String(500), nullable=True)

    category_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("complaint_categories.id", ondelete="SET NULL"),
        nullable=True,
    )
    department_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("departments.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    priority: Mapped[ComplaintPriority] = mapped_column(
        SQLEnum(
            ComplaintPriority,
            name="priority_enum",
            values_callable=lambda x: [e.value for e in x],
            create_type=False,
        ),
        nullable=False,
        default=ComplaintPriority.MEDIUM,
        index=True,
    )
    status: Mapped[ComplaintStatus] = mapped_column(
        SQLEnum(
            ComplaintStatus,
            name="status_enum",
            values_callable=lambda x: [e.value for e in x],
            create_type=False,
        ),
        nullable=False,
        default=ComplaintStatus.REPORTED,
        index=True,
    )
    is_safety_risk: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    source: Mapped[ComplaintSource] = mapped_column(
        SQLEnum(
            ComplaintSource,
            name="source_enum",
            values_callable=lambda x: [e.value for e in x],
            create_type=False,
        ),
        nullable=False,
        default=ComplaintSource.WEB,
        server_default="web",
    )

    location_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    location_lat: Mapped[float | None] = mapped_column(Numeric(10, 8), nullable=True)
    location_lng: Mapped[float | None] = mapped_column(Numeric(11, 8), nullable=True)
    location_address: Mapped[str | None] = mapped_column(Text, nullable=True)
    ward: Mapped[str | None] = mapped_column(String(100), nullable=True)

    ai_classification_raw: Mapped[dict[str, Any] | None] = mapped_column(
        JSON().with_variant(JSONB, "postgresql"), nullable=True
    )
    ai_confidence: Mapped[float | None] = mapped_column(Numeric(5, 4), nullable=True)
    priority_score: Mapped[int | None] = mapped_column(Integer, nullable=True)

    duplicate_of: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("complaints.id", ondelete="SET NULL"),
        nullable=True,
    )
    assigned_to: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    sla_deadline: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    sla_breached: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    resolved_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    resolution_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(tz=UTC),
        nullable=False,
        index=True,
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        onupdate=lambda: datetime.now(tz=UTC),
        nullable=True,
    )

    # Relationships
    department = relationship("Department", back_populates="complaints")
    category = relationship("ComplaintCategory", back_populates="complaints")
    assigned_officer = relationship(
        "User",
        back_populates="assigned_complaints",
        foreign_keys=[assigned_to],
    )
    status_history = relationship(
        "ComplaintStatusHistory",
        back_populates="complaint",
        cascade="all, delete-orphan",
    )
    comments = relationship(
        "ComplaintComment",
        back_populates="complaint",
        cascade="all, delete-orphan",
    )
    ai_logs = relationship(
        "AIProcessingLog",
        back_populates="complaint",
        cascade="all, delete-orphan",
    )
