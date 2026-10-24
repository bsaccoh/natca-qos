import os
import shutil
import tempfile
import logging

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, ImageEnhance
import numpy as np

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("face_match")

app = FastAPI(title="NatCA Face Match Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

MATCH_THRESHOLD = float(os.environ.get("FACE_MATCH_THRESHOLD", "55"))
MODEL_NAME = os.environ.get("FACE_MODEL", "ArcFace")
DETECTOR = os.environ.get("FACE_DETECTOR", "retinaface")

_deepface = None

def get_deepface():
    global _deepface
    if _deepface is None:
        from deepface import DeepFace
        _deepface = DeepFace
        logger.info("DeepFace loaded — warming up models...")
        _warmup()
        logger.info("Models ready")
    return _deepface


def _warmup():
    """Pre-load the recognition and detector models so the first real request is fast."""
    tmp = tempfile.NamedTemporaryFile(suffix=".jpg", delete=False)
    try:
        img = Image.new("RGB", (120, 120), (128, 128, 128))
        img.save(tmp.name)
        tmp.close()
        _deepface.represent(tmp.name, model_name=MODEL_NAME, detector_backend="skip")
    except Exception:
        pass
    finally:
        os.unlink(tmp.name)


def enhance_id_image(path: str) -> str:
    """Boost contrast/sharpness on ID card photos which are typically faded and small."""
    try:
        img = Image.open(path).convert("RGB")
        img = ImageEnhance.Contrast(img).enhance(1.6)
        img = ImageEnhance.Sharpness(img).enhance(2.0)
        img = ImageEnhance.Brightness(img).enhance(1.15)
        min_dim = 400
        w, h = img.size
        if w < min_dim or h < min_dim:
            scale = max(min_dim / w, min_dim / h)
            img = img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)
        enhanced = path.rsplit(".", 1)
        out = f"{enhanced[0]}_enh.{enhanced[1]}" if len(enhanced) == 2 else f"{path}_enh"
        img.save(out, quality=95)
        return out
    except Exception:
        return path


def cosine_distance_to_score(distance: float) -> int:
    """Map cosine distance (0=identical, 1=opposite) to a 0-100 percentage.

    ArcFace cosine threshold is ~0.68.  We want:
      distance 0.0 → 100 %
      distance 0.4 → ~70 %   (clear match)
      distance 0.68 → ~55 %  (borderline)
      distance 1.0 → 0 %
    """
    score = max(0.0, min(1.0, 1.0 - distance))
    return round(score * 100)


def check_passive_liveness(image_path: str) -> dict:
    """Analyze selfie for screen replay, printed paper spoofing, and excessive blur."""
    import cv2
    img = cv2.imread(image_path)
    if img is None:
        return {"passed": False, "score": 0, "reasons": ["Unreadable image"], "blur_score": 0.0}

    # 1. Blur evaluation using Laplacian variance
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    laplacian_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())

    # 2. 2D FFT Moiré pattern detection (typical of LCD/OLED display photos)
    h, w = gray.shape
    dft = np.fft.fft2(gray)
    dft_shift = np.fft.fftshift(dft)
    magnitude_spectrum = 20 * np.log(np.abs(dft_shift) + 1e-8)
    crow, ccol = h // 2, w // 2
    center_box = magnitude_spectrum[max(0, crow - 25):min(h, crow + 25), max(0, ccol - 25):min(w, ccol + 25)]
    center_energy = float(np.mean(center_box))
    total_energy = float(np.mean(magnitude_spectrum))
    high_freq_ratio = total_energy / (center_energy + 1e-6)

    # 3. Saturation & Color distribution check
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    sat_std = float(np.std(hsv[:, :, 1]))

    score = 100
    reasons = []

    # Laplacian threshold: < 60 is heavily blurred or poor fake
    if laplacian_var < 60.0:
        score -= 35
        reasons.append("Image is excessively blurry")
    elif laplacian_var < 100.0:
        score -= 15

    # High frequency ratio > 0.85 indicates artificial display raster
    if high_freq_ratio > 0.88:
        score -= 30
        reasons.append("High-frequency screen moiré pattern detected (suspected display photo)")

    # Washed-out paper prints have low saturation variance
    if sat_std < 18.0:
        score -= 25
        reasons.append("Unnatural chromaticity distribution (suspected printed photocopy)")

    liveness_score = max(0, min(100, score))
    return {
        "passed": liveness_score >= 60,
        "score": liveness_score,
        "blur_score": round(laplacian_var, 2),
        "reasons": reasons,
    }


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/liveness")
async def evaluate_liveness(image: UploadFile = File(...)):
    tmp_dir = tempfile.mkdtemp()
    try:
        ext = os.path.splitext(image.filename or "selfie.jpg")[1] or ".jpg"
        img_path = os.path.join(tmp_dir, f"target{ext}")
        with open(img_path, "wb") as f:
            shutil.copyfileobj(image.file, f)
        result = check_passive_liveness(img_path)
        return result
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)


@app.post("/compare")
async def compare_faces(
    id_image: UploadFile = File(...),
    selfie: UploadFile = File(...),
):
    DeepFace = get_deepface()
    tmp_dir = tempfile.mkdtemp()
    try:
        id_ext = os.path.splitext(id_image.filename or "id.jpg")[1] or ".jpg"
        selfie_ext = os.path.splitext(selfie.filename or "selfie.jpg")[1] or ".jpg"
        id_path = os.path.join(tmp_dir, f"id{id_ext}")
        selfie_path = os.path.join(tmp_dir, f"selfie{selfie_ext}")

        with open(id_path, "wb") as f:
            shutil.copyfileobj(id_image.file, f)
        with open(selfie_path, "wb") as f:
            shutil.copyfileobj(selfie.file, f)

        enhanced_id = enhance_id_image(id_path)

        strategies = [
            {"detector_backend": DETECTOR, "img": enhanced_id, "label": "retinaface+enhanced"},
            {"detector_backend": "mtcnn", "img": enhanced_id, "label": "mtcnn+enhanced"},
            {"detector_backend": DETECTOR, "img": id_path, "label": "retinaface+original"},
            {"detector_backend": "opencv", "img": id_path, "label": "opencv+original"},
            {"detector_backend": "skip", "img": enhanced_id, "label": "skip+enhanced"},
        ]

        best_result = None
        best_score = -1
        errors = []

        for strat in strategies:
            try:
                result = DeepFace.verify(
                    img1_path=strat["img"],
                    img2_path=selfie_path,
                    model_name=MODEL_NAME,
                    detector_backend=strat["detector_backend"],
                    distance_metric="cosine",
                    enforce_detection=True,
                    align=True,
                )
                score = cosine_distance_to_score(result["distance"])
                logger.info(
                    "Strategy %s: distance=%.4f score=%d verified=%s",
                    strat["label"], result["distance"], score, result["verified"],
                )
                if score > best_score:
                    best_score = score
                    best_result = {
                        "match": result["verified"] or score >= MATCH_THRESHOLD,
                        "score": score,
                        "distance": round(result["distance"], 4),
                        "threshold": round(result["threshold"], 4),
                        "strategy": strat["label"],
                        "model": MODEL_NAME,
                    }
                if result["verified"]:
                    break
            except Exception as e:
                errors.append(f"{strat['label']}: {str(e)}")
                logger.warning("Strategy %s failed: %s", strat["label"], e)
                continue

        liveness_data = check_passive_liveness(selfie_path)

        if best_result:
            best_result["match"] = best_result["match"] or best_result["score"] >= MATCH_THRESHOLD
            best_result["liveness"] = liveness_data
            best_result["liveness_passed"] = liveness_data["passed"]
            best_result["liveness_score"] = liveness_data["score"]

            # Risk score: 0 (safe) to 100 (high risk)
            risk = 0.0
            if not best_result["match"]:
                risk += 50.0
            else:
                risk += (100.0 - best_result["score"]) * 0.4

            if not liveness_data["passed"]:
                risk += 40.0
            else:
                risk += (100.0 - liveness_data["score"]) * 0.3

            best_result["risk_score"] = round(min(100.0, max(0.0, risk)), 2)
            return best_result

        return {
            "match": False,
            "score": 0,
            "distance": 1.0,
            "threshold": 0.68,
            "strategy": "none",
            "model": MODEL_NAME,
            "liveness": liveness_data,
            "liveness_passed": liveness_data["passed"],
            "liveness_score": liveness_data["score"],
            "risk_score": 90.0,
            "message": "Could not detect a face in the ID image. Please upload a clearer photo.",
            "errors": errors[:3],
        }

    except Exception as e:
        logger.exception("Compare failed")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", "8001"))
    uvicorn.run(app, host="0.0.0.0", port=port)
