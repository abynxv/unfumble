"""
SQLAlchemy ORM model for the Generation table.

WHY AN ORM MODEL:
SQLAlchemy maps this Python class to a PostgreSQL table. Each instance of
Generation represents one row in the 'generations' table. This lets us
interact with the database using Python objects instead of raw SQL.

KEY DESIGN DECISIONS:
- We store image paths/URLs, NOT binary image data. Images live in Supabase Storage.
- user_id comes from the Supabase JWT (the authenticated user's UUID).
- status tracks the generation lifecycle: pending → processing → completed/failed.
- error_message captures failure reasons for debugging and user feedback.
"""

import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class GenerationStatus(str, enum.Enum):
    """
    Tracks where a generation is in its lifecycle.

    WHY an enum: Constrains the status to known values at both the
    Python and database level, preventing invalid status strings.
    """
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class Generation(Base):
    """
    Represents one AI profile picture generation.

    Each row tracks:
    - Who requested it (user_id)
    - The original uploaded image path
    - The AI-generated image path
    - Which style was selected
    - Current processing status
    - Any error that occurred
    - Timestamps for creation and completion
    """

    __tablename__ = "generations"

    # Primary key — auto-generated integer ID.
    # Using Mapped[int] with mapped_column is the SQLAlchemy 2.x way to define columns.
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)

    # The Supabase user UUID who owns this generation.
    # Indexed for fast lookups when fetching "my generations."
    user_id: Mapped[str] = mapped_column(String(255), nullable=False, index=True)

    # Storage paths (not full URLs) — the storage service resolves these to URLs.
    # Storing paths instead of full URLs means we can change storage providers
    # without updating every database row.
    original_image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    generated_image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # The style the user selected (e.g., "corporate", "startup", "developer", "formal").
    style: Mapped[str] = mapped_column(String(50), nullable=False)

    # Generation lifecycle status — starts as PENDING.
    status: Mapped[GenerationStatus] = mapped_column(
        Enum(GenerationStatus),
        nullable=False,
        default=GenerationStatus.PENDING,
        server_default="pending",
    )

    # If the generation fails, store the error message for debugging.
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Timestamps — server_default uses PostgreSQL's now() function.
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    def __repr__(self) -> str:
        return (
            f"Generation(id={self.id}, user_id={self.user_id}, "
            f"style={self.style}, status={self.status})"
        )
