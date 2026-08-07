import { Router }       from 'express';
import { z }            from 'zod';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok }           from '../../utils/http.js';
import { authenticate } from '../../middleware/auth.js';
import { requireRole }  from '../../middleware/rbac.js';
import { query, queryOne } from '../../config/db.js';
import { ApiError }     from '../../utils/ApiError.js';
import * as complaintSvc from '../complaints/complaints.service.js';
import * as kycSvc       from '../kyc/kyc.service.js';

const router = Router();
router.use(authenticate);
router.use(requireRole('OPERATOR_ADMIN'));

/* ── Operator Complaints ─────────────────────────────────────────────────── */

// List complaints assigned to this operator
router.get('/complaints', asyncHandler(async (req, res) => {
  ok(res, await complaintSvc.listComplaints({
    operatorId: req.user.operatorId,
    status:     req.query.status,
    severity:   req.query.severity,
    dateFrom:   req.query.dateFrom,
    dateTo:     req.query.dateTo,
    search:     req.query.search,
    limit:      req.query.limit  ?? 25,
    offset:     req.query.offset ?? 0,
  }));
}));

// Get single complaint (must belong to this operator)
router.get('/complaints/:id', asyncHandler(async (req, res) => {
  const c = await complaintSvc.getComplaint(req.params.id);
  if (c.operator_id && String(c.operator_id) !== String(req.user.operatorId)) {
    throw { statusCode: 403, message: 'Forbidden' };
  }
  ok(res, c);
}));

// Submit operator response / finding on a complaint
router.patch('/complaints/:id/respond', asyncHandler(async (req, res) => {
  const { note, status } = z.object({
    note:   z.string().min(1),
    status: z.enum(['RESOLVED', 'UNDER_REVIEW', 'ESCALATED', 'CLOSED']).optional(),
  }).parse(req.body);

  // Verify ownership
  const c = await queryOne(`SELECT operator_id FROM complaints WHERE complaint_id = :id`, { id: req.params.id });
  if (!c) throw ApiError.notFound('Complaint not found');
  if (String(c.operator_id) !== String(req.user.operatorId)) throw ApiError.forbidden();

  const io = req.app.get('io');
  await complaintSvc.addNote(req.params.id, { note, isPublic: false, actorId: req.user.userId });
  if (status) {
    await complaintSvc.updateComplaint(req.params.id, { status, actorId: req.user.userId }, io);
  }

  ok(res, { responded: true });
}));

/* ── Operator KYC ────────────────────────────────────────────────────────── */

// List KYC submissions for this operator
router.get('/kyc', asyncHandler(async (req, res) => {
  ok(res, await kycSvc.listKyc({
    operatorId: req.user.operatorId,
    status:     req.query.status,
    search:     req.query.search,
    limit:      req.query.limit  ?? 25,
    offset:     req.query.offset ?? 0,
  }));
}));

// Get single KYC for this operator
router.get('/kyc/:id', asyncHandler(async (req, res) => {
  const k = await kycSvc.getKyc(req.params.id);
  if (k.operator_id && String(k.operator_id) !== String(req.user.operatorId)) {
    throw { statusCode: 403, message: 'Forbidden' };
  }
  ok(res, k);
}));

// Operator confirms physical SIM registration
router.patch('/kyc/:id/confirm', asyncHandler(async (req, res) => {
  const k = await kycSvc.getKyc(req.params.id);
  if (k.operator_id && String(k.operator_id) !== String(req.user.operatorId)) {
    throw { statusCode: 403, message: 'Forbidden' };
  }
  ok(res, await kycSvc.operatorConfirmKyc(req.params.id, { confirmedBy: req.user.userId }));
}));

/* ── Operator Analytics (summary for their own complaints/KYC) ──────────── */
router.get('/analytics', asyncHandler(async (req, res) => {
  const [complaintCounts] = await query(
    `SELECT COUNT(*) AS total,
            SUM(CASE WHEN status = 'NEW'          THEN 1 ELSE 0 END) AS new_count,
            SUM(CASE WHEN status = 'RESOLVED'     THEN 1 ELSE 0 END) AS resolved,
            SUM(CASE WHEN status = 'CLOSED'       THEN 1 ELSE 0 END) AS closed,
            SUM(CASE WHEN sla_deadline < NOW() AND status NOT IN ('RESOLVED','CLOSED') THEN 1 ELSE 0 END) AS sla_breached
     FROM complaints WHERE operator_id = :opId`,
    { opId: req.user.operatorId }
  );
  const kycCounts = await kycSvc.getKycSummary({ operatorId: req.user.operatorId });
  const trend = await query(
    `SELECT DATE(created_at) AS day, COUNT(*) AS total
     FROM complaints
     WHERE operator_id = :opId AND created_at >= NOW() - INTERVAL '30 days'
     GROUP BY day ORDER BY day`,
    { opId: req.user.operatorId }
  );
  ok(res, { complaints: complaintCounts, kyc: kycCounts, trend });
}));

export default router;
