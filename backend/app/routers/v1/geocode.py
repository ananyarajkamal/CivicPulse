"""
Geocoding proxy endpoint (/api/v1/geocode).

Proxies geocoding queries to Nominatim (OpenStreetMap) respecting rate limits
and usage policies (User-Agent header required).
"""

from typing import Any

import httpx
from fastapi import APIRouter, Query, Request
from pydantic import BaseModel, ConfigDict
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.config import get_settings

router = APIRouter(prefix="/geocode", tags=["geocoding"])
limiter = Limiter(key_func=get_remote_address)
settings = get_settings()


class GeocodeResult(BaseModel):
    """Geocoding search result schema."""

    model_config = ConfigDict(frozen=True)

    display_name: str
    lat: float
    lng: float


@router.get(
    "",
    response_model=list[GeocodeResult],
    summary="Geocode location text",
    description="Proxy endpoint to Nominatim for address/location text geocoding.",
)
@limiter.limit("20/minute")
async def geocode_address(
    request: Request,
    q: str = Query(
        min_length=3,
        max_length=250,
        description="Address or location search query",
    ),
) -> list[GeocodeResult]:
    """Proxy query to Nominatim geocoding service."""
    url = "https://nominatim.openstreetmap.org/search"
    headers = {"User-Agent": settings.NOMINATIM_USER_AGENT}
    params: dict[str, str | int] = {
        "q": q,
        "format": "json",
        "limit": 5,
        "addressdetails": 1,
    }

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(url, headers=headers, params=params)
            if response.status_code != 200:
                return []

            data: list[dict[str, Any]] = response.json()
            results: list[GeocodeResult] = []
            for item in data:
                try:
                    results.append(
                        GeocodeResult(
                            display_name=item.get("display_name", ""),
                            lat=float(item["lat"]),
                            lng=float(item["lon"]),
                        )
                    )
                except (KeyError, ValueError):
                    continue
            return results
    except Exception:
        # Fail gracefully on network timeout / upstream outage
        return []
