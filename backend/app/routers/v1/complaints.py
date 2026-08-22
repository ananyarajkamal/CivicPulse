"""
Public & Staff Complaints router (/api/v1/complaints).

Endpoints:
    POST /complaints                  — Submit anonymous complaint (triggers AI)
    GET  /complaints/track/{tracking_id} — Public status tracker
    GET  /complaints/{complaint_id}  — Staff detailed complaint view
"""

import html
import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.ai.intelligence_agent import IntelligenceAgent
from app.database import get_db
from app.dependencies import get_current_officer
from app.models.category import ComplaintCategory
from app.models.comment import ComplaintComment
from app.models.complaint import Complaint
from app.models.related_complaint import RelatedComplaint
from app.models.status_history import ComplaintStatusHistory
from app.models.user import User
from app.schemas.complaint import (
    AILogEntry,
    AssignOfficerRequest,
    CitizenComplaintResponse,
    CommentCreateRequest,
    CommentResponse,
    ComplaintCreateRequest,
    ComplaintCreateResponse,
    KPIResponse,
    RelatedComplaintResponse,
    StaffComplaintDetailResponse,
    StatusUpdateRequest,
    TimelineEntry,
)
from app.schemas.enums import ComplaintPriority, ComplaintStatus, UserRole
from app.services.duplicate_service import DuplicateService
from app.services.priority_agent import PriorityAgent
from app.services.routing_agent import RoutingAgent
from app.services.sla_service import SLAService
from app.utils.tracking import generate_tracking_id, validate_tracking_id

router = APIRouter(prefix="/complaints", tags=["complaints"])
limiter = Limiter(key_func=get_remote_address)


@router.post(
    "",
    response_model=ComplaintCreateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit citizen complaint",
    description="Submit an anonymous complaint. Returns a tracking ID.",
)
@limiter.limit("5/minute")
async def submit_complaint(
    request: Request,
    payload: ComplaintCreateRequest,
    db: AsyncSession = Depends(get_db),
) -> ComplaintCreateResponse:
    """Submit anonymous citizen complaint and run AI classification."""
    # 1. Sanitize text input (HTML escaping)
    sanitized_text = html.escape(payload.raw_text.strip())

    # 2. Parse category and department UUIDs if provided
    cat_uuid: uuid.UUID | None = None
    if payload.category_id:
        try:
            cat_uuid = uuid.UUID(payload.category_id)
        except ValueError:
            cat_uuid = None

    dept_uuid: uuid.UUID | None = None
    if payload.department_id:
        try:
            dept_uuid = uuid.UUID(payload.department_id)
        except ValueError:
            dept_uuid = None

    # If category_id provided, fetch category to infer department if missing
    if cat_uuid and not dept_uuid:
        cat_res = await db.execute(
            select(ComplaintCategory).where(ComplaintCategory.id == cat_uuid)
        )
        cat_obj = cat_res.scalar_one_or_none()
        if cat_obj:
            dept_uuid = cat_obj.department_id

    # 3. Generate 128-bit cryptographically secure tracking ID
    tracking_id = generate_tracking_id()

    # 4. Create Complaint record
    now = datetime.now(tz=UTC)
    sub_name = payload.submitter_name.strip() if payload.submitter_name else None
    sub_contact = (
        payload.submitter_contact.strip() if payload.submitter_contact else None
    )
    loc_text = payload.location_text.strip() if payload.location_text else None
    loc_addr = (
        payload.location_address.strip() if payload.location_address else None
    )

    complaint = Complaint(
        tracking_id=tracking_id,
        submitter_name=sub_name,
        submitter_contact=sub_contact,
        raw_text=sanitized_text,
        location_text=loc_text,
        location_lat=payload.location_lat,
        location_lng=payload.location_lng,
        location_address=loc_addr,
        category_id=cat_uuid,
        department_id=dept_uuid,
        status=ComplaintStatus.REPORTED,
        priority=ComplaintPriority.MEDIUM,
        created_at=now,
    )
    db.add(complaint)
    await db.flush()

    # 5. Record initial status history entry
    status_entry = ComplaintStatusHistory(
        complaint_id=complaint.id,
        from_status=None,
        to_status=ComplaintStatus.REPORTED,
        notes="Complaint registered by citizen",
        created_at=now,
    )
    db.add(status_entry)
    await db.flush()

    # 6. Trigger AI Intelligence Agent
    agent = IntelligenceAgent()
    ai_res = await agent.process_complaint(complaint.id, sanitized_text, db)
    ai_sev: str | None = None
    if ai_res:
        complaint.title = ai_res.summary_title
        complaint.is_safety_risk = ai_res.is_safety_risk
        complaint.ai_confidence = ai_res.confidence
        complaint.ai_classification_raw = ai_res.model_dump()
        ai_sev = ai_res.severity

        # Infer category if missing
        if not complaint.category_id and ai_res.category:
            cat_match = await db.execute(
                select(ComplaintCategory).where(
                    ComplaintCategory.name.ilike(f"%{ai_res.category}%")
                )
            )
            matched_cat = cat_match.scalars().first()
            if matched_cat:
                complaint.category_id = matched_cat.id
                if not complaint.department_id:
                    complaint.department_id = matched_cat.department_id

    # 7. Phase 5: Routing Agent
    routed_dept_id = await RoutingAgent().route_complaint(complaint, db)
    if routed_dept_id:
        complaint.department_id = routed_dept_id

    # 8. Phase 5: Duplicate Detection Service
    dupe_id, _ = await DuplicateService().process_duplicates(complaint, db)
    if dupe_id:
        complaint.duplicate_of = dupe_id

    # 9. Phase 5: Priority Agent
    p_score, p_enum = await PriorityAgent().calculate_priority(
        complaint, db, ai_severity=ai_sev
    )
    complaint.priority_score = p_score
    complaint.priority = p_enum

    # 10. Phase 5: SLA Service
    deadline, breached = await SLAService().calculate_sla(complaint, db)
    complaint.sla_deadline = deadline
    complaint.sla_breached = breached

    await db.commit()

    return ComplaintCreateResponse(
        tracking_id=tracking_id,
        status=ComplaintStatus.REPORTED,
        created_at=now,
    )


@router.get(
    "/track/{tracking_id}",
    response_model=CitizenComplaintResponse,
    summary="Track complaint status",
    description="Public citizen-safe tracker. Returns only safe fields.",
)
@limiter.limit("30/minute")
async def track_complaint(
    request: Request,
    tracking_id: str,
    db: AsyncSession = Depends(get_db),
) -> CitizenComplaintResponse:
    """Return public citizen complaint status."""
    # 1. Validate tracking ID format strictly against ^CP-[A-Za-z0-9_-]{22}$
    if not validate_tracking_id(tracking_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Complaint not found.",
        )

    # 2. Query DB for complaint with relations
    result = await db.execute(
        select(Complaint)
        .options(
            selectinload(Complaint.department),
            selectinload(Complaint.category),
            selectinload(Complaint.status_history),
        )
        .where(Complaint.tracking_id == tracking_id)
    )
    complaint = result.scalar_one_or_none()

    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Complaint not found.",
        )

    # 3. Build public status timeline history
    timeline: list[TimelineEntry] = []
    for h in sorted(complaint.status_history, key=lambda x: x.created_at):
        timeline.append(
            TimelineEntry(
                status=h.to_status,
                timestamp=h.created_at,
            )
        )

    # 4. Construct public DTO boundary (CitizenComplaintResponse)
    return CitizenComplaintResponse(
        tracking_id=complaint.tracking_id,
        status=complaint.status,
        title=complaint.title,
        category=complaint.category.name if complaint.category else None,
        department=complaint.department.name if complaint.department else None,
        priority=complaint.priority,
        location_address=complaint.location_address or complaint.location_text,
        sla_deadline=complaint.sla_deadline,
        sla_breached=complaint.sla_breached,
        created_at=complaint.created_at,
        updated_at=complaint.updated_at,
        timeline=timeline,
    )


@router.get(
    "/kpi",
    response_model=KPIResponse,
    summary="Get operational KPI metrics",
)
async def get_kpi_summary(
    current_user: User = Depends(get_current_officer),
    db: AsyncSession = Depends(get_db),
) -> KPIResponse:
    """
    Staff-only endpoint: Compute operational KPI summary metrics.

    Scoping:
      - Municipal Officers view metrics for their assigned department only.
      - Admins view global metrics across all departments.
    """
    base_query = select(
        Complaint.id,
        Complaint.status,
        Complaint.assigned_to,
        Complaint.sla_breached,
    )
    if current_user.role == UserRole.MUNICIPAL_OFFICER and current_user.department_id:
        base_query = base_query.where(
            Complaint.department_id == current_user.department_id
        )

    res = await db.execute(base_query)
    rows = res.all()

    total = len(rows)
    unassigned = sum(
        1 for r in rows if r.status == ComplaintStatus.REPORTED or r.assigned_to is None
    )
    in_progress = sum(
        1
        for r in rows
        if r.status in (ComplaintStatus.ASSIGNED, ComplaintStatus.IN_PROGRESS)
    )
    resolved = sum(
        1
        for r in rows
        if r.status in (ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED)
    )
    breached = sum(
        1
        for r in rows
        if r.sla_breached
        and r.status
        not in (
            ComplaintStatus.RESOLVED,
            ComplaintStatus.CLOSED,
            ComplaintStatus.REJECTED,
        )
    )

    return KPIResponse(
        total_complaints=total,
        unassigned_complaints=unassigned,
        in_progress_complaints=in_progress,
        resolved_complaints=resolved,
        sla_breached_complaints=breached,
    )


@router.get(
    "",
    response_model=list[StaffComplaintDetailResponse],
    summary="Get staff complaint queue",
)
async def get_complaint_queue(
    status_filter: ComplaintStatus | None = Query(None, alias="status"),
    priority_filter: ComplaintPriority | None = Query(None, alias="priority"),
    department_id_filter: uuid.UUID | None = Query(None, alias="department_id"),
    sla_breached_filter: bool | None = Query(None, alias="sla_breached"),
    current_user: User = Depends(get_current_officer),
    db: AsyncSession = Depends(get_db),
) -> list[StaffComplaintDetailResponse]:
    """
    Staff-only endpoint: Retrieve filterable complaint queue.
    """
    query = (
        select(Complaint)
        .options(
            selectinload(Complaint.category),
            selectinload(Complaint.department),
            selectinload(Complaint.status_history),
            selectinload(Complaint.ai_logs),
        )
        .order_by(Complaint.created_at.desc())
    )

    if current_user.role == UserRole.MUNICIPAL_OFFICER and current_user.department_id:
        query = query.where(Complaint.department_id == current_user.department_id)
    elif department_id_filter:
        query = query.where(Complaint.department_id == department_id_filter)

    if status_filter:
        query = query.where(Complaint.status == status_filter)
    if priority_filter:
        query = query.where(Complaint.priority == priority_filter)
    if sla_breached_filter is not None:
        query = query.where(Complaint.sla_breached == sla_breached_filter)

    res = await db.execute(query)
    complaints = res.scalars().all()

    output: list[StaffComplaintDetailResponse] = []
    for c in complaints:
        lat = float(c.location_lat) if c.location_lat is not None else None
        lng = float(c.location_lng) if c.location_lng is not None else None
        conf = float(c.ai_confidence) if c.ai_confidence is not None else None

        timeline = [
            TimelineEntry(status=sh.to_status, timestamp=sh.created_at)
            for sh in c.status_history
        ]
        ai_logs = [
            AILogEntry(
                id=log.id,
                agent_name=log.agent_name,
                provider=log.provider,
                prompt_tokens=log.prompt_tokens,
                completion_tokens=log.completion_tokens,
                latency_ms=log.latency_ms,
                success=log.success,
                error_message=log.error_message,
                created_at=log.created_at,
            )
            for log in c.ai_logs
        ]

        output.append(
            StaffComplaintDetailResponse(
                id=c.id,
                tracking_id=c.tracking_id,
                title=c.title,
                raw_text=c.raw_text,
                submitter_name=c.submitter_name,
                submitter_contact=c.submitter_contact,
                status=c.status,
                priority=c.priority,
                priority_score=c.priority_score,
                is_safety_risk=c.is_safety_risk,
                location_text=c.location_text,
                location_lat=lat,
                location_lng=lng,
                location_address=c.location_address,
                ward=c.ward,
                category_id=c.category_id,
                category_name=c.category.name if c.category else None,
                department_id=c.department_id,
                department_name=c.department.name if c.department else None,
                ai_classification_raw=c.ai_classification_raw,
                ai_confidence=conf,
                duplicate_of=c.duplicate_of,
                assigned_to=c.assigned_to,
                sla_deadline=c.sla_deadline,
                sla_breached=c.sla_breached,
                resolved_at=c.resolved_at,
                resolution_notes=c.resolution_notes,
                created_at=c.created_at,
                updated_at=c.updated_at,
                timeline=timeline,
                ai_logs=ai_logs,
            )
        )

    return output


@router.get(
    "/{complaint_id}",
    response_model=StaffComplaintDetailResponse,
    summary="Get detailed complaint (Staff/Admin only)",
    description="Returns full complaint record including AI audit data for staff.",
)
async def get_staff_complaint_detail(
    complaint_id: uuid.UUID,
    current_user: User = Depends(get_current_officer),
    db: AsyncSession = Depends(get_db),
) -> StaffComplaintDetailResponse:
    """Return full complaint detail for authorized municipal officers/admins."""
    result = await db.execute(
        select(Complaint)
        .options(
            selectinload(Complaint.department),
            selectinload(Complaint.category),
            selectinload(Complaint.status_history),
            selectinload(Complaint.ai_logs),
        )
        .where(Complaint.id == complaint_id)
    )
    complaint = result.scalar_one_or_none()

    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Complaint not found.",
        )

    # RBAC: Municipal officer can only view complaints in their own department
    if (
        current_user.role == UserRole.MUNICIPAL_OFFICER
        and complaint.department_id != current_user.department_id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to complaints outside assigned department.",
        )

    timeline = [
        TimelineEntry(status=h.to_status, timestamp=h.created_at)
        for h in sorted(complaint.status_history, key=lambda x: x.created_at)
    ]

    ai_logs = [
        AILogEntry.model_validate(log)
        for log in sorted(complaint.ai_logs, key=lambda x: x.created_at)
    ]

    lat = float(complaint.location_lat) if complaint.location_lat is not None else None
    lng = float(complaint.location_lng) if complaint.location_lng is not None else None
    conf = (
        float(complaint.ai_confidence)
        if complaint.ai_confidence is not None
        else None
    )

    return StaffComplaintDetailResponse(
        id=complaint.id,
        tracking_id=complaint.tracking_id,
        title=complaint.title,
        raw_text=complaint.raw_text,
        submitter_name=complaint.submitter_name,
        submitter_contact=complaint.submitter_contact,
        status=complaint.status,
        priority=complaint.priority,
        priority_score=complaint.priority_score,
        is_safety_risk=complaint.is_safety_risk,
        location_text=complaint.location_text,
        location_lat=lat,
        location_lng=lng,
        location_address=complaint.location_address,
        ward=complaint.ward,
        category_id=complaint.category_id,
        category_name=complaint.category.name if complaint.category else None,
        department_id=complaint.department_id,
        department_name=complaint.department.name if complaint.department else None,
        ai_classification_raw=complaint.ai_classification_raw,
        ai_confidence=conf,
        duplicate_of=complaint.duplicate_of,
        assigned_to=complaint.assigned_to,
        sla_deadline=complaint.sla_deadline,
        sla_breached=complaint.sla_breached,
        resolved_at=complaint.resolved_at,
        resolution_notes=complaint.resolution_notes,
        created_at=complaint.created_at,
        updated_at=complaint.updated_at,
        timeline=timeline,
        ai_logs=ai_logs,
    )


@router.get(
    "/{complaint_id}/related",
    response_model=list[RelatedComplaintResponse],
)
async def get_related_complaints(
    complaint_id: uuid.UUID,
    current_user: User = Depends(get_current_officer),
    db: AsyncSession = Depends(get_db),
) -> list[RelatedComplaintResponse]:
    """
    Staff-only endpoint: Retrieve related complaints linked to a complaint.

    RBAC:
      - Admins can view related complaints for any complaint.
      - Officers can view related complaints only for their department.
    """
    res = await db.execute(
        select(Complaint).where(Complaint.id == complaint_id)
    )
    complaint = res.scalar_one_or_none()

    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Complaint not found.",
        )

    if (
        current_user.role == UserRole.MUNICIPAL_OFFICER
        and complaint.department_id != current_user.department_id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: complaint belongs to another department.",
        )

    rel_res = await db.execute(
        select(RelatedComplaint, Complaint)
        .join(Complaint, RelatedComplaint.related_id == Complaint.id)
        .where(RelatedComplaint.complaint_id == complaint_id)
    )
    pairs = rel_res.all()

    output: list[RelatedComplaintResponse] = []
    for rel, target in pairs:
        score = float(rel.similarity_score) if rel.similarity_score else 0.0
        output.append(
            RelatedComplaintResponse(
                complaint_id=rel.complaint_id,
                related_id=rel.related_id,
                related_tracking_id=target.tracking_id,
                related_title=target.title,
                related_status=target.status,
                related_priority=target.priority,
                similarity_score=score,
                detection_method=rel.detection_method or "unknown",
                created_at=rel.created_at,
            )
        )

    return output


@router.patch(
    "/{complaint_id}/status",
    response_model=StaffComplaintDetailResponse,
    summary="Update complaint status",
)
async def update_complaint_status(
    complaint_id: uuid.UUID,
    payload: StatusUpdateRequest,
    current_user: User = Depends(get_current_officer),
    db: AsyncSession = Depends(get_db),
) -> StaffComplaintDetailResponse:
    """
    Staff-only endpoint: Update complaint lifecycle status.
    """
    res = await db.execute(
        select(Complaint)
        .options(
            selectinload(Complaint.category),
            selectinload(Complaint.department),
            selectinload(Complaint.status_history),
            selectinload(Complaint.ai_logs),
        )
        .where(Complaint.id == complaint_id)
    )
    complaint = res.scalar_one_or_none()

    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Complaint not found.",
        )

    if (
        current_user.role == UserRole.MUNICIPAL_OFFICER
        and complaint.department_id != current_user.department_id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: complaint belongs to another department.",
        )

    # Transition matrix validation
    allowed_transitions: dict[ComplaintStatus, set[ComplaintStatus]] = {
        ComplaintStatus.REPORTED: {
            ComplaintStatus.ASSIGNED,
            ComplaintStatus.IN_PROGRESS,
            ComplaintStatus.REJECTED,
            ComplaintStatus.CLOSED,
        },
        ComplaintStatus.ASSIGNED: {
            ComplaintStatus.IN_PROGRESS,
            ComplaintStatus.RESOLVED,
            ComplaintStatus.REJECTED,
            ComplaintStatus.CLOSED,
        },
        ComplaintStatus.IN_PROGRESS: {
            ComplaintStatus.RESOLVED,
            ComplaintStatus.REJECTED,
            ComplaintStatus.CLOSED,
        },
        ComplaintStatus.RESOLVED: {ComplaintStatus.CLOSED},
        ComplaintStatus.REJECTED: set(),
        ComplaintStatus.CLOSED: set(),
    }

    if payload.to_status not in allowed_transitions.get(complaint.status, set()):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Invalid status transition from {complaint.status.value} "
                f"to {payload.to_status.value}."
            ),
        )

    old_status = complaint.status
    complaint.status = payload.to_status
    now = datetime.now(tz=UTC)
    complaint.updated_at = now

    if payload.to_status in (ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED):
        complaint.resolved_at = now

    if payload.notes:
        complaint.resolution_notes = html.escape(payload.notes.strip())

    history_entry = ComplaintStatusHistory(
        complaint_id=complaint.id,
        from_status=old_status,
        to_status=payload.to_status,
        changed_by=current_user.id,
        notes=html.escape(payload.notes.strip()) if payload.notes else None,
        created_at=now,
    )
    db.add(history_entry)
    await db.commit()

    return await get_staff_complaint_detail(complaint_id, current_user, db)


@router.post(
    "/{complaint_id}/assign",
    response_model=StaffComplaintDetailResponse,
    summary="Assign complaint to officer",
)
async def assign_complaint_officer(
    complaint_id: uuid.UUID,
    payload: AssignOfficerRequest,
    current_user: User = Depends(get_current_officer),
    db: AsyncSession = Depends(get_db),
) -> StaffComplaintDetailResponse:
    """
    Staff-only endpoint: Assign complaint to an active officer within department.
    """
    res = await db.execute(
        select(Complaint).where(Complaint.id == complaint_id)
    )
    complaint = res.scalar_one_or_none()

    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Complaint not found.",
        )

    if (
        current_user.role == UserRole.MUNICIPAL_OFFICER
        and complaint.department_id != current_user.department_id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: complaint belongs to another department.",
        )

    officer_res = await db.execute(
        select(User).where(User.id == payload.officer_id)
    )
    target_officer = officer_res.scalar_one_or_none()

    if not target_officer or not target_officer.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Selected officer does not exist or is inactive.",
        )

    if (
        target_officer.role == UserRole.MUNICIPAL_OFFICER
        and complaint.department_id
        and target_officer.department_id != complaint.department_id
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot assign complaint to an officer from a different department.",
        )

    complaint.assigned_to = target_officer.id
    now = datetime.now(tz=UTC)
    complaint.updated_at = now

    if complaint.status == ComplaintStatus.REPORTED:
        old_status = complaint.status
        complaint.status = ComplaintStatus.ASSIGNED
        history_entry = ComplaintStatusHistory(
            complaint_id=complaint.id,
            from_status=old_status,
            to_status=ComplaintStatus.ASSIGNED,
            changed_by=current_user.id,
            notes=f"Assigned to officer {target_officer.full_name}",
            created_at=now,
        )
        db.add(history_entry)

    await db.commit()

    return await get_staff_complaint_detail(complaint_id, current_user, db)


@router.post(
    "/{complaint_id}/comments",
    response_model=CommentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add internal staff comment",
)
async def add_internal_comment(
    complaint_id: uuid.UUID,
    payload: CommentCreateRequest,
    current_user: User = Depends(get_current_officer),
    db: AsyncSession = Depends(get_db),
) -> CommentResponse:
    """
    Staff-only endpoint: Post an internal staff comment on a complaint.
    """
    res = await db.execute(
        select(Complaint).where(Complaint.id == complaint_id)
    )
    complaint = res.scalar_one_or_none()

    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Complaint not found.",
        )

    if (
        current_user.role == UserRole.MUNICIPAL_OFFICER
        and complaint.department_id != current_user.department_id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: complaint belongs to another department.",
        )

    sanitized_content = html.escape(payload.content.strip())
    now = datetime.now(tz=UTC)

    comment = ComplaintComment(
        complaint_id=complaint.id,
        author_id=current_user.id,
        content=sanitized_content,
        is_internal=True,
        created_at=now,
    )
    db.add(comment)
    await db.commit()
    await db.refresh(comment)

    return CommentResponse(
        id=comment.id,
        complaint_id=comment.complaint_id,
        author_id=comment.author_id,
        author_name=current_user.full_name,
        content=comment.content,
        is_internal=comment.is_internal,
        created_at=comment.created_at,
    )


@router.get(
    "/{complaint_id}/comments",
    response_model=list[CommentResponse],
    summary="Get internal staff comments",
)
async def get_internal_comments(
    complaint_id: uuid.UUID,
    current_user: User = Depends(get_current_officer),
    db: AsyncSession = Depends(get_db),
) -> list[CommentResponse]:
    """
    Staff-only endpoint: Retrieve internal staff comments for a complaint.
    """
    res = await db.execute(
        select(Complaint).where(Complaint.id == complaint_id)
    )
    complaint = res.scalar_one_or_none()

    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Complaint not found.",
        )

    if (
        current_user.role == UserRole.MUNICIPAL_OFFICER
        and complaint.department_id != current_user.department_id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: complaint belongs to another department.",
        )

    comments_res = await db.execute(
        select(ComplaintComment, User)
        .outerjoin(User, ComplaintComment.author_id == User.id)
        .where(ComplaintComment.complaint_id == complaint_id)
        .order_by(ComplaintComment.created_at.asc())
    )
    rows = comments_res.all()

    output: list[CommentResponse] = []
    for comment, author in rows:
        output.append(
            CommentResponse(
                id=comment.id,
                complaint_id=comment.complaint_id,
                author_id=comment.author_id,
                author_name=author.full_name if author else None,
                content=comment.content,
                is_internal=comment.is_internal,
                created_at=comment.created_at,
            )
        )

    return output
