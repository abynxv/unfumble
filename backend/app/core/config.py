"""
Application configuration using Pydantic Settings.

WHY: We use pydantic-settings to load environment variables with type validation.
This ensures all required config values are present at startup, and gives us
a single source of truth for configuration across the entire backend.

The Settings class reads from environment variables (or a .env file).
Each field maps to an environment variable — Pydantic handles parsing.
"""

from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Central configuration for the application.
    All values come from environment variables or a .env file.
    """

    # ─── Supabase ─────────────────────────────────────────────
    supabase_url: str
    supabase_anon_key: str
    supabase_jwt_secret: str
    supabase_service_role_key: str
    supabase_storage_bucket: str = "generations"

    # ─── Database ─────────────────────────────────────────────
    # The async connection string for PostgreSQL via asyncpg.
    # Format: postgresql+asyncpg://user:pass@host:5432/dbname
    database_url: str

    # ─── Hugging Face ─────────────────────────────────────────
    huggingface_api_key: str
    huggingface_model_id: str = "stabilityai/stable-diffusion-xl-refiner-1.0"

    # ─── Admin ────────────────────────────────────────────────
    # Comma-separated emails that have admin access.
    # Keeps admin authorization simple — no complex RBAC needed.
    admin_emails: str = ""

    # ─── App ──────────────────────────────────────────────────
    app_env: str = "development"
    log_level: str = "INFO"
    max_upload_size_mb: int = 10

    # Tell Pydantic to read from a .env file in the backend/ directory
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    @property
    def max_upload_size_bytes(self) -> int:
        """Convert MB limit to bytes for file validation."""
        return self.max_upload_size_mb * 1024 * 1024

    @property
    def admin_email_list(self) -> list[str]:
        """Parse the comma-separated admin emails into a list."""
        if not self.admin_emails:
            return []
        return [email.strip().lower() for email in self.admin_emails.split(",") if email.strip()]

    def is_admin(self, email: str) -> bool:
        """Check if a given email address has admin privileges."""
        return email.strip().lower() in self.admin_email_list


# WHY lru_cache: We only want to load and parse the .env file once.
# After the first call, subsequent calls return the cached Settings instance.
# This is a common FastAPI pattern for singleton-style configuration.
@lru_cache
def get_settings() -> Settings:
    """Return the cached application settings singleton."""
    return Settings()
