// Best-effort NIN check via Tesseract.js OCR on the front-of-ID image.
// Phone-camera photos of ID cards vary wildly; OCR failure is common.
// We treat that as "unknown", not a hard fail.
//
// Sierra Leone NIN format: 8 uppercase letters (e.g. SAXEGTWT).

import Tesseract from 'tesseract.js';

const NIN_LENGTH = 8;

function normaliseNin(s) { return String(s).toUpperCase().replace(/[^A-Z]/g, ''); }

// Common OCR misreads for letters
function fixOcrSubstitutions(s) {
  return s.toUpperCase()
    .replace(/0/g, 'O')
    .replace(/1/g, 'I')
    .replace(/8/g, 'B')
    .replace(/5/g, 'S')
    .replace(/6/g, 'G')
    .replace(/2/g, 'Z');
}

function extractAlphaRuns(text) {
  const corrected = fixOcrSubstitutions(text);
  return corrected.match(/[A-Z]{4,}/g) || [];
}

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[m][n];
}

function fuzzyContains(text, nin, maxDist = 2) {
  const upper = text.toUpperCase();
  for (let i = 0; i <= upper.length - nin.length; i++) {
    const window = upper.slice(i, i + nin.length);
    if (levenshtein(window, nin) <= maxDist) return true;
  }
  return false;
}

function extractExpiryDate(text) {
  const datePatterns = [
    /(\d{1,2})[.\-/](\d{1,2})[.\-/](20\d{2})/g,
    /(20\d{2})[.\-/](\d{1,2})[.\-/](\d{1,2})/g,
  ];

  const lines = text.split('\n');
  const dates = [];

  for (const line of lines) {
    const lower = line.toLowerCase();
    const isExpiryLine = /expir|exp\b|valid.*until|valid.*to|date.*exp/i.test(lower);

    for (const pat of datePatterns) {
      pat.lastIndex = 0;
      let m;
      while ((m = pat.exec(line)) !== null) {
        let day, month, year;
        if (/^20\d{2}$/.test(m[1])) {
          year = parseInt(m[1]); month = parseInt(m[2]); day = parseInt(m[3]);
        } else {
          day = parseInt(m[1]); month = parseInt(m[2]); year = parseInt(m[3]);
        }
        if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 2024 && year <= 2040) {
          const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          dates.push({ iso, isExpiryLine, year });
        }
      }
    }
  }

  const expiryDates = dates.filter(d => d.isExpiryLine);
  if (expiryDates.length > 0) return expiryDates[0].iso;

  const futureDates = dates.filter(d => d.year > new Date().getFullYear());
  if (futureDates.length > 0) return futureDates[0].iso;

  return null;
}

export async function extractIdExpiry(idFrontFile) {
  try {
    const { data } = await Tesseract.recognize(idFrontFile, 'eng', {
      logger: () => {},
    });
    const text = data?.text || '';
    if (!text.trim()) return null;
    return extractExpiryDate(text);
  } catch {
    return null;
  }
}

export async function verifyNinAgainstId({ idFrontFile, nin }) {
  const cleanNin = normaliseNin(nin);
  if (!cleanNin || cleanNin.length !== NIN_LENGTH) {
    return { ok: null, matched: false, message: 'NIN not provided or invalid length — skipped', extractedRuns: [] };
  }

  let text = '';
  try {
    const { data } = await Tesseract.recognize(idFrontFile, 'eng', {
      logger: () => {},
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .-/',
    });
    text = data?.text || '';
  } catch {
    return {
      ok: null, matched: false,
      message: 'Could not read text from the ID image (poor image quality). Human review may be needed.',
      extractedRuns: [],
    };
  }

  if (!text.trim()) {
    return {
      ok: null, matched: false,
      message: 'No text readable on the ID — skipping NIN check.',
      extractedRuns: [],
    };
  }

  const correctedText = fixOcrSubstitutions(text);
  const runs = extractAlphaRuns(text);

  // Exact match in alpha runs
  const exactMatch = runs.some((run) => run.includes(cleanNin));
  if (exactMatch) {
    return { ok: true, matched: true, message: `NIN found on ID (${cleanNin})`, extractedRuns: runs };
  }

  // Fuzzy match: allow up to 2 character differences (OCR misreads)
  const fuzzyMatch = fuzzyContains(correctedText, cleanNin, 2);
  if (fuzzyMatch) {
    return { ok: true, matched: true, message: `NIN found on ID (${cleanNin}, fuzzy match)`, extractedRuns: runs };
  }

  // Also try against the raw text with substitution corrections
  const rawFuzzy = fuzzyContains(text.toUpperCase(), cleanNin, 2);
  if (rawFuzzy) {
    return { ok: true, matched: true, message: `NIN found on ID (${cleanNin})`, extractedRuns: runs };
  }

  return {
    ok: null,
    matched: false,
    message: runs.length
      ? `Could not confidently match NIN on ID (OCR quality may be low). Admin will verify manually.`
      : `No letter sequences readable on the ID — skipping NIN check.`,
    extractedRuns: runs,
  };
}
