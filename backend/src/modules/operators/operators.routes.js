import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/http.js';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { query } from '../../config/db.js';

const router = Router();

router.get('/', asyncHandler(async (_req, res) => {
  ok(res, await query(`SELECT operator_id, operator_name, code, hotline, logo_url, status FROM operators ORDER BY operator_name`));
}));

router.use(authenticate);

router.post('/', requireRole('SYSTEM_ADMIN', 'NATCA_ADMIN'), asyncHandler(async (req, res) => {
  const { operatorName, code, hotline } = req.body;
  const [row] = await query(
    `INSERT INTO operators (operator_name, code, hotline) VALUES (:operatorName, :code, :hotline) RETURNING *`,
    { operatorName, code, hotline: hotline || null }
  );
  ok(res, row);
}));

router.put('/:id', requireRole('SYSTEM_ADMIN', 'NATCA_ADMIN'), asyncHandler(async (req, res) => {
  const { operatorName, code, hotline, status } = req.body;
  const [row] = await query(
    `UPDATE operators SET operator_name = COALESCE(:operatorName, operator_name),
       code = COALESCE(:code, code), hotline = COALESCE(:hotline, hotline),
       status = COALESCE(:status, status)
     WHERE operator_id = :id RETURNING *`,
    { id: req.params.id, operatorName: operatorName || null, code: code || null, hotline: hotline || null, status: status || null }
  );
  ok(res, row);
}));

export default router;
