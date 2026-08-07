import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/http.js';
import { authenticate, optionalAuth } from '../../middleware/auth.js';
import { requireRole, operatorScope } from '../../middleware/rbac.js';
import * as svc from './complaints.service.js';
import { query as dbQuery } from '../../config/db.js';

const router = Router();

const STAFF = ['SYSTEM_ADMIN', 'NATCA_ADMIN', 'NATCA_ANALYST'];

function sendCsv(res, filename, rows) {
  if (!rows.length) { res.status(204).end(); return; }
  const headers = Object.keys(rows[0]);
  const escape = (v) => {
    if (v == null) return '';
    const s = String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => escape(r[h])).join(','))].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
}


/* ── Public ─────────────────────────────────────────────────────────────── */
router.post('/submit', optionalAuth, asyncHandler(async (req, res) => {
  const body = z.object({
    operatorId:           z.number().int().optional(),
    categoryId:           z.number().int().optional(),
    issueType:            z.string().min(1),
    severity:             z.enum(['LOW','MEDIUM','HIGH','CRITICAL']).optional(),
    priority:             z.enum(['LOW','NORMAL','HIGH','URGENT']).optional(),
    districtId:           z.number().int().optional(),
    chiefdomId:           z.number().int().optional(),
    areaDetail:           z.string().optional(),
    latitude:             z.number().optional(),
    longitude:            z.number().optional(),
    description:          z.string().optional(),
    billingSubCategory:   z.string().optional(),
    transactionRef:       z.string().optional(),
    disputedAmount:       z.number().optional(),
    transactionDate:      z.string().optional(),
    contactName:          z.string().optional(),
    contactPhone:         z.string().optional(),
    contactEmail:         z.string().email().optional(),
    networkDiagnostics:   z.any().optional(),
    source:               z.string().optional(),
  }).parse(req.body);

  ok(res, await svc.submitComplaint({ ...body, userId: req.user?.userId, ip: req.ip }, req.app.get('io')));
}));

router.get('/track/:ref', asyncHandler(async (req, res) => {
  ok(res, await svc.trackComplaint(req.params.ref));
}));

router.patch('/track/:ref/rate', asyncHandler(async (req, res) => {
  const { rating, feedback } = z.object({
    rating:   z.number().int().min(1).max(5),
    feedback: z.string().optional(),
  }).parse(req.body);
  ok(res, await svc.rateComplaintByRef(req.params.ref, { rating, feedback }));
}));

router.get('/categories', asyncHandler(async (_req, res) => {
  ok(res, await dbQuery(`SELECT category_id, name, code, sla_hours, is_financial FROM complaint_categories ORDER BY name`));
}));

/* ── Authenticated staff ────────────────────────────────────────────────── */
router.use(authenticate);

router.get('/export', requireRole(...STAFF), operatorScope, asyncHandler(async (req, res) => {
  const rows = await svc.exportComplaints({
    operatorId: req.scope?.operatorId || undefined,
    status:     req.query.status,
    severity:   req.query.severity,
    dateFrom:   req.query.dateFrom,
    dateTo:     req.query.dateTo,
  });
  sendCsv(res, 'complaints.csv', rows);
}));

router.get('/analytics/heatmap', requireRole(...STAFF, 'OPERATOR_ADMIN'), operatorScope, asyncHandler(async (req, res) => {
  ok(res, await svc.getHeatmapData({ operatorId: req.scope?.operatorId }));
}));

router.get('/analytics/advanced', requireRole(...STAFF, 'OPERATOR_ADMIN'), operatorScope, asyncHandler(async (req, res) => {
  ok(res, await svc.getAdvancedAnalytics({ operatorId: req.scope?.operatorId }));
}));

router.get('/summary', requireRole(...STAFF, 'OPERATOR_ADMIN'), operatorScope, asyncHandler(async (req, res) => {
  ok(res, await svc.getSummary({ operatorId: req.scope?.operatorId }));
}));

router.get('/', requireRole(...STAFF, 'OPERATOR_ADMIN', 'CITIZEN'), asyncHandler(async (req, res) => {
  const isStaff = STAFF.includes(req.user.role) || req.user.role === 'OPERATOR_ADMIN';
  const { limit, offset } = { limit: req.query.limit, offset: req.query.offset };
  ok(res, await svc.listComplaints({
    operatorId: req.user.role === 'OPERATOR_ADMIN' ? req.user.operatorId : (req.query.operatorId ? Number(req.query.operatorId) : undefined),
    userId:     req.user.role === 'CITIZEN' ? req.user.userId : (req.query.userId ? Number(req.query.userId) : undefined),
    status:     req.query.status,
    issueType:  req.query.issueType,
    districtId: req.query.districtId ? Number(req.query.districtId) : undefined,
    severity:   req.query.severity,
    priority:   req.query.priority,
    categoryId: req.query.categoryId ? Number(req.query.categoryId) : undefined,
    dateFrom:   req.query.dateFrom,
    dateTo:     req.query.dateTo,
    search:     req.query.search,
    assignedTo: req.query.assignedTo ? Number(req.query.assignedTo) : undefined,
    limit:      limit ?? 25,
    offset:     offset ?? 0,
  }));
}));

router.patch('/:id/assign', requireRole(...STAFF), asyncHandler(async (req, res) => {
  const { officerId, inspectorId } = req.body;
  ok(res, await svc.assignComplaint(req.params.id, { officerId, inspectorId, actorId: req.user.userId }, req.app.get('io')));
}));

router.patch('/:id/note', requireRole(...STAFF), asyncHandler(async (req, res) => {
  const { note, isPublic } = z.object({ note: z.string(), isPublic: z.boolean().optional() }).parse(req.body);
  ok(res, await svc.addNote(req.params.id, { note, isPublic, actorId: req.user.userId }));
}));

router.patch('/:id/rate', authenticate, asyncHandler(async (req, res) => {
  const { rating, feedback } = z.object({ rating: z.number().int().min(1).max(5), feedback: z.string().optional() }).parse(req.body);
  ok(res, await svc.rateComplaint(req.params.id, { rating, feedback, userId: req.user.userId }));
}));

router.get('/:id', requireRole(...STAFF, 'OPERATOR_ADMIN', 'CITIZEN'), asyncHandler(async (req, res) => {
  ok(res, await svc.getComplaint(req.params.id));
}));

router.patch('/:id', requireRole(...STAFF, 'OPERATOR_ADMIN'), asyncHandler(async (req, res) => {
  const body = z.object({
    status:         z.string().optional(),
    resolutionNote: z.string().optional(),
    internalNote:   z.string().optional(),
    priority:       z.string().optional(),
    severity:       z.string().optional(),
  }).parse(req.body);
  ok(res, await svc.updateComplaint(req.params.id, { ...body, actorId: req.user.userId }, req.app.get('io')));
}));

export default router;
