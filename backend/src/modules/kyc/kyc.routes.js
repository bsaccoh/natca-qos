import { Router }      from 'express';
import multer          from 'multer';
import path            from 'path';
import { randomUUID }  from 'crypto';
import fs              from 'fs';
import { z }           from 'zod';
import sharp           from 'sharp';
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
    }).parse(req.body);

    const rawIdFront   = req.files?.id_front?.[0]?.path || null;
    const rawIdBack    = req.files?.id_back?.[0]?.path  || null;
    const rawFace      = req.files?.face?.[0]?.path     || null;

    if (rawFace) {
      const qualityOk = await validateFaceQuality(rawFace);
      if (!qualityOk) {
        fs.unlinkSync(rawFace);
        return res.status(400).json({ error: 'Face image quality too low (too dark or overexposed). Please retake the photo in better lighting.' });
      }
    }

    const toRelative = (p) => p ? p.replace(/\\/g, '/').replace(/^.*?(uploads\/)/, 'uploads/') : null;

    ok(res, await svc.submitKyc({
      ...body,
      userId:       req.user?.userId || null,
      idFrontPath:   toRelative(rawIdFront),
      idBackPath:    toRelative(rawIdBack),
      faceImagePath: toRelative(rawFace),
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
        message: result.match
          ? `Face verified (${result.score}% match)`
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
