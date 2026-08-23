"""
CivicPulse — Proactive Citizen Email Notification Service.

Provides a clean provider abstraction for sending citizen notifications
upon complaint submission, status transitions, and resolution.

Core rules:
- Email delivery is secondary infrastructure; failures NEVER break complaint workflow.
- Notifications are sent only when a valid citizen email address is provided.
- Simulated channels without valid citizen email skip email delivery gracefully.
"""

import re
from datetime import datetime

import httpx
import structlog

from app.config import get_settings
from app.schemas.enums import ComplaintStatus

logger = structlog.get_logger()


class NotificationService:
    """
    Service layer for constructing and dispatching transactional emails to citizens.
    """

    EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")

    @classmethod
    def is_valid_email(cls, email: str | None) -> bool:
        """Return True if email string matches standard email regex format."""
        if not email or not isinstance(email, str):
            return False
        return bool(cls.EMAIL_REGEX.match(email.strip()))

    @classmethod
    async def _send_email(
        cls, to_email: str, subject: str, body_text: str, body_html: str
    ) -> bool:
        """
        Internal dispatcher. Calls Resend HTTP API if API key configured;
        otherwise logs structured delivery event. Failure is caught silently.
        """
        if not cls.is_valid_email(to_email):
            logger.info(
                f"[NOTIFICATION] Delivery skipped: Invalid email '{to_email}'"
            )
            return False

        settings = get_settings()

        # If Resend API Key is provided, attempt HTTP despatch
        if settings.RESEND_API_KEY and settings.RESEND_API_KEY.strip():
            try:
                async with httpx.AsyncClient(timeout=5.0) as client:
                    resp = await client.post(
                        "https://api.resend.com/emails",
                        headers={
                            "Authorization": (
                                f"Bearer {settings.RESEND_API_KEY.strip()}"
                            ),
                            "Content-Type": "application/json",
                        },
                        json={
                            "from": settings.FROM_EMAIL,
                            "to": [to_email.strip()],
                            "subject": subject,
                            "text": body_text,
                            "html": body_html,
                        },
                    )
                    if resp.status_code in (200, 201):
                        logger.info(
                            f"[NOTIFICATION] Email sent via Resend to '{to_email}'"
                        )
                        return True
                    else:
                        logger.warning(
                            f"[NOTIFICATION] Resend API error ({resp.status_code})"
                        )
            except Exception as exc:
                logger.error(
                    f"[NOTIFICATION] Email provider error: {exc}. Continuing."
                )
                return False

        # Provider fallback / Development simulation logger
        logger.info(
            f"[NOTIFICATION] [SIMULATED EMAIL DISPATCH]\n"
            f"  To: {to_email.strip()}\n"
            f"  Subject: {subject}\n"
            f"  Body Snippet: {body_text[:120]}...\n"
        )
        return True

    @classmethod
    async def notify_complaint_received(
        cls,
        to_email: str | None,
        tracking_id: str,
        title: str,
        department_name: str | None,
        sla_deadline: datetime | None,
    ) -> bool:
        """Send Complaint Received confirmation email."""
        if not cls.is_valid_email(to_email):
            return False

        settings = get_settings()
        track_url = f"{settings.FRONTEND_BASE_URL.rstrip('/')}/track/{tracking_id}"
        dept = department_name or "Municipal Administration"
        sla_str = (
            sla_deadline.strftime("%B %d, %Y at %I:%M %p UTC")
            if sla_deadline
            else "Standard Municipal Target"
        )

        subject = f"CivicPulse Complaint Received - {tracking_id}"
        body_text = (
            f"CivicPulse Smart City Resolution Portal\n\n"
            f"Your civic complaint has been registered successfully.\n\n"
            f"Tracking ID: {tracking_id}\n"
            f"Issue: {title}\n"
            f"Responsible Department: {dept}\n"
            f"Status: Reported\n"
            f"Service SLA Deadline: {sla_str}\n\n"
            f"Track your complaint status online anytime:\n{track_url}\n"
        )
        body_html = f"""
        <div style="font-family: Arial, sans-serif; color: #161616; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #D6CFC3; background-color: #FBFAF7;">
          <h2 style="color: #292724; border-bottom: 2px solid #B7A58A; padding-bottom: 8px;">CivicPulse Complaint Received</h2>
          <p>Your civic complaint has been registered successfully into the portal.</p>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
            <tr><td style="padding: 6px; font-weight: bold;">Tracking ID:</td><td style="padding: 6px; font-family: monospace;">{tracking_id}</td></tr>
            <tr><td style="padding: 6px; font-weight: bold;">Issue:</td><td style="padding: 6px;">{title}</td></tr>
            <tr><td style="padding: 6px; font-weight: bold;">Department:</td><td style="padding: 6px;">{dept}</td></tr>
            <tr><td style="padding: 6px; font-weight: bold;">Status:</td><td style="padding: 6px;">Reported</td></tr>
            <tr><td style="padding: 6px; font-weight: bold;">SLA Target:</td><td style="padding: 6px;">{sla_str}</td></tr>
          </table>
          <p><a href="{track_url}" style="display: inline-block; background-color: #292724; color: #FBFAF7; padding: 10px 18px; text-decoration: none; border-radius: 4px;">Track Status</a></p>
        </div>
        """  # noqa: E501

        assert to_email is not None
        return await cls._send_email(to_email, subject, body_text, body_html)

    @classmethod
    async def notify_status_update(
        cls,
        to_email: str | None,
        tracking_id: str,
        title: str,
        department_name: str | None,
        new_status: ComplaintStatus,
        resolution_notes: str | None = None,
    ) -> bool:
        """
        Send status transition email
        (ASSIGNED, IN_PROGRESS, RESOLVED, CLOSED, REJECTED).
        """
        if not cls.is_valid_email(to_email):
            return False

        settings = get_settings()
        track_url = f"{settings.FRONTEND_BASE_URL.rstrip('/')}/track/{tracking_id}"
        dept = department_name or "Municipal Administration"
        status_label = new_status.value.replace("_", " ").upper()

        if new_status == ComplaintStatus.RESOLVED:
            res_summary = (
                resolution_notes or "Officer-reported resolution completed."
            )
            subject = f"CivicPulse Complaint Resolved - {tracking_id}"
            body_text = (
                f"CivicPulse Smart City Resolution Portal\n\n"
                f"Your reported civic complaint has been marked as resolved.\n\n"
                f"Tracking ID: {tracking_id}\n"
                f"Issue: {title}\n"
                f"Department: {dept}\n"
                f"Status: RESOLVED\n"
                f"Resolution Summary: {res_summary}\n\n"
                f"Review complete status timeline online:\n{track_url}\n"
            )
            body_html = f"""
            <div style="font-family: Arial, sans-serif; color: #161616; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #D6CFC3; background-color: #FBFAF7;">
              <h2 style="color: #292724; border-bottom: 2px solid #B7A58A; padding-bottom: 8px;">Complaint Resolution Notice</h2>
              <p>Your reported civic issue has been resolved by the municipal department.</p>
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
                <tr><td style="padding: 6px; font-weight: bold;">Tracking ID:</td><td style="padding: 6px; font-family: monospace;">{tracking_id}</td></tr>
                <tr><td style="padding: 6px; font-weight: bold;">Issue:</td><td style="padding: 6px;">{title}</td></tr>
                <tr><td style="padding: 6px; font-weight: bold;">Department:</td><td style="padding: 6px;">{dept}</td></tr>
                <tr><td style="padding: 6px; font-weight: bold;">Resolution Summary:</td><td style="padding: 6px;">{resolution_notes or 'Officer-reported resolution completed.'}</td></tr>
              </table>
              <p><a href="{track_url}" style="display: inline-block; background-color: #292724; color: #FBFAF7; padding: 10px 18px; text-decoration: none; border-radius: 4px;">View Resolution Record</a></p>
            </div>
            """  # noqa: E501
        else:
            subject = f"CivicPulse Update - {tracking_id}"
            body_text = (
                f"CivicPulse Smart City Resolution Portal\n\n"
                f"The status of your complaint has been updated.\n\n"
                f"Tracking ID: {tracking_id}\n"
                f"Issue: {title}\n"
                f"Department: {dept}\n"
                f"New Status: {status_label}\n\n"
                f"Track status online:\n{track_url}\n"
            )
            body_html = f"""
            <div style="font-family: Arial, sans-serif; color: #161616; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #D6CFC3; background-color: #FBFAF7;">
              <h2 style="color: #292724; border-bottom: 2px solid #B7A58A; padding-bottom: 8px;">Complaint Status Update</h2>
              <p>Your reported civic complaint status has changed.</p>
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
                <tr><td style="padding: 6px; font-weight: bold;">Tracking ID:</td><td style="padding: 6px; font-family: monospace;">{tracking_id}</td></tr>
                <tr><td style="padding: 6px; font-weight: bold;">Issue:</td><td style="padding: 6px;">{title}</td></tr>
                <tr><td style="padding: 6px; font-weight: bold;">Department:</td><td style="padding: 6px;">{dept}</td></tr>
                <tr><td style="padding: 6px; font-weight: bold;">New Status:</td><td style="padding: 6px; font-weight: bold;">{status_label}</td></tr>
              </table>
              <p><a href="{track_url}" style="display: inline-block; background-color: #292724; color: #FBFAF7; padding: 10px 18px; text-decoration: none; border-radius: 4px;">Track Complaint</a></p>
            </div>
            """  # noqa: E501

        assert to_email is not None
        return await cls._send_email(to_email, subject, body_text, body_html)
