// Browser-only face verification.
// Loads face-api.js models from a public CDN on first use.
// Compares an ID photo against a selfie and returns a similarity score.

import * as faceapi from '@vladmandic/face-api';

const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.13/model';
// Below ~0.6 Euclidean distance is a match for most face-api.js configs.
// We invert to a percentage so 100% = identical, 0% = totally different.
const MATCH_THRESHOLD_PCT = 55;

let modelsLoaded = false;
let modelsLoading = null;
let ssdLoaded = false;
let ssdLoading = null;

async function loadModels() {
  if (modelsLoaded) return;
  if (!modelsLoading) {
    modelsLoading = Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]).then(() => { modelsLoaded = true; });
  }
  await modelsLoading;
}

// SsdMobilenetV1 is much better than TinyFaceDetector at finding small/low-quality
// faces on static images (like ID cards). ~5MB, loaded lazily on first fallback.
async function loadSsdIfNeeded() {
  if (ssdLoaded) return;
  if (!ssdLoading) {
    ssdLoading = faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL).then(() => { ssdLoaded = true; });
  }
  await ssdLoading;
}

// Load a File into a canvas. Handles JPEG, PNG, WebP, GIF, BMP and (on capable
// browsers) HEIC — createImageBitmap is much more permissive than <img>.
// Falls back to an Image element if createImageBitmap rejects.
async function fileToCanvas(file) {
  if (!file) throw new Error('No file provided');
  if (file.type && file.type.startsWith('application/pdf')) {
    throw new Error('PDFs are not supported for face detection — please upload a JPEG or PNG image of the ID.');
  }
  let width, height, source;
  try {
    const bitmap = await createImageBitmap(file);
    width  = bitmap.width;
    height = bitmap.height;
    source = bitmap;
  } catch {
    const url = URL.createObjectURL(file);
    try {
      source = await new Promise((resolve, reject) => {
        const el = new Image();
        el.onload  = () => resolve(el);
        el.onerror = () => reject(new Error(`Image format not supported (${file.type || 'unknown'}). Try a JPEG or PNG.`));
        el.src = url;
      });
      width  = source.naturalWidth;
      height = source.naturalHeight;
    } finally {
      // Revoke after the drawImage below — but we defer via micro-task
      queueMicrotask(() => URL.revokeObjectURL(url));
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width  = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(source, 0, 0);
  if (source.close) source.close();
  return canvas;
}

async function detectWithTiny(canvas, { inputSize, scoreThreshold }) {
  const opts = new faceapi.TinyFaceDetectorOptions({ inputSize, scoreThreshold });
  return faceapi.detectSingleFace(canvas, opts).withFaceLandmarks().withFaceDescriptor();
}

async function detectWithSsd(canvas, { minConfidence = 0.3 } = {}) {
  await loadSsdIfNeeded();
  const opts = new faceapi.SsdMobilenetv1Options({ minConfidence });
  return faceapi.detectSingleFace(canvas, opts).withFaceLandmarks().withFaceDescriptor();
}

// Multi-pass face detection: cheap-first, then progressively more thorough.
// Static ID images often have small / lower-resolution faces that the default
// TinyFaceDetector settings miss, so we widen the net before giving up.
async function getDescriptor(file, { thorough = false } = {}) {
  const canvas = await fileToCanvas(file);

  // Pass 1: fast defaults — catches most well-composed selfies.
  let detection = await detectWithTiny(canvas, { inputSize: 320, scoreThreshold: 0.4 });
  if (detection) return detection.descriptor;

  // Pass 2: larger input + lower threshold — helps on small / low-quality faces.
  detection = await detectWithTiny(canvas, { inputSize: 608, scoreThreshold: 0.2 });
  if (detection) return detection.descriptor;

  // Pass 3: fall back to SsdMobilenetV1, which is more robust on static images.
  // Only pay the ~5MB model download cost if we actually need it.
  if (thorough) {
    detection = await detectWithSsd(canvas, { minConfidence: 0.25 });
    if (detection) return detection.descriptor;
  }
  return null;
}

/**
 * Compare an ID image (front of card) with a selfie.
 * Returns { ok, score, message, idHadFace, selfieHadFace }
 * - ok: passed threshold
 * - score: 0..100 similarity percentage
 */
export async function verifyFaceAgainstId({ idFrontFile, selfieFile }) {
  await loadModels();

  const [idDesc, selfieDesc] = await Promise.all([
    getDescriptor(idFrontFile, { thorough: true }),
    getDescriptor(selfieFile),
  ]);

  if (!idDesc) {
    return {
      ok: false,
      score: 0,
      idHadFace: false,
      selfieHadFace: !!selfieDesc,
      message: 'Could not find a face on the ID photo. Retake the ID card with the photo area filling more of the frame, good lighting, and no glare.',
    };
  }
  if (!selfieDesc) {
    return {
      ok: false,
      score: 0,
      idHadFace: true,
      selfieHadFace: false,
      message: 'No face detected in your selfie. Please retake with your face clearly in view.',
    };
  }

  const distance = faceapi.euclideanDistance(idDesc, selfieDesc);
  // distance ranges roughly 0.2 (same person) to 1.0+ (different).
  // Map linearly: 0.2 → 100%, 1.0 → 0%.
  const score = Math.max(0, Math.min(100, Math.round((1.0 - distance) * 125)));
  const ok = score >= MATCH_THRESHOLD_PCT;
  return {
    ok,
    score,
    idHadFace: true,
    selfieHadFace: true,
    message: ok
      ? `Face verified (${score}% match)`
      : `The face on your ID does not match your selfie (${score}% match). Please retake your selfie or upload a clearer ID photo.`,
  };
}
