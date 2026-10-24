/**
 * NatCA CMS — Regulatory Signal Thresholds Service
 * Single source of truth for 2G / 3G / 4G / 5G QoS evaluation in Sierra Leone.
 */
import { query } from '../../config/db.js';

let cachedThresholds = null;
let lastFetchedAt = 0;
const CACHE_TTL_MS = 60000; // 60s cache

export const DEFAULT_THRESHOLDS = {
  '4G': {
    rsrp:    { pass_value: -100.0, pass_direction: 'gte', good_min: -90.0, fair_min: -100.0, poor_min: -110.0, unit: 'dBm', weight: 0.35 },
    rsrq:    { pass_value: -12.0,  pass_direction: 'gte', good_min: -10.0, fair_min: -12.0,  poor_min: -16.0,  unit: 'dB',  weight: 0.20 },
    sinr:    { pass_value: 0.0,    pass_direction: 'gte', good_min: 10.0,  fair_min: 5.0,    poor_min: 0.0,    unit: 'dB',  weight: 0.20 },
    dl_kbps: { pass_value: 10000.0,pass_direction: 'gte', good_min: 25000.0,fair_min: 10000.0,poor_min: 3000.0, unit: 'kbps',weight: 0.25 },
  },
  '3G': {
    rsrp:    { pass_value: -90.0,  pass_direction: 'gte', good_min: -75.0, fair_min: -90.0,  poor_min: -100.0, unit: 'dBm', weight: 0.50 },
    dl_kbps: { pass_value: 2000.0, pass_direction: 'gte', good_min: 5000.0, fair_min: 2000.0, poor_min: 500.0,  unit: 'kbps',weight: 0.50 },
  },
  '2G': {
    rsrp:    { pass_value: -85.0,  pass_direction: 'gte', good_min: -70.0, fair_min: -85.0,  poor_min: -95.0,  unit: 'dBm', weight: 0.50 },
    rsrq:    { pass_value: 3.0,    pass_direction: 'lte', good_min: 1.0,   fair_min: 3.0,    poor_min: 5.0,    unit: 'scale',weight: 0.50 },
  }
};

export async function getThresholds(technology = '4G') {
  const now = Date.now();
  if (!cachedThresholds || (now - lastFetchedAt) > CACHE_TTL_MS) {
    try {
      const rows = await query(`SELECT * FROM signal_thresholds WHERE is_active = TRUE`);
      const map = {};
      for (const r of rows) {
        if (!map[r.technology]) map[r.technology] = {};
        map[r.technology][r.metric] = {
          pass_value: Number(r.pass_value),
          pass_direction: r.pass_direction,
          good_min: r.good_min !== null ? Number(r.good_min) : null,
          fair_min: r.fair_min !== null ? Number(r.fair_min) : null,
          poor_min: r.poor_min !== null ? Number(r.poor_min) : null,
          weight: Number(r.weight),
          unit: r.unit,
          label: r.label,
        };
      }
      cachedThresholds = map;
      lastFetchedAt = now;
    } catch {
      cachedThresholds = DEFAULT_THRESHOLDS;
    }
  }

  const techUpper = (technology || '4G').toUpperCase();
  return cachedThresholds[techUpper] || DEFAULT_THRESHOLDS[techUpper] || DEFAULT_THRESHOLDS['4G'];
}

export function passes(th, value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return false;
  const num = Number(value);
  return th.pass_direction === 'lte' ? num <= th.pass_value : num >= th.pass_value;
}

export function classifyBin(th, value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return { tier: 'UNKNOWN', color: '#94a3b8' };
  }
  const v = Number(value);
  if (th.pass_direction === 'lte') {
    if (th.good_min !== null && v <= th.good_min) return { tier: 'EXCELLENT', color: '#10b981' };
    if (th.fair_min !== null && v <= th.fair_min) return { tier: 'GOOD', color: '#3b82f6' };
    if (th.poor_min !== null && v <= th.poor_min) return { tier: 'FAIR', color: '#f59e0b' };
    return { tier: 'POOR', color: '#ef4444' };
  } else {
    if (th.good_min !== null && v >= th.good_min) return { tier: 'EXCELLENT', color: '#10b981' };
    if (th.fair_min !== null && v >= th.fair_min) return { tier: 'GOOD', color: '#3b82f6' };
    if (th.poor_min !== null && v >= th.poor_min) return { tier: 'FAIR', color: '#f59e0b' };
    return { tier: 'POOR', color: '#ef4444' };
  }
}

export function invalidateThresholdCache() {
  cachedThresholds = null;
  lastFetchedAt = 0;
}
