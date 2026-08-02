import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/http.js';
import { query } from '../../config/db.js';

const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  const conds = ['t.is_active = TRUE'];
  const params = {};
  if (req.query.operatorId) { conds.push('t.operator_id = :operatorId'); params.operatorId = req.query.operatorId; }
  if (req.query.type)       { conds.push('t.tariff_type = :type');       params.type = req.query.type; }

  ok(res, await query(
    `SELECT t.tariff_id, t.tariff_type, t.name, t.rate, t.unit, t.valid_from,
            o.operator_name, o.operator_id
     FROM tariffs t
     LEFT JOIN operators o ON o.operator_id = t.operator_id
     WHERE ${conds.join(' AND ')}
     ORDER BY t.tariff_type, o.operator_name`,
    params
  ));
}));

export default router;
