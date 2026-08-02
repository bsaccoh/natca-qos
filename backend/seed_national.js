import { query } from './src/config/db.js';
async function seed() {
  try {
    const ops = await query("SELECT * FROM operators WHERE operator_name = 'National'");
    let opId;
    if (ops.length > 0) {
      opId = ops[0].operator_id;
    } else {
      const [opResult] = await query(
        "INSERT INTO operators (operator_name, code, hotline, status) VALUES (:opName, :opCode, :opHotline, :opStatus) RETURNING operator_id",
        { opName: 'National', opCode: 'NAT', opHotline: '111', opStatus: 'ACTIVE' }
      );
      opId = opResult.operator_id;
      console.log('Inserted National operator with ID:', opId);
    }

    const codes = [
      { code: '111', desc: 'National — Customer Care / NatCA Complaint Portal', cat: 'SUPPORT' },
      { code: '117', desc: 'National — Health Emergency Line', cat: 'EMERGENCY' },
      { code: '119', desc: 'National — Police Emergency Line', cat: 'EMERGENCY' },
      { code: '123', desc: 'National — SL Armed Forces Security Line', cat: 'EMERGENCY' },
      { code: '300', desc: 'National — Fire Force Emergency Line', cat: 'EMERGENCY' },
      { code: '999', desc: 'National — Disaster Response Helpline', cat: 'EMERGENCY' },
      { code: '5050', desc: 'National — Citizen Toll Free Hotline', cat: 'SUPPORT' }
    ];

    for (const c of codes) {
      await query(
        "INSERT INTO ussd_codes (operator_id, code, description, service_category, is_active) VALUES (:opId, :code, :desc, :cat, TRUE)",
        { opId, code: c.code, desc: c.desc, cat: c.cat }
      );
      console.log('Inserted:', c.code);
    }
  } catch (err) {
    console.error('Seeding error:', err);
  }
}
seed().finally(() => process.exit(0));
