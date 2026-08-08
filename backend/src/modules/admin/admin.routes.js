import { Router }  from 'express';
import bcrypt       from 'bcryptjs';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok }           from '../../utils/http.js';
import { authenticate } from '../../middleware/auth.js';
import { requireRole }  from '../../middleware/rbac.js';
import { query }        from '../../config/db.js';
import { ApiError }     from '../../utils/ApiError.js';

const router = Router();
router.use(authenticate);
router.use(requireRole('SYSTEM_ADMIN', 'NATCA_ADMIN'));

/* ── Active sessions ─────────────────────────────────────────────────── */
router.get('/sessions', asyncHandler(async (_req, res) => {
  const rows = await query(`
    SELECT s.session_id, s.user_agent, s.ip_address, s.expires_at, s.created_at,
           u.user_id, u.full_name, u.email, r.role_key
    FROM sessions s
    JOIN  users u ON u.user_id = s.user_id
    JOIN  roles r ON r.role_id = u.role_id
    WHERE s.revoked_at IS NULL AND s.expires_at > NOW()
    ORDER BY s.created_at DESC
    LIMIT 200
  `);
  ok(res, rows);
}));

router.delete('/sessions/:id', requireRole('SYSTEM_ADMIN'), asyncHandler(async (req, res) => {
  await query(`UPDATE sessions SET revoked_at = NOW() WHERE session_id = :id`, { id: req.params.id });
  ok(res, { revoked: true });
}));

router.delete('/sessions', requireRole('SYSTEM_ADMIN'), asyncHandler(async (req, res) => {
  const { exceptCurrentUser } = req.query;
  const cond = exceptCurrentUser ? 'AND user_id != :uid' : '';
  await query(`UPDATE sessions SET revoked_at = NOW() WHERE revoked_at IS NULL AND expires_at > NOW() ${cond}`,
    { uid: req.user.userId });
  ok(res, { revokedAll: true });
}));

/* ── Audit log ───────────────────────────────────────────────────────── */
router.get('/audit-logs', asyncHandler(async (req, res) => {
  const { action, userId, dateFrom, dateTo, limit = 50, offset = 0 } = req.query;
  const conds  = ['1=1'];
  const params = { limit: Number(limit), offset: Number(offset) };
  if (action)   { conds.push('al.action ILIKE :action');    params.action   = `%${action}%`; }
  if (userId)   { conds.push('al.user_id = :userId');       params.userId   = Number(userId); }
  if (dateFrom) { conds.push('al.created_at >= :dateFrom'); params.dateFrom = dateFrom; }
  if (dateTo)   { conds.push('al.created_at <= :dateTo');   params.dateTo   = dateTo; }
  const where = conds.join(' AND ');

  const [rows, [countRow]] = await Promise.all([
    query(`
      SELECT al.log_id, al.action, al.entity_type, al.entity_id,
             al.changes, al.ip_address, al.created_at,
             u.full_name, u.email, r.role_key
      FROM audit_logs al
      LEFT JOIN users u ON u.user_id = al.user_id
      LEFT JOIN roles r ON r.role_id = u.role_id
      WHERE ${where}
      ORDER BY al.created_at DESC
      LIMIT :limit OFFSET :offset
    `, params),
    query(`SELECT COUNT(*) AS total FROM audit_logs al WHERE ${where}`, params),
  ]);
  ok(res, { rows, total: Number(countRow?.total || 0) });
}));

/* ── Login history (all sessions) ────────────────────────────────────── */
router.get('/login-history', asyncHandler(async (req, res) => {
  const { search, limit = 50, offset = 0 } = req.query;
  const conds  = ['1=1'];
  const params = { limit: Number(limit), offset: Number(offset) };
  if (search) {
    conds.push('(u.email ILIKE :s OR u.full_name ILIKE :s OR s.ip_address ILIKE :s)');
    params.s = `%${search}%`;
  }
  const where = conds.join(' AND ');
  const rows = await query(`
    SELECT s.session_id, s.ip_address, s.user_agent,
           s.created_at, s.expires_at, s.revoked_at,
           u.full_name, u.email, r.role_key
    FROM sessions s
    JOIN  users u ON u.user_id = s.user_id
    JOIN  roles r ON r.role_id = u.role_id
    WHERE ${where}
    ORDER BY s.created_at DESC
    LIMIT :limit OFFSET :offset
  `, params);
  ok(res, rows);
}));

/* ── System settings ─────────────────────────────────────────────────── */
router.get('/system-settings', asyncHandler(async (_req, res) => {
  const rows = await query(`SELECT key, value, description, updated_at FROM system_config ORDER BY key`);
  ok(res, rows);
}));

router.put('/system-settings', requireRole('SYSTEM_ADMIN'), asyncHandler(async (req, res) => {
  const { settings } = req.body;
  if (!Array.isArray(settings) || settings.length === 0) throw ApiError.badRequest('settings must be a non-empty array');
  for (const { key, value } of settings) {
    await query(
      `INSERT INTO system_config (key, value, updated_at)
       VALUES (:key, :value::jsonb, NOW())
       ON CONFLICT (key) DO UPDATE SET value = :value::jsonb, updated_at = NOW()`,
      { key, value: JSON.stringify(value) }
    );
  }
  await query(
    `INSERT INTO audit_logs (user_id, action, entity_type, changes, ip_address)
     VALUES (:uid, 'SYSTEM_SETTINGS_UPDATED', 'system_config', :ch, :ip)`,
    { uid: req.user.userId, ch: JSON.stringify({ keys: settings.map(s => s.key) }), ip: req.ip }
  );
  ok(res, { updated: true });
}));

/* ── Alert settings ──────────────────────────────────────────────────── */
const ALERT_DEFAULTS = {
  sla_warning_hours:    24,
  sla_breach_emails:    [],
  sla_sms_enabled:      false,
  notify_new_complaint: true,
};

router.get('/alert-settings', asyncHandler(async (_req, res) => {
  const keys = Object.keys(ALERT_DEFAULTS);
  const rows = await query(`SELECT key, value FROM system_config WHERE key = ANY(:keys)`, { keys });
  const result = { ...ALERT_DEFAULTS };
  rows.forEach(r => { result[r.key] = r.value; });
  ok(res, result);
}));

router.put('/alert-settings', asyncHandler(async (req, res) => {
  const allowed = Object.keys(ALERT_DEFAULTS);
  const updates = Object.entries(req.body).filter(([k]) => allowed.includes(k));
  for (const [key, value] of updates) {
    await query(
      `INSERT INTO system_config (key, value, updated_at)
       VALUES (:key, :value::jsonb, NOW())
       ON CONFLICT (key) DO UPDATE SET value = :value::jsonb, updated_at = NOW()`,
      { key, value: JSON.stringify(value) }
    );
  }
  await query(
    `INSERT INTO audit_logs (user_id, action, entity_type, changes, ip_address)
     VALUES (:uid, 'ALERT_SETTINGS_UPDATED', 'system_config', :ch, :ip)`,
    { uid: req.user.userId, ch: JSON.stringify({ keys: updates.map(([k]) => k) }), ip: req.ip }
  );
  ok(res, { updated: true });
}));

/* ── Account suspension ──────────────────────────────────────────────── */
router.patch('/users/:id/suspend', asyncHandler(async (req, res) => {
  const { suspend, reason } = req.body;
  await query(
    `UPDATE users SET is_active = :active, updated_at = NOW() WHERE user_id = :id`,
    { active: !suspend, id: req.params.id }
  );
  await query(
    `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, changes, ip_address)
     VALUES (:adminId, :action, 'user', :targetId, :changes, :ip)`,
    {
      adminId:  req.user.userId,
      action:   suspend ? 'ACCOUNT_SUSPENDED' : 'ACCOUNT_REACTIVATED',
      targetId: Number(req.params.id),
      changes:  JSON.stringify({ reason: reason || null }),
      ip:       req.ip,
    }
  );
  ok(res, { suspended: Boolean(suspend) });
}));

/* ── Role permissions ────────────────────────────────────────────────── */
router.get('/role-permissions', asyncHandler(async (_req, res) => {
  const rows = await query(`SELECT role_key, permission_key, granted FROM role_permissions ORDER BY permission_key, role_key`);
  ok(res, rows);
}));

router.put('/role-permissions', requireRole('SYSTEM_ADMIN'), asyncHandler(async (req, res) => {
  const { permissions } = req.body;
  if (!Array.isArray(permissions) || permissions.length === 0) throw ApiError.badRequest('permissions required');
  for (const { role_key, permission_key, granted } of permissions) {
    await query(
      `INSERT INTO role_permissions (role_key, permission_key, granted)
       VALUES (:role_key, :permission_key, :granted)
       ON CONFLICT (role_key, permission_key) DO UPDATE SET granted = :granted`,
      { role_key, permission_key, granted: Boolean(granted) }
    );
  }
  await query(
    `INSERT INTO audit_logs (user_id, action, entity_type, changes, ip_address)
     VALUES (:uid, 'ROLE_PERMISSIONS_UPDATED', 'role_permissions', :ch, :ip)`,
    { uid: req.user.userId, ch: JSON.stringify({ count: permissions.length }), ip: req.ip }
  );
  ok(res, { updated: true });
}));

/* ── Force password reset ────────────────────────────────────────────── */
router.post('/users/:id/reset-password', requireRole('SYSTEM_ADMIN'), asyncHandler(async (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 8) throw ApiError.badRequest('Minimum 8 characters required');
  const hash = await bcrypt.hash(newPassword, 12);
  await query(`UPDATE users SET password_hash = :hash, must_change_password = TRUE, updated_at = NOW() WHERE user_id = :id`, { hash, id: req.params.id });
  await query(
    `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address)
     VALUES (:adminId, 'FORCE_PASSWORD_RESET', 'user', :targetId, :ip)`,
    { adminId: req.user.userId, targetId: Number(req.params.id), ip: req.ip }
  );
  ok(res, { reset: true });
}));

export default router;
