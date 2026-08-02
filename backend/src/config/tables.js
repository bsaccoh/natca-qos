import { query } from './db.js';

async function run() {
  try {
    const ussd = await query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'ussd_codes'");
    console.log('--- ussd_codes ---');
    console.log(ussd.map(c => `${c.column_name}: ${c.data_type}`).join('\n'));

    const content = await query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'content_items'");
    console.log('\n--- content_items ---');
    console.log(content.map(c => `${c.column_name}: ${c.data_type}`).join('\n'));

    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
run();
