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
    Available styles for profile picture generation.
    Each style maps to a different prompt sent to the AI model.
    """
    CORPORATE = "corporate"
    STARTUP = "startup"
    DEVELOPER = "developer"
    FORMAL = "formal"


class GenerationCreate(BaseModel):
    """
    Schema for creating a new generation.

    NOTE: The actual image file is sent as a multipart form upload,
    not in the JSON body. This schema only validates the 'style' field
    which is sent as a form field alongside the image.
    """
    style: StyleEnum = Field(
        ...,
        description="The style for the generated profile picture.",
        examples=["corporate"],
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
