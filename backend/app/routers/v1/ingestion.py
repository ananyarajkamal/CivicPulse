"""
Ingestion Agent API Router (/api/v1/ingest).

Provides endpoints for:
  - POST /ingest/social-feed  : Active automated social media feed ingestion
  - POST /ingest/telegram     : Live Telegram Bot webhook receiver
  - POST /ingest/channel      : General multi-channel ingestion endpoint
"""

from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.complaint import StaffComplaintDetailResponse
from app.schemas.enums import ComplaintSource
from app.services.ingestion_agent import IngestionAgent

router = APIRouter(prefix="/ingest", tags=["ingestion"])


class ChannelIngestRequest(BaseModel):
    raw_text: str = Field(..., min_length=10, max_length=2000)
    source: ComplaintSource = ComplaintSource.WEB
    submitter_name: str | None = None
    submitter_contact: str | None = None
    location_text: str | None = None
    location_lat: float | None = None
    location_lng: float | None = None


class SocialFeedIngestResponse(BaseModel):
    ingested_count: int
    items: list[dict[str, Any]]


@router.post(
    "/channel",
    response_model=StaffComplaintDetailResponse,
    summary="Ingest a complaint from any source channel",
)
async def ingest_channel_report(
    req: ChannelIngestRequest,
    db: AsyncSession = Depends(get_db),
) -> Any:
    """Passes raw channel intake report into the Ingestion Agent."""
    try:
        complaint = await IngestionAgent.ingest_report(
            raw_text=req.raw_text,
            source=req.source,
            submitter_name=req.submitter_name,
            submitter_contact=req.submitter_contact,
            location_text=req.location_text,
            location_lat=req.location_lat,
            location_lng=req.location_lng,
            db=db,
        )
        return complaint
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.post(
    "/social-feed",
    response_model=SocialFeedIngestResponse,
    summary="Monitor and ingest live social media posts",
)
async def ingest_social_feed(
    db: AsyncSession = Depends(get_db),
) -> SocialFeedIngestResponse:
    """Active Ingestion Agent poller: Fetches public social posts & mentions."""
    posts = await IngestionAgent.fetch_public_social_feed()
    ingested_items = []

    for post in posts:
        try:
            complaint = await IngestionAgent.ingest_report(
                raw_text=post["raw_text"],
                source=ComplaintSource.SOCIAL_DEMO,
                submitter_name=post["handle"],
                location_text=post["location_text"],
                location_lat=post["lat"],
                location_lng=post["lng"],
                db=db,
            )
            dept_name = (
                complaint.department.name if complaint.department else "Unassigned"
            )
            ingested_items.append(
                {
                    "platform": post["platform"],
                    "handle": post["handle"],
                    "tracking_id": complaint.tracking_id,
                    "title": complaint.title,
                    "priority": complaint.priority.value,
                    "department": dept_name,
                }
            )
        except Exception:
            continue

    return SocialFeedIngestResponse(
        ingested_count=len(ingested_items),
        items=ingested_items,
    )


@router.post(
    "/reddit",
    response_model=SocialFeedIngestResponse,
    summary="Monitor and ingest live Reddit civic posts",
)
async def ingest_reddit_feed(
    subreddit: str = "patna",
    db: AsyncSession = Depends(get_db),
) -> SocialFeedIngestResponse:
    """
    Active Ingestion Agent: Queries public Reddit feeds (e.g. r/patna),
    filters for civic complaints, and ingests them into the municipal workflow.
    """
    posts = await IngestionAgent.fetch_reddit_civic_posts(subreddit=subreddit)
    ingested_items = []

    for post in posts:
        try:
            complaint = await IngestionAgent.ingest_report(
                raw_text=post["raw_text"],
                source=ComplaintSource.SOCIAL_DEMO,
                submitter_name=post["handle"],
                location_text=post["location_text"],
                location_lat=post["lat"],
                location_lng=post["lng"],
                db=db,
            )
            dept_name = (
                complaint.department.name if complaint.department else "Unassigned"
            )
            ingested_items.append(
                {
                    "platform": post["platform"],
                    "handle": post["handle"],
                    "tracking_id": complaint.tracking_id,
                    "title": complaint.title,
                    "priority": complaint.priority.value,
                    "department": dept_name,
                    "post_url": post.get(
                        "post_url", f"https://www.reddit.com/r/{subreddit}"
                    ),
                }
            )
        except Exception:
            continue

    return SocialFeedIngestResponse(
        ingested_count=len(ingested_items),
        items=ingested_items,
    )


@router.post(
    "/deep-scan",
    summary="Trigger deep multi-city autonomous AI sweep across India",
)
async def deep_scan_multi_city(
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """
    Autonomous Ingestion Agent: Sweeps all major Indian city subreddits
    (Delhi, Bengaluru, Mumbai, Hyderabad, Patna) for civic complaints.
    """
    return await IngestionAgent.deep_scan_all_cities(db=db)


@router.get(
    "/agent-status",
    summary="Get Autonomous Ingestion Agent heartbeat & metrics",
)
async def get_agent_status() -> dict[str, Any]:
    """Returns autonomous agent background scanning metrics."""
    return {
        "agent_name": "IngestionAgent (Social & Reddit Sentinel)",
        "status": "ACTIVE",
        "scan_frequency": "Every 60 seconds (1 minute)",
        "monitored_regions": [
            "r/patna",
            "r/delhi",
            "r/bangalore",
            "r/mumbai",
            "r/hyderabad",
            "r/pune",
            "r/kolkata",
            "r/bihar",
            "r/india",
        ],
        "active_categories": [
            "Road Damage & Potholes",
            "Waterlogging & Drainage Overflow",
            "Uncollected Garbage Dumps",
            "Broken Streetlights & Electrical Hazards",
            "Sewage Pipeline Leakage",
            "Traffic & Encroachment Hazards",
        ],
        "autonomous_mode": True,
        "server_time_utc": datetime.now(tz=UTC).isoformat(),
    }


@router.post(
    "/telegram",
    summary="Receive live Telegram Bot messages",
)
async def ingest_telegram_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Live Webhook receiver for Telegram Bot API (@CivicPulseBot)."""
    payload = await request.json()
    message = payload.get("message", {})
    text = message.get("text", "")
    chat = message.get("chat", {})
    sender_name = chat.get("first_name", "Telegram Citizen")
    chat_id = chat.get("id")

    if not text or len(text.strip()) < 10:
        return {"status": "ignored", "reason": "Text too short or missing"}

    try:
        complaint = await IngestionAgent.ingest_report(
            raw_text=text,
            source=ComplaintSource.WHATSAPP_DEMO,
            submitter_name=sender_name,
            submitter_contact=str(chat_id),
            db=db,
        )
        msg = f"Complaint registered! Tracking ID: {complaint.tracking_id}"
        return {
            "status": "success",
            "tracking_id": complaint.tracking_id,
            "reply_message": msg,
        }
    except Exception as e:
        return {"status": "error", "detail": str(e)}


@router.get(
    "/whatsapp",
    summary="Meta WhatsApp Cloud API Webhook Verification",
)
async def verify_whatsapp_webhook(
    request: Request,
) -> Any:
    """Standard Meta WhatsApp Webhook verification handshake."""
    params = request.query_params
    mode = params.get("hub.mode")
    challenge = params.get("hub.challenge")
    if mode == "subscribe" and challenge:
        from fastapi.responses import PlainTextResponse

        return PlainTextResponse(challenge)
    return {"status": "WhatsApp Webhook Listener Ready"}


@router.post(
    "/whatsapp",
    summary="Meta WhatsApp Cloud API Incoming Message Receiver",
)
async def receive_whatsapp_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """
    Standard Meta WhatsApp Cloud API Webhook message receiver.
    Ingests citizen complaints sent via WhatsApp directly into the AI pipeline.
    """
    try:
        payload = await request.json()
        entry = payload.get("entry", [{}])[0]
        changes = entry.get("changes", [{}])[0]
        value = changes.get("value", {})
        messages = value.get("messages", [])
        contacts = value.get("contacts", [])

        if not messages:
            return {"status": "ignored", "reason": "No messages in payload"}

        msg_obj = messages[0]
        text_body = msg_obj.get("text", {}).get("body", "")
        sender_phone = msg_obj.get("from", "WhatsApp Citizen")
        sender_name = (
            contacts[0].get("profile", {}).get("name", "WhatsApp Citizen")
            if contacts
            else "WhatsApp Citizen"
        )

        if len(text_body.strip()) < 10:
            return {"status": "ignored", "reason": "Message too short"}

        complaint = await IngestionAgent.ingest_report(
            raw_text=text_body,
            source=ComplaintSource.WHATSAPP_DEMO,
            submitter_name=sender_name,
            submitter_contact=str(sender_phone),
            db=db,
        )

        return {
            "status": "success",
            "channel": "WhatsApp Cloud API",
            "tracking_id": complaint.tracking_id,
            "reply_message": (
                f"CivicPulse: Your complaint has been registered. "
                f"Tracking ID: {complaint.tracking_id}"
            ),
        }
    except Exception as e:
        return {"status": "error", "detail": str(e)}
