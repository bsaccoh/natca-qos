import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/http.js';
import { authenticate } from '../../middleware/auth.js';
import { requireRole, operatorScope } from '../../middleware/rbac.js';
import * as svc from './analytics.service.js';

const router = Router();
const STAFF = ['SYSTEM_ADMIN', 'NATCA_ADMIN', 'NATCA_ANALYST'];

router.use(authenticate);

router.get('/overview', requireRole(...STAFF), asyncHandler(async (_req, res) => {
  ok(res, await svc.getOverview());
}));

router.get('/complaints', requireRole(...STAFF, 'OPERATOR_ADMIN'), operatorScope, asyncHandler(async (req, res) => {
  ok(res, await svc.getComplaintsAnalytics({
    dateFrom:   req.query.dateFrom,
    dateTo:     req.query.dateTo,
    operatorId: req.scope?.operatorId || (req.query.operatorId ? Number(req.query.operatorId) : undefined),
  }));
}));

router.get('/advanced', requireRole(...STAFF, 'OPERATOR_ADMIN'), asyncHandler(async (_req, res) => {
  ok(res, await svc.getAdvanced());
}));

router.get('/heatmap', requireRole(...STAFF, 'OPERATOR_ADMIN'), asyncHandler(async (_req, res) => {
  ok(res, await svc.getHeatmap());
}));

router.get('/operator-benchmark', requireRole(...STAFF, 'OPERATOR_ADMIN'), asyncHandler(async (_req, res) => {
  ok(res, await svc.getOperatorBenchmark());
}));

router.get('/dashboard-kpis', requireRole(...STAFF, 'OPERATOR_ADMIN'), asyncHandler(async (_req, res) => {
  ok(res, await svc.getDashboardKpis());
}));

router.get('/feedback', requireRole(...STAFF, 'OPERATOR_ADMIN'), asyncHandler(async (req, res) => {
  ok(res, await svc.getFeedback({
    limit:      req.query.limit      ? Number(req.query.limit)      : 50,
    operatorId: req.query.operatorId ? Number(req.query.operatorId) : undefined,
  }));
}));

export default router;
