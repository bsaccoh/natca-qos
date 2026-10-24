/**
 * NatCA CMS — Realistic Drive Test Data Seeder
 * Generates field audit telemetry along key Sierra Leone highway and urban corridors:
 * 1. Freetown Urban & East End Corridor (Orange SL - 4G LTE)
 * 2. Waterloo — Masiaka Highway Corridor (Africell - 4G LTE)
 * 3. Masiaka — Mile 91 — Bo City National Trunk (Qcell - 4G LTE)
 */
import { query } from '../config/db.js';
import { ingestDriveTest } from '../modules/drivetest/drivetest.service.js';

// Waypoint interpolation helper
function interpolateWaypoints(waypoints, totalPoints) {
  const points = [];
  const segments = waypoints.length - 1;
  const pointsPerSeg = Math.floor(totalPoints / segments);

  for (let i = 0; i < segments; i++) {
    const start = waypoints[i];
    const end = waypoints[i + 1];
    const segPoints = i === segments - 1 ? totalPoints - points.length : pointsPerSeg;

    for (let j = 0; j < segPoints; j++) {
      const frac = j / segPoints;
      // Linear interpolation + small natural GPS drift
      const lat = start.lat + (end.lat - start.lat) * frac + (Math.random() - 0.5) * 0.0004;
      const lon = start.lon + (end.lon - start.lon) * frac + (Math.random() - 0.5) * 0.0004;

      // Realistic RF conditions based on distance or intentional dead zones
      let rsrp, rsrq, sinr, dlKbps, ulKbps, pci, callStatus;
      const isDeadZone = start.deadZone || (frac > 0.4 && frac < 0.65 && start.hasDeadValley);

      if (isDeadZone) {
        // Severe coverage dead zone (< -110 dBm)
        rsrp = -112.0 - Math.random() * 8.0; // -112 to -120 dBm
        rsrq = -15.0 - Math.random() * 4.0;
        sinr = -2.0 - Math.random() * 4.0;
        dlKbps = 450.0 + Math.random() * 600.0; // < 1 Mbps
        ulKbps = 150.0 + Math.random() * 200.0;
        pci = 104;
        callStatus = Math.random() < 0.35 ? 'CALL_DROP' : 'DEGRADED';
      } else if (start.isRural) {
        // Fair / Marginal rural coverage
        rsrp = -98.0 - Math.random() * 8.0;
        rsrq = -11.0 - Math.random() * 3.0;
        sinr = 2.0 + Math.random() * 5.0;
        dlKbps = 6000.0 + Math.random() * 6000.0;
        ulKbps = 2000.0 + Math.random() * 2000.0;
        pci = 210;
        callStatus = 'CONNECTED';
      } else {
        // Good / Excellent urban coverage
        rsrp = -78.0 - Math.random() * 14.0; // -78 to -92 dBm
        rsrq = -8.0 - Math.random() * 3.0;
        sinr = 8.0 + Math.random() * 12.0;  // 8 to 20 dB
        dlKbps = 22000.0 + Math.random() * 28000.0; // 22 to 50 Mbps
        ulKbps = 8000.0 + Math.random() * 10000.0;
        pci = 352;
        callStatus = 'CONNECTED';
      }

      points.push({
        lat: Number(lat.toFixed(6)),
        lon: Number(lon.toFixed(6)),
        rsrp: Number(rsrp.toFixed(1)),
        rsrq: Number(rsrq.toFixed(1)),
        sinr: Number(sinr.toFixed(1)),
        dlKbps: Math.round(dlKbps),
        ulKbps: Math.round(ulKbps),
        pci,
        callStatus,
      });
    }
  }

  return points;
}

// Builds CSV text string from telemetry points
function buildCsv(points, baseTime) {
  const lines = ['Timestamp,Latitude,Longitude,RSRP,RSRQ,SINR,DL_Throughput,UL_Throughput,PCI,Call_Status'];
  let currentMs = baseTime.getTime();

  for (const p of points) {
    currentMs += 1000 + Math.floor(Math.random() * 500); // 1 to 1.5 seconds per sample
    const tsStr = new Date(currentMs).toISOString();
    lines.push(`${tsStr},${p.lat},${p.lon},${p.rsrp},${p.rsrq},${p.sinr},${p.dlKbps},${p.ulKbps},${p.pci},${p.callStatus}`);
  }

  return lines.join('\n');
}

export async function ensureSeedDriveTests() {
  const [existing] = await query(`SELECT COUNT(*)::int AS cnt FROM drive_tests`);
  if (existing.cnt > 0) {
    console.log(`✓ Drive tests already exist (${existing.cnt} sessions) — skipping seed`);
    return;
  }

  console.log('⚙ Seeding realistic Sierra Leone Drive Test audit corridors...');

  const operators = await query(`SELECT operator_id, code, operator_name FROM operators`);
  const orange = operators.find((o) => o.code === 'ORANGE') || operators[0];
  const africell = operators.find((o) => o.code === 'AFRICELL') || operators[1] || operators[0];
  const qcell = operators.find((o) => o.code === 'QCELL') || operators[2] || operators[0];

  const [freetownDist] = await query(`SELECT district_id FROM districts WHERE name = 'Freetown'`);
  const [ruralDist]    = await query(`SELECT district_id FROM districts WHERE name = 'Western Rural'`);
  const [boDist]       = await query(`SELECT district_id FROM districts WHERE name = 'Bo'`);

  // ── Corridor 1: Freetown Urban & Eastern Bypass (Orange SL) ───────────────────
  const freetownWaypoints = [
    { lat: 8.4870, lon: -13.2750, isRural: false }, // Lumley Beach / Aberdeen
    { lat: 8.4790, lon: -13.2500, isRural: false }, // Congo Cross
    { lat: 8.4680, lon: -13.2350, hasDeadValley: true }, // Hill Station valley dip (dead zone)
    { lat: 8.4840, lon: -13.2340, isRural: false }, // Cotton Tree Downtown
    { lat: 8.4750, lon: -13.2050, isRural: false }, // Kissy Road
    { lat: 8.4550, lon: -13.1700, isRural: false }, // Wellington Industrial
  ];

  const freetownPoints = interpolateWaypoints(freetownWaypoints, 240);
  const freetownCsv = buildCsv(freetownPoints, new Date(Date.now() - 4 * 86400000));

  await ingestDriveTest({
    operatorId: orange?.operator_id,
    testName: 'Freetown_Peninsula_4G_Regulatory_Audit',
    technology: '4G',
    districtId: freetownDist?.district_id,
    clusterName: 'Western_Urban_CL01',
    deviceModel: 'R&S TSMW / Nemo Outdoor',
    testerName: 'Ing. M. Kamara (NatCA)',
    notes: 'Q3 statutory benchmark. Moderate congestion observed at Kissy Road; dead zone identified around Hill Station cut.',
    fileContent: freetownCsv,
  });
  console.log('✓ Ingested Freetown 4G Audit (Orange SL)');

  // ── Corridor 2: Waterloo — Songo — Masiaka Highway (Africell) ─────────────────
  const highwayWaypoints = [
    { lat: 8.3380, lon: -13.0710, isRural: false }, // Waterloo Market
    { lat: 8.3550, lon: -13.0100, isRural: true },  // Newton
    { lat: 8.3820, lon: -12.9200, deadZone: true }, // Songo Forest gap (dead zone)
    { lat: 8.4500, lon: -12.8200, isRural: true },  // Okra Hill
    { lat: 8.5170, lon: -12.7560, isRural: false }, // Masiaka Junction
  ];

  const highwayPoints = interpolateWaypoints(highwayWaypoints, 280);
  const highwayCsv = buildCsv(highwayPoints, new Date(Date.now() - 2 * 86400000));

  await ingestDriveTest({
    operatorId: africell?.operator_id,
    testName: 'Waterloo_Masiaka_Highway_Corridor_Audit',
    technology: '4G',
    districtId: ruralDist?.district_id,
    clusterName: 'Western_Rural_Corridor',
    deviceModel: 'Anite / SwissQual DriveKit',
    testerName: 'Ing. A. Sesay (NatCA)',
    notes: 'Trunk highway audit. Songo forest valley exhibits RSRP < -112 dBm. Operator mandate required for fill-in microcell.',
    fileContent: highwayCsv,
  });
  console.log('✓ Ingested Waterloo-Masiaka Highway Audit (Africell)');

  // ── Corridor 3: Masiaka — Mile 91 — Bo Trunk Corridor (Qcell) ─────────────────
  const boWaypoints = [
    { lat: 8.5170, lon: -12.7560, isRural: false }, // Masiaka Town
    { lat: 8.4900, lon: -12.4400, isRural: false }, // Mile 91 Junction
    { lat: 8.3200, lon: -12.3500, deadZone: true }, // Bradford rural valley (severe dead zone)
    { lat: 8.1600, lon: -12.2400, isRural: true },  // Moyamba Junction
    { lat: 8.0400, lon: -11.9500, isRural: true },  // Gerihun
    { lat: 7.9640, lon: -11.7380, isRural: false }, // Bo City Clocktower
  ];

  const boPoints = interpolateWaypoints(boWaypoints, 320);
  const boCsv = buildCsv(boPoints, new Date(Date.now() - 1 * 86400000));

  await ingestDriveTest({
    operatorId: qcell?.operator_id,
    testName: 'Mile91_Bo_Highway_Southern_Trunk_Audit',
    technology: '4G',
    districtId: boDist?.district_id,
    clusterName: 'Southern_Trunk_Bo',
    deviceModel: 'TEMS Investigation 24',
    testerName: 'Ing. B. Koroma (NatCA)',
    notes: 'Southern trunk road audit. Town coverage in Bo is good (35 Mbps); rural gaps flagged between Mile 91 and Moyamba Junction.',
    fileContent: boCsv,
  });
  console.log('✓ Ingested Mile 91 — Bo Trunk Audit (Qcell)');

  console.log('✓ All Drive Test seed corridors ingested successfully');
}

// Allow direct CLI execution
if (process.argv[1]?.endsWith('seed_drivetests.js')) {
  import('../config/db.js').then(async ({ waitForDb }) => {
    await waitForDb();
    await ensureSeedDriveTests();
    process.exit(0);
  }).catch((err) => {
    console.error('Seed drive tests failed:', err);
    process.exit(1);
  });
}
