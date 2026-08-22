"""
Gemini AI Provider implementation.
"""

import time
from typing import Any

import httpx

from app.ai.base import AIResponse, BaseAIProvider


class GeminiProvider(BaseAIProvider):
    """Google Gemini 2.0 Flash LLM Provider."""

    def __init__(self, api_key: str) -> None:
        self.api_key = api_key
        self.provider_name = "gemini"
        self.endpoint = (
            "https://generativelanguage.googleapis.com/v1beta/models/"
            "gemini-2.0-flash:generateContent"
        )

    async def health_check(self) -> bool:
        """Return True if API key is configured."""
        return bool(self.api_key and self.api_key.strip())

    async def complete(self, system_prompt: str, user_content: str) -> AIResponse:
        """Call Gemini REST API and return AIResponse."""
        if not await self.health_check():
            raise RuntimeError("Gemini API key is not configured.")

        url = f"{self.endpoint}?key={self.api_key}"
        headers = {"Content-Type": "application/json"}
        prompt_content = f"{system_prompt}\n\nUSER CONTENT:\n{user_content}"
        payload = {
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": prompt_content}],
                }
            ],
            "generationConfig": {
                "temperature": 0.1,
                "responseMimeType": "application/json",
            },
        }

        start_time = time.perf_counter()
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(url, headers=headers, json=payload)
            response.raise_for_status()

        latency_ms = int((time.perf_counter() - start_time) * 1000)
        data: dict[str, Any] = response.json()

        try:
            candidate = data["candidates"][0]
            text = candidate["content"]["parts"][0]["text"]
            usage = data.get("usageMetadata", {})
            prompt_tokens = usage.get("promptTokenCount")
            completion_tokens = usage.get("candidatesTokenCount")

            return AIResponse(
                text=text,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                provider=self.provider_name,
                latency_ms=latency_ms,
            )
        except (KeyError, IndexError) as exc:
            msg = f"Unexpected response structure from Gemini: {data}"
            raise RuntimeError(msg) from exc
