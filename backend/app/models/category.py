"""
Complaint Category ORM model (TABLE 2 in implementation_plan.md).
"""

import uuid
from datetime import UTC, datetime

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.dialects.postgresql import ARRAY, TEXT, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.schemas.enums import ComplaintPriority


class ComplaintCategory(Base):
    __tablename__ = "complaint_categories"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    department_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("departments.id", ondelete="RESTRICT"),
        nullable=False,
    )
    default_priority: Mapped[ComplaintPriority] = mapped_column(
        SQLEnum(ComplaintPriority, name="priority_enum", create_type=False),
        nullable=False,
        default=ComplaintPriority.MEDIUM,
    )
    default_sla_hours: Mapped[int | None] = mapped_column(Integer, nullable=True)
    keywords: Mapped[list[str] | None] = mapped_column(
        JSON().with_variant(ARRAY(TEXT), "postgresql"), nullable=True
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(tz=UTC),
        nullable=False,
    )

    # Relationships
    department = relationship("Department", back_populates="categories")
    complaints = relationship("Complaint", back_populates="category")
