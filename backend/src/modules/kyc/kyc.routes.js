import { Router }      from 'express';
import multer          from 'multer';
import path            from 'path';
import { randomUUID }  from 'crypto';
import fs              from 'fs';
import { z }           from 'zod';
import { asyncHandler }        from '../../utils/asyncHandler.js';
import { ok }                  from '../../utils/http.js';
import { authenticate, optionalAuth } from '../../middleware/auth.js';
import { requireRole }         from '../../middleware/rbac.js';
import * as svc                from './kyc.service.js';

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
      nin:         z.string().optional(),
      firstName:   z.string().optional(),
      lastName:    z.string().optional(),
      dateOfBirth: z.string().optional(),
      sex:         z.string().optional(),
      nationality: z.string().optional(),
      address:     z.string().optional(),
      districtId:  z.coerce.number().int().optional(),
      chiefdomId:  z.coerce.number().int().optional(),
      idType:      z.string().optional(),
    }).parse(req.body);

    const idFrontPath   = req.files?.id_front?.[0]?.path || null;
    const idBackPath    = req.files?.id_back?.[0]?.path  || null;
    const faceImagePath = req.files?.face?.[0]?.path     || null;

    ok(res, await svc.submitKyc({
      ...body,
      userId:       req.user?.userId || null,
      idFrontPath,
      idBackPath,
      faceImagePath,
    }));
  })
);

router.get('/status/:ref', asyncHandler(async (req, res) => {
  ok(res, await svc.getKycStatus(req.params.ref));
}));

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
