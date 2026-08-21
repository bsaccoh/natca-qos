/**
 * Centralized formatting utilities for dates, times, durations, and numbers.
 */

/**
 * Relative time calculation (e.g. "12s ago", "5m ago", "3h ago", "2d ago")
 */
export function timeSince(ts) {
  if (!ts) return '—';
  const diffSec = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (isNaN(diffSec)) return '—';
  if (diffSec < 0) return 'Just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  const days = Math.floor(diffSec / 86400);
  if (days < 30) return `${days}d ago`;
  return new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/**
 * Format timestamp as human-readable locale string (e.g. "18 Aug 2026, 14:30")
 */
export function formatDate(ts, includeTime = true) {
  if (!ts) return '—';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return '—';
  const options = {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(includeTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  };
  return d.toLocaleString('en-GB', options);
}

/**
 * Format SLA deadline or overdue duration
 */
export function formatOverdue(hours) {
  if (hours == null || isNaN(hours)) return '—';
  const num = Number(hours);
  if (num < 1) return `${Math.max(1, Math.round(num * 60))}m overdue`;
  if (num < 24) return `${num.toFixed(1)}h overdue`;
  return `${(num / 24).toFixed(1)}d overdue`;
}

/**
 * Format hours to display string (e.g. "4.5h", "2.1d")
 */
export function formatHours(hours) {
  if (hours == null || isNaN(hours)) return '—';
  const h = Number(hours);
  if (h < 24) return `${h.toFixed(1)}h`;
  return `${(h / 24).toFixed(1)}d`;
}

/**
 * Format numbers with safe defaults and decimals
 */
export function formatNumber(val, decimals = 2) {
  if (val == null || isNaN(val)) return '—';
  return Number(val).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}

/**
 * Clean and format backend upload URLs safely
 */
export function getBackendFileUrl(filePath, apiUrl = import.meta.env.VITE_API_URL || '/api/v1') {
  if (!filePath) return null;
  if (filePath.startsWith('http://') || filePath.startsWith('https://') || filePath.startsWith('blob:')) {
    return filePath;
  }
  const backendOrigin = apiUrl.replace(/\/api\/v\d+\/?$/, '');
  const cleanPath = filePath.replace(/\\/g, '/').replace(/^.*?(uploads\/)/, 'uploads/');
  return `${backendOrigin}/${cleanPath}`;
}
