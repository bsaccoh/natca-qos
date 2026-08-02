import bcrypt from 'bcryptjs';
import { query } from '../config/db.js';
import { env } from '../config/env.js';

export async function ensureSeedAdmin() {
  const [role] = await query(`SELECT role_id FROM roles WHERE role_key = 'SYSTEM_ADMIN'`);
  if (!role) { console.warn('Roles not seeded yet — skipping admin seed'); return; }

  const existing = await query(`SELECT user_id FROM users WHERE email = :email`, { email: env.seedAdmin.email });
  if (existing.length) return;

  const hash = await bcrypt.hash(env.seedAdmin.password, 12);
  await query(
    `INSERT INTO users (full_name, email, password_hash, role_id, otp_verified, phone_verified, is_active)
     VALUES (:name, :email, :hash, :roleId, TRUE, TRUE, TRUE)`,
    { name: env.seedAdmin.name, email: env.seedAdmin.email, hash, roleId: role.role_id }
  );
  console.log(`✓ Admin seeded: ${env.seedAdmin.email}`);
}
