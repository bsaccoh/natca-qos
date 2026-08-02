// natca-cms backend
import { waitForDb } from './config/db.js';
import { ensureSeedAdmin } from './seed/ensureAdmin.js';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { startSlaJob } from './jobs/sla.job.js';

async function main() {
  await waitForDb();
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
