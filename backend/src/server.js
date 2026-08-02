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
  console.log('✓ Migrations applied');
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
