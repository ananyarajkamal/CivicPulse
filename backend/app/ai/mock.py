"""
Mock AI Provider implementation for testing and fallback execution.
"""

import json
from typing import Any

from app.ai.base import AIResponse, BaseAIProvider


class MockAIProvider(BaseAIProvider):
    """Rule-based mock AI Provider when no API keys are present."""

    def __init__(self) -> None:
        self.provider_name = "mock_ai"

    async def health_check(self) -> bool:
        """Mock provider is always available."""
        return True

    async def complete(self, system_prompt: str, user_content: str) -> AIResponse:
        """Return deterministic JSON response based on user_content text."""
        text_lower = user_content.lower()

        safety_keywords = [
            "hazard",
            "danger",
            "fire",
            "leak",
            "collapse",
            "wire",
            "safety",
            "emergency",
        ]
        is_safety = any(w in text_lower for w in safety_keywords)

        category = "General Issue"
        suggested_dept = "General Services"

        road_keywords = ["pothole", "road", "street", "asphalt", "pavement"]
        if any(w in text_lower for w in road_keywords):
            category = "Road Damage"
            suggested_dept = "Roads & Infrastructure"
        elif any(w in text_lower for w in ["water", "pipe", "drain", "sewage", "leak"]):
            category = "Water & Drainage"
            suggested_dept = "Water Supply & Sewerage"
        elif any(w in text_lower for w in ["trash", "waste", "garbage", "dump"]):
            category = "Waste Management"
            suggested_dept = "Sanitation & Solid Waste"

        title = user_content[:50] + ("..." if len(user_content) > 50 else "")

        output: dict[str, Any] = {
            "category": category,
            "subcategory": category,
            "summary_title": title,
            "severity": "high" if is_safety else "medium",
            "is_safety_risk": is_safety,
            "location_mentions": [],
            "suggested_department": suggested_dept,
            "confidence": 0.85,
        }

        return AIResponse(
            text=json.dumps(output),
            prompt_tokens=45,
            completion_tokens=60,
            provider=self.provider_name,
            latency_ms=10,
        )
