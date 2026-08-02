import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, created } from '../../utils/http.js';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import * as svc from './ussd.service.js';

const router = Router();
const STAFF = ['SYSTEM_ADMIN', 'NATCA_ADMIN', 'NATCA_ANALYST'];

// Public route for Citizen portal to fetch active USSD codes
router.get('/public', asyncHandler(async (req, res) => {
  ok(res, await svc.listUssdCodes({ is_active: true, limit: 100 }));
}));

router.use(authenticate);

router.get('/', requireRole(...STAFF), asyncHandler(async (req, res) => {
  const { limit, offset, operatorId, is_active, category } = req.query;
  ok(res, await svc.listUssdCodes({
    limit, offset,
    operatorId: operatorId ? Number(operatorId) : undefined,
    is_active: is_active !== undefined ? is_active === 'true' : undefined,
    category
  }));
}));

router.get('/:id', requireRole(...STAFF), asyncHandler(async (req, res) => {
  ok(res, await svc.getUssdCode(Number(req.params.id)));
}));

router.post('/', requireRole('SYSTEM_ADMIN', 'NATCA_ADMIN'), asyncHandler(async (req, res) => {
  const body = z.object({
    operatorId: z.number().int().optional().nullable(),
    serviceCategory: z.string().min(1),
    code: z.string().min(1),
    description: z.string().optional().nullable(),
    isActive: z.boolean().optional()
  }).parse(req.body);

  created(res, await svc.createUssdCode(body));
}));

router.put('/:id', requireRole('SYSTEM_ADMIN', 'NATCA_ADMIN'), asyncHandler(async (req, res) => {
  const body = z.object({
    operatorId: z.number().int().optional().nullable(),
    serviceCategory: z.string().optional(),
    code: z.string().optional(),
    description: z.string().optional().nullable(),
    isActive: z.boolean().optional()
  }).parse(req.body);

  ok(res, await svc.updateUssdCode(Number(req.params.id), body));
}));

router.delete('/:id', requireRole('SYSTEM_ADMIN', 'NATCA_ADMIN'), asyncHandler(async (req, res) => {
  ok(res, await svc.deleteUssdCode(Number(req.params.id)));
}));

export default router;
