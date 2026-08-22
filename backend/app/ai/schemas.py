"""
Pydantic schemas for AI output validation.
"""

from pydantic import BaseModel, ConfigDict, Field


class AIClassificationResult(BaseModel):
    """Structured Pydantic output schema for complaint intelligence classification."""

    model_config = ConfigDict(frozen=True)

    category: str | None = Field(
        default=None,
        description="Matched complaint category name",
    )
    subcategory: str | None = Field(
        default=None,
        description="Detailed subcategory name",
    )
    summary_title: str = Field(
        description="Concise summary title",
    )
    severity: str = Field(
        default="medium",
        description="Perceived severity: 'low', 'medium', 'high', or 'critical'",
    )
    is_safety_risk: bool = Field(
        default=False,
        description="Flag indicating immediate public safety hazard",
    )
    location_mentions: list[str] = Field(
        default_factory=list,
        description="Extracted location names or landmarks from text",
    )
    suggested_department: str | None = Field(
        default=None,
        description="Suggested municipal department name",
    )
    confidence: float = Field(
        default=0.8,
        ge=0.0,
        le=1.0,
        description="AI confidence score between 0.0 and 1.0",
    )
