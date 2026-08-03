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

async function getDescriptor(file) {
  const canvas = await fileToCanvas(file);
  const opts = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.4 });
  const detection = await faceapi.detectSingleFace(canvas, opts).withFaceLandmarks().withFaceDescriptor();
  if (!detection) return null;
  return detection.descriptor;
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
    getDescriptor(idFrontFile),
    getDescriptor(selfieFile),
  ]);

  if (!idDesc) {
    return {
      ok: false,
      score: 0,
      idHadFace: false,
      selfieHadFace: !!selfieDesc,
      message: 'No face detected on the front of the ID. Please upload a clearer photo where the face on the card is visible.',
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
