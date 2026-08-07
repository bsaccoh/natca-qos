// Face verification via the Python DeepFace/ArcFace backend service.
// Sends both images to the Node backend which proxies to the Python microservice.

import { api } from '../api/client.js';

/**
 * Compare an ID image (front of card) with a selfie via server-side DeepFace.
 * Returns { ok, score, message }
 */
export async function verifyFaceAgainstId({ idFrontFile, selfieFile }) {
  if (!idFrontFile || !selfieFile) {
    return {
      ok: false,
      score: 0,
      message: 'Both an ID photo and a selfie are required.',
    };
  }

  const fd = new FormData();
  fd.append('id_front', idFrontFile);
  fd.append('selfie', selfieFile);

  try {
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
  } catch (err) {
    const msg = err.response?.data?.error || err.message || 'Face comparison failed';
    if (err.response?.status === 503) {
      return {
        ok: false,
        score: 0,
        message: 'Face match service is temporarily unavailable. You can still submit — an admin will verify manually.',
      };
    }
    return {
      ok: false,
      score: 0,
      message: `Face comparison error: ${msg}`,
    };
  }
}
