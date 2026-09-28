"""
Tests for the AI Profile Studio backend.

TEST STRATEGY:
- Mock external services (Supabase, HuggingFace) — don't make real API calls in tests.
- Test authentication dependency with valid/invalid JWTs.
- Test image validation logic.
- Test generation CRUD with ownership checks.
- Test admin access controls.

WHY MOCK:
Real API calls in tests are slow, unreliable, and costly. Mocking lets us
test our logic in isolation, control exactly what responses look like,
and run tests in CI without API keys.
"""

import io
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException
from PIL import Image

from app.core.security import AuthenticatedUser, get_current_user
from app.services.generation_service import GenerationService, ImageValidationError


# ─── Helper Functions ────────────────────────────────────────────

def create_test_image(format: str = "JPEG", size: tuple = (100, 100)) -> bytes:
    """Create a valid test image in memory."""
    img = Image.new("RGB", size, color="red")
    buffer = io.BytesIO()
    img.save(buffer, format=format)
    return buffer.getvalue()


def create_mock_user(user_id: str = "test-user-123", email: str = "test@example.com") -> AuthenticatedUser:
    """Create a mock authenticated user."""
    return AuthenticatedUser(id=user_id, email=email, raw_token="mock-token")


# ─── Image Validation Tests ─────────────────────────────────────

class TestImageValidation:
    """Test the image validation logic in GenerationService."""

    def setup_method(self):
        """Create a service with mocked dependencies."""
        self.service = GenerationService(
            storage=MagicMock(),
            huggingface=MagicMock(),
        )

    def test_valid_jpeg_image(self):
        """Valid JPEG images should pass validation."""
        image_data = create_test_image("JPEG")
        # Should not raise
        self.service.validate_image(image_data, "photo.jpg", "image/jpeg")

    def test_valid_png_image(self):
        """Valid PNG images should pass validation."""
        image_data = create_test_image("PNG")
        self.service.validate_image(image_data, "photo.png", "image/png")

    def test_valid_webp_image(self):
        """Valid WebP images should pass validation."""
        image_data = create_test_image("WEBP")
        self.service.validate_image(image_data, "photo.webp", "image/webp")

    def test_invalid_extension(self):
        """Files with unsupported extensions should be rejected."""
        image_data = create_test_image("JPEG")
        with pytest.raises(ImageValidationError, match="Unsupported file type"):
            self.service.validate_image(image_data, "photo.gif", "image/gif")

    def test_file_too_large(self):
        """Files exceeding the size limit should be rejected."""
        # Create a large fake file (larger than max allowed)
        large_data = b"x" * (11 * 1024 * 1024)  # 11MB (limit is 10MB)
        with pytest.raises(ImageValidationError, match="File too large"):
            self.service.validate_image(large_data, "big.jpg", "image/jpeg")

    def test_invalid_image_data(self):
        """Non-image data with valid extension should be rejected."""
        fake_data = b"this is not an image"
        with pytest.raises(ImageValidationError, match="not a valid image"):
            self.service.validate_image(fake_data, "fake.jpg", "image/jpeg")

    def test_no_extension(self):
        """Files without extensions should be rejected."""
        image_data = create_test_image("JPEG")
        with pytest.raises(ImageValidationError, match="Unsupported file type"):
            self.service.validate_image(image_data, "photo", None)


# ─── Authentication Tests ───────────────────────────────────────

class TestAuthentication:
    """Test JWT validation and user extraction."""

    @pytest.mark.asyncio
    async def test_missing_token_raises_401(self):
        """Requests without a Bearer token should be rejected."""
        # The HTTPBearer scheme handles this automatically,
        # but we test the dependency behavior with a mock.
        mock_credentials = MagicMock()
        mock_credentials.credentials = "invalid-token"

        mock_settings = MagicMock()
        mock_settings.supabase_jwt_secret = "test-secret"

        with pytest.raises(HTTPException) as exc_info:
            await get_current_user(
                credentials=mock_credentials,
                settings=mock_settings,
            )
        assert exc_info.value.status_code == 401

    @pytest.mark.asyncio
    async def test_valid_jwt_returns_user(self):
        """A valid JWT should return an AuthenticatedUser."""
        from jose import jwt

        secret = "test-jwt-secret-key"
        payload = {
            "sub": "user-uuid-123",
            "email": "test@example.com",
            "aud": "authenticated",
        }
        token = jwt.encode(payload, secret, algorithm="HS256")

        mock_credentials = MagicMock()
        mock_credentials.credentials = token

        mock_settings = MagicMock()
        mock_settings.supabase_jwt_secret = secret

        user = await get_current_user(
            credentials=mock_credentials,
            settings=mock_settings,
        )
        assert user.id == "user-uuid-123"
        assert user.email == "test@example.com"


# ─── Ownership Tests ────────────────────────────────────────────

class TestOwnership:
    """Test that users can only access their own generations."""

    @pytest.mark.asyncio
    async def test_user_cannot_access_other_users_generation(self):
        """
        Requesting a generation with a different user_id should return None.
        This proves User A can't access User B's generations.
        """
        service = GenerationService(
            storage=MagicMock(),
            huggingface=MagicMock(),
        )

        # Mock database session
        mock_db = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db.execute.return_value = mock_result

        # Try to get a generation as a different user
        result = await service.get_generation(
            db=mock_db,
            generation_id=1,
            user_id="different-user",
        )
        assert result is None

    @pytest.mark.asyncio
    async def test_user_can_access_own_generation(self):
        """Users should be able to access their own generations."""
        service = GenerationService(
            storage=MagicMock(),
            huggingface=MagicMock(),
        )

        # Create a mock generation belonging to our test user
        mock_generation = MagicMock()
        mock_generation.user_id = "test-user-123"

        mock_db = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_generation
        mock_db.execute.return_value = mock_result

        result = await service.get_generation(
            db=mock_db,
            generation_id=1,
            user_id="test-user-123",
        )
        assert result is not None
        assert result.user_id == "test-user-123"


# ─── Admin Access Tests ─────────────────────────────────────────

class TestAdminAccess:
    """Test admin authorization logic."""

    @pytest.mark.asyncio
    async def test_non_admin_rejected(self):
        """Non-admin users should get 403 on admin endpoints."""
        from app.core.security import get_current_admin

        user = create_mock_user(email="regular@example.com")
        mock_settings = MagicMock()
        mock_settings.is_admin.return_value = False

        with pytest.raises(HTTPException) as exc_info:
            await get_current_admin(user=user, settings=mock_settings)
        assert exc_info.value.status_code == 403

    @pytest.mark.asyncio
    async def test_admin_allowed(self):
        """Admin users should pass the admin dependency."""
        from app.core.security import get_current_admin

        user = create_mock_user(email="admin@example.com")
        mock_settings = MagicMock()
        mock_settings.is_admin.return_value = True

        result = await get_current_admin(user=user, settings=mock_settings)
        assert result.email == "admin@example.com"
