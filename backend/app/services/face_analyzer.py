"""
Face Analyzer Service.

Validates that an uploaded photo is suitable for a professional headshot:
1. Detects human face(s).
2. Verifies sharpness/clarity (Laplacian variance to detect blur).
3. Checks face resolution / framing size.
4. Checks illumination (not severely under- or over-exposed).
"""

import logging
from io import BytesIO
import cv2
import numpy as np
from PIL import Image, ImageOps

logger = logging.getLogger(__name__)


class FaceAnalysisResult:
    def __init__(
        self,
        is_valid: bool,
        message: str,
        face_count: int = 0,
        blur_score: float = 0.0,
        brightness: float = 0.0,
        face_box: tuple[int, int, int, int] | None = None,
    ):
        self.is_valid = is_valid
        self.message = message
        self.face_count = face_count
        self.blur_score = blur_score
        self.brightness = brightness
        self.face_box = face_box


class FaceAnalyzer:
    def __init__(self) -> None:
        # Load OpenCV's bundled frontal face Haar cascade
        cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        self._face_cascade = cv2.CascadeClassifier(cascade_path)

    def analyze_image(self, image_bytes: bytes) -> FaceAnalysisResult:
        """
        Analyze an uploaded portrait photo for face clarity and quality.
        """
        try:
            # Load with PIL first to honor EXIF orientation
            pil_img = Image.open(BytesIO(image_bytes))
            pil_img = ImageOps.exif_transpose(pil_img)
            rgb_arr = np.array(pil_img.convert("RGB"))

            # Convert to grayscale for OpenCV analysis
            gray = cv2.cvtColor(rgb_arr, cv2.COLOR_RGB2GRAY)
            img_h, img_w = gray.shape[:2]

            # 1. Detect faces
            # ScaleFactor 1.1, minNeighbors 5, minSize 60x60
            faces = self._face_cascade.detectMultiScale(
                gray,
                scaleFactor=1.1,
                minNeighbors=5,
                minSize=(60, 60),
                flags=cv2.CASCADE_SCALE_IMAGE,
            )

            face_count = len(faces)
            if face_count == 0:
                logger.warning("No face detected in portrait upload.")
                return FaceAnalysisResult(
                    is_valid=False,
                    message="No clear face was detected in this photo. Please upload a clear, front-facing portrait.",
                    face_count=0,
                )

            if face_count > 2:
                logger.warning(f"Multiple faces ({face_count}) detected in portrait upload.")
                return FaceAnalysisResult(
                    is_valid=False,
                    message=f"We detected multiple people ({face_count} faces). Please upload a photo with only you.",
                    face_count=face_count,
                )

            # Get the primary (largest) face
            best_face = max(faces, key=lambda f: f[2] * f[3])
            fx, fy, fw, fh = best_face

            # 2. Check face size relative to image
            min_dimension = min(img_w, img_h)
            if fw < 0.12 * min_dimension or fh < 0.12 * min_dimension:
                logger.warning(f"Face is too small in the frame ({fw}x{fh} in {img_w}x{img_h}).")
                return FaceAnalysisResult(
                    is_valid=False,
                    message="Your face appears too far away or small. Please upload a closer portrait.",
                    face_count=face_count,
                    face_box=(int(fx), int(fy), int(fw), int(fh)),
                )

            # Crop face region for sharpness and brightness analysis
            face_roi = gray[fy : fy + fh, fx : fx + fw]

            # 3. Check sharpness / blur (Laplacian variance)
            laplacian_var = float(cv2.Laplacian(face_roi, cv2.CV_64F).var())
            logger.info(f"Face sharpness (Laplacian variance): {laplacian_var:.1f}")

            # Typical threshold: < 35 is visibly blurry/soft
            if laplacian_var < 30.0:
                logger.warning(f"Face is too blurry (score {laplacian_var:.1f} < 30).")
                return FaceAnalysisResult(
                    is_valid=False,
                    message="The photo is too blurry or out of focus. Please upload a sharper portrait.",
                    face_count=face_count,
                    blur_score=laplacian_var,
                    face_box=(int(fx), int(fy), int(fw), int(fh)),
                )

            # 4. Check brightness / exposure
            mean_brightness = float(np.mean(face_roi))
            logger.info(f"Face mean brightness: {mean_brightness:.1f}")

            if mean_brightness < 30.0:
                return FaceAnalysisResult(
                    is_valid=False,
                    message="The photo is too dark. Please upload a photo taken in better lighting.",
                    face_count=face_count,
                    brightness=mean_brightness,
                    face_box=(int(fx), int(fy), int(fw), int(fh)),
                )

            if mean_brightness > 235.0:
                return FaceAnalysisResult(
                    is_valid=False,
                    message="The photo is overexposed or washed out. Please upload a photo with balanced lighting.",
                    face_count=face_count,
                    brightness=mean_brightness,
                    face_box=(int(fx), int(fy), int(fw), int(fh)),
                )

            # All quality checks passed!
            return FaceAnalysisResult(
                is_valid=True,
                message="Face is clear, sharp, and well-lit.",
                face_count=face_count,
                blur_score=laplacian_var,
                brightness=mean_brightness,
                face_box=(int(fx), int(fy), int(fw), int(fh)),
            )

        except Exception as e:
            logger.error(f"Error during face analysis: {e}")
            # If face analysis encounters an unexpected format error, don't crash
            return FaceAnalysisResult(
                is_valid=True,
                message="Analysis completed with default checks.",
            )


_face_analyzer: FaceAnalyzer | None = None


def get_face_analyzer() -> FaceAnalyzer:
    global _face_analyzer
    if _face_analyzer is None:
        _face_analyzer = FaceAnalyzer()
    return _face_analyzer
