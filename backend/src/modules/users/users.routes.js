import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/http.js';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { query, queryOne } from '../../config/db.js';
import { ApiError } from '../../utils/ApiError.js';

const router = Router();
router.use(authenticate);
router.use(requireRole('SYSTEM_ADMIN', 'NATCA_ADMIN'));

router.get('/', asyncHandler(async (_req, res) => {
  ok(res, await query(
    `SELECT u.user_id, u.full_name, u.email, u.phone, u.is_active, u.last_login_at, u.created_at,
            r.role_key, r.name AS role_name, o.operator_name
     FROM users u
     JOIN roles r ON r.role_id = u.role_id
     LEFT JOIN operators o ON o.operator_id = u.operator_id
     ORDER BY u.created_at DESC`
  ));
}));

router.get('/roles', asyncHandler(async (_req, res) => {
  ok(res, await query(`SELECT role_id, role_key, name FROM roles ORDER BY role_id`));
}));

router.post('/', asyncHandler(async (req, res) => {
  const { fullName, email, phone, password, roleKey, operatorId } = req.body;
  const [role] = await query(`SELECT role_id FROM roles WHERE role_key = :roleKey`, { roleKey });
  if (!role) throw ApiError.badRequest('Invalid role');
  const hash = await bcrypt.hash(password || 'Admin@12345', 12);
  const [row] = await query(
    `INSERT INTO users (full_name, email, phone, password_hash, role_id, operator_id, otp_verified, phone_verified)
     VALUES (:fullName, :email, :phone, :hash, :roleId, :operatorId, TRUE, TRUE)
     RETURNING user_id, full_name, email, phone`,
    { fullName, email: email || null, phone: phone || null, hash, roleId: role.role_id, operatorId: operatorId || null }
  );
  ok(res, row);
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const { fullName, email, phone, isActive, roleKey, operatorId } = req.body;
  let roleId = undefined;
  if (roleKey) {
    const [role] = await query(`SELECT role_id FROM roles WHERE role_key = :roleKey`, { roleKey });
    if (!role) throw ApiError.badRequest('Invalid role');
    roleId = role.role_id;
  }
  await query(
    `UPDATE users SET
       full_name   = COALESCE(:fullName, full_name),
       email       = COALESCE(:email, email),
       phone       = COALESCE(:phone, phone),
       is_active   = COALESCE(:isActive, is_active),
       role_id     = COALESCE(:roleId, role_id),
       operator_id = COALESCE(:operatorId, operator_id),
       updated_at  = NOW()
     WHERE user_id = :id`,
    { id: req.params.id, fullName: fullName || null, email: email || null, phone: phone || null, isActive: isActive ?? null, roleId: roleId ?? null, operatorId: operatorId ?? null }
  );
  ok(res, { updated: true });
}));

router.post('/:id/reset-password', asyncHandler(async (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 8) throw ApiError.badRequest('Password must be at least 8 characters');
  const hash = await bcrypt.hash(newPassword, 12);
  await query(`UPDATE users SET password_hash = :hash, updated_at = NOW() WHERE user_id = :id`, { hash, id: req.params.id });
  ok(res, { reset: true });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  await query(`UPDATE users SET is_active = FALSE, updated_at = NOW() WHERE user_id = :id`, { id: req.params.id });
  ok(res, { deactivated: true });
}));

export default router;
