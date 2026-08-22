"""
Public Complaint Categories router (/api/v1/categories).
"""

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.category import ComplaintCategory
from app.schemas.category import CategoryResponse

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get(
    "",
    response_model=list[CategoryResponse],
    summary="List active categories",
    description="Returns public list of active complaint categories.",
)
async def list_categories(
    db: AsyncSession = Depends(get_db),
) -> list[CategoryResponse]:
    """Return all active complaint categories."""
    result = await db.execute(
        select(ComplaintCategory)
        .where(ComplaintCategory.is_active.is_(True))
        .order_by(ComplaintCategory.name)
    )
    categories = result.scalars().all()
    return [CategoryResponse.model_validate(c) for c in categories]
