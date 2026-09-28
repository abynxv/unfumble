"""
Generation API endpoints — the core REST API for the application.

ENDPOINT OVERVIEW:
    POST   /api/v1/generations      → Upload image and start generation
    GET    /api/v1/generations      → List user's generations
    GET    /api/v1/generations/{id} → Get a specific generation
    DELETE /api/v1/generations/{id} → Delete a generation

HOW FASTAPI HANDLES FILE UPLOADS:
FastAPI uses python-multipart to parse multipart/form-data requests.
When a user uploads a file, it arrives as an UploadFile object that provides:
- filename: The original filename
- content_type: The MIME type (e.g., "image/jpeg")
- read(): Async method to read the file bytes

The 'style' field is sent as a form field alongside the file (not JSON body),
because you can't mix file uploads with JSON body in the same request.

WHY BackgroundTasks:
AI inference takes 30-60+ seconds. Instead of making the user wait,
we return the generation record immediately (status=PENDING) and run
the inference in a FastAPI BackgroundTask. The frontend polls the
GET endpoint to check when it's done.
"""

import logging

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile,
    status,
)
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import AuthenticatedUser, get_current_user
from app.schemas.generation import (
    GenerationListResponse,
    GenerationResponse,
    StyleEnum,
)
from app.services.generation_service import (
    GenerationService,
    ImageValidationError,
    get_generation_service,
)
from app.core.database import SessionLocal

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/generations", tags=["Generations"])


async def _run_background_generation(
    generation_id: int,
    user_id: str,
    image_bytes: bytes,
    style: str,
) -> None:
    """
    Background task wrapper for AI generation.

    WHY A SEPARATE DB SESSION:
    Background tasks run after the HTTP response is sent, so the original
    request's database session is already closed. We need a fresh session.
    This is a common pattern when using FastAPI BackgroundTasks with databases.
    """
    service = get_generation_service()
    async with SessionLocal() as db:
        await service.process_generation(
            db=db,
            generation_id=generation_id,
            user_id=user_id,
            original_image_bytes=image_bytes,
            style=style,
        )


@router.post(
    "",
    response_model=GenerationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new generation",
    description="Upload a portrait photo and select a style to generate a professional profile picture.",
)
async def create_generation(
    background_tasks: BackgroundTasks,
    style: StyleEnum = Form(..., description="The style for the generated image"),
    image: UploadFile = File(..., description="The portrait image to transform"),
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    service: GenerationService = Depends(get_generation_service),
):
    """
    Upload a photo and start AI profile picture generation.

    HOW THIS ENDPOINT WORKS:
    1. FastAPI authenticates the user via the JWT (get_current_user dependency).
    2. The image file and style are extracted from the multipart form data.
    3. We read the file bytes and validate the image.
    4. We upload the original to storage and create a DB record (status=PENDING).
    5. We schedule the AI inference as a background task.
    6. We return the generation record immediately — the user doesn't wait for AI.
    7. The background task runs inference, saves the result, and updates the DB.
    8. The frontend polls GET /api/v1/generations/{id} to check status.
    """
    # Read the uploaded file into memory
    file_data = await image.read()

    try:
        # Create the generation record (validates image + uploads original)
        generation = await service.create_generation(
            db=db,
            user_id=user.id,
            file_data=file_data,
            filename=image.filename or "upload.jpg",
            content_type=image.content_type,
            style=style.value,
        )
    except ImageValidationError as e:
        # Return a 400 with a clear error message explaining what's wrong
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except RuntimeError as e:
        # Storage or other infrastructure failures
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Upload failed: {str(e)}",
        )

    # Schedule AI inference as a background task.
    # WHY: This returns the HTTP response immediately while inference runs async.
    background_tasks.add_task(
        _run_background_generation,
        generation_id=generation.id,
        user_id=user.id,
        image_bytes=file_data,
        style=style.value,
    )

    return generation


@router.get(
    "",
    response_model=GenerationListResponse,
    summary="List your generations",
    description="Get all your profile picture generations, newest first.",
)
async def list_generations(
    skip: int = 0,
    limit: int = 20,
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    service: GenerationService = Depends(get_generation_service),
):
    """
    List all generations belonging to the authenticated user.

    WHY USER SCOPING:
    The get_current_user dependency extracts the user ID from the JWT.
    The service filters generations by this user ID, so User A
    can never see User B's generations — even if they modify the request.
    """
    generations, total = await service.list_generations(
        db=db,
        user_id=user.id,
        skip=skip,
        limit=limit,
    )
    return GenerationListResponse(generations=generations, total=total)


@router.get(
    "/{generation_id}",
    response_model=GenerationResponse,
    summary="Get a specific generation",
    description="Get details of a specific generation by ID.",
)
async def get_generation(
    generation_id: int,
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    service: GenerationService = Depends(get_generation_service),
):
    """
    Get a single generation by ID.

    The service automatically scopes the query to the authenticated user,
    so requesting another user's generation returns 404 (not 403).

    WHY 404 INSTEAD OF 403:
    Returning 404 for unauthorized access prevents information leakage.
    An attacker can't determine if a generation ID exists for another user.
    """
    generation = await service.get_generation(
        db=db,
        generation_id=generation_id,
        user_id=user.id,
    )
    if not generation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Generation not found.",
        )
    return generation


@router.delete(
    "/{generation_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a generation",
    description="Delete a generation and its associated images.",
)
async def delete_generation(
    generation_id: int,
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    service: GenerationService = Depends(get_generation_service),
):
    """
    Delete a generation owned by the authenticated user.

    WHY 204 NO CONTENT:
    The HTTP spec recommends 204 for successful DELETE operations
    where there's no body to return. The generation is gone.
    """
    deleted = await service.delete_generation(
        db=db,
        generation_id=generation_id,
        user_id=user.id,
    )
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Generation not found.",
        )
    # 204 responses have no body — FastAPI handles this automatically
