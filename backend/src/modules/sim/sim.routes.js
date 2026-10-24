import { Router }       from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, created }   from '../../utils/http.js';
import { queryOne }     from '../../config/db.js';
import { ApiError }     from '../../utils/ApiError.js';
import { authenticate } from '../../middleware/auth.js';
import { requireRole }  from '../../middleware/rbac.js';
import * as simService  from './sim.service.js';

const router = Router();

/**
 * GET /sim/verify?phone=&nin=
 * Public endpoint — checks if a phone + NIN combo has an approved KYC record.
 */
router.get('/verify', asyncHandler(async (req, res) => {
  const { phone, nin } = req.query;
  if (!phone) throw ApiError.badRequest('phone query parameter is required');

  const row = await queryOne(
    `SELECT k.kyc_reference, k.status, k.first_name, k.last_name,
            o.operator_name, k.expires_at
     FROM kyc_submissions k
     LEFT JOIN operators o ON o.operator_id = k.operator_id
     WHERE k.phone = :phone
       AND (:nin::TEXT IS NULL OR k.nin = :nin)
       AND k.status = 'APPROVED'
     ORDER BY k.created_at DESC
     LIMIT 1`,
    { phone, nin: nin || null }
  );

  if (!row) {
    return ok(res, {
      verified: false,
      message:  'No approved KYC record found for this number',
    });
  }

  // Check expiry
  if (row.expires_at && new Date(row.expires_at) < new Date()) {
    return ok(res, { verified: false, message: 'KYC record has expired' });
  }

  ok(res, {
    verified:      true,
    kyc_reference: row.kyc_reference,
    operator:      row.operator_name,
    first_name:    row.first_name,
    last_name:     row.last_name,
    expires_at:    row.expires_at,
  });
}));

/**
 * GET /sim/audit/:nin
 * Regulatory audit: returns all active SIMs registered to this NIN across all operators
 */
router.get(
  '/audit/:nin',
  authenticate,
  requireRole('SYSTEM_ADMIN', 'NATCA_ADMIN', 'NATCA_ANALYST', 'INSPECTOR', 'OPERATOR_ADMIN'),
  asyncHandler(async (req, res) => {
    const data = await simService.auditSimRegistrations(req.params.nin);
    ok(res, data);
  })
);

/**
 * POST /sim/check-cap
 * Pre-activation compliance check before issuing a new SIM
 */
router.post(
  '/check-cap',
  authenticate,
  asyncHandler(async (req, res) => {
    const { nin, phone, operatorId } = req.body;
    const result = await simService.checkSimCapPreActivation({
      nin,
      phone,
      operatorId: operatorId || req.user?.operatorId,
    });
    ok(res, result);
  })
);

/**
 * GET /sim/fraud-alerts
 * Lists active SIM cap violations and rapid-velocity registration fraud alerts
 */
router.get(
  '/fraud-alerts',
  authenticate,
  requireRole('SYSTEM_ADMIN', 'NATCA_ADMIN', 'NATCA_ANALYST', 'INSPECTOR'),
  asyncHandler(async (req, res) => {
    const { status, limit, offset } = req.query;
    const data = await simService.listSimFraudAlerts({ status, limit, offset });
    ok(res, data);
  })
);

/**
 * PATCH /sim/fraud-alerts/:id
 * Resolve or update status of a SIM fraud alert
 */
router.patch(
  '/fraud-alerts/:id',
  authenticate,
  requireRole('SYSTEM_ADMIN', 'NATCA_ADMIN'),
  asyncHandler(async (req, res) => {
    const { status, resolutionNote } = req.body;
    const updated = await simService.resolveFraudAlert(Number(req.params.id), {
      status,
      resolutionNote,
      resolvedBy: req.user?.userId,
    });
    ok(res, updated);
  })
);

export default router;
