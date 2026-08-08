// natca-cms backend
import { waitForDb, query } from './config/db.js';
import { ensureSeedAdmin } from './seed/ensureAdmin.js';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { startSlaJob } from './jobs/sla.job.js';

async function runMigrations() {
  await query(`ALTER TABLE complaints ADD COLUMN IF NOT EXISTS contact_name  VARCHAR(120)`);
  await query(`ALTER TABLE complaints ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(30)`);
  await query(`ALTER TABLE complaints ADD COLUMN IF NOT EXISTS contact_email VARCHAR(120)`);
  await query(`ALTER TABLE complaints ADD COLUMN IF NOT EXISTS network_diagnostics JSONB`);

  await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE`);

  await query(`CREATE TABLE IF NOT EXISTS role_permissions (
    id              SERIAL PRIMARY KEY,
    role_key        VARCHAR(50) NOT NULL,
    permission_key  VARCHAR(80) NOT NULL,
    granted         BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (role_key, permission_key)
  )`);

  await seedPermissions();
  console.log('✓ Migrations applied');
}

const DEFAULT_PERMISSIONS = [
  { perm: 'complaints.view',       roles: ['SYSTEM_ADMIN','NATCA_ADMIN','NATCA_ANALYST','INSPECTOR','OPERATOR_ADMIN'] },
  { perm: 'complaints.manage',     roles: ['SYSTEM_ADMIN','NATCA_ADMIN','NATCA_ANALYST','INSPECTOR','OPERATOR_ADMIN'] },
  { perm: 'complaints.assign',     roles: ['SYSTEM_ADMIN','NATCA_ADMIN','NATCA_ANALYST'] },
  { perm: 'complaints.export',     roles: ['SYSTEM_ADMIN','NATCA_ADMIN','NATCA_ANALYST'] },
  { perm: 'kyc.view',              roles: ['SYSTEM_ADMIN','NATCA_ADMIN','NATCA_ANALYST','OPERATOR_ADMIN'] },
  { perm: 'kyc.approve',           roles: ['SYSTEM_ADMIN','NATCA_ADMIN','NATCA_ANALYST'] },
  { perm: 'analytics.view',        roles: ['SYSTEM_ADMIN','NATCA_ADMIN','NATCA_ANALYST','OPERATOR_ADMIN'] },
  { perm: 'analytics.speed',       roles: ['SYSTEM_ADMIN','NATCA_ADMIN','NATCA_ANALYST','OPERATOR_ADMIN'] },
  { perm: 'analytics.benchmark',   roles: ['SYSTEM_ADMIN','NATCA_ADMIN'] },
  { perm: 'network.view',          roles: ['SYSTEM_ADMIN','NATCA_ADMIN','NATCA_ANALYST','INSPECTOR'] },
  { perm: 'network.manage',        roles: ['SYSTEM_ADMIN','NATCA_ADMIN'] },
  { perm: 'content.manage',        roles: ['SYSTEM_ADMIN','NATCA_ADMIN'] },
  { perm: 'content.ussd',          roles: ['SYSTEM_ADMIN','NATCA_ADMIN'] },
  { perm: 'content.tariffs',       roles: ['SYSTEM_ADMIN','NATCA_ADMIN'] },
  { perm: 'admin.operators',       roles: ['SYSTEM_ADMIN','NATCA_ADMIN'] },
  { perm: 'admin.users',           roles: ['SYSTEM_ADMIN','NATCA_ADMIN'] },
  { perm: 'security.audit',        roles: ['SYSTEM_ADMIN','NATCA_ADMIN'] },
  { perm: 'security.sessions',     roles: ['SYSTEM_ADMIN'] },
  { perm: 'security.settings',     roles: ['SYSTEM_ADMIN'] },
  { perm: 'security.reset_pw',     roles: ['SYSTEM_ADMIN'] },
  { perm: 'security.suspend',      roles: ['SYSTEM_ADMIN','NATCA_ADMIN'] },
  { perm: 'citizen.submit',        roles: ['CITIZEN'] },
  { perm: 'citizen.track',         roles: ['CITIZEN'] },
];

const ALL_ROLES = ['SYSTEM_ADMIN','NATCA_ADMIN','NATCA_ANALYST','INSPECTOR','OPERATOR_ADMIN','CITIZEN'];

async function seedPermissions() {
  const [existing] = await query(`SELECT COUNT(*)::int AS cnt FROM role_permissions`);
  if (existing.cnt > 0) return;
  for (const { perm, roles } of DEFAULT_PERMISSIONS) {
    for (const role of ALL_ROLES) {
      await query(
        `INSERT INTO role_permissions (role_key, permission_key, granted)
         VALUES (:role, :perm, :granted) ON CONFLICT DO NOTHING`,
        { role, perm, granted: roles.includes(role) }
      );
    }
  }
  console.log('✓ Role permissions seeded');
}

async function main() {
  await waitForDb();
  await runMigrations();
  await ensureSeedAdmin();

  const { app, httpServer } = createApp();
  const io = app.get('io');
  
  startSlaJob(io);

  httpServer.listen(env.port, () => {
    console.log(`✓ NatCA CMS API running on http://localhost:${env.port}`);
    console.log(`  ENV: ${env.nodeEnv}`);
  });
}

main().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
