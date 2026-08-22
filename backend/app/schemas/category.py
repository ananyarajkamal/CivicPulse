"""
Category response schemas.
"""

import uuid

from pydantic import BaseModel, ConfigDict

from app.schemas.enums import ComplaintPriority


class CategoryResponse(BaseModel):
    """Public complaint category item."""

    model_config = ConfigDict(from_attributes=True, frozen=True)

    id: uuid.UUID
    name: str
    department_id: uuid.UUID
    default_priority: ComplaintPriority
    default_sla_hours: int | None = None
    keywords: list[str] | None = None
    is_active: bool
