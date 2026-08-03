// Best-effort NIN check via Tesseract.js OCR on the front-of-ID image.
// Phone-camera photos of ID cards vary wildly; OCR failure is common.
// We treat that as "unknown", not a hard fail.

import Tesseract from 'tesseract.js';

/**
 * Normalise digits from OCR output: strip everything that isn't a digit,
 * then find sequences long enough to plausibly contain the NIN.
 */
function extractDigitRuns(text, minLen = 6) {
  const runs = String(text).match(/\d{6,}/g) || [];
  return runs;
}

function normaliseDigits(s) { return String(s).replace(/\D/g, ''); }

/**
 * Search the OCR'd text for the submitted NIN.
 * Returns { ok, matched, message, extractedRuns }.
 * - ok: verdict for gating submission
 *   - true  → NIN was found in the text
 *   - false → text was extracted but NIN was NOT found
 *   - null  → OCR failed to read anything usable; treat as unknown, don't block
 */
export async function verifyNinAgainstId({ idFrontFile, nin }) {
  const cleanNin = normaliseDigits(nin);
  if (!cleanNin || cleanNin.length < 6) {
    return { ok: null, matched: false, message: 'NIN not provided or too short — skipped', extractedRuns: [] };
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

  const runs = extractDigitRuns(text);
  if (!runs.length) {
    return {
      ok: null,
      matched: false,
      message: 'No number sequences readable on the ID — skipping NIN check.',
      extractedRuns: [],
    };
  }

  const matched = runs.some((run) => run.includes(cleanNin) || cleanNin.includes(run));
  return {
    ok: matched,
    matched,
    message: matched
      ? `NIN found on ID (${cleanNin})`
      : `The NIN you entered (${cleanNin}) does not appear on the front of your ID. Please double-check the number or upload a clearer photo.`,
    extractedRuns: runs,
  };
}
