import bcrypt from 'bcryptjs';
import { query } from '../config/db.js';
import { env } from '../config/env.js';

export async function ensureSeedAdmin() {
  const [role] = await query(`SELECT role_id FROM roles WHERE role_key = 'SYSTEM_ADMIN'`);
  if (!role) { console.warn('Roles not seeded yet — skipping admin seed'); return; }

  const existing = await query(`SELECT user_id FROM users WHERE email = :email`, { email: env.seedAdmin.email });
  if (existing.length === 0) {
    const hash = await bcrypt.hash(env.seedAdmin.password, 12);
    await query(
      `INSERT INTO users (full_name, email, password_hash, role_id, otp_verified, phone_verified, is_active)
       VALUES (:name, :email, :hash, :roleId, TRUE, TRUE, TRUE)`,
      { name: env.seedAdmin.name, email: env.seedAdmin.email, hash, roleId: role.role_id }
    );
    console.log(`✓ Admin seeded: ${env.seedAdmin.email}`);
  }

  await ensureOperatorUsers();
}

async function ensureOperatorUsers() {
  const [opRole] = await query(`SELECT role_id FROM roles WHERE role_key = 'OPERATOR_ADMIN'`);
  if (!opRole) return;

  const operators = await query(`SELECT operator_id, operator_name, code FROM operators`);
  for (const op of operators) {
    const email = `${op.code.toLowerCase()}@sl.com`;
    const [exists] = await query(`SELECT user_id FROM users WHERE email = :email`, { email });
    if (exists) continue;

    const hash = await bcrypt.hash('Operator@123', 12);
    await query(
      `INSERT INTO users (full_name, email, password_hash, role_id, operator_id, otp_verified, phone_verified, is_active)
       VALUES (:name, :email, :hash, :roleId, :opId, TRUE, TRUE, TRUE)`,
      { name: `${op.operator_name} Admin`, email, hash, roleId: opRole.role_id, opId: op.operator_id }
    );
    console.log(`✓ Operator user seeded: ${email}`);
  }
}
