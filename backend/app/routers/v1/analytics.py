"""
Analytics & City Intelligence Router (/api/v1/analytics).

Endpoints:
    GET /analytics/summary   — Department, category, priority & status breakdowns
    GET /analytics/trends    — Complaint volume trend over time
    GET /analytics/hotspots  — Geographic complaint concentration & clusters
"""

import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_officer
from app.models.category import ComplaintCategory
from app.models.complaint import Complaint
from app.models.department import Department
from app.models.user import User
from app.schemas.analytics import (
    AnalyticsSummaryResponse,
    CategoryBreakdownItem,
    DepartmentBreakdownItem,
    HotspotClusterItem,
    PriorityBreakdownItem,
    StatusBreakdownItem,
    TrendDataPoint,
)
from app.schemas.enums import ComplaintStatus, UserRole
from app.services.sla_service import SLAService

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get(
    "/summary",
    response_model=AnalyticsSummaryResponse,
    summary="Get analytics summary metrics",
)
async def get_analytics_summary(
    current_user: User = Depends(get_current_officer),
    db: AsyncSession = Depends(get_db),
) -> AnalyticsSummaryResponse:
    """
    Staff-only endpoint: Compute aggregated distribution & SLA metrics.

    RBAC Scoping:
      - Municipal Officers receive metrics for their assigned department only.
      - Admins receive city-wide metrics across all departments.
    """
    dept_id = (
        current_user.department_id
        if current_user.role == UserRole.MUNICIPAL_OFFICER
        else None
    )

    # 1. Base count & SLA rate query
    base_stmt = select(Complaint)
    if dept_id:
        base_stmt = base_stmt.where(Complaint.department_id == dept_id)

    res = await db.execute(base_stmt)
    complaints = res.scalars().all()

    total = len(complaints)
    non_breached = sum(1 for c in complaints if not SLAService.is_breached(c))
    sla_rate = round((non_breached / total * 100.0), 1) if total > 0 else 100.0

    # 2. Priority Breakdown
    prio_stmt = select(Complaint.priority, func.count(Complaint.id))
    if dept_id:
        prio_stmt = prio_stmt.where(Complaint.department_id == dept_id)
    prio_stmt = prio_stmt.group_by(Complaint.priority)
    prio_res = await db.execute(prio_stmt)
    priorities = [
        PriorityBreakdownItem(priority=p.value, count=cnt) for p, cnt in prio_res.all()
    ]

    # 3. Status Breakdown
    status_stmt = select(Complaint.status, func.count(Complaint.id))
    if dept_id:
        status_stmt = status_stmt.where(Complaint.department_id == dept_id)
    status_stmt = status_stmt.group_by(Complaint.status)
    status_res = await db.execute(status_stmt)
    statuses = [
        StatusBreakdownItem(status=st.value, count=cnt) for st, cnt in status_res.all()
    ]

    # 4. Category Breakdown
    cat_stmt = select(ComplaintCategory.name, func.count(Complaint.id)).join(
        ComplaintCategory, Complaint.category_id == ComplaintCategory.id
    )
    if dept_id:
        cat_stmt = cat_stmt.where(Complaint.department_id == dept_id)
    cat_stmt = cat_stmt.group_by(ComplaintCategory.name)
    cat_res = await db.execute(cat_stmt)
    categories = [
        CategoryBreakdownItem(category_name=cname, count=cnt)
        for cname, cnt in cat_res.all()
    ]

    # 5. Department Breakdown
    dept_stmt = select(Department.name, func.count(Complaint.id)).join(
        Department, Complaint.department_id == Department.id
    )
    if dept_id:
        dept_stmt = dept_stmt.where(Complaint.department_id == dept_id)
    dept_stmt = dept_stmt.group_by(Department.name)
    dept_res = await db.execute(dept_stmt)
    departments = [
        DepartmentBreakdownItem(department_name=dname, count=cnt)
        for dname, cnt in dept_res.all()
    ]

    return AnalyticsSummaryResponse(
        total_complaints=total,
        sla_compliance_rate=sla_rate,
        categories=categories,
        departments=departments,
        priorities=priorities,
        statuses=statuses,
    )


@router.get(
    "/trends",
    response_model=list[TrendDataPoint],
    summary="Get complaint volume trends",
)
async def get_analytics_trends(
    days: int = 30,
    current_user: User = Depends(get_current_officer),
    db: AsyncSession = Depends(get_db),
) -> list[TrendDataPoint]:
    """
    Staff-only endpoint: Compute complaint volume trend aggregated by date.
    """
    dept_id = (
        current_user.department_id
        if current_user.role == UserRole.MUNICIPAL_OFFICER
        else None
    )

    since_date = datetime.now(tz=UTC) - timedelta(days=days)

    stmt = select(Complaint.created_at)
    if dept_id:
        stmt = stmt.where(Complaint.department_id == dept_id)
    stmt = stmt.where(Complaint.created_at >= since_date)

    res = await db.execute(stmt)
    timestamps = res.scalars().all()

    # Aggregate by YYYY-MM-DD date string
    date_counts: dict[str, int] = {}
    for ts in timestamps:
        dt_str = ts.strftime("%Y-%m-%d")
        date_counts[dt_str] = date_counts.get(dt_str, 0) + 1

    sorted_dates = sorted(date_counts.keys())
    return [TrendDataPoint(date=d, count=date_counts[d]) for d in sorted_dates]


@router.get(
    "/hotspots",
    response_model=list[HotspotClusterItem],
    summary="Get geographic complaint hotspots",
)
async def get_analytics_hotspots(
    current_user: User = Depends(get_current_officer),
    db: AsyncSession = Depends(get_db),
) -> list[HotspotClusterItem]:
    """
    Staff-only endpoint: Aggregate complaint locations into geographic hotspot clusters.
    """
    dept_id = (
        current_user.department_id
        if current_user.role == UserRole.MUNICIPAL_OFFICER
        else None
    )

    stmt = (
        select(
            Complaint.location_text,
            Complaint.location_address,
            Complaint.location_lat,
            Complaint.location_lng,
            Complaint.status,
            Complaint.priority,
            ComplaintCategory.name.label("category_name"),
            Department.name.label("department_name"),
        )
        .outerjoin(ComplaintCategory, Complaint.category_id == ComplaintCategory.id)
        .outerjoin(Department, Complaint.department_id == Department.id)
        .where(Complaint.status != ComplaintStatus.REJECTED)
    )

    if dept_id:
        stmt = stmt.where(Complaint.department_id == dept_id)

    res = await db.execute(stmt)
    rows = res.all()

    prio_order = {"critical": 4, "high": 3, "medium": 2, "low": 1}
    clusters: dict[str, dict[str, Any]] = {}

    for loc_text, loc_addr, lat, lng, st_val, prio_val, cat_name, dept_name in rows:
        label = loc_addr or loc_text or "General Municipal Area"
        # Geographic coordinate tolerance (~0.005 deg precision) or normalized address
        if lat is not None and lng is not None:
            key = f"{round(float(lat), 3):.3f},{round(float(lng), 3):.3f}"
        else:
            key = label.strip().lower()

        if key not in clusters:
            clusters[key] = {
                "id": str(uuid.uuid5(uuid.NAMESPACE_DNS, key)),
                "location_name": label.strip(),
                "latitude": float(lat) if lat is not None else 40.7128,
                "longitude": float(lng) if lng is not None else -74.0060,
                "complaint_count": 0,
                "open_cases": 0,
                "resolved_cases": 0,
                "categories": {},
                "departments": {},
                "priorities": [],
            }

        clusters[key]["complaint_count"] += 1

        curr_label = clusters[key]["location_name"]
        if label and len(label.strip()) < len(curr_label) and len(label.strip()) > 3:
            clusters[key]["location_name"] = label.strip()

        st_str = st_val.value if hasattr(st_val, "value") else str(st_val)
        if st_str.lower() in ["resolved", "closed"]:
            clusters[key]["resolved_cases"] += 1
        else:
            clusters[key]["open_cases"] += 1

        cat_label = cat_name or "Uncategorized"
        curr_cat_cnt = clusters[key]["categories"].get(cat_label, 0)
        clusters[key]["categories"][cat_label] = curr_cat_cnt + 1

        if dept_name:
            curr_dept_cnt = clusters[key]["departments"].get(dept_name, 0)
            clusters[key]["departments"][dept_name] = curr_dept_cnt + 1

        if prio_val:
            p_str = prio_val.value if hasattr(prio_val, "value") else str(prio_val)
            clusters[key]["priorities"].append(p_str.lower())

    sorted_clusters = sorted(
        clusters.values(), key=lambda c: c["complaint_count"], reverse=True
    )

    result_clusters = []
    for c in sorted_clusters:
        cats_dict = c["categories"]
        top_cat = (
            max(cats_dict.items(), key=lambda x: x[1])[0]
            if cats_dict
            else "Uncategorized"
        )

        depts_dict = c["departments"]
        top_dept = (
            max(depts_dict.items(), key=lambda x: x[1])[0] if depts_dict else None
        )

        prios = c["priorities"]
        highest_prio = (
            max(prios, key=lambda p: prio_order.get(p, 0)).capitalize()
            if prios
            else "Medium"
        )

        result_clusters.append(
            HotspotClusterItem(
                id=c["id"],
                location_name=c["location_name"],
                latitude=c["latitude"],
                longitude=c["longitude"],
                complaint_count=c["complaint_count"],
                primary_category=top_cat,
                department_name=top_dept,
                open_cases=c["open_cases"],
                resolved_cases=c["resolved_cases"],
                highest_priority=highest_prio,
            )
        )

    return result_clusters
