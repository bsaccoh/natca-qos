import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { query, queryOne } from '../../config/db.js';
import { env } from '../../config/env.js';
import { ApiError } from '../../utils/ApiError.js';
import { sendSms } from '../../services/sms.js';

function signAccess(user) {
  return jwt.sign(
    { sub: user.user_id, role: user.role_key, operatorId: user.operator_id ?? null, email: user.email },
    env.jwt.secret,
    { expiresIn: env.jwt.accessTtl }
  );
}

export async function register({ fullName, email, phone, password, districtId }) {
  if (!phone && !email) throw ApiError.badRequest('Phone or email is required');
  if (!password) throw ApiError.badRequest('Password is required');

  const [citizenRole] = await query(`SELECT role_id FROM roles WHERE role_key = 'CITIZEN'`);
  if (!citizenRole) throw ApiError.badRequest('Roles not seeded');

  const hash = await bcrypt.hash(password, 12);
  const [user] = await query(
    `INSERT INTO users (full_name, email, phone, password_hash, role_id, district_id)
     VALUES (:fullName, :email, :phone, :hash, :roleId, :districtId)
     RETURNING user_id, full_name, email, phone`,
    { fullName, email: email || null, phone: phone || null, hash, roleId: citizenRole.role_id, districtId: districtId || null }
  );

  if (phone) await sendOtp(phone, 'REGISTRATION');
  return { user_id: user.user_id, phone: user.phone, email: user.email, otpSent: !!phone };
}

export async function sendOtp(phone, purpose = 'REGISTRATION') {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const hash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

  await query(
    `INSERT INTO otp_codes (phone, code_hash, purpose, expires_at) VALUES (:phone, :hash, :purpose, :expiresAt)`,
    { phone, hash, purpose, expiresAt }
  );

  await sendSms(phone, `Your NatCA verification code is ${code}. Valid for 10 minutes.`);
  return { sent: true };
}

export async function verifyOtp(phone, code, purpose = 'REGISTRATION') {
  const row = await queryOne(
    `SELECT id, code_hash FROM otp_codes
     WHERE phone = :phone AND purpose = :purpose AND used_at IS NULL AND expires_at > NOW()
     ORDER BY created_at DESC LIMIT 1`,
    { phone, purpose }
  );
  if (!row) throw ApiError.badRequest('OTP expired or not found');

  const valid = await bcrypt.compare(code, row.code_hash);
  if (!valid) throw ApiError.badRequest('Invalid OTP');

  await query(`UPDATE otp_codes SET used_at = NOW() WHERE id = :id`, { id: row.id });
  await query(`UPDATE users SET phone_verified = TRUE, otp_verified = TRUE WHERE phone = :phone`, { phone });
  return { verified: true };
}

export async function login(identifier, password, ctx = {}) {
  const isEmail = identifier.includes('@');
  const user = await queryOne(
    `SELECT u.*, r.role_key FROM users u JOIN roles r ON r.role_id = u.role_id
     WHERE ${isEmail ? 'u.email' : 'u.phone'} = :identifier AND u.is_active = TRUE`,
    { identifier }
  );
  if (!user) throw ApiError.unauthorized('Invalid credentials');

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) throw ApiError.unauthorized('Invalid credentials');

  const accessToken = signAccess(user);
  const raw = randomUUID();
  const refreshHash = await bcrypt.hash(raw, 10);
  const expiresAt = new Date(Date.now() + env.jwt.refreshTtl * 1000);

  const [sess] = await query(
    `INSERT INTO sessions (user_id, refresh_hash, user_agent, ip_address, expires_at)
     VALUES (:userId, :refreshHash, :ua, :ip, :expiresAt) RETURNING session_id`,
    { userId: user.user_id, refreshHash, ua: ctx.userAgent || null, ip: ctx.ip || null, expiresAt }
  );

  await query(`UPDATE users SET last_login_at = NOW() WHERE user_id = :id`, { id: user.user_id });

  return {
    accessToken,
    refreshToken: `${sess.session_id}.${raw}`,
    user: { userId: user.user_id, fullName: user.full_name, email: user.email, phone: user.phone, role: user.role_key, operatorId: user.operator_id },
  };
}

export async function refresh(compositeToken) {
  const dot = compositeToken.lastIndexOf('.');
  const sessionId = compositeToken.slice(0, dot);
  const raw = compositeToken.slice(dot + 1);

  const sess = await queryOne(
    `SELECT s.*, u.user_id FROM sessions s JOIN users u ON u.user_id = s.user_id
     WHERE s.session_id = :sessionId AND s.revoked_at IS NULL AND s.expires_at > NOW()`,
    { sessionId }
  );
  if (!sess) throw ApiError.unauthorized('Refresh token invalid or expired');

  const valid = await bcrypt.compare(raw, sess.refresh_hash);
  if (!valid) throw ApiError.unauthorized('Refresh token mismatch');

  const user = await queryOne(
    `SELECT u.*, r.role_key FROM users u JOIN roles r ON r.role_id = u.role_id WHERE u.user_id = :id`,
    { id: sess.user_id }
  );
  return { accessToken: signAccess(user) };
}

export async function logout(compositeToken) {
  if (!compositeToken) return;
  const dot = compositeToken.lastIndexOf('.');
  const sessionId = compositeToken.slice(0, dot);
  await query(`UPDATE sessions SET revoked_at = NOW() WHERE session_id = :sessionId`, { sessionId });
}

export async function getMe(userId) {
  const user = await queryOne(
    `SELECT u.user_id, u.full_name, u.email, u.phone, u.is_active,
            u.otp_verified, u.phone_verified, u.last_login_at, u.created_at,
            r.role_key AS role, r.name AS role_name,
            o.operator_name, u.operator_id, u.district_id
     FROM users u
     JOIN roles r ON r.role_id = u.role_id
     LEFT JOIN operators o ON o.operator_id = u.operator_id
     WHERE u.user_id = :userId`,
    { userId }
  );
  if (!user) throw ApiError.notFound('User not found');
  return user;
}

export async function updateProfile(userId, { fullName, email, phone }) {
  await query(
    `UPDATE users SET
       full_name   = COALESCE(:fullName, full_name),
       email       = COALESCE(:email, email),
       phone       = COALESCE(:phone, phone),
       updated_at  = NOW()
     WHERE user_id = :userId`,
    { userId, fullName: fullName || null, email: email || null, phone: phone || null }
  );
  return getMe(userId);
}

export async function resetPasswordRequest(phone) {
  const user = await queryOne(`SELECT user_id FROM users WHERE phone = :phone`, { phone });
  if (!user) return { sent: true }; // don't reveal non-existence
  return sendOtp(phone, 'RESET');
}

export async function resetPassword(phone, code, newPassword) {
  await verifyOtp(phone, code, 'RESET');
  const hash = await bcrypt.hash(newPassword, 12);
  await query(`UPDATE users SET password_hash = :hash, updated_at = NOW() WHERE phone = :phone`, { hash, phone });
  return { success: true };
}
