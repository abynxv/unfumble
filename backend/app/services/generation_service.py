"""
Generation service — orchestrates the full image generation workflow.

WHY A SERVICE LAYER:
The route handler (in generations.py) should only handle HTTP concerns
(parsing requests, returning responses). The business logic — validation,
storage, database operations, AI inference — lives here in the service.

This separation makes the code:
- Easier to test (test the service without HTTP)
- Easier to understand (each layer has one job)
- Easier to refactor (swap storage or AI without touching routes)

THE GENERATION FLOW:
1. Validate the uploaded image (size, type, validity)
2. Upload the original image to storage
3. Create a database record with status=PENDING
4. Run AI inference (in a background task if needed)
5. Upload the generated image to storage
6. Update the database record with the result
"""

import logging
from datetime import datetime, timezone
from io import BytesIO

from PIL import Image
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.generation import Generation, GenerationStatus
from app.services.huggingface_service import HuggingFaceService, get_huggingface_service
from app.services.storage_service import StorageService, get_storage_service

logger = logging.getLogger(__name__)

# Allowed image MIME types and extensions
ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}


class ImageValidationError(Exception):
    """Raised when an uploaded image fails validation."""
    pass


class GenerationService:
    """
    Orchestrates the profile picture generation workflow.

    This is the main business logic layer — it coordinates between
    storage, AI inference, and the database.
    """

    def __init__(
        self,
        storage: StorageService | None = None,
        huggingface: HuggingFaceService | None = None,
    ) -> None:
        self._storage = storage or get_storage_service()
        self._hf = huggingface or get_huggingface_service()
        self._settings = get_settings()

    def validate_image(self, file_data: bytes, filename: str, content_type: str | None) -> None:
        """
        Validate an uploaded image file.

        WHY VALIDATE:
        - Prevent uploading non-image files (security)
        - Prevent excessively large uploads (resource protection)
        - Verify the file is actually a valid image, not a renamed file

        We check three things:
        1. File extension is allowed
        2. File size is within limits
        3. Pillow can actually open and parse it (proves it's a real image)
        """
        # 1. Check file extension
        extension = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
        if extension not in ALLOWED_EXTENSIONS:
            raise ImageValidationError(
                f"Unsupported file type '.{extension}'. "
                f"Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
            )

        # 2. Check file size
        max_size = self._settings.max_upload_size_bytes
        if len(file_data) > max_size:
            raise ImageValidationError(
                f"File too large ({len(file_data) / 1024 / 1024:.1f}MB). "
                f"Maximum: {self._settings.max_upload_size_mb}MB."
            )

        # 3. Verify it's actually a valid image using Pillow
        # WHY PILLOW: A file could have a .jpg extension but contain malicious
        # content. Pillow actually parses the image header and pixel data,
        # so it will reject non-image files.
        try:
            img = Image.open(BytesIO(file_data))
            img.verify()  # Verifies the image data without fully decoding it
        except Exception:
            raise ImageValidationError(
                "The uploaded file is not a valid image or is corrupted."
            )

    async def create_generation(
        self,
        db: AsyncSession,
        user_id: str,
        file_data: bytes,
        filename: str,
        content_type: str | None,
        style: str,
    ) -> Generation:
        """
        Create a new generation record and upload the original image.

        This method handles the synchronous part of generation:
        - Validate the image
        - Upload it to storage
        - Create the database record

        The actual AI inference happens separately (in process_generation)
        so it can run as a background task without blocking the HTTP response.
        """
        # Validate the uploaded image
        self.validate_image(file_data, filename, content_type)

        # Upload original image to storage
        original_path = self._storage.upload_file(
            file_data=file_data,
            folder="original",
            user_id=user_id,
            original_filename=filename,
        )

        # Get the public URL for the original image
        original_url = self._storage.get_public_url(original_path)

        # Create the generation record in the database
        generation = Generation(
            user_id=user_id,
            original_image_url=original_url,
            style=style,
            status=GenerationStatus.PENDING,
        )
        db.add(generation)
        await db.commit()
        await db.refresh(generation)

        logger.info(f"Created generation {generation.id} for user {user_id}")
        return generation

    async def process_generation(
        self,
        db: AsyncSession,
        generation_id: int,
        user_id: str,
        original_image_bytes: bytes,
        style: str,
    ) -> None:
        """
        Run AI inference and update the generation record.

        WHY SEPARATE FROM create_generation:
        AI inference can take 30-60+ seconds. If we did it in the same request,
        the user would see a loading spinner for a full minute. Instead:
        1. create_generation() returns immediately with status=PENDING
        2. This method runs as a FastAPI BackgroundTask
        3. The frontend polls for status updates

        WHY BackgroundTasks (NOT Celery):
        For a learning project, FastAPI's built-in BackgroundTasks is sufficient.
        It runs the task in the same process after the response is sent.
        Celery would be overkill here — it requires Redis/RabbitMQ infrastructure.
        """
        # Fetch the generation record
        result = await db.execute(
            select(Generation).where(
                Generation.id == generation_id,
                Generation.user_id == user_id,
            )
        )
        generation = result.scalar_one_or_none()

        if not generation:
            logger.error(f"Generation {generation_id} not found for processing")
            return

        # Update status to PROCESSING
        generation.status = GenerationStatus.PROCESSING
        await db.commit()

        try:
            # Run AI inference via HuggingFace
            generated_bytes = await self._hf.generate_profile_image(
                image_bytes=original_image_bytes,
                style=style,
            )

            # Upload the generated image to storage
            generated_path = self._storage.upload_file(
                file_data=generated_bytes,
                folder="generated",
                user_id=user_id,
                original_filename=f"generated_{generation_id}.png",
            )
            generated_url = self._storage.get_public_url(generated_path)

            # Update the generation record with the result
            generation.generated_image_url = generated_url
            generation.status = GenerationStatus.COMPLETED
            generation.completed_at = datetime.now(timezone.utc)
            await db.commit()

            logger.info(f"Generation {generation_id} completed successfully")

        except Exception as e:
            # If anything fails, mark the generation as FAILED with the error message.
            # This lets the user see what went wrong in the UI.
            logger.error(f"Generation {generation_id} failed: {e}")
            generation.status = GenerationStatus.FAILED
            generation.error_message = str(e)
            generation.completed_at = datetime.now(timezone.utc)
            await db.commit()

    async def get_generation(
        self,
        db: AsyncSession,
        generation_id: int,
        user_id: str,
    ) -> Generation | None:
        """
        Fetch a single generation by ID, scoped to the authenticated user.

        WHY USER SCOPING:
        We always filter by user_id to enforce ownership. Even if an attacker
        guesses another user's generation ID, they can't access it because
        the query filters by their own user_id.
        """
        result = await db.execute(
            select(Generation).where(
                Generation.id == generation_id,
                Generation.user_id == user_id,
            )
        )
        return result.scalar_one_or_none()

    async def list_generations(
        self,
        db: AsyncSession,
        user_id: str,
        skip: int = 0,
        limit: int = 20,
    ) -> tuple[list[Generation], int]:
        """
        List all generations for a user with pagination.

        Returns a tuple of (generations, total_count) for the frontend
        to display pagination controls.
        """
        # Get total count
        count_result = await db.execute(
            select(func.count(Generation.id)).where(Generation.user_id == user_id)
        )
        total = count_result.scalar() or 0

        # Get paginated results, newest first
        result = await db.execute(
            select(Generation)
            .where(Generation.user_id == user_id)
            .order_by(Generation.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        generations = list(result.scalars().all())

        return generations, total

    async def delete_generation(
        self,
        db: AsyncSession,
        generation_id: int,
        user_id: str,
    ) -> bool:
        """
        Delete a generation and its associated files.

        Returns True if the generation was found and deleted, False if not found.

        WHY CHECK OWNERSHIP:
        We verify the generation belongs to the user before deleting.
        This prevents User A from deleting User B's generations.
        """
        generation = await self.get_generation(db, generation_id, user_id)
        if not generation:
            return False

        # Delete associated files from storage (best-effort — don't fail if storage delete fails)
        if generation.original_image_url:
            self._storage.delete_file(generation.original_image_url)
        if generation.generated_image_url:
            self._storage.delete_file(generation.generated_image_url)

        # Delete the database record
        await db.delete(generation)
        await db.commit()

        logger.info(f"Deleted generation {generation_id} for user {user_id}")
        return True

    # ─── Admin Methods ───────────────────────────────────────────

    async def get_admin_stats(self, db: AsyncSession) -> dict:
        """Get aggregate statistics for the admin dashboard."""
        # Total generations by status
        status_counts = {}
        for status in GenerationStatus:
            result = await db.execute(
                select(func.count(Generation.id)).where(Generation.status == status)
            )
            status_counts[status.value] = result.scalar() or 0

        # Total unique users
        user_count_result = await db.execute(
            select(func.count(func.distinct(Generation.user_id)))
        )
        total_users = user_count_result.scalar() or 0

        total_generations = sum(status_counts.values())

        return {
            "total_users": total_users,
            "total_generations": total_generations,
            "completed_generations": status_counts.get("completed", 0),
            "failed_generations": status_counts.get("failed", 0),
            "pending_generations": status_counts.get("pending", 0),
            "processing_generations": status_counts.get("processing", 0),
        }

    async def list_all_generations(
        self,
        db: AsyncSession,
        skip: int = 0,
        limit: int = 50,
        status_filter: str | None = None,
    ) -> tuple[list[Generation], int]:
        """List all generations across all users (admin only)."""
        query = select(Generation)
        count_query = select(func.count(Generation.id))

        if status_filter:
            query = query.where(Generation.status == status_filter)
            count_query = count_query.where(Generation.status == status_filter)

        count_result = await db.execute(count_query)
        total = count_result.scalar() or 0

        result = await db.execute(
            query.order_by(Generation.created_at.desc()).offset(skip).limit(limit)
        )
        generations = list(result.scalars().all())

        return generations, total

    async def admin_delete_generation(
        self,
        db: AsyncSession,
        generation_id: int,
    ) -> bool:
        """Admin can delete any generation regardless of ownership."""
        result = await db.execute(
            select(Generation).where(Generation.id == generation_id)
        )
        generation = result.scalar_one_or_none()
        if not generation:
            return False

        if generation.original_image_url:
            self._storage.delete_file(generation.original_image_url)
        if generation.generated_image_url:
            self._storage.delete_file(generation.generated_image_url)

        await db.delete(generation)
        await db.commit()

        logger.info(f"Admin deleted generation {generation_id}")
        return True


# Singleton
_generation_service: GenerationService | None = None


def get_generation_service() -> GenerationService:
    """Get or create the generation service singleton."""
    global _generation_service
    if _generation_service is None:
        _generation_service = GenerationService()
    return _generation_service
