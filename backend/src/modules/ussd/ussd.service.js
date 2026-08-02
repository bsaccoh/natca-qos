import { query, queryOne } from '../../config/db.js';
import { ApiError } from '../../utils/ApiError.js';

export async function listUssdCodes({ operatorId, is_active, category, limit = 50, offset = 0 } = {}) {
  const conds = ['1=1'];
  const params = {};

  if (operatorId) { conds.push('u.operator_id = :operatorId'); params.operatorId = operatorId; }
  if (is_active !== undefined) { conds.push('u.is_active = :is_active'); params.is_active = is_active; }
  if (category) { conds.push('u.service_category = :category'); params.category = category; }

  const where = conds.join(' AND ');
  params.limit = Number(limit);
  params.offset = Number(offset);

  const [rows, [{ total }]] = await Promise.all([
    query(
      `SELECT u.*, o.operator_name 
       FROM ussd_codes u 
       LEFT JOIN operators o ON o.operator_id = u.operator_id 
       WHERE ${where} 
       ORDER BY u.created_at DESC 
       LIMIT :limit OFFSET :offset`,
      params
    ),
    query(`SELECT COUNT(*) AS total FROM ussd_codes u WHERE ${where}`, params),
  ]);

  return { rows, total: Number(total) };
}

export async function getUssdCode(id) {
  const row = await queryOne(
    `SELECT u.*, o.operator_name 
     FROM ussd_codes u 
     LEFT JOIN operators o ON o.operator_id = u.operator_id 
     WHERE u.ussd_id = :id`,
    { id }
  );
  if (!row) throw ApiError.notFound('USSD code not found');
  return row;
}

export async function createUssdCode(data) {
  const [row] = await query(
    `INSERT INTO ussd_codes (operator_id, service_category, code, description, is_active, last_verified)
     VALUES (:operatorId, :category, :code, :description, :isActive, NOW())
     RETURNING *`,
    {
      operatorId: data.operatorId || null,
      category: data.serviceCategory,
      code: data.code,
      description: data.description || null,
      isActive: data.isActive ?? true
    }
  );
  return row;
}

export async function updateUssdCode(id, data) {
  const sets = [];
  const params = { id };

  if (data.operatorId !== undefined) { sets.push('operator_id = :operatorId'); params.operatorId = data.operatorId; }
  if (data.serviceCategory !== undefined) { sets.push('service_category = :category'); params.category = data.serviceCategory; }
  if (data.code !== undefined) { sets.push('code = :code'); params.code = data.code; }
  if (data.description !== undefined) { sets.push('description = :description'); params.description = data.description; }
  if (data.isActive !== undefined) { sets.push('is_active = :isActive'); params.isActive = data.isActive; }

  if (sets.length === 0) return getUssdCode(id);

  const [row] = await query(
    `UPDATE ussd_codes SET ${sets.join(', ')} WHERE ussd_id = :id RETURNING *`,
    params
  );
  if (!row) throw ApiError.notFound('USSD code not found');
  return row;
}

export async function deleteUssdCode(id) {
  const [row] = await query(`DELETE FROM ussd_codes WHERE ussd_id = :id RETURNING ussd_id`, { id });
  if (!row) throw ApiError.notFound('USSD code not found');
  return { deleted: true };
}
