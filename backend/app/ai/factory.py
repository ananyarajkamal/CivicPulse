"""
AI Provider Factory with dynamic primary-to-fallback resolution.
"""

import structlog

from app.ai.base import BaseAIProvider
from app.ai.gemini import GeminiProvider
from app.ai.groq import GroqProvider
from app.ai.mock import MockAIProvider
from app.config import get_settings

logger = structlog.get_logger()


class AIProviderFactory:
    """Factory creating and resolving primary/fallback AI providers."""

    @staticmethod
    def get_provider() -> BaseAIProvider:
        """
        Return the primary configured AI provider.

        Priority order:
          1. Gemini (Gemini 2.0 Flash)
          2. Groq (Groq Llama 3.3)
          3. MockAIProvider (fallback for local development/testing)
        """
        settings = get_settings()

        if settings.GEMINI_API_KEY and settings.GEMINI_API_KEY.strip():
            return GeminiProvider(api_key=settings.GEMINI_API_KEY)

        if settings.GROQ_API_KEY and settings.GROQ_API_KEY.strip():
            return GroqProvider(api_key=settings.GROQ_API_KEY)

        logger.info("No primary AI API keys configured. Using MockAIProvider.")
        return MockAIProvider()
