import { Router }       from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok }           from '../../utils/http.js';
import { queryOne }     from '../../config/db.js';
import { ApiError }     from '../../utils/ApiError.js';

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

export default router;
