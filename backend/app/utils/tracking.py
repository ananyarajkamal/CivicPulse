"""
CivicPulse — Secure complaint tracking ID generator.

SPECIFICATION (locked in implementation_plan.md):
    - Entropy:   128 bits (16 cryptographically random bytes)
    - Encoding:  URL-safe Base64, no padding characters
    - Format:    CP-{22 characters}
    - Regex:     ^CP-[A-Za-z0-9_-]{22}$
    - DB column: VARCHAR(30)

RATIONALE:
    128-bit entropy gives ~3.4 x 10^38 possible values.
    At 1 billion guesses/second, exhaustive enumeration would take
    ~10^22 years — computationally infeasible.

    Combined with rate limiting on the public tracking endpoint
    (30 requests/minute per IP), enumeration attacks are not viable.

IMPORTANT:
    The internal complaint UUID (complaints.id) is kept separate and
    is never exposed to external callers. The tracking_id is the
    ONLY public identifier for a complaint.

    Sequential IDs (CP-000001, CP-000002, etc.) are explicitly
    prohibited — they allow enumeration of complaint counts and ordering.
"""

import base64
import re
import secrets

# ---------------------------------------------------------------------------
# Compiled validation pattern — used for both generation verification
# and input validation on the public tracking endpoint.
# ---------------------------------------------------------------------------
TRACKING_ID_RE: re.Pattern[str] = re.compile(r"^CP-[A-Za-z0-9_-]{22}$")


def generate_tracking_id() -> str:
    """
    Generate a cryptographically secure public complaint tracking ID.

    Returns:
        A string of the form CP-{22 URL-safe Base64 chars}, e.g.
        "CP-X7k2mN4qVpRsLwYzJb8nDg"

    The returned value:
        - Is 25 characters long (3 prefix + 22 payload)
        - Contains only URL-safe characters: A-Z, a-z, 0-9, _, -
        - Carries 128 bits of cryptographic randomness
        - Has no padding characters (=)
        - Fits in VARCHAR(30)
    """
    raw: bytes = secrets.token_bytes(16)  # 128 bits of entropy
    # urlsafe_b64encode(16 bytes) = 24 chars with 2 padding chars
    # After stripping '=': always exactly 22 chars
    encoded: bytes = base64.urlsafe_b64encode(raw).rstrip(b"=")
    tracking_id = f"CP-{encoded.decode('ascii')}"

    # Invariant check — catches any future regression immediately
    assert len(tracking_id) == 25, (
        f"Tracking ID length invariant violated: expected 25, got {len(tracking_id)}"
    )
    return tracking_id


def validate_tracking_id(tracking_id: str) -> bool:
    """
    Validate a public tracking ID against the canonical format.

    Args:
        tracking_id: The candidate tracking ID string.

    Returns:
        True if the format matches ^CP-[A-Za-z0-9_-]{22}$, False otherwise.

    Note:
        This validates format only, not database existence.
        Return 404 for both missing and format-invalid IDs on the
        public endpoint (do not distinguish between the two).
    """
    return bool(TRACKING_ID_RE.match(tracking_id))
