"""
Hugging Face inference service — isolated AI model integration.

WHY ISOLATE THE MODEL:
The AI model is behind its own service so it can be replaced later without
touching the rest of the codebase. Today we use Hugging Face Inference API;
tomorrow it could be a self-hosted model, Replicate, or another provider.

HOW HUGGING FACE INFERENCE API WORKS:
1. We send an HTTP POST request to HF's inference endpoint.
2. The request includes the image and a text prompt describing the desired output.
3. HF runs the model on their servers (no local GPU needed).
4. We receive the generated image as bytes in the response.

This uses the "image-to-image" pipeline — we provide a source image and a prompt,
and the model transforms the image according to the prompt.

NOTE: We use httpx (async HTTP client) instead of the huggingface_hub library
for simplicity and to keep the dependency footprint small. The Inference API
is just a REST endpoint — no SDK needed.
"""

import logging

import httpx

from app.core.config import Settings, get_settings

logger = logging.getLogger(__name__)

# Style-specific prompts that guide the AI model to generate professional portraits.
# Each style has a carefully crafted prompt to produce the desired look.
STYLE_PROMPTS: dict[str, str] = {
    "corporate": (
        "Professional corporate headshot, clean studio lighting, "
        "neutral background, business attire, sharp focus, high quality, "
        "LinkedIn profile photo, confident expression"
    ),
    "startup": (
        "Modern startup founder headshot, warm natural lighting, "
        "casual professional attire, approachable expression, "
        "slight smile, clean blurred background, tech industry style"
    ),
    "developer": (
        "Professional developer headshot, clean modern background, "
        "casual smart attire, friendly approachable expression, "
        "soft studio lighting, tech professional, high quality portrait"
    ),
    "formal": (
        "Formal professional portrait, elegant studio lighting, "
        "dark neutral background, formal business attire, "
        "composed dignified expression, high-end headshot photography"
    ),
}


class HuggingFaceService:
    """
    Handles AI image generation via Hugging Face's Inference API.

    WHY THE INFERENCE API (NOT LOCAL MODEL):
    - No GPU required on our server
    - No model download (saves GB of disk space)
    - Pay-per-use pricing (or free tier for light usage)
    - HF handles scaling and infrastructure
    - Perfect for a learning project and portfolio demo
    """

    # The Inference API endpoint for image-to-image models
    API_URL_TEMPLATE = "https://api-inference.huggingface.co/models/{model_id}"

    def __init__(self, settings: Settings | None = None) -> None:
        self._settings = settings or get_settings()
        self._api_key = self._settings.huggingface_api_key
        self._model_id = self._settings.huggingface_model_id
        self._api_url = self.API_URL_TEMPLATE.format(model_id=self._model_id)

    async def generate_profile_image(
        self,
        image_bytes: bytes,
        style: str,
    ) -> bytes:
        """
        Send an image to the Hugging Face model and get a transformed version.

        Args:
            image_bytes: The raw bytes of the uploaded portrait.
            style: One of the style keys (corporate, startup, developer, formal).

        Returns:
            The generated image as bytes.

        Raises:
            RuntimeError: If the API call fails or returns an error.

        HOW IT WORKS:
        The HF Inference API for image-to-image accepts the image as binary data
        in the request body, with the prompt as a query parameter or in the headers.
        For simplicity, we send a JSON payload with the image and parameters.
        """
        prompt = STYLE_PROMPTS.get(style, STYLE_PROMPTS["corporate"])

        headers = {
            "Authorization": f"Bearer {self._api_key}",
        }

        logger.info(f"Sending image to HF model '{self._model_id}' with style '{style}'")

        try:
            # Use httpx async client for non-blocking HTTP request.
            # timeout is generous because model inference can take 30-60+ seconds,
            # especially if the model needs to "warm up" (cold start).
            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(
                    self._api_url,
                    headers=headers,
                    content=image_bytes,
                    params={"prompt": prompt},
                )

                if response.status_code == 503:
                    # Model is loading — HF returns 503 with estimated_time.
                    # In production, you'd retry after the estimated time.
                    error_data = response.json()
                    estimated_time = error_data.get("estimated_time", "unknown")
                    raise RuntimeError(
                        f"Model is loading. Estimated wait: {estimated_time}s. "
                        "Please try again in a moment."
                    )

                if response.status_code != 200:
                    error_text = response.text
                    logger.error(f"HF API error ({response.status_code}): {error_text}")
                    raise RuntimeError(
                        f"Hugging Face API error: {response.status_code} — {error_text}"
                    )

                # The response body IS the generated image bytes
                generated_bytes = response.content

                if not generated_bytes or len(generated_bytes) < 100:
                    raise RuntimeError("Received empty or invalid image from HF API.")

                logger.info(f"Successfully generated image ({len(generated_bytes)} bytes)")
                return generated_bytes

        except httpx.TimeoutException:
            logger.error("HF API request timed out")
            raise RuntimeError(
                "Image generation timed out. The model may be under heavy load. "
                "Please try again."
            )
        except httpx.HTTPError as e:
            logger.error(f"HTTP error calling HF API: {e}")
            raise RuntimeError(f"Failed to connect to Hugging Face: {e}")

    async def health_check(self) -> bool:
        """Check if the HF model endpoint is responsive."""
        headers = {"Authorization": f"Bearer {self._api_key}"}
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(self._api_url, headers=headers)
                return response.status_code in (200, 503)  # 503 = model loading, but accessible
        except Exception:
            return False


# Singleton instance
_hf_service: HuggingFaceService | None = None


def get_huggingface_service() -> HuggingFaceService:
    """Get or create the HuggingFace service singleton."""
    global _hf_service
    if _hf_service is None:
        _hf_service = HuggingFaceService()
    return _hf_service
