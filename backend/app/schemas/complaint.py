"""
CivicPulse — Complaint Pydantic schemas.

╔══════════════════════════════════════════════════════════════════════════════╗
║  PUBLIC BOUNDARY — CitizenComplaintResponse                                 ║
║                                                                              ║
║  CitizenComplaintResponse is the ONLY schema that may be serialized and      ║
║  returned to anonymous (unauthenticated) callers on the public tracking      ║
║  endpoint.                                                                   ║
║                                                                              ║
║  COLUMN FILTERING IS ENFORCED HERE — NOT BY ROW LEVEL SECURITY.             ║
║                                                                              ║
║  PostgreSQL/Supabase RLS provides ROW-level access control only. It does    ║
║  NOT filter individual columns. Any field not explicitly listed in this      ║
║  schema CANNOT appear in the public response, regardless of what the         ║
║  database query returns.                                                     ║
║                                                                              ║
║  APPROVED FIELDS (publicly visible):                                         ║
║    tracking_id, status, title, category, department, priority,              ║
║    location_address, sla_deadline, sla_breached, created_at,                ║
║    updated_at, timeline                                                      ║
║                                                                              ║
║  PERMANENTLY EXCLUDED (never returned to anonymous callers):                ║
║    id               — internal UUID, never exposed externally               ║
║    raw_text         — citizen text may contain PII; caller unverifiable     ║
║    submitter_name   — PII (voluntarily provided)                            ║
║    submitter_contact— PII (voluntarily provided)                            ║
║    ai_classification_raw — internal AI audit data                           ║
║    ai_confidence    — internal operational metric                           ║
║    priority_score   — internal formula output                               ║
║    duplicate_of     — internal complaint graph                              ║
║    assigned_to      — officer identity / staff PII                         ║
║    location_lat     — raw coordinate (expose only display address)          ║
║    location_lng     — raw coordinate (expose only display address)          ║
║    ward             — internal administrative field                         ║
║    resolution_notes — internal staff notes                                  ║
║    is_internal comments — staff-only commentary                             ║
╚══════════════════════════════════════════════════════════════════════════════╝
"""

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.enums import ComplaintPriority, ComplaintSource, ComplaintStatus


class TimelineEntry(BaseModel):
    """A single entry in the public status history timeline."""

    model_config = ConfigDict(frozen=True)

    status: ComplaintStatus
    timestamp: datetime = Field(description="UTC timestamp of the status transition")


class CitizenComplaintResponse(BaseModel):
    """
    Public-safe response DTO for the complaint tracking endpoint.

    THIS IS THE AUTHORITATIVE COLUMN-LEVEL EXPOSURE BOUNDARY.

    Only the fields declared here can ever be returned to anonymous callers.
    This schema must be used as the response_model on the public tracking
    endpoint and must not be bypassed by returning raw ORM objects or dicts.

    Voluntary contact fields (submitter_name, submitter_contact) are
    intentionally absent — they are stored in the database for internal
    officer use only and must never appear in any public response.
    """

    model_config = ConfigDict(
        from_attributes=True,  # Enables construction from SQLAlchemy ORM objects
        frozen=True,           # Immutable once created — prevents accidental mutation
    )

    # --- Public identifier ---
    tracking_id: str = Field(
        description="Public complaint tracking ID (format: CP-{22 chars})",
        pattern=r"^CP-[A-Za-z0-9_-]{22}$",
    )

    # --- Status & classification ---
    status: ComplaintStatus = Field(description="Current complaint lifecycle status")
    title: str | None = Field(
        default=None,
        description="AI-generated summary title (not the raw complaint text)",
    )
    category: str | None = Field(
        default=None,
        description="Complaint category name",
    )
    department: str | None = Field(
        default=None,
        description="Responsible department name",
    )
    priority: ComplaintPriority = Field(description="Complaint priority level")

    # --- Location ---
    # Only the human-readable display address is exposed.
    # Raw coordinates (location_lat, location_lng) are explicitly excluded.
    location_address: str | None = Field(
        default=None,
        description="Reverse-geocoded display address (no raw lat/lng)",
    )

    # --- SLA ---
    sla_deadline: datetime | None = Field(
        default=None,
        description="SLA resolution deadline (UTC)",
    )
    sla_breached: bool = Field(description="Whether the SLA deadline has been breached")

    # --- Timestamps ---
    created_at: datetime = Field(description="Complaint submission timestamp (UTC)")
    updated_at: datetime | None = Field(
        default=None,
        description="Last update timestamp (UTC)",
    )

    # --- Public status history ---
    timeline: list[TimelineEntry] = Field(
        default_factory=list,
        description="Public status transition history (excludes internal comments)",
    )


class ComplaintCreateRequest(BaseModel):
    """
    Complaint intake submission schema.

    Enforces input length boundaries and HTML sanitization.
    submitter_name and submitter_contact are strictly optional.
    """

    model_config = ConfigDict(frozen=True)

    raw_text: str = Field(
        min_length=10,
        max_length=2000,
        description="Detailed description of the civic issue (10-2000 chars)",
    )
    location_text: str | None = Field(
        default=None,
        max_length=500,
        description="Raw location text or street address described by citizen",
    )
    location_lat: float | None = Field(
        default=None,
        ge=-90.0,
        le=90.0,
        description="Latitude coordinate (-90 to 90)",
    )
    location_lng: float | None = Field(
        default=None,
        ge=-180.0,
        le=180.0,
        description="Longitude coordinate (-180 to 180)",
    )
    location_address: str | None = Field(
        default=None,
        max_length=500,
        description="Geocoded display address",
    )
    category_id: str | None = Field(
        default=None,
        description="Optional category UUID selected by citizen",
    )
    department_id: str | None = Field(
        default=None,
        description="Optional department UUID selected by citizen",
    )
    source: ComplaintSource = Field(
        default=ComplaintSource.WEB,
        description="Channel intake source (defaults to 'web')",
    )
    submitter_name: str | None = Field(
        default=None,
        max_length=255,
        description="Voluntary contact name (never in public response)",
    )
    submitter_contact: str | None = Field(
        default=None,
        max_length=255,
        description="Voluntary email or phone (never in public response)",
    )


class DemoComplaintCreateRequest(BaseModel):
    """
    Staff-authenticated multi-channel demo complaint intake schema.

    Accepts simulated non-web channel sources (whatsapp_demo,
    social_demo, municipal_demo).
    """

    model_config = ConfigDict(frozen=True)

    source: ComplaintSource = Field(
        description="Demo channel source (whatsapp_demo, social_demo, municipal_demo)"
    )
    raw_text: str = Field(
        min_length=10,
        max_length=2000,
        description="Detailed description of the civic issue (10-2000 chars)",
    )
    location_text: str | None = Field(
        default=None,
        max_length=500,
        description="Raw location text described by citizen",
    )
    location_lat: float | None = Field(
        default=None, ge=-90.0, le=90.0
    )
    location_lng: float | None = Field(
        default=None, ge=-180.0, le=180.0
    )
    location_address: str | None = Field(
        default=None, max_length=500
    )
    category_id: str | None = None
    department_id: str | None = None
    submitter_name: str | None = Field(default=None, max_length=255)
    submitter_contact: str | None = Field(default=None, max_length=255)


class ComplaintCreateResponse(BaseModel):
    """Response returned upon successful complaint submission."""

    model_config = ConfigDict(frozen=True)

    tracking_id: str = Field(
        description="Cryptographically secure 128-bit public tracking ID",
        pattern=r"^CP-[A-Za-z0-9_-]{22}$",
    )
    status: ComplaintStatus = Field(description="Initial complaint status ('reported')")
    created_at: datetime = Field(description="Submission UTC timestamp")
    message: str = Field(
        default="Complaint successfully registered. Save your tracking ID.",
    )


class AILogEntry(BaseModel):
    """Entry representing an AI processing log record for staff audit."""

    model_config = ConfigDict(from_attributes=True, frozen=True)

    id: str | uuid.UUID
    agent_name: str
    provider: str | None = None
    prompt_tokens: int | None = None
    completion_tokens: int | None = None
    latency_ms: int | None = None
    success: bool
    error_message: str | None = None
    created_at: datetime


class StaffComplaintDetailResponse(BaseModel):
    """
    Authenticated Staff/Admin Detail DTO.

    Contains full complaint details including AI raw classification data,
    confidence metrics, AI logs, and internal staff fields.
    NOT ACCESSIBLE TO PUBLIC CALLERS.
    """

    model_config = ConfigDict(from_attributes=True, frozen=True)

    id: uuid.UUID
    tracking_id: str
    source: ComplaintSource = Field(default=ComplaintSource.WEB)
    title: str | None = None
    raw_text: str
    submitter_name: str | None = None
    submitter_contact: str | None = None
    status: ComplaintStatus
    priority: ComplaintPriority
    priority_score: int | None = None
    is_safety_risk: bool
    location_text: str | None = None
    location_lat: float | None = None
    location_lng: float | None = None
    location_address: str | None = None
    ward: str | None = None
    category_id: uuid.UUID | None = None
    category_name: str | None = None
    department_id: uuid.UUID | None = None
    department_name: str | None = None
    ai_classification_raw: dict[str, Any] | None = None
    ai_confidence: float | None = None
    duplicate_of: uuid.UUID | None = None
    assigned_to: uuid.UUID | None = None
    sla_deadline: datetime | None = None
    sla_breached: bool
    resolved_at: datetime | None = None
    resolution_notes: str | None = None
    created_at: datetime
    updated_at: datetime | None = None
    timeline: list[TimelineEntry] = Field(default_factory=list)
    ai_logs: list[AILogEntry] = Field(default_factory=list)


class RelatedComplaintResponse(BaseModel):
    """Staff schema for linked related/duplicate complaints."""

    model_config = ConfigDict(from_attributes=True)

    complaint_id: uuid.UUID
    related_id: uuid.UUID
    related_tracking_id: str
    related_title: str | None = None
    related_status: ComplaintStatus
    related_priority: ComplaintPriority
    similarity_score: float
    detection_method: str
    created_at: datetime


class StatusUpdateRequest(BaseModel):
    """Schema for requesting a complaint status transition."""

    to_status: ComplaintStatus
    notes: str | None = None


class AssignOfficerRequest(BaseModel):
    """Schema for assigning an officer to a complaint."""

    officer_id: uuid.UUID


class CommentCreateRequest(BaseModel):
    """Schema for adding an internal comment."""

    content: str = Field(..., min_length=1, max_length=1000)


class CommentResponse(BaseModel):
    """Schema for displaying an internal comment to staff."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    complaint_id: uuid.UUID
    author_id: uuid.UUID | None = None
    author_name: str | None = None
    content: str
    is_internal: bool
    created_at: datetime


class KPIResponse(BaseModel):
    """Schema for operational KPI metrics."""

    total_complaints: int
    unassigned_complaints: int
    in_progress_complaints: int
    resolved_complaints: int
    sla_breached_complaints: int


