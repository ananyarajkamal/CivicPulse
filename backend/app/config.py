"""
CivicPulse — Centralised application configuration.

All settings are loaded from environment variables (or .env file).
No secrets are hardcoded anywhere in this file.

Usage:
    from app.config import get_settings
    settings = get_settings()
"""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.

    Required variables must be present in the environment or a .env file.
    See .env.example for the full list of required variables.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # --- Application ---
    APP_NAME: str = "CivicPulse"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = False

    # --- Database (Supabase PostgreSQL) ---
    DATABASE_URL: str
    SUPABASE_URL: str
    SUPABASE_SERVICE_ROLE_KEY: str  # Backend only — never expose to frontend
    SUPABASE_ANON_KEY: str

    # --- Authentication ---
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # --- AI Providers (Phase 4+, not used in Phase 1) ---
    GEMINI_API_KEY: str = ""
    GROQ_API_KEY: str = ""

    # --- CORS ---
    # Accepts a comma-separated string or a Python list.
    # Example: ALLOWED_ORIGINS=http://localhost:3000,https://app.example.com
    ALLOWED_ORIGINS: str | list[str] = "http://localhost:3000"

    # --- Email Notification Settings ---
    EMAIL_PROVIDER: str = "resend"
    RESEND_API_KEY: str = ""
    FROM_EMAIL: str = "CivicPulse <notifications@civicpulse.gov>"
    FRONTEND_BASE_URL: str = "http://localhost:3000"

    # --- Geocoding ---
    NOMINATIM_USER_AGENT: str = "CivicPulse/0.1.0"

    # --- Rate Limits (informational — applied per-endpoint in later phases) ---
    RATE_LIMIT_COMPLAINT_SUBMIT: str = "5/minute"
    RATE_LIMIT_TRACKING: str = "30/minute"
    RATE_LIMIT_GEOCODE: str = "20/minute"
    RATE_LIMIT_LOGIN: str = "10/minute"
    RATE_LIMIT_AUTHENTICATED: str = "120/minute"

    @property
    def allowed_origins_list(self) -> list[str]:
        """Return ALLOWED_ORIGINS as a list of trimmed strings."""
        if isinstance(self.ALLOWED_ORIGINS, str):
            return [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]
        return [str(o) for o in self.ALLOWED_ORIGINS]


@lru_cache
def get_settings() -> Settings:
    """
    Return the cached application settings singleton.

    Uses lru_cache so the .env file is only read once.
    In tests, call get_settings.cache_clear() to reload.
    """
    return Settings()
