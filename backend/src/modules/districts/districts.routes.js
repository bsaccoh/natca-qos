import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/http.js';
import { query } from '../../config/db.js';

const router = Router();

router.get('/', asyncHandler(async (_req, res) => {
  ok(res, await query(`SELECT district_id, name, province FROM districts ORDER BY name`));
}));

router.get('/:id/chiefdoms', asyncHandler(async (req, res) => {
  ok(res, await query(`SELECT chiefdom_id, name FROM chiefdoms WHERE district_id = :id ORDER BY name`, { id: req.params.id }));
}));

export default router;
