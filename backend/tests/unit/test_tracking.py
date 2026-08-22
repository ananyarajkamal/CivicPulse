"""
Tests for the tracking ID generator.

These tests verify:
  - The correct 128-bit entropy (16 bytes)
  - The correct format (CP-{22 URL-safe Base64 chars})
  - The correct length (25 characters total)
  - No Base64 padding characters
  - Uniqueness over a large sample
  - The format validator
"""

import base64
import re

from app.utils.tracking import (
    TRACKING_ID_RE,
    generate_tracking_id,
    validate_tracking_id,
)

_EXPECTED_PATTERN = re.compile(r"^CP-[A-Za-z0-9_-]{22}$")


class TestTrackingIdFormat:
    """Verify the format of generated tracking IDs."""

    def test_matches_canonical_regex(self) -> None:
        """ID must match ^CP-[A-Za-z0-9_-]{22}$."""
        tid = generate_tracking_id()
        assert _EXPECTED_PATTERN.match(tid), f"Format mismatch: {tid!r}"

    def test_uses_compiled_module_regex(self) -> None:
        """Module-level TRACKING_ID_RE must match all generated IDs."""
        for _ in range(50):
            tid = generate_tracking_id()
            assert TRACKING_ID_RE.match(tid), f"Module regex mismatch: {tid!r}"

    def test_starts_with_cp_prefix(self) -> None:
        tid = generate_tracking_id()
        assert tid.startswith("CP-"), f"Expected CP- prefix, got: {tid!r}"

    def test_total_length_is_25(self) -> None:
        """CP- (3) + 22 payload chars = 25 total."""
        tid = generate_tracking_id()
        assert len(tid) == 25, f"Expected length 25, got {len(tid)}: {tid!r}"

    def test_payload_length_is_22(self) -> None:
        tid = generate_tracking_id()
        payload = tid[3:]  # Strip "CP-"
        assert len(payload) == 22, f"Expected 22-char payload, got {len(payload)}"

    def test_no_base64_padding(self) -> None:
        """Tracking ID must not contain '=' padding characters."""
        tid = generate_tracking_id()
        assert "=" not in tid, f"Padding character found: {tid!r}"

    def test_url_safe_characters_only(self) -> None:
        """All payload characters must be URL-safe (A-Z, a-z, 0-9, _, -)."""
        for _ in range(100):
            tid = generate_tracking_id()
            payload = tid[3:]
            for ch in payload:
                assert ch in (
                    "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
                    "abcdefghijklmnopqrstuvwxyz"
                    "0123456789-_"
                ), f"Non-URL-safe char {ch!r} in tracking ID {tid!r}"

    def test_fits_in_varchar30(self) -> None:
        """Tracking ID must fit in VARCHAR(30) database column."""
        tid = generate_tracking_id()
        assert len(tid) <= 30, f"Exceeds VARCHAR(30): len={len(tid)}, id={tid!r}"


class TestTrackingIdEntropy:
    """Verify that tracking IDs carry 128 bits of entropy."""

    def test_payload_decodes_to_16_bytes(self) -> None:
        """
        Decode the payload back to bytes and confirm it is exactly 16 bytes
        (128 bits). This is the ground truth for entropy verification.
        """
        tid = generate_tracking_id()
        payload = tid[3:]  # Remove "CP-"
        # Add padding back before decoding
        padding_needed = (4 - len(payload) % 4) % 4
        padded = payload + "=" * padding_needed
        raw = base64.urlsafe_b64decode(padded)
        assert len(raw) == 16, (
            f"Expected 16 bytes (128-bit entropy), decoded {len(raw)} bytes"
        )

    def test_not_48_bit_legacy(self) -> None:
        """
        Guard against regression to the old 48-bit / 10-char implementation.
        A 48-bit ID would have only 10 payload chars, not 22.
        """
        for _ in range(20):
            tid = generate_tracking_id()
            payload = tid[3:]
            assert len(payload) != 10, (
                f"Regression: 10-char payload (old 48-bit format): {tid!r}"
            )

    def test_uniqueness_over_large_sample(self) -> None:
        """With 128-bit entropy, 10,000 generated IDs must all be unique."""
        ids = {generate_tracking_id() for _ in range(10_000)}
        assert len(ids) == 10_000, (
            f"Collision detected: {10_000 - len(ids)} duplicates in 10,000 IDs"
        )


class TestValidateTrackingId:
    """Verify the tracking ID format validator."""

    def test_valid_generated_id(self) -> None:
        tid = generate_tracking_id()
        assert validate_tracking_id(tid) is True

    def test_invalid_empty_string(self) -> None:
        assert validate_tracking_id("") is False

    def test_invalid_wrong_prefix(self) -> None:
        assert validate_tracking_id("XX-X7k2mN4qVpRsLwYzJb8nDg") is False

    def test_invalid_no_prefix(self) -> None:
        assert validate_tracking_id("X7k2mN4qVpRsLwYzJb8nDg") is False

    def test_invalid_too_short_payload(self) -> None:
        """Less than 22 chars in payload is invalid."""
        assert validate_tracking_id("CP-SHORT") is False

    def test_invalid_too_long_payload(self) -> None:
        """More than 22 chars in payload is invalid."""
        assert validate_tracking_id("CP-X7k2mN4qVpRsLwYzJb8nDgXXX") is False

    def test_invalid_old_48bit_format(self) -> None:
        """The legacy 10-char format must be rejected."""
        assert validate_tracking_id("CP-K7MXQ2NVPF") is False

    def test_invalid_sequential_id(self) -> None:
        """Sequential IDs (forbidden by spec) must be rejected."""
        assert validate_tracking_id("CP-000001") is False

    def test_invalid_contains_padding(self) -> None:
        """IDs with Base64 padding must be rejected."""
        assert validate_tracking_id("CP-X7k2mN4qVpRsLwYzJb8n==") is False

    def test_invalid_non_url_safe_chars(self) -> None:
        """Standard Base64 (+, /) must be rejected (only URL-safe chars allowed)."""
        assert validate_tracking_id("CP-X7k2mN4qVpRsLwYzJb8+/") is False

    def test_consistent_with_module_regex(self) -> None:
        """validate_tracking_id must be consistent with TRACKING_ID_RE."""
        for _ in range(100):
            tid = generate_tracking_id()
            assert validate_tracking_id(tid) == bool(TRACKING_ID_RE.match(tid))
