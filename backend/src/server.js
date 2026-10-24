// natca-cms backend
import { waitForDb, query } from './config/db.js';
import { ensureSeedAdmin } from './seed/ensureAdmin.js';
import { ensureSeedDriveTests } from './seed/seed_drivetests.js';
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

  // Phase 3: Drive Tests
  await query(`CREATE TABLE IF NOT EXISTS drive_tests (
    drive_test_id   BIGSERIAL PRIMARY KEY,
    operator_id     INT REFERENCES operators(operator_id) ON DELETE SET NULL,
    test_name       VARCHAR(200) NOT NULL,
    test_date       DATE NOT NULL DEFAULT CURRENT_DATE,
    district_id     INT REFERENCES districts(district_id) ON DELETE SET NULL,
    cluster_name    VARCHAR(100),
    technology      VARCHAR(10) NOT NULL DEFAULT '4G',
    device_model    VARCHAR(100),
    tester_name     VARCHAR(100),
    total_samples   INT DEFAULT 0,
    valid_samples   INT DEFAULT 0,
    distance_km     DECIMAL(8,2) DEFAULT 0.0,
    overall_score   DECIMAL(5,2) DEFAULT 0.0,
    pass_rate_pct   DECIMAL(5,2) DEFAULT 0.0,
    status          VARCHAR(30) DEFAULT 'COMPLETED',
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);

  await query(`CREATE TABLE IF NOT EXISTS drive_test_samples (
    sample_id      BIGSERIAL PRIMARY KEY,
    drive_test_id  BIGINT NOT NULL REFERENCES drive_tests(drive_test_id) ON DELETE CASCADE,
    ts             TIMESTAMPTZ,
    latitude       DECIMAL(10,7) NOT NULL,
    longitude      DECIMAL(10,7) NOT NULL,
    rsrp           DECIMAL(6,2),
    rsrq           DECIMAL(6,2),
    sinr           DECIMAL(6,2),
    dl_throughput  DECIMAL(10,2),
    ul_throughput  DECIMAL(10,2),
    pci            INT,
    earfcn         INT,
    call_status    VARCHAR(30)
  )`);

  await query(`CREATE TABLE IF NOT EXISTS drive_test_grid (
    grid_id        BIGSERIAL PRIMARY KEY,
    operator_id    INT REFERENCES operators(operator_id) ON DELETE CASCADE,
    technology     VARCHAR(10) NOT NULL,
    grid_lat       DECIMAL(7,3) NOT NULL,
    grid_lon       DECIMAL(7,3) NOT NULL,
    sample_count   INT DEFAULT 1,
    avg_rsrp       DECIMAL(6,2),
    avg_sinr       DECIMAL(6,2),
    avg_dl_kbps    DECIMAL(10,2),
    is_dead_zone   BOOLEAN DEFAULT FALSE,
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_grid_op_tech_coords UNIQUE(operator_id, technology, grid_lat, grid_lon)
  )`);

  await query(`CREATE TABLE IF NOT EXISTS signal_thresholds (
    threshold_id   SERIAL PRIMARY KEY,
    technology     VARCHAR(10) NOT NULL,
    metric         VARCHAR(30) NOT NULL,
    label          VARCHAR(100) NOT NULL,
    unit           VARCHAR(20),
    pass_value     DECIMAL(10,2) NOT NULL,
    pass_direction VARCHAR(10) NOT NULL DEFAULT 'gte',
    good_min       DECIMAL(10,2),
    fair_min       DECIMAL(10,2),
    poor_min       DECIMAL(10,2),
    weight         DECIMAL(4,3) NOT NULL DEFAULT 0.25,
    is_active      BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE(technology, metric)
  )`);

  // Phase 4: Webhooks and SIM Fraud Alerts
  await query(`CREATE TABLE IF NOT EXISTS operator_webhooks (
    webhook_id    SERIAL PRIMARY KEY,
    operator_id   INT NOT NULL REFERENCES operators(operator_id) ON DELETE CASCADE,
    target_url    VARCHAR(500) NOT NULL,
    secret_key    VARCHAR(255) NOT NULL,
    events        TEXT[] NOT NULL DEFAULT ARRAY['complaint.escalated', 'complaint.sla_warning'],
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);

  await query(`CREATE TABLE IF NOT EXISTS webhook_delivery_logs (
    log_id        BIGSERIAL PRIMARY KEY,
    webhook_id    INT REFERENCES operator_webhooks(webhook_id) ON DELETE CASCADE,
    event_name    VARCHAR(80) NOT NULL,
    payload       JSONB NOT NULL,
    response_code INT,
    response_body TEXT,
    success       BOOLEAN NOT NULL DEFAULT FALSE,
    delivered_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);

  await query(`CREATE TABLE IF NOT EXISTS sim_fraud_alerts (
    alert_id      BIGSERIAL PRIMARY KEY,
    nin           VARCHAR(50) NOT NULL,
    alert_type    VARCHAR(50) NOT NULL,
    severity      VARCHAR(20) NOT NULL DEFAULT 'HIGH',
    total_sims    INT NOT NULL,
    details       JSONB,
    status        VARCHAR(30) NOT NULL DEFAULT 'OPEN',
    resolution_note TEXT,
    resolved_by   BIGINT REFERENCES users(user_id) ON DELETE SET NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);

  // Seed default regulatory thresholds if missing
  await query(`
    INSERT INTO signal_thresholds (technology, metric, label, unit, pass_value, pass_direction, good_min, fair_min, poor_min, weight)
    VALUES
      ('4G', 'rsrp', '4G RSRP (Coverage)', 'dBm', -100.0, 'gte', -90.0, -100.0, -110.0, 0.35),
      ('4G', 'rsrq', '4G RSRQ (Signal Quality)', 'dB', -12.0, 'gte', -10.0, -12.0, -16.0, 0.20),
      ('4G', 'sinr', '4G SINR (Interference)', 'dB', 0.0, 'gte', 10.0, 5.0, 0.0, 0.20),
      ('4G', 'dl_kbps', '4G Downlink Throughput', 'kbps', 10000.0, 'gte', 25000.0, 10000.0, 3000.0, 0.25),
      ('3G', 'rsrp', '3G RSCP (Coverage)', 'dBm', -90.0, 'gte', -75.0, -90.0, -100.0, 0.50),
      ('3G', 'dl_kbps', '3G Downlink Throughput', 'kbps', 2000.0, 'gte', 5000.0, 2000.0, 500.0, 0.50),
      ('2G', 'rsrp', '2G RxLev (Coverage)', 'dBm', -85.0, 'gte', -70.0, -85.0, -95.0, 0.50),
      ('2G', 'rsrq', '2G RxQual (Voice Quality)', 'scale', 3.0, 'lte', 1.0, 3.0, 5.0, 0.50)
    ON CONFLICT (technology, metric) DO NOTHING
  `);

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
  { perm: 'drivetest.view',        roles: ['SYSTEM_ADMIN','NATCA_ADMIN','NATCA_ANALYST','INSPECTOR','OPERATOR_ADMIN'] },
  { perm: 'drivetest.upload',      roles: ['SYSTEM_ADMIN','NATCA_ADMIN','INSPECTOR'] },
  { perm: 'drivetest.manage',      roles: ['SYSTEM_ADMIN','NATCA_ADMIN'] },
  { perm: 'sim.audit',             roles: ['SYSTEM_ADMIN','NATCA_ADMIN','NATCA_ANALYST','INSPECTOR'] },
  { perm: 'webhooks.manage',       roles: ['SYSTEM_ADMIN','NATCA_ADMIN','OPERATOR_ADMIN'] },
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
  await ensureSeedDriveTests();

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
