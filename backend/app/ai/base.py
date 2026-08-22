"""
AI Provider Base Interface and Response Dataclass.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass(frozen=True)
class AIResponse:
    """Standardized response container returned by all AI providers."""

    text: str
    prompt_tokens: int | None = None
    completion_tokens: int | None = None
    provider: str = "unknown"
    latency_ms: int = 0


class BaseAIProvider(ABC):
    """Abstract base class for all LLM providers (Gemini, Groq, Mock)."""

    @abstractmethod
    async def complete(self, system_prompt: str, user_content: str) -> AIResponse:
        """Send system prompt and user content to LLM and return AIResponse."""
        pass

    @abstractmethod
    async def health_check(self) -> bool:
        """Check if provider is configured and operational."""
        pass
