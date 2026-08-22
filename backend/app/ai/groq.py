"""
Groq AI Provider implementation (Fallback LLM Provider).
"""

import time
from typing import Any

import httpx

from app.ai.base import AIResponse, BaseAIProvider


class GroqProvider(BaseAIProvider):
    """Groq API Provider (Fallback)."""

    def __init__(self, api_key: str, model: str = "llama-3.3-70b-versatile") -> None:
        self.api_key = api_key
        self.model = model
        self.provider_name = "groq"
        self.endpoint = "https://api.groq.com/openai/v1/chat/completions"

    async def health_check(self) -> bool:
        """Return True if API key is configured."""
        return bool(self.api_key and self.api_key.strip())

    async def complete(self, system_prompt: str, user_content: str) -> AIResponse:
        """Call Groq REST API and return AIResponse."""
        if not await self.health_check():
            raise RuntimeError("Groq API key is not configured.")

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content},
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.1,
        }

        start_time = time.perf_counter()
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(self.endpoint, headers=headers, json=payload)
            response.raise_for_status()

        latency_ms = int((time.perf_counter() - start_time) * 1000)
        data: dict[str, Any] = response.json()

        try:
            choice = data["choices"][0]
            text = choice["message"]["content"]
            usage = data.get("usage", {})
            prompt_tokens = usage.get("prompt_tokens")
            completion_tokens = usage.get("completion_tokens")

            return AIResponse(
                text=text,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                provider=self.provider_name,
                latency_ms=latency_ms,
            )
        except (KeyError, IndexError) as exc:
            msg = f"Unexpected response structure from Groq: {data}"
            raise RuntimeError(msg) from exc
