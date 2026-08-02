// Collects device / network diagnostics from the browser at submit time.
// Radio-level details (RSRP, band, cell ID) are not exposed to web pages —
// those require the native app.

const PING_TIMEOUT_MS = 5000;

function tryGeoOnce(opts) {
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({
        available: true,
        latitude:  pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy_m: pos.coords.accuracy,
      }),
      (err) => resolve({ available: false, reason: err.code === 1 ? 'denied' : (err.code === 3 ? 'timeout' : err.message) }),
      opts,
    );
  });
}

async function getGeo() {
  if (!('geolocation' in navigator)) return { available: false, reason: 'unsupported' };
  // Fast pass: coarse cell/WiFi fix, allow slightly stale reading (60s)
  const coarse = await tryGeoOnce({ enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 });
  if (coarse.available) return coarse;
  if (coarse.reason === 'denied') return coarse;
  // Slow pass: real GPS lock — up to 25s
  return tryGeoOnce({ enableHighAccuracy: true, timeout: 25000, maximumAge: 0 });
}

function getConnection() {
  const c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (!c) return { available: false };
  return {
    available: true,
    effectiveType: c.effectiveType,       // 'slow-2g' | '2g' | '3g' | '4g'
    downlinkMbps:  c.downlink,            // Mbps estimate
    rttMs:         c.rtt,                 // browser's RTT estimate
    saveData:      c.saveData,
    type:          c.type,                // 'wifi' | 'cellular' | 'ethernet' | ...
  };
}

async function pingBackend() {
  try {
    const url = (import.meta.env.VITE_API_URL || '/api/v1') + '/districts';
    const t0 = performance.now();
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), PING_TIMEOUT_MS);
    await fetch(url, { method: 'HEAD', cache: 'no-store', signal: ctrl.signal }).catch(() =>
      fetch(url, { method: 'GET', cache: 'no-store', signal: ctrl.signal })
    );
    clearTimeout(timer);
    return { available: true, rttMs: Math.round(performance.now() - t0) };
  } catch {
    return { available: false };
  }
}

function getDevice() {
  return {
    userAgent: navigator.userAgent,
    platform:  navigator.platform,
    language:  navigator.language,
    screen:    `${window.screen.width}x${window.screen.height}`,
    online:    navigator.onLine,
  };
}

export async function collectDiagnostics({ withLocation = true } = {}) {
  const [geo, ping] = await Promise.all([
    withLocation ? getGeo() : Promise.resolve({ available: false, reason: 'skipped' }),
    pingBackend(),
  ]);
  return {
    collected_at: new Date().toISOString(),
    geo,
    connection: getConnection(),
    ping,
    device: getDevice(),
  };
}
