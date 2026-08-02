import { query } from '../../config/db.js';

export async function submitSpeedTest({
  userId, operatorId, districtId, latitude, longitude,
  networkType, downloadMbps, uploadMbps, pingMs, jitterMs, packetLossPct, cellId, source = 'WEB'
}) {
  const [row] = await query(
    `INSERT INTO speed_tests (
       user_id, operator_id, district_id, latitude, longitude,
       network_type, download_mbps, upload_mbps, ping_ms, jitter_ms, packet_loss_pct, cell_id, source
     ) VALUES (
       :userId, :operatorId, :districtId, :latitude, :longitude,
       :networkType, :downloadMbps, :uploadMbps, :pingMs, :jitterMs, :packetLossPct, :cellId, :source
     ) RETURNING test_id`,
    {
      userId: userId || null, operatorId: operatorId || null, districtId: districtId || null,
      latitude: latitude || null, longitude: longitude || null,
      networkType: networkType || null, downloadMbps, uploadMbps, pingMs,
      jitterMs: jitterMs || null, packetLossPct: packetLossPct || null, cellId: cellId || null, source
    }
  );
  return { test_id: row.test_id };
}

export async function getOperatorComparison() {
  return query(`
    SELECT COALESCE(o.operator_name, 'Unknown') AS operator,
           COUNT(*) AS total_tests,
           AVG(download_mbps) AS avg_download,
           AVG(upload_mbps) AS avg_upload,
           AVG(ping_ms) AS avg_ping
    FROM speed_tests s
    LEFT JOIN operators o ON o.operator_id = s.operator_id
    GROUP BY o.operator_name
    ORDER BY avg_download DESC
  `);
}

export async function listTests({ operatorId, districtId, networkType, limit = 50, offset = 0 } = {}) {
  const conds = ['1=1'];
  const params = {};
  if (operatorId)  { conds.push('s.operator_id = :operatorId'); params.operatorId = operatorId; }
  if (districtId)  { conds.push('s.district_id = :districtId'); params.districtId = districtId; }
  if (networkType) { conds.push('s.network_type = :networkType'); params.networkType = networkType; }
  
  const where = conds.join(' AND ');
  params.limit = Number(limit);
  params.offset = Number(offset);

  const [rows, [{ total }]] = await Promise.all([
    query(`
      SELECT s.*, o.operator_name, d.name AS district
      FROM speed_tests s
      LEFT JOIN operators o ON o.operator_id = s.operator_id
      LEFT JOIN districts d ON d.district_id = s.district_id
      WHERE ${where}
      ORDER BY s.created_at DESC
      LIMIT :limit OFFSET :offset
    `, params),
    query(`SELECT COUNT(*) AS total FROM speed_tests s WHERE ${where}`, params)
  ]);

  return { rows, total: Number(total) };
}

export async function getHistorical(days = 30) {
  return query(`
    SELECT TO_CHAR(DATE(s.created_at), 'DD Mon') AS date,
           COALESCE(o.operator_name, 'Unknown') AS operator,
           AVG(s.download_mbps) AS avg_download,
           AVG(s.upload_mbps) AS avg_upload
    FROM speed_tests s
    LEFT JOIN operators o ON o.operator_id = s.operator_id
    WHERE s.created_at >= NOW() - INTERVAL '${Number(days)} days'
    GROUP BY DATE(s.created_at), o.operator_name
    ORDER BY DATE(s.created_at) ASC
  `);
}

export async function getDistrictAverages() {
  return query(`
    SELECT d.name AS district,
           AVG(s.download_mbps) AS avg_download,
           AVG(s.upload_mbps) AS avg_upload,
           AVG(s.ping_ms) AS avg_ping,
           COUNT(*) AS total_tests
    FROM speed_tests s
    JOIN districts d ON d.district_id = s.district_id
    GROUP BY d.name
    ORDER BY avg_download DESC
  `);
}

export async function getPeakAnalysis() {
  return query(`
    SELECT EXTRACT(HOUR FROM s.created_at) AS hour_of_day,
           AVG(s.download_mbps) AS avg_download,
           AVG(s.ping_ms) AS avg_ping,
           COUNT(*) AS total_tests
    FROM speed_tests s
    GROUP BY EXTRACT(HOUR FROM s.created_at)
    ORDER BY hour_of_day ASC
  `);
}

export async function getMapData() {
  return query(`
    SELECT s.test_id, s.latitude, s.longitude, s.download_mbps, s.upload_mbps, s.ping_ms,
           COALESCE(o.operator_name, 'Unknown') AS operator_name
    FROM speed_tests s
    LEFT JOIN operators o ON o.operator_id = s.operator_id
    WHERE s.latitude IS NOT NULL AND s.longitude IS NOT NULL
  `);
}
