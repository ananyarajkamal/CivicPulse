"""
CivicPulse — Domain enumerations.

These enums are used in both the database (SQLAlchemy) and the API
(Pydantic schemas). They are defined here so they can be imported by
both layers without circular imports.
"""

from enum import StrEnum


class ComplaintStatus(StrEnum):
    """Lifecycle states for a complaint (see implementation_plan.md §8)."""

    REPORTED = "reported"
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    CLOSED = "closed"
    REJECTED = "rejected"


class ComplaintPriority(StrEnum):
    """Priority levels assigned by the Priority Agent (deterministic formula)."""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class UserRole(StrEnum):
    """
    Staff roles in the system.

    IMPORTANT: There is no 'citizen' role. Citizens are anonymous in the MVP.
    Citizen accounts, registration, and login are future roadmap items.
    """

    MUNICIPAL_OFFICER = "municipal_officer"
    ADMIN = "admin"

