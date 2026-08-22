"""
Department response schemas.
"""

import uuid

from pydantic import BaseModel, ConfigDict


class DepartmentResponse(BaseModel):
    """Public department item."""

    model_config = ConfigDict(from_attributes=True, frozen=True)

    id: uuid.UUID
    name: str
    code: str
    description: str | None = None
    default_sla_hours: int
    is_active: bool
