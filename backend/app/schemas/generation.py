"""
Pydantic schemas for the Generation API.

WHY SEPARATE SCHEMAS FROM MODELS:
- ORM models (SQLAlchemy) define the database structure.
- Pydantic schemas define the API request/response structure.
- Keeping them separate lets us control exactly what data the API accepts and returns,
  without exposing internal database details.

KEY CONCEPTS:
- "Create" schemas validate incoming request data.
- "Response" schemas shape outgoing API responses.
- model_config with from_attributes=True tells Pydantic to read from ORM objects.
"""

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class StyleEnum(str, Enum):
    """
    Available styles and backgrounds for profile picture generation.
    """
    STUDIO_MINIMAL = "studio_minimal"
    STUDIO_GREY = "studio_grey"
    OFFICE_BLUR = "office_blur"
    WARM_LOUNGE = "warm_lounge"
    OUTDOOR_BOKEH = "outdoor_bokeh"

    # Legacy styles for backwards compatibility
    CORPORATE = "corporate"
    STARTUP = "startup"
    DEVELOPER = "developer"
    FORMAL = "formal"


class FaceCheckResponse(BaseModel):
    """Result of pre-flight face clarity and quality analysis."""
    is_valid: bool
    message: str
    face_count: int = 0
    blur_score: float = 0.0
    brightness: float = 0.0


class GenerationCreate(BaseModel):
    """
    Schema for creating a new generation.
    """
    style: StyleEnum = Field(
        ...,
        description="The background style for the generated profile picture.",
        examples=["studio_minimal"],
    )


class GenerationResponse(BaseModel):
    """
    Schema for returning a generation in API responses.

    WHY from_attributes: This tells Pydantic it can read data from
    SQLAlchemy model instances (which use attribute access, not dict access).
    Without this, Pydantic can't convert an ORM object to a response.
    """
    id: int
    user_id: str
    original_image_url: str | None = None
    generated_image_url: str | None = None
    style: str
    status: str
    error_message: str | None = None
    created_at: datetime
    completed_at: datetime | None = None

    model_config = {"from_attributes": True}


class GenerationListResponse(BaseModel):
    """Paginated list of generations."""
    generations: list[GenerationResponse]
    total: int


class AdminStatsResponse(BaseModel):
    """
    Admin dashboard statistics.
    Provides an overview of system usage for admin monitoring.
    """
    total_users: int
    total_generations: int
    completed_generations: int
    failed_generations: int
    pending_generations: int
    processing_generations: int


class AdminUserResponse(BaseModel):
    """Admin view of a user's activity."""
    user_id: str
    email: str | None = None
    generation_count: int
    last_generation_at: datetime | None = None


class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    version: str = "1.0.0"
