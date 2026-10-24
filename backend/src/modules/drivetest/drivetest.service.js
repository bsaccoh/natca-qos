/**
 * NatCA CMS — Drive Test Ingestion & QoS Performance Analytics Service
 */
import { query, queryOne, withTransaction } from '../../config/db.js';
import { ApiError } from '../../utils/ApiError.js';
import { getThresholds, passes } from './thresholds.service.js';

// Haversine distance between two coordinates in kilometers
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Robust CSV row parser handling quotes and delimiters
export function parseCsvRows(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const delimiter = lines[0].includes('\t') ? '\t' : (lines[0].includes(';') ? ';' : ',');
  const rawHeaders = lines[0].split(delimiter).map((h) => h.trim().replace(/^["']|["']$/g, '').toLowerCase());

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Simple split preserving standard values
    const parts = line.split(delimiter).map((p) => p.trim().replace(/^["']|["']$/g, ''));
    const obj = {};
    for (let j = 0; j < rawHeaders.length; j++) {
      obj[rawHeaders[j]] = parts[j] !== undefined ? parts[j] : '';
    }
    rows.push(obj);
  }
  return rows;
}

// Helper to extract numeric value safely keeping 0
function toNum(val) {
  if (val === null || val === undefined || val === '') return null;
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
}

export async function ingestDriveTest({
  operatorId,
  testName,
  technology = '4G',
  districtId = null,
  clusterName = null,
  deviceModel = null,
  testerName = null,
  notes = null,
  fileContent, // string (CSV)
}) {
  const rows = parseCsvRows(fileContent);
  if (!rows || rows.length === 0) {
    throw ApiError.badRequest('No valid data rows found in uploaded file');
  }

  // Find column mapping dynamically
  const sample = rows[0];
  const keys = Object.keys(sample);

  const findKey = (patterns) => keys.find((k) => patterns.some((p) => k === p || k.includes(p)));

  const latKey   = findKey(['latitude', 'lat', 'gps_lat', 'y']);
  const lonKey   = findKey(['longitude', 'lon', 'long', 'lng', 'gps_lon', 'x']);
  const rsrpKey  = findKey(['rsrp', 'rxlev', 'rscp', 'signal_strength', 'ss']);
  const rsrqKey  = findKey(['rsrq', 'rxqual', 'quality']);
  const sinrKey  = findKey(['sinr', 'snr', 'cinr']);
  const dlKey    = findKey(['dl_throughput', 'dl', 'downlink', 'data_rate', 'throughput_dl']);
  const ulKey    = findKey(['ul_throughput', 'ul', 'uplink', 'throughput_ul']);
  const pciKey   = findKey(['pci', 'psc', 'cell_id']);
  const earfcnKey= findKey(['earfcn', 'arfcn', 'uarfcn']);
  const tsKey    = findKey(['timestamp', 'time', 'ts', 'date_time']);
  const eventKey = findKey(['call_status', 'event_type', 'event', 'status']);

  if (!latKey || !lonKey) {
    throw ApiError.badRequest('CSV must contain Latitude and Longitude columns');
  }

  const thresholds = await getThresholds(technology);

  // Filter and normalize samples
  const validSamples = [];
  let prevLat = null;
  let prevLon = null;
  let totalDistanceKm = 0;
  let passCount = 0;

  for (const r of rows) {
    const lat = toNum(r[latKey]);
    const lon = toNum(r[lonKey]);

    // Skip missing or (0,0) coordinates
    if (lat === null || lon === null || (Math.abs(lat) < 0.001 && Math.abs(lon) < 0.001)) {
      continue;
    }

    const rsrp = rsrpKey ? toNum(r[rsrpKey]) : null;
    const rsrq = rsrqKey ? toNum(r[rsrqKey]) : null;
    const sinr = sinrKey ? toNum(r[sinrKey]) : null;
    const dl   = dlKey ? toNum(r[dlKey]) : null;
    const ul   = ulKey ? toNum(r[ulKey]) : null;
    const pci  = pciKey ? parseInt(r[pciKey], 10) || null : null;
    const earfcn = earfcnKey ? parseInt(r[earfcnKey], 10) || null : null;
    const callStatus = eventKey ? (r[eventKey] || null) : null;
    const ts = tsKey && r[tsKey] ? new Date(r[tsKey]) : new Date();

    // Distance calculation
    if (prevLat !== null && prevLon !== null) {
      const d = haversineKm(prevLat, prevLon, lat, lon);
      // Filter GPS jumps (> 5km per second)
      if (d < 5.0) {
        totalDistanceKm += d;
      }
    }
    prevLat = lat;
    prevLon = lon;

    // Evaluate compliance against regulatory thresholds
    let samplePasses = true;
    if (thresholds.rsrp && rsrp !== null) {
      if (!passes(thresholds.rsrp, rsrp)) samplePasses = false;
    }
    if (thresholds.sinr && sinr !== null) {
      if (!passes(thresholds.sinr, sinr)) samplePasses = false;
    }
    if (thresholds.dl_kbps && dl !== null) {
      if (!passes(thresholds.dl_kbps, dl)) samplePasses = false;
    }

    if (samplePasses) passCount++;

    validSamples.push({
      ts: isNaN(ts.getTime()) ? new Date() : ts,
      lat,
      lon,
      rsrp,
      rsrq,
      sinr,
      dl_throughput: dl,
      ul_throughput: ul,
      pci,
      earfcn,
      call_status: callStatus,
      is_pass: samplePasses,
    });
  }

  if (validSamples.length === 0) {
    throw ApiError.badRequest('No valid GPS coordinate samples found in file');
  }

  const passRatePct = Number(((passCount / validSamples.length) * 100).toFixed(2));
  const overallScore = passRatePct; // Primary compliance index

  return withTransaction(async ({ q }) => {
    // 1. Insert drive_tests master row
    const [test] = await q(
      `INSERT INTO drive_tests (
         operator_id, test_name, test_date, district_id, cluster_name,
         technology, device_model, tester_name, total_samples, valid_samples,
         distance_km, overall_score, pass_rate_pct, status, notes
       ) VALUES (
         :operatorId, :testName, NOW(), :districtId, :clusterName,
         :technology, :deviceModel, :testerName, :totalSamples, :validSamples,
         :distanceKm, :overallScore, :passRatePct, 'COMPLETED', :notes
       ) RETURNING *`,
      {
        operatorId: operatorId || null,
        testName,
        districtId: districtId || null,
        clusterName: clusterName || 'National_Audit',
        technology,
        deviceModel: deviceModel || 'Standard Reg Scanner',
        testerName: testerName || 'NatCA Inspector',
        totalSamples: rows.length,
        validSamples: validSamples.length,
        distanceKm: Number(totalDistanceKm.toFixed(2)),
        overallScore,
        passRatePct,
        notes: notes || null,
      }
    );

    const testId = test.drive_test_id;

    // 2. Batch insert samples (chunks of 500)
    const CHUNK_SIZE = 500;
    for (let i = 0; i < validSamples.length; i += CHUNK_SIZE) {
      const chunk = validSamples.slice(i, i + CHUNK_SIZE);
      for (const s of chunk) {
        await q(
          `INSERT INTO drive_test_samples (
             drive_test_id, ts, latitude, longitude, rsrp, rsrq, sinr,
             dl_throughput, ul_throughput, pci, earfcn, call_status
           ) VALUES (
             :testId, :ts, :lat, :lon, :rsrp, :rsrq, :sinr,
             :dl, :ul, :pci, :earfcn, :callStatus
           )`,
          {
            testId,
            ts: s.ts,
            lat: s.lat,
            lon: s.lon,
            rsrp: s.rsrp,
            rsrq: s.rsrq,
            sinr: s.sinr,
            dl: s.dl_throughput,
            ul: s.ul_throughput,
            pci: s.pci,
            earfcn: s.earfcn,
            callStatus: s.call_status,
          }
        );
      }
    }

    // 3. Pre-aggregate into drive_test_grid (~100m grid tiles)
    if (operatorId) {
      const gridMap = new Map();
      for (const s of validSamples) {
        const gridLat = Number(s.lat.toFixed(3));
        const gridLon = Number(s.lon.toFixed(3));
        const key = `${gridLat},${gridLon}`;

        if (!gridMap.has(key)) {
          gridMap.set(key, { gridLat, gridLon, count: 0, sumRsrp: 0, sumSinr: 0, sumDl: 0, deadCount: 0 });
        }
        const g = gridMap.get(key);
        g.count++;
        if (s.rsrp !== null) g.sumRsrp += s.rsrp;
        if (s.sinr !== null) g.sumSinr += s.sinr;
        if (s.dl_throughput !== null) g.sumDl += s.dl_throughput;
        if (s.rsrp !== null && s.rsrp < (thresholds.rsrp?.poor_min ?? -110)) {
          g.deadCount++;
        }
      }

      for (const g of gridMap.values()) {
        const avgRsrp = g.count > 0 ? Number((g.sumRsrp / g.count).toFixed(2)) : null;
        const avgSinr = g.count > 0 ? Number((g.sumSinr / g.count).toFixed(2)) : null;
        const avgDl   = g.count > 0 ? Number((g.sumDl / g.count).toFixed(2)) : null;
        const isDead  = avgRsrp !== null && avgRsrp < (thresholds.rsrp?.poor_min ?? -110);

        await q(
          `INSERT INTO drive_test_grid (
             operator_id, technology, grid_lat, grid_lon, sample_count,
             avg_rsrp, avg_sinr, avg_dl_kbps, is_dead_zone, updated_at
           ) VALUES (
             :operatorId, :technology, :gridLat, :gridLon, :count,
             :avgRsrp, :avgSinr, :avgDl, :isDead, NOW()
           )
           ON CONFLICT (operator_id, technology, grid_lat, grid_lon) DO UPDATE SET
             sample_count = drive_test_grid.sample_count + EXCLUDED.sample_count,
             avg_rsrp     = (drive_test_grid.avg_rsrp + EXCLUDED.avg_rsrp) / 2,
             avg_sinr     = COALESCE((drive_test_grid.avg_sinr + EXCLUDED.avg_sinr) / 2, EXCLUDED.avg_sinr),
             avg_dl_kbps  = COALESCE((drive_test_grid.avg_dl_kbps + EXCLUDED.avg_dl_kbps) / 2, EXCLUDED.avg_dl_kbps),
             is_dead_zone = EXCLUDED.is_dead_zone,
             updated_at   = NOW()`,
          {
            operatorId,
            technology,
            gridLat: g.gridLat,
            gridLon: g.gridLon,
            count: g.count,
            avgRsrp,
            avgSinr,
            avgDl,
            isDead,
          }
        );
      }
    }

    return {
      testId,
      testName,
      technology,
      validSamples: validSamples.length,
      distanceKm: totalDistanceKm.toFixed(2),
      overallScore,
      passRatePct,
    };
  });
}

export async function listDriveTests({ operatorId, districtId, limit = 50, offset = 0 } = {}) {
  const conds = ['1=1'];
  const params = {};

  if (operatorId) { conds.push('dt.operator_id = :operatorId'); params.operatorId = operatorId; }
  if (districtId) { conds.push('dt.district_id = :districtId'); params.districtId = districtId; }

  const where = conds.join(' AND ');
  params.limit = Number(limit);
  params.offset = Number(offset);

  const [rows, [{ total }]] = await Promise.all([
    query(
      `SELECT dt.*, o.operator_name, d.name AS district_name
       FROM drive_tests dt
       LEFT JOIN operators o ON o.operator_id = dt.operator_id
       LEFT JOIN districts d ON d.district_id = dt.district_id
       WHERE ${where}
       ORDER BY dt.created_at DESC
       LIMIT :limit OFFSET :offset`,
      params
    ),
    query(`SELECT COUNT(*) AS total FROM drive_tests dt WHERE ${where}`, params),
  ]);

  return { rows, total: Number(total) };
}

export async function getDriveTestDetails(driveTestId) {
  const test = await queryOne(
    `SELECT dt.*, o.operator_name, d.name AS district_name
     FROM drive_tests dt
     LEFT JOIN operators o ON o.operator_id = dt.operator_id
     LEFT JOIN districts d ON d.district_id = dt.district_id
     WHERE dt.drive_test_id = :driveTestId`,
    { driveTestId }
  );

  if (!test) throw ApiError.notFound('Drive test session not found');

  const [stats] = await query(
    `SELECT 
       COUNT(*) AS sample_count,
       AVG(rsrp) AS avg_rsrp,
       MIN(rsrp) AS min_rsrp,
       MAX(rsrp) AS max_rsrp,
       AVG(sinr) AS avg_sinr,
       AVG(dl_throughput) AS avg_dl_kbps,
       AVG(ul_throughput) AS avg_ul_kbps
     FROM drive_test_samples
     WHERE drive_test_id = :driveTestId`,
    { driveTestId }
  );

  const samples = await query(
    `SELECT sample_id, ts, latitude, longitude, rsrp, rsrq, sinr, dl_throughput, pci, call_status
     FROM drive_test_samples
     WHERE drive_test_id = :driveTestId
     ORDER BY sample_id ASC
     LIMIT 2000`,
    { driveTestId }
  );

  return {
    ...test,
    stats: {
      ...stats,
      avg_rsrp: stats.avg_rsrp ? Number(stats.avg_rsrp).toFixed(2) : null,
      avg_sinr: stats.avg_sinr ? Number(stats.avg_sinr).toFixed(2) : null,
      avg_dl_kbps: stats.avg_dl_kbps ? Number(stats.avg_dl_kbps).toFixed(2) : null,
    },
    samples,
  };
}

export async function getHeatmapTiles({ operatorId, technology = '4G', isDeadZone } = {}) {
  const conds = ['1=1'];
  const params = {};

  if (operatorId) { conds.push('operator_id = :operatorId'); params.operatorId = operatorId; }
  if (technology) { conds.push('technology = :technology'); params.technology = technology; }
  if (isDeadZone !== undefined) { conds.push('is_dead_zone = :isDeadZone'); params.isDeadZone = isDeadZone; }

  const where = conds.join(' AND ');
  return query(
    `SELECT grid_id, operator_id, technology, grid_lat, grid_lon, sample_count, avg_rsrp, avg_sinr, avg_dl_kbps, is_dead_zone
     FROM drive_test_grid
     WHERE ${where}
     ORDER BY sample_count DESC
     LIMIT 5000`,
    params
  );
}

export async function getBlackspots({ operatorId, limit = 50 } = {}) {
  const params = { limit: Number(limit) };
  let opClause = '';
  if (operatorId) {
    opClause = 'AND g.operator_id = :operatorId';
    params.operatorId = operatorId;
  }

  return query(
    `SELECT g.*, o.operator_name
     FROM drive_test_grid g
     JOIN operators o ON o.operator_id = g.operator_id
     WHERE g.is_dead_zone = TRUE ${opClause}
     ORDER BY g.avg_rsrp ASC
     LIMIT :limit`,
    params
  );
}
