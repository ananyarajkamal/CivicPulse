"""
Public Departments router (/api/v1/departments).
"""

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.department import Department
from app.schemas.department import DepartmentResponse

router = APIRouter(prefix="/departments", tags=["departments"])


@router.get(
    "",
    response_model=list[DepartmentResponse],
    summary="List active departments",
    description="Returns public list of active municipal departments.",
)
async def list_departments(
    db: AsyncSession = Depends(get_db),
) -> list[DepartmentResponse]:
    """Return all active departments."""
    result = await db.execute(
        select(Department)
        .where(Department.is_active.is_(True))
        .order_by(Department.name)
    )
    departments = result.scalars().all()
    return [DepartmentResponse.model_validate(d) for d in departments]
