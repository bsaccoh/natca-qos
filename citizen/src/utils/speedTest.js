// Shared speed-test primitives — used by SpeedTest page and complaint diagnostics.
import { api, get } from '../api/client.js';

export async function measurePing(samples = 4) {
  const times = [];
  for (let i = 0; i < samples; i++) {
    const t0 = performance.now();
    try { await get('/speed/compare'); } catch {}
    times.push(performance.now() - t0);
  }
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const jitter = Math.abs(times[times.length - 1] - times[0]);
  return { pingMs: Math.round(avg), jitterMs: Math.round(jitter) };
}

export async function measureDownload() {
  const t0 = performance.now();
  try {
    const res = await api.get('/speed/payload', { responseType: 'blob' });
    const durationMs = performance.now() - t0;
    const bits = res.data.size * 8;
    const mbps = bits / (1024 * 1024) / (durationMs / 1000);
    return Number(Math.max(0, mbps).toFixed(2));
  } catch {
    return null;
  }
}

export async function measureUpload(payloadMB = 2) {
  const bytes = payloadMB * 1024 * 1024;
  const buffer = new Blob([new ArrayBuffer(bytes)]);
  const t0 = performance.now();
  try {
    await api.post('/speed/payload', buffer, {
      headers: { 'Content-Type': 'application/octet-stream' },
    });
    const durationMs = performance.now() - t0;
    const bits = bytes * 8;
    const mbps = bits / (1024 * 1024) / (durationMs / 1000);
    return Number(Math.max(0, mbps).toFixed(2));
  } catch {
    return null;
  }
}

export async function runQuickSpeedTest() {
  const { pingMs, jitterMs } = await measurePing(3);
  const downloadMbps = await measureDownload();
  const uploadMbps   = await measureUpload(1);
  return { pingMs, jitterMs, downloadMbps, uploadMbps, measured_at: new Date().toISOString() };
}
