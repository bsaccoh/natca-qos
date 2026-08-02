import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/http.js';
import { query } from '../../config/db.js';

const router = Router();

router.get('/', asyncHandler(async (_req, res) => {
  const [
    [{ total }],
    [{ resolved }],
    [{ this_year }],
    [{ avg_days }],
    [{ operator_count }],
  ] = await Promise.all([
    query(`SELECT COUNT(*) AS total FROM complaints`),
    query(`SELECT COUNT(*) AS resolved FROM complaints WHERE status IN ('RESOLVED','CLOSED')`),
    query(`SELECT COUNT(*) AS this_year FROM complaints WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW())`),
    query(`SELECT ROUND(CAST(AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 86400) AS NUMERIC), 1) AS avg_days
           FROM complaints WHERE status IN ('RESOLVED','CLOSED') AND resolved_at IS NOT NULL`),
    query(`SELECT COUNT(*) AS operator_count FROM operators WHERE status = 'ACTIVE'`),
  ]);

  ok(res, {
    totalComplaints:    Number(total),
    resolvedComplaints: Number(resolved),
    complaintsThisYear: Number(this_year),
    avgResolutionDays:  avg_days ? Number(avg_days) : null,
    activeOperators:    Number(operator_count),
  });
}));

export default router;
