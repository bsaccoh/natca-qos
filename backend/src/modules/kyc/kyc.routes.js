import { Router }      from 'express';
import multer          from 'multer';
import path            from 'path';
import { randomUUID }  from 'crypto';
import fs              from 'fs';
import { z }           from 'zod';
import sharp           from 'sharp';
import Tesseract       from 'tesseract.js';
import { asyncHandler }        from '../../utils/asyncHandler.js';
import { ok }                  from '../../utils/http.js';
import { authenticate, optionalAuth } from '../../middleware/auth.js';
import { requireRole }         from '../../middleware/rbac.js';
import * as svc                from './kyc.service.js';
import { env }                 from '../../config/env.js';

const SERVER_BRIGHTNESS_MIN = 30;
const SERVER_BRIGHTNESS_MAX = 220;

async function validateFaceQuality(filePath) {
  const { data, info } = await sharp(filePath)
    .resize(160, 160, { fit: 'cover' })
    .raw()
    .toBuffer({ resolveWithObject: true });

  let totalLum = 0;
  const n = info.width * info.height;
  for (let i = 0; i < data.length; i += info.channels) {
    totalLum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }
  const avgBrightness = totalLum / n;
  return avgBrightness >= SERVER_BRIGHTNESS_MIN && avgBrightness <= SERVER_BRIGHTNESS_MAX;
}

const router = Router();

/* ── Multer for KYC document uploads ────────────────────────────────────── */
const kycStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.join(process.cwd(), 'uploads', 'kyc', new Date().toISOString().slice(0, 10));
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${randomUUID()}${ext}`);
  },
});
const kycUpload = multer({
  storage: kycStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    cb(null, allowed.includes(file.mimetype));
  },
});

const ADMIN  = ['SYSTEM_ADMIN', 'NATCA_ADMIN', 'NATCA_ANALYST'];
const OP     = ['OPERATOR_ADMIN'];

/* ── Warm up the Python face-match service (Render free tier cold starts) */
router.get('/compare-faces', asyncHandler(async (_req, res) => {
  try {
    await fetch(`${env.faceMatchUrl}/health`);
    ok(res, { status: 'warm' });
  } catch {
    res.status(503).json({ status: 'cold' });
  }
}));

/* ── Public ─────────────────────────────────────────────────────────────── */
router.post(
  '/submit',
  optionalAuth,
  kycUpload.fields([
    { name: 'id_front', maxCount: 1 },
    { name: 'id_back',  maxCount: 1 },
    { name: 'face',     maxCount: 1 },
  ]),
  asyncHandler(async (req, res) => {
    const body = z.object({
      phone:       z.string().min(6),
      operatorId:  z.coerce.number().int().optional(),
      iccid:       z.string().optional(),
      nin:         z.string().regex(/^[A-Z]{8}$/, 'NIN must be exactly 8 uppercase letters').optional(),
      firstName:   z.string().optional(),
      lastName:    z.string().optional(),
      dateOfBirth: z.string().optional(),
      sex:         z.string().optional(),
      nationality: z.string().optional(),
      address:     z.string().optional(),
      districtId:  z.coerce.number().int().optional(),
      chiefdomId:  z.coerce.number().int().optional(),
      idType:        z.string().optional(),
      idExpiryDate:  z.string().optional(),
      faceMatchScore: z.coerce.number().min(0).max(100).optional(),
      livenessPassed: z.boolean().optional(),
      livenessScore:  z.coerce.number().optional(),
      riskScore:      z.coerce.number().optional(),
    }).parse(req.body);

    const rawIdFront   = req.files?.id_front?.[0] || null;
    const rawIdBack    = req.files?.id_back?.[0]  || null;
    const rawFace      = req.files?.face?.[0]     || null;

    if (rawFace) {
      const qualityOk = await validateFaceQuality(rawFace.path);
      if (!qualityOk) {
        fs.unlinkSync(rawFace.path);
        return res.status(400).json({ error: 'Face image quality too low (too dark or overexposed). Please retake the photo in better lighting.' });
      }
    }

    const toRelative = (p) => p ? p.replace(/\\/g, '/').replace(/^.*?(uploads\/)/, 'uploads/') : null;
    const toDataUri = (fileObj) => {
      if (!fileObj?.path) return null;
      try {
        const buf = fs.readFileSync(fileObj.path);
        const mime = fileObj.mimetype || 'image/jpeg';
        return `data:${mime};base64,${buf.toString('base64')}`;
      } catch { return null; }
    };

    ok(res, await svc.submitKyc({
      ...body,
      userId:        req.user?.userId || null,
      idFrontPath:   toRelative(rawIdFront?.path),
      idBackPath:    toRelative(rawIdBack?.path),
      faceImagePath: toRelative(rawFace?.path),
      idFrontData:   toDataUri(rawIdFront),
      idBackData:    toDataUri(rawIdBack),
      faceImageData: toDataUri(rawFace),
    }));
  })
);

router.get('/status/:ref', asyncHandler(async (req, res) => {
  ok(res, await svc.getKycStatus(req.params.ref));
}));

/* ── Python face-match proxy ──────────────────────────────────────────────
   Sends both images to the Python DeepFace/ArcFace microservice and
   returns its similarity verdict to the browser.                         */
const compareUpload = multer({ storage: multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.join(process.cwd(), 'uploads', 'tmp');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => cb(null, `${randomUUID()}${path.extname(file.originalname)}`),
}), limits: { fileSize: 10 * 1024 * 1024 } });

router.post(
  '/compare-faces',
  compareUpload.fields([
    { name: 'id_front', maxCount: 1 },
    { name: 'selfie',   maxCount: 1 },
  ]),
  asyncHandler(async (req, res) => {
    const idPath     = req.files?.id_front?.[0]?.path;
    const selfiePath = req.files?.selfie?.[0]?.path;
    if (!idPath || !selfiePath) {
      return res.status(400).json({ error: 'Both id_front and selfie files are required.' });
    }

    try {
      const FormData = (await import('form-data')).default;
      const form = new FormData();
      form.append('id_image', fs.createReadStream(idPath));
      form.append('selfie',   fs.createReadStream(selfiePath));

      const url = `${env.faceMatchUrl}/compare`;
      const resp = await fetch(url, { method: 'POST', body: form, headers: form.getHeaders() });

      if (!resp.ok) {
        const text = await resp.text();
        return res.status(502).json({ error: `Face match service error: ${text}` });
      }

      const result = await resp.json();
      ok(res, {
        ok:      !!result.match,
        score:   result.score ?? 0,
        liveness_passed: result.liveness_passed ?? true,
        liveness_score:  result.liveness_score ?? 100,
        risk_score:      result.risk_score ?? 0,
        liveness_reasons: result.liveness?.reasons || [],
        message: result.match
          ? (result.liveness_passed === false
              ? `Face matched (${result.score}%), but passive anti-spoofing flagged potential display/paper replay. Review required.`
              : `Face verified (${result.score}% match)`)
          : result.message || `The face on your ID does not match your selfie (${result.score}% match). Please retake your selfie or upload a clearer ID photo.`,
        strategy: result.strategy,
        model:    result.model,
      });
    } catch (err) {
      if (err.cause?.code === 'ECONNREFUSED' || err.code === 'ECONNREFUSED') {
        return res.status(503).json({ error: 'Face match service is not available. Please try again later.' });
      }
      throw err;
    } finally {
      try { fs.unlinkSync(idPath); } catch {}
      try { fs.unlinkSync(selfiePath); } catch {}
    }
  })
);

/* ── NIN OCR verification ────────────────────────────────────────────────
   Runs Tesseract OCR on the ID front image and checks if the NIN appears.
   Best-effort: OCR on phone-camera photos often fails.                   */
function fixOcrSubstitutions(s) {
  return s.toUpperCase()
    .replace(/0/g, 'O').replace(/1/g, 'I').replace(/8/g, 'B')
    .replace(/5/g, 'S').replace(/6/g, 'G').replace(/2/g, 'Z');
}

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
  return dp[m][n];
}

function fuzzyContains(text, nin, maxDist = 2) {
  const upper = text.toUpperCase();
  for (let i = 0; i <= upper.length - nin.length; i++) {
    if (levenshtein(upper.slice(i, i + nin.length), nin) <= maxDist) return true;
  }
  return false;
}

function extractExpiryDate(text) {
  const patterns = [
    /(\d{1,2})[.\-/](\d{1,2})[.\-/](20\d{2})/g,
    /(20\d{2})[.\-/](\d{1,2})[.\-/](\d{1,2})/g,
  ];
  const dates = [];
  for (const line of text.split('\n')) {
    const isExpiry = /expir|exp\b|valid.*until|valid.*to|date.*exp/i.test(line);
    for (const pat of patterns) {
      pat.lastIndex = 0;
      let m;
      while ((m = pat.exec(line)) !== null) {
        let day, month, year;
        if (/^20\d{2}$/.test(m[1])) { year = +m[1]; month = +m[2]; day = +m[3]; }
        else { day = +m[1]; month = +m[2]; year = +m[3]; }
        if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 2024 && year <= 2040) {
          dates.push({ iso: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`, isExpiry, year });
        }
      }
    }
  }
  const expiry = dates.find(d => d.isExpiry) || dates.find(d => d.year > new Date().getFullYear());
  return expiry?.iso || null;
}

router.post(
  '/verify-nin',
  compareUpload.fields([{ name: 'id_front', maxCount: 1 }]),
  asyncHandler(async (req, res) => {
    const idPath = req.files?.id_front?.[0]?.path;
    const nin = (req.body.nin || '').toUpperCase().replace(/[^A-Z]/g, '');
    if (!idPath) return res.status(400).json({ error: 'id_front file is required.' });

    try {
      const { data } = await Tesseract.recognize(idPath, 'eng', { logger: () => {} });
      const text = data?.text || '';

      if (!text.trim()) {
        return ok(res, { ok: null, matched: false, expiry: null,
          message: 'No text readable on the ID — skipping NIN check.' });
      }

      const expiry = extractExpiryDate(text);

      if (!nin || nin.length !== 8) {
        return ok(res, { ok: null, matched: false, expiry,
          message: 'NIN not provided or invalid — skipped.' });
      }

      const corrected = fixOcrSubstitutions(text);
      const runs = corrected.match(/[A-Z]{4,}/g) || [];
      const exact = runs.some(r => r.includes(nin));
      if (exact) {
        return ok(res, { ok: true, matched: true, expiry, message: `NIN found on ID (${nin})` });
      }
      if (fuzzyContains(corrected, nin, 2) || fuzzyContains(text.toUpperCase(), nin, 2)) {
        return ok(res, { ok: true, matched: true, expiry, message: `NIN found on ID (${nin}, fuzzy match)` });
      }

      return ok(res, { ok: null, matched: false, expiry,
        message: runs.length
          ? 'Could not confidently match NIN on ID (OCR quality may be low). Admin will verify manually.'
          : 'No letter sequences readable on the ID — skipping NIN check.' });
    } finally {
      try { fs.unlinkSync(idPath); } catch {}
    }
  })
);

/* ── Authenticated (admin + operator) ───────────────────────────────────── */
router.use(authenticate);

router.get('/summary', requireRole(...ADMIN), asyncHandler(async (req, res) => {
  ok(res, await svc.getKycSummary({ operatorId: req.query.operatorId ? Number(req.query.operatorId) : undefined }));
}));

router.get('/', requireRole(...ADMIN, ...OP), asyncHandler(async (req, res) => {
  ok(res, await svc.listKyc({
    status:     req.query.status,
    operatorId: req.query.operatorId ? Number(req.query.operatorId) : undefined,
    districtId: req.query.districtId ? Number(req.query.districtId) : undefined,
    dateFrom:   req.query.dateFrom,
    dateTo:     req.query.dateTo,
    search:     req.query.search,
    limit:      req.query.limit  ?? 25,
    offset:     req.query.offset ?? 0,
  }));
}));

router.get('/:id', requireRole(...ADMIN, ...OP), asyncHandler(async (req, res) => {
  ok(res, await svc.getKyc(req.params.id));
}));

router.patch('/:id/approve', requireRole(...ADMIN), asyncHandler(async (req, res) => {
  ok(res, await svc.approveKyc(req.params.id, { reviewedBy: req.user.userId }));
}));

router.patch('/:id/reject', requireRole(...ADMIN), asyncHandler(async (req, res) => {
  const { reason } = z.object({ reason: z.string().min(5) }).parse(req.body);
  ok(res, await svc.rejectKyc(req.params.id, { reviewedBy: req.user.userId, reason }));
}));

router.patch('/:id/request-info', requireRole(...ADMIN), asyncHandler(async (req, res) => {
  const { note } = z.object({ note: z.string().optional() }).parse(req.body);
  ok(res, await svc.requestKycInfo(req.params.id, { reviewedBy: req.user.userId, note }));
}));

router.patch('/:id/confirm', requireRole(...OP), asyncHandler(async (req, res) => {
  ok(res, await svc.operatorConfirmKyc(req.params.id, { confirmedBy: req.user.userId }));
}));

export default router;
