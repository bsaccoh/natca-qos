// Face verification: tries server-side Python DeepFace first,
// falls back to client-side face-api.js if the service is unavailable.

import { api } from '../api/client.js';

const MATCH_THRESHOLD_PCT = 55;

async function serverVerify(idFrontFile, selfieFile) {
  const fd = new FormData();
  fd.append('id_front', idFrontFile);
  fd.append('selfie', selfieFile);

  const resp = await api.post('/kyc/compare-faces', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000,
  });

  const data = resp.data?.data || resp.data;
  return {
    ok: !!data.ok,
    score: data.score ?? 0,
    idHadFace: true,
    selfieHadFace: true,
    message: data.message || (data.ok
      ? `Face verified (${data.score}% match)`
      : `The face on your ID does not match your selfie (${data.score}% match).`),
  };
}

async function clientVerify(idFrontFile, selfieFile) {
  const faceapi = await import('@vladmandic/face-api');
  const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.13/model';

  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
  ]);

  async function fileToCanvas(file) {
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    canvas.getContext('2d').drawImage(bitmap, 0, 0);
    bitmap.close?.();
    return canvas;
  }

  async function getDescriptor(file, thorough) {
    const canvas = await fileToCanvas(file);
    const tinyOpts = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.4 });
    let det = await faceapi.detectSingleFace(canvas, tinyOpts).withFaceLandmarks().withFaceDescriptor();
    if (det) return det.descriptor;

    const tinyOpts2 = new faceapi.TinyFaceDetectorOptions({ inputSize: 608, scoreThreshold: 0.2 });
    det = await faceapi.detectSingleFace(canvas, tinyOpts2).withFaceLandmarks().withFaceDescriptor();
    if (det) return det.descriptor;

    if (thorough) {
      const ssdOpts = new faceapi.SsdMobilenetv1Options({ minConfidence: 0.25 });
      det = await faceapi.detectSingleFace(canvas, ssdOpts).withFaceLandmarks().withFaceDescriptor();
      if (det) return det.descriptor;
    }
    return null;
  }

  const [idDesc, selfieDesc] = await Promise.all([
    getDescriptor(idFrontFile, true),
    getDescriptor(selfieFile, false),
  ]);

  if (!idDesc) {
    return { ok: false, score: 0, idHadFace: false, selfieHadFace: !!selfieDesc,
      message: 'Could not find a face on the ID photo. Retake with the photo area filling more of the frame.' };
  }
  if (!selfieDesc) {
    return { ok: false, score: 0, idHadFace: true, selfieHadFace: false,
      message: 'No face detected in your selfie. Please retake with your face clearly in view.' };
  }

  const distance = faceapi.euclideanDistance(idDesc, selfieDesc);
  const score = Math.max(0, Math.min(100, Math.round((1.0 - distance) * 125)));
  const ok = score >= MATCH_THRESHOLD_PCT;
  return {
    ok, score, idHadFace: true, selfieHadFace: true,
    message: ok
      ? `Face verified (${score}% match)`
      : `The face on your ID does not match your selfie (${score}% match). Please retake your selfie or upload a clearer ID photo.`,
  };
}

export async function verifyFaceAgainstId({ idFrontFile, selfieFile }) {
  if (!idFrontFile || !selfieFile) {
    return { ok: false, score: 0, message: 'Both an ID photo and a selfie are required.' };
  }

  try {
    return await serverVerify(idFrontFile, selfieFile);
  } catch (err) {
    const status = err.response?.status;
    if (status === 503 || status === 502 || !err.response) {
      try {
        return await clientVerify(idFrontFile, selfieFile);
      } catch (fbErr) {
        return { ok: false, score: 0, message: `Face comparison failed: ${fbErr.message}` };
      }
    }
    const msg = err.response?.data?.error || err.message || 'Face comparison failed';
    return { ok: false, score: 0, message: `Face comparison error: ${msg}` };
  }
}
