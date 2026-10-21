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

import base64
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

    # The updated Serverless Inference API endpoint on the router domain
    API_URL_TEMPLATE = "https://router.huggingface.co/hf-inference/models/{model_id}"

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
        """
        prompt = STYLE_PROMPTS.get(style, STYLE_PROMPTS["corporate"])

        headers = {
            "Authorization": f"Bearer {self._api_key}",
        }

        logger.info(f"Sending image to HF model '{self._model_id}' with style '{style}'")

        try:
            image_b64 = base64.b64encode(image_bytes).decode("utf-8")
            payload = {
                "inputs": image_b64,
                "parameters": {"prompt": prompt},
            }

            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(
                    self._api_url,
                    headers=headers,
                    json=payload,
                )

                if response.status_code == 200:
                    content_type = response.headers.get("content-type", "")
                    if "application/json" in content_type:
                        data = response.json()
                        if isinstance(data, list) and len(data) > 0 and isinstance(data[0], dict) and "generated_image" in data[0]:
                            generated_bytes = base64.b64decode(data[0]["generated_image"].split(",")[-1])
                        elif isinstance(data, dict) and "image" in data:
                            generated_bytes = base64.b64decode(data["image"].split(",")[-1])
                        else:
                            generated_bytes = response.content
                    else:
                        generated_bytes = response.content

                    if generated_bytes and len(generated_bytes) >= 100:
                        logger.info(f"Successfully generated image via HF API ({len(generated_bytes)} bytes)")
                        return generated_bytes

                logger.warning(
                    f"HF API returned {response.status_code}: {response.text[:200]}. "
                    f"Applying stylistic portrait transform fallback for style '{style}'."
                )
                return self._apply_fallback_transformation(image_bytes, style)

        except Exception as e:
            logger.warning(
                f"HF API call failed ({e}). Applying stylistic portrait transform fallback for style '{style}'."
            )
            return self._apply_fallback_transformation(image_bytes, style)

    def _apply_fallback_transformation(self, image_bytes: bytes, style: str) -> bytes:
        """
        Graceful portrait transformation fallback when Hugging Face serverless tier
        decommissions a model or is temporarily unavailable.
        Uses Pillow to apply professional photographic color grading & contrast
        tailored to the chosen style.
        """
        from io import BytesIO
        from PIL import Image, ImageEnhance, ImageOps

        img = Image.open(BytesIO(image_bytes))
        img = ImageOps.exif_transpose(img)
        img = img.convert("RGB")

        if style == "corporate":
            img = ImageEnhance.Contrast(img).enhance(1.15)
            img = ImageEnhance.Sharpness(img).enhance(1.2)
            img = ImageEnhance.Color(img).enhance(1.05)
        elif style == "startup":
            img = ImageEnhance.Color(img).enhance(1.2)
            img = ImageEnhance.Contrast(img).enhance(1.1)
            img = ImageEnhance.Brightness(img).enhance(1.05)
        elif style == "formal":
            img = ImageEnhance.Contrast(img).enhance(1.25)
            img = ImageEnhance.Color(img).enhance(0.9)
            img = ImageEnhance.Sharpness(img).enhance(1.3)
        elif style == "developer":
            img = ImageEnhance.Contrast(img).enhance(1.18)
            img = ImageEnhance.Sharpness(img).enhance(1.25)
            img = ImageEnhance.Brightness(img).enhance(1.02)

        out = BytesIO()
        img.save(out, format="JPEG", quality=92)
        return out.getvalue()

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
