// Best-effort NIN check via Tesseract.js OCR on the front-of-ID image.
// Phone-camera photos of ID cards vary wildly; OCR failure is common.
// We treat that as "unknown", not a hard fail.
//
// Sierra Leone NIN format: 8 uppercase letters (e.g. SAXEGTWT).

import Tesseract from 'tesseract.js';

const NIN_LENGTH = 8;

// Normalise a user-entered NIN: uppercase, letters only.
function normaliseNin(s) { return String(s).toUpperCase().replace(/[^A-Z]/g, ''); }

// Extract all runs of 8+ consecutive letters from OCR text (uppercased).
// OCR often misreads O→0 and I→1; we correct those common substitutions.
function fixOcrSubstitutions(s) {
  return s.toUpperCase().replace(/0/g, 'O').replace(/1/g, 'I');
}

function extractAlphaRuns(text) {
  const corrected = fixOcrSubstitutions(text);
  return corrected.match(/[A-Z]{8,}/g) || [];
}

/**
 * Search the OCR'd text for the submitted NIN.
 * Returns { ok, matched, message, extractedRuns }.
 * - ok: true  → NIN was found in the OCR text
 *       false → OCR text extracted but NIN NOT found
 *       null  → OCR failed / nothing readable; treat as unknown, don't block
 */
export async function verifyNinAgainstId({ idFrontFile, nin }) {
  const cleanNin = normaliseNin(nin);
  if (!cleanNin || cleanNin.length !== NIN_LENGTH) {
    return { ok: null, matched: false, message: 'NIN not provided or invalid length — skipped', extractedRuns: [] };
  }

  let text = '';
  try {
    const { data } = await Tesseract.recognize(idFrontFile, 'eng', { logger: () => {} });
    text = data?.text || '';
  } catch {
    return {
      ok: null,
      matched: false,
      message: 'Could not read text from the ID image (poor image quality). Human review may be needed.',
      extractedRuns: [],
    };
  }

  const runs = extractAlphaRuns(text);
  if (!runs.length) {
    return {
      ok: null,
      matched: false,
      message: 'No letter sequences readable on the ID — skipping NIN check.',
      extractedRuns: [],
    };
  }

  const matched = runs.some((run) => run.includes(cleanNin));
  return {
    ok: matched,
    matched,
    message: matched
      ? `NIN found on ID (${cleanNin})`
      : `The NIN you entered (${cleanNin}) does not appear on the front of your ID. Please double-check and upload a clearer photo.`,
    extractedRuns: runs,
  };
}
