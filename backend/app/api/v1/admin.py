"""
Admin API endpoints — analytics and management for admin users.

HOW ADMIN ACCESS WORKS:
The get_current_admin dependency (from security.py) chains on top of
get_current_user. It first validates the JWT, then checks if the user's
email is in the ADMIN_EMAILS environment variable. If not, they get 403.

This keeps admin authorization dead simple — no database roles, no RBAC tables.
Just a comma-separated list of trusted email addresses.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import AuthenticatedUser, get_current_admin
from app.schemas.generation import (
    AdminStatsResponse,
    GenerationListResponse,
    GenerationResponse,
)
from app.services.generation_service import GenerationService, get_generation_service
from app.services.huggingface_service import get_huggingface_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get(
    "/stats",
    response_model=AdminStatsResponse,
    summary="Get system statistics",
    description="Get aggregate statistics about users and generations. Admin only.",
)
async def get_admin_stats(
    admin: AuthenticatedUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
    service: GenerationService = Depends(get_generation_service),
):
    """
    Return aggregate statistics for the admin dashboard.
    Only accessible to users whose email is in ADMIN_EMAILS.
    """
    stats = await service.get_admin_stats(db)
    return AdminStatsResponse(**stats)


@router.get(
    "/generations",
    response_model=GenerationListResponse,
    summary="List all generations (admin)",
    description="List all generations across all users. Supports filtering by status.",
)
async def list_all_generations(
    skip: int = 0,
    limit: int = 50,
    status_filter: str | None = None,
    admin: AuthenticatedUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
    service: GenerationService = Depends(get_generation_service),
):
    """List all generations across all users with optional status filtering."""
    generations, total = await service.list_all_generations(
        db=db,
        skip=skip,
        limit=limit,
        status_filter=status_filter,
    )
    return GenerationListResponse(generations=generations, total=total)


@router.delete(
    "/generations/{generation_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete any generation (admin)",
    description="Delete any generation regardless of ownership. Admin only.",
)
async def admin_delete_generation(
    generation_id: int,
    admin: AuthenticatedUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
    service: GenerationService = Depends(get_generation_service),
):
    """Admin can delete any generation regardless of who owns it."""
    deleted = await service.admin_delete_generation(db, generation_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Generation not found.",
        )


@router.get(
    "/health/huggingface",
    summary="Check Hugging Face API health",
    description="Verify that the Hugging Face model endpoint is accessible.",
)
async def check_hf_health(
    admin: AuthenticatedUser = Depends(get_current_admin),
):
    """Check if the Hugging Face model is accessible."""
    hf = get_huggingface_service()
    is_healthy = await hf.health_check()
    return {
        "huggingface_api": "healthy" if is_healthy else "unhealthy",
        "model_id": hf._model_id,
    }
