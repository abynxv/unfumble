"""
Storage service — abstracts file storage operations.

WHY A SERVICE:
By hiding Supabase Storage behind a service interface, we can later swap
to S3-compatible storage (AWS S3, MinIO, Cloudflare R2) without changing
any code outside this file. The rest of the application only calls
upload_file() and get_public_url() — it doesn't know or care where
files actually live.

HOW SUPABASE STORAGE WORKS:
- Supabase Storage is an S3-compatible object store built into Supabase.
- Files are organized in "buckets" (like top-level folders).
- We use the service role key (not the anon key) for backend uploads,
  because the service role bypasses Row Level Security policies.
- Each file gets a path like "original/{user_id}/{filename}".
"""

import logging
import uuid
from io import BytesIO

from supabase import Client, create_client

from app.core.config import Settings, get_settings

logger = logging.getLogger(__name__)


class StorageService:
    """
    Handles file upload and URL generation for Supabase Storage.

    The service role key is used because backend operations need to bypass
    Supabase's Row Level Security — the backend is a trusted server,
    not an untrusted browser client.
    """

    def __init__(self, settings: Settings | None = None) -> None:
        self._settings = settings or get_settings()
        # Create a Supabase client with the service role key for elevated access.
        self._client: Client = create_client(
            self._settings.supabase_url,
            self._settings.supabase_service_role_key,
        )
        self._bucket = self._settings.supabase_storage_bucket

    def upload_file(
        self,
        file_data: bytes,
        folder: str,
        user_id: str,
        original_filename: str,
    ) -> str:
        """
        Upload a file to Supabase Storage.

        Args:
            file_data: The raw file bytes.
            folder: The folder prefix ("original" or "generated").
            user_id: The authenticated user's UUID (for path namespacing).
            original_filename: The original filename (used to preserve the extension).

        Returns:
            The storage path (e.g., "original/abc-123/unique-name.jpg").

        WHY UUID IN FILENAME:
        We generate a unique filename to prevent collisions if the user uploads
        multiple files with the same name. The original extension is preserved
        so the file is served with the correct content type.
        """
        # Extract file extension from original filename
        extension = original_filename.rsplit(".", 1)[-1].lower() if "." in original_filename else "jpg"
        unique_name = f"{uuid.uuid4().hex}.{extension}"
        storage_path = f"{folder}/{user_id}/{unique_name}"

        try:
            # Upload to Supabase Storage.
            # content_type is inferred from the extension by Supabase.
            self._client.storage.from_(self._bucket).upload(
                path=storage_path,
                file=file_data,
                file_options={"content-type": f"image/{extension}"},
            )
            logger.info(f"Uploaded file to {storage_path}")
            return storage_path

        except Exception as e:
            logger.error(f"Storage upload failed: {e}")
            raise RuntimeError(f"Failed to upload file: {e}") from e

    def get_public_url(self, storage_path: str) -> str:
        """
        Get a public URL for a stored file.

        WHY PUBLIC URLS:
        For simplicity, we use public URLs. In a production app with sensitive
        images, you'd use signed URLs with expiration times instead.
        """
        try:
            response = self._client.storage.from_(self._bucket).get_public_url(storage_path)
            return response
        except Exception as e:
            logger.error(f"Failed to get public URL for {storage_path}: {e}")
            raise RuntimeError(f"Failed to get public URL: {e}") from e

    def delete_file(self, storage_path: str) -> None:
        """Delete a file from Supabase Storage."""
        try:
            self._client.storage.from_(self._bucket).remove([storage_path])
            logger.info(f"Deleted file: {storage_path}")
        except Exception as e:
            logger.warning(f"Failed to delete file {storage_path}: {e}")
            # Don't raise — deletion failures shouldn't break the user flow


# Singleton instance — reused across the application.
# WHY: Creating a new Supabase client for every request is wasteful.
_storage_service: StorageService | None = None


def get_storage_service() -> StorageService:
    """Get or create the storage service singleton."""
    global _storage_service
    if _storage_service is None:
        _storage_service = StorageService()
    return _storage_service
