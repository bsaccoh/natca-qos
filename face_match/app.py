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


@app.get("/health")
async def health():
    return {"status": "ok"}


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

        if best_result:
            best_result["match"] = best_result["match"] or best_result["score"] >= MATCH_THRESHOLD
            return best_result

        return {
            "match": False,
            "score": 0,
            "distance": 1.0,
            "threshold": 0.68,
            "strategy": "none",
            "model": MODEL_NAME,
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
