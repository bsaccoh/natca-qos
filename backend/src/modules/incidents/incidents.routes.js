import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/http.js';
import { authenticate } from '../../middleware/auth.js';
import { requireRole, operatorScope } from '../../middleware/rbac.js';
import * as svc from './incidents.service.js';

const router = Router();
const STAFF = ['SYSTEM_ADMIN', 'NATCA_ADMIN', 'NATCA_ANALYST'];

router.use(authenticate);

router.get('/', requireRole(...STAFF, 'OPERATOR_ADMIN'), operatorScope, asyncHandler(async (req, res) => {
  ok(res, await svc.listIncidents({
    operatorId: req.scope?.operatorId || (req.query.operatorId ? Number(req.query.operatorId) : undefined),
    status: req.query.status,
    limit: req.query.limit,
    offset: req.query.offset,
  }));
}));

router.post('/', requireRole(...STAFF, 'OPERATOR_ADMIN'), asyncHandler(async (req, res) => {
  const body = z.object({
    operatorId:  z.number().int(),
    title:       z.string().min(3),
    description: z.string().optional(),
    severity:    z.string().optional(),
  }).parse(req.body);

  // If OPERATOR_ADMIN, force operatorId to their own
  if (req.user.role === 'OPERATOR_ADMIN') {
    body.operatorId = req.user.operatorId;
  }

  ok(res, await svc.createIncident({ ...body, actorId: req.user.userId }));
}));

router.get('/:id', requireRole(...STAFF, 'OPERATOR_ADMIN'), asyncHandler(async (req, res) => {
  ok(res, await svc.getIncident(req.params.id));
}));

router.patch('/:id', requireRole(...STAFF, 'OPERATOR_ADMIN'), asyncHandler(async (req, res) => {
  const body = z.object({
    status:      z.string().optional(),
    severity:    z.string().optional(),
    description: z.string().optional(),
  }).parse(req.body);
  ok(res, await svc.updateIncident(req.params.id, body));
}));

export default router;
