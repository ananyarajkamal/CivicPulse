"""
Pydantic schemas for City Intelligence & Analytics (Phase 8).
"""

from pydantic import BaseModel


class CategoryBreakdownItem(BaseModel):
    category_name: str
    count: int


class DepartmentBreakdownItem(BaseModel):
    department_name: str
    count: int


class PriorityBreakdownItem(BaseModel):
    priority: str
    count: int


class StatusBreakdownItem(BaseModel):
    status: str
    count: int


class AnalyticsSummaryResponse(BaseModel):
    total_complaints: int
    sla_compliance_rate: float
    categories: list[CategoryBreakdownItem]
    departments: list[DepartmentBreakdownItem]
    priorities: list[PriorityBreakdownItem]
    statuses: list[StatusBreakdownItem]


class TrendDataPoint(BaseModel):
    date: str
    count: int


class HotspotClusterItem(BaseModel):
    id: str
    location_name: str
    latitude: float
    longitude: float
    complaint_count: int
    primary_category: str | None = None
