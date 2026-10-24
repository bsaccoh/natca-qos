import { query } from '../../config/db.js';

export async function getOverview({ dateFrom, dateTo, operatorId } = {}) {
  const conds = ['1=1'];
  const params = {};
  if (dateFrom) {
    conds.push('c.created_at >= :dateFrom');
    params.dateFrom = dateFrom;
  }
  if (dateTo) {
    conds.push("c.created_at <= (:dateTo::text || ' 23:59:59')::timestamp");
    params.dateTo = dateTo;
  }
  if (operatorId) {
    conds.push('c.operator_id = :operatorId');
    params.operatorId = operatorId;
  }
  const where = conds.join(' AND ');

  const [complaints] = await query(`
    SELECT COUNT(*) AS total,
           SUM(CASE WHEN c.status = 'NEW' THEN 1 ELSE 0 END) AS pending,
           SUM(CASE WHEN c.status IN ('RESOLVED','CLOSED') THEN 1 ELSE 0 END) AS resolved,
           SUM(CASE WHEN c.sla_deadline < NOW() AND c.status NOT IN ('RESOLVED','CLOSED') THEN 1 ELSE 0 END) AS breached
    FROM complaints c
    WHERE ${where}
  `, params);

  const kycConds = ['1=1'];
  const kycParams = {};
  if (dateFrom) { kycConds.push('k.created_at >= :dateFrom'); kycParams.dateFrom = dateFrom; }
  if (dateTo) { kycConds.push("k.created_at <= (:dateTo::text || ' 23:59:59')::timestamp"); kycParams.dateTo = dateTo; }
  if (operatorId) { kycConds.push('k.operator_id = :operatorId'); kycParams.operatorId = operatorId; }
  const kycWhere = kycConds.join(' AND ');

  const [kyc] = await query(`
    SELECT COUNT(*) AS total,
           SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) AS pending,
           SUM(CASE WHEN status = 'APPROVED' THEN 1 ELSE 0 END) AS approved,
           SUM(CASE WHEN status = 'REJECTED' THEN 1 ELSE 0 END) AS rejected
    FROM kyc_submissions k
    WHERE ${kycWhere}
  `, kycParams);

  const [users] = await query(`
    SELECT COUNT(*) AS total,
           SUM(CASE WHEN operator_id IS NOT NULL THEN 1 ELSE 0 END) AS operator_staff,
           SUM(CASE WHEN operator_id IS NULL THEN 1 ELSE 0 END) AS citizens
    FROM users
  `);

  const trend = await query(`
    SELECT DATE(c.created_at) AS day,
           COUNT(*) AS total,
           SUM(CASE WHEN c.status IN ('RESOLVED','CLOSED') THEN 1 ELSE 0 END) AS resolved
    FROM complaints c
    WHERE ${where}
    GROUP BY day ORDER BY day
  `, params);

  const operators = await query(`
    SELECT COALESCE(o.operator_name, 'Unknown') AS name, COUNT(c.complaint_id) AS complaints
    FROM complaints c
    LEFT JOIN operators o ON o.operator_id = c.operator_id
    WHERE ${where}
    GROUP BY o.operator_name ORDER BY complaints DESC
  `, params);

  return {
    complaints: {
      total: Number(complaints?.total || 0),
      pending: Number(complaints?.pending || 0),
      resolved: Number(complaints?.resolved || 0),
      breached: Number(complaints?.breached || 0),
    },
    kyc: {
      total: Number(kyc?.total || 0),
      pending: Number(kyc?.pending || 0),
      approved: Number(kyc?.approved || 0),
      rejected: Number(kyc?.rejected || 0),
    },
    users: {
      total: Number(users?.total || 0),
      operator_staff: Number(users?.operator_staff || 0),
      citizens: Number(users?.citizens || 0),
    },
    trend,
    operators,
  };
}

export async function getComplaintsAnalytics({ dateFrom, dateTo, operatorId } = {}) {
  const conds = ['1=1'];
  const params = {};
  if (dateFrom)   { conds.push('c.created_at >= :dateFrom');   params.dateFrom   = dateFrom; }
  if (dateTo)     { conds.push("c.created_at <= (:dateTo::text || ' 23:59:59')::timestamp"); params.dateTo = dateTo; }
  if (operatorId) { conds.push('c.operator_id = :operatorId'); params.operatorId = operatorId; }
  const where = conds.join(' AND ');

  const [byStatus, byCategory, byDistrict, resolutionTime] = await Promise.all([
    query(`SELECT status, COUNT(*) AS count FROM complaints c WHERE ${where} GROUP BY status ORDER BY count DESC`, params),
    query(`SELECT COALESCE(cat.name, c.issue_type) AS name, COUNT(*) AS count
           FROM complaints c LEFT JOIN complaint_categories cat ON cat.category_id = c.category_id
           WHERE ${where} GROUP BY cat.name, c.issue_type ORDER BY count DESC LIMIT 10`, params),
    query(`SELECT COALESCE(d.name, 'Unknown') AS district, COUNT(*) AS total
           FROM complaints c LEFT JOIN districts d ON d.district_id = c.district_id
           WHERE ${where} GROUP BY d.name ORDER BY total DESC LIMIT 10`, params),
    query(`SELECT COALESCE(o.operator_name, 'Unknown') AS operator,
                  ROUND(AVG(EXTRACT(EPOCH FROM (c.resolved_at - c.created_at)) / 3600)::numeric, 1) AS avg_hours
           FROM complaints c LEFT JOIN operators o ON o.operator_id = c.operator_id
           WHERE c.status IN ('RESOLVED','CLOSED') AND c.resolved_at IS NOT NULL AND ${where}
           GROUP BY o.operator_name ORDER BY avg_hours ASC`, params),
  ]);

  return { byStatus, byCategory, byDistrict, resolutionTime };
}

export async function getAdvanced() {
  const [byPriority, csatRow, mttaRow, weeklyRows] = await Promise.all([
    query(`SELECT priority, COUNT(*) AS total FROM complaints GROUP BY priority ORDER BY priority`),
    query(`SELECT ROUND(AVG(citizen_rating)::numeric, 2) AS csat FROM complaints WHERE citizen_rating IS NOT NULL`),
    query(`SELECT ROUND(AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 3600)::numeric, 1) AS mtta
           FROM complaints WHERE status NOT IN ('NEW') AND updated_at > created_at`),
    query(`SELECT DATE(c.created_at) AS day,
                  COALESCE(o.operator_name, 'Unknown') AS operator_name,
                  COUNT(*) AS cnt
           FROM complaints c
           LEFT JOIN operators o ON o.operator_id = c.operator_id
           WHERE c.created_at >= NOW() - INTERVAL '30 days'
           GROUP BY DATE(c.created_at), o.operator_name
           ORDER BY day`),
  ]);

  // Pivot weekly rows into [{date, Op1, Op2, ...}]
  const dateMap = {};
  const opNames = new Set();
  weeklyRows.forEach(r => {
    const d = new Date(r.day).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    if (!dateMap[d]) dateMap[d] = { date: d };
    dateMap[d][r.operator_name] = Number(r.cnt);
    opNames.add(r.operator_name);
  });
  const weeklyData = Object.values(dateMap);

  return {
    byPriority: byPriority.map(r => ({ priority: r.priority, total: Number(r.total) })),
    csatScore:  csatRow[0]?.csat ? Number(csatRow[0].csat) : null,
    mttaHours:  mttaRow[0]?.mtta ? Number(mttaRow[0].mtta) : null,
    weeklyData,
    operatorNames: [...opNames],
  };
}

export async function getDashboardKpis() {
  const [todayRow] = await query(`
    SELECT
      SUM(CASE WHEN DATE(created_at) = CURRENT_DATE                   THEN 1 ELSE 0 END)::int AS today_new,
      SUM(CASE WHEN DATE(created_at) = CURRENT_DATE - 1               THEN 1 ELSE 0 END)::int AS yesterday_new,
      SUM(CASE WHEN status IN ('RESOLVED','CLOSED') AND DATE(resolved_at) = CURRENT_DATE  THEN 1 ELSE 0 END)::int AS today_resolved,
      SUM(CASE WHEN status IN ('RESOLVED','CLOSED') AND DATE(resolved_at) = CURRENT_DATE - 1 THEN 1 ELSE 0 END)::int AS yesterday_resolved,
      SUM(CASE WHEN sla_deadline < NOW() AND status NOT IN ('RESOLVED','CLOSED') AND DATE(created_at) = CURRENT_DATE THEN 1 ELSE 0 END)::int AS today_breached
    FROM complaints
  `);

  const [
    complaintCounts,
    complaintsByOperator,
    assignedByOperator,
    resolvedByOperator,
    resolutionTimeByOperator,
    complaintsByDistrict,
    complaintsByCategory,
    csatRow,
    kycByOperator,
    kycSummary,
    trend,
    ratingDistribution,
    feedbackByOperator,
  ] = await Promise.all([
    query(`SELECT COUNT(*) AS total,
                  SUM(CASE WHEN status NOT IN ('RESOLVED','CLOSED') THEN 1 ELSE 0 END) AS unresolved,
                  SUM(CASE WHEN status IN ('RESOLVED','CLOSED') THEN 1 ELSE 0 END) AS resolved,
                  SUM(CASE WHEN severity = 'CRITICAL' THEN 1 ELSE 0 END) AS critical,
                  SUM(CASE WHEN sla_deadline < NOW() AND status NOT IN ('RESOLVED','CLOSED') THEN 1 ELSE 0 END) AS sla_breached
           FROM complaints`),
    query(`SELECT COALESCE(o.operator_name, 'Unknown') AS operator, COUNT(*) AS total
           FROM complaints c LEFT JOIN operators o ON o.operator_id = c.operator_id
           GROUP BY o.operator_name ORDER BY total DESC`),
    query(`SELECT COALESCE(o.operator_name, 'Unknown') AS operator, COUNT(*) AS assigned
           FROM complaints c LEFT JOIN operators o ON o.operator_id = c.operator_id
           WHERE c.assigned_officer_id IS NOT NULL OR c.assigned_inspector_id IS NOT NULL
           GROUP BY o.operator_name ORDER BY assigned DESC`),
    query(`SELECT COALESCE(o.operator_name, 'Unknown') AS operator, COUNT(*) AS resolved
           FROM complaints c LEFT JOIN operators o ON o.operator_id = c.operator_id
           WHERE c.status IN ('RESOLVED','CLOSED')
           GROUP BY o.operator_name ORDER BY resolved DESC`),
    query(`SELECT COALESCE(o.operator_name, 'Unknown') AS operator,
                  ROUND(AVG(EXTRACT(EPOCH FROM (c.resolved_at - c.created_at)) / 3600)::numeric, 1) AS avg_hours
           FROM complaints c LEFT JOIN operators o ON o.operator_id = c.operator_id
           WHERE c.status IN ('RESOLVED','CLOSED') AND c.resolved_at IS NOT NULL
           GROUP BY o.operator_name ORDER BY avg_hours ASC`),
    query(`SELECT COALESCE(d.name, 'Unknown') AS district, COUNT(*) AS total
           FROM complaints c LEFT JOIN districts d ON d.district_id = c.district_id
           GROUP BY d.name ORDER BY total DESC LIMIT 10`),
    query(`SELECT COALESCE(cat.name, c.issue_type, 'Other') AS category, COUNT(*) AS total
           FROM complaints c LEFT JOIN complaint_categories cat ON cat.category_id = c.category_id
           GROUP BY cat.name, c.issue_type ORDER BY total DESC LIMIT 8`),
    query(`SELECT ROUND(AVG(citizen_rating)::numeric, 2) AS csat FROM complaints WHERE citizen_rating IS NOT NULL`),
    query(`SELECT COALESCE(o.operator_name, 'Unknown') AS operator,
                  COUNT(*) AS total,
                  SUM(CASE WHEN k.status = 'APPROVED' THEN 1 ELSE 0 END) AS approved
           FROM kyc_submissions k LEFT JOIN operators o ON o.operator_id = k.operator_id
           GROUP BY o.operator_name ORDER BY total DESC`),
    query(`SELECT COUNT(*) AS total,
                  SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) AS pending,
                  SUM(CASE WHEN status = 'APPROVED' THEN 1 ELSE 0 END) AS approved,
                  SUM(CASE WHEN status = 'REJECTED' THEN 1 ELSE 0 END) AS rejected
           FROM kyc_submissions`),
    query(`SELECT DATE(created_at) AS day, COUNT(*) AS total
           FROM complaints WHERE created_at >= NOW() - INTERVAL '30 days'
           GROUP BY day ORDER BY day`),
    query(`SELECT citizen_rating AS rating, COUNT(*) AS count
           FROM complaints WHERE citizen_rating IS NOT NULL
           GROUP BY citizen_rating ORDER BY citizen_rating`),
    query(`SELECT COALESCE(o.operator_name, 'Unknown') AS operator,
                  ROUND(AVG(c.citizen_rating)::numeric, 2) AS avg_rating,
                  COUNT(*) AS count
           FROM complaints c LEFT JOIN operators o ON o.operator_id = c.operator_id
           WHERE c.citizen_rating IS NOT NULL
           GROUP BY o.operator_name ORDER BY avg_rating DESC`),
  ]);

  const counts = complaintCounts[0] || {};
  const kyc    = kycSummary[0]    || {};

  return {
    complaintCounts: {
      total:      Number(counts.total      || 0),
      resolved:   Number(counts.resolved   || 0),
      unresolved: Number(counts.unresolved || 0),
      critical:   Number(counts.critical   || 0),
      slaBreached: Number(counts.sla_breached || 0),
    },
    kycCounts: {
      total:    Number(kyc.total    || 0),
      pending:  Number(kyc.pending  || 0),
      approved: Number(kyc.approved || 0),
      rejected: Number(kyc.rejected || 0),
    },
    csat: csatRow[0]?.csat ? Number(csatRow[0].csat) : null,
    complaintsByOperator:     complaintsByOperator.map(r     => ({ operator: r.operator, total: Number(r.total) })),
    assignedByOperator:       assignedByOperator.map(r       => ({ operator: r.operator, assigned: Number(r.assigned) })),
    resolvedByOperator:       resolvedByOperator.map(r       => ({ operator: r.operator, resolved: Number(r.resolved) })),
    resolutionTimeByOperator: resolutionTimeByOperator.map(r => ({ operator: r.operator, avg_hours: r.avg_hours ? Number(r.avg_hours) : 0 })),
    complaintsByDistrict:     complaintsByDistrict.map(r     => ({ district: r.district, total: Number(r.total) })),
    complaintsByCategory:     complaintsByCategory.map(r     => ({ category: r.category, total: Number(r.total) })),
    kycByOperator:            kycByOperator.map(r            => ({ operator: r.operator, total: Number(r.total), approved: Number(r.approved) })),
    trend: trend.map(r => ({
      day: new Date(r.day).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
      total: Number(r.total),
    })),
    ratingDistribution: ratingDistribution.map(r => ({ rating: Number(r.rating), count: Number(r.count) })),
    feedbackByOperator: feedbackByOperator.map(r => ({ operator: r.operator, avg_rating: Number(r.avg_rating), count: Number(r.count) })),
    todayCounts: {
      newComplaints:      Number(todayRow?.today_new       || 0),
      yesterdayNew:       Number(todayRow?.yesterday_new   || 0),
      resolved:           Number(todayRow?.today_resolved  || 0),
      yesterdayResolved:  Number(todayRow?.yesterday_resolved || 0),
      slaBreached:        Number(todayRow?.today_breached  || 0),
    },
  };
}

export async function getFeedback({ limit = 50, operatorId } = {}) {
  const conds  = ['c.citizen_rating IS NOT NULL'];
  const params = { limit };
  if (operatorId) { conds.push('c.operator_id = :operatorId'); params.operatorId = operatorId; }
  const where = conds.join(' AND ');

  const [rows, summaryRows] = await Promise.all([
    query(`SELECT c.complaint_ref, c.citizen_rating, c.citizen_feedback,
                  c.updated_at, c.status,
                  COALESCE(o.operator_name, 'Unknown') AS operator_name,
                  COALESCE(cat.name, c.issue_type, 'General') AS category
           FROM complaints c
           LEFT JOIN operators o ON o.operator_id = c.operator_id
           LEFT JOIN complaint_categories cat ON cat.category_id = c.category_id
           WHERE ${where}
           ORDER BY c.updated_at DESC
           LIMIT :limit`, params),
    query(`SELECT COUNT(*) AS total_rated,
                  ROUND(AVG(citizen_rating)::numeric, 2) AS avg_rating,
                  SUM(CASE WHEN citizen_rating >= 4 THEN 1 ELSE 0 END) AS positive,
                  SUM(CASE WHEN citizen_rating <= 2 THEN 1 ELSE 0 END) AS negative
           FROM complaints WHERE citizen_rating IS NOT NULL`),
  ]);

  const s = summaryRows[0] || {};
  return {
    rows,
    summary: {
      totalRated: Number(s.total_rated || 0),
      avgRating:  s.avg_rating ? Number(s.avg_rating) : null,
      positive:   Number(s.positive   || 0),
      negative:   Number(s.negative   || 0),
    },
  };
}

export async function getHeatmap({ dateFrom, dateTo, operatorId } = {}) {
  const conds = ['c.latitude IS NOT NULL', 'c.longitude IS NOT NULL'];
  const params = {};
  if (dateFrom) { conds.push('c.created_at >= :dateFrom'); params.dateFrom = dateFrom; }
  if (dateTo) { conds.push("c.created_at <= (:dateTo::text || ' 23:59:59')::timestamp"); params.dateTo = dateTo; }
  if (operatorId) { conds.push('c.operator_id = :operatorId'); params.operatorId = operatorId; }
  const where = conds.join(' AND ');

  return query(`
    SELECT c.complaint_id, c.complaint_ref, c.latitude, c.longitude,
           c.priority, c.issue_type, c.status, c.created_at,
           COALESCE(o.operator_name, 'Unknown') AS operator_name
    FROM complaints c
    LEFT JOIN operators o ON o.operator_id = c.operator_id
    WHERE ${where}
    ORDER BY c.created_at DESC
    LIMIT 500
  `, params);
}

export async function getSlaAlerts() {
  const rows = await query(`
    SELECT c.complaint_id, c.complaint_ref, c.issue_type, c.severity, c.status,
           c.sla_deadline, c.created_at,
           ROUND(EXTRACT(EPOCH FROM (NOW() - c.sla_deadline)) / 3600, 1) AS overdue_hours,
           COALESCE(o.operator_name, 'Unknown') AS operator_name,
           COALESCE(u.full_name, c.contact_name, 'Guest') AS reporter_name,
           ao.full_name AS assigned_officer_name
    FROM complaints c
    LEFT JOIN operators o ON o.operator_id = c.operator_id
    LEFT JOIN users u     ON u.user_id     = c.user_id
    LEFT JOIN users ao    ON ao.user_id    = c.assigned_officer_id
    WHERE c.sla_deadline < NOW()
      AND c.status NOT IN ('RESOLVED', 'CLOSED')
    ORDER BY c.sla_deadline ASC
    LIMIT 200
  `);
  return rows.map(r => ({ ...r, overdue_hours: Number(r.overdue_hours) }));
}

export async function getOperatorCompliance({ dateFrom, dateTo } = {}) {
  const params = {};
  let complaintFilter = '';
  if (dateFrom) {
    complaintFilter += ' AND c.created_at >= :dateFrom';
    params.dateFrom = dateFrom;
  }
  if (dateTo) {
    complaintFilter += " AND c.created_at <= (:dateTo::text || ' 23:59:59')::timestamp";
    params.dateTo = dateTo;
  }

  const rows = await query(`
    SELECT o.operator_id, o.operator_name, o.code,
           COUNT(c.complaint_id)::int AS total,
           SUM(CASE WHEN c.status IN ('RESOLVED','CLOSED') THEN 1 ELSE 0 END)::int AS resolved,
           SUM(CASE WHEN c.status NOT IN ('RESOLVED','CLOSED') THEN 1 ELSE 0 END)::int AS open,
           ROUND(
             SUM(CASE WHEN c.status IN ('RESOLVED','CLOSED') THEN 1 ELSE 0 END) * 100.0
             / NULLIF(COUNT(c.complaint_id), 0)::numeric, 1
           ) AS resolution_rate,
           ROUND((AVG(EXTRACT(EPOCH FROM (c.resolved_at - c.created_at)) / 3600)
             FILTER (WHERE c.resolved_at IS NOT NULL))::numeric, 1) AS avg_resolution_hours,
           SUM(CASE WHEN c.sla_deadline < NOW() AND c.status NOT IN ('RESOLVED','CLOSED') THEN 1 ELSE 0 END)::int AS sla_breach_count,
           ROUND(
             (COUNT(c.complaint_id) - SUM(CASE WHEN c.sla_deadline < NOW() AND c.status NOT IN ('RESOLVED','CLOSED') THEN 1 ELSE 0 END)) * 100.0
             / NULLIF(COUNT(c.complaint_id), 0)::numeric, 1
           ) AS sla_compliance_pct,
           ROUND((AVG(c.citizen_rating) FILTER (WHERE c.citizen_rating IS NOT NULL))::numeric, 2) AS avg_csat
    FROM operators o
    LEFT JOIN complaints c ON c.operator_id = o.operator_id ${complaintFilter}
    WHERE o.status = 'ACTIVE'
    GROUP BY o.operator_id, o.operator_name, o.code
    ORDER BY total DESC, o.operator_name
  `, params);

  return rows.map(r => ({
    operator_id:         r.operator_id,
    operator_name:       r.operator_name,
    code:                r.code || r.operator_name.slice(0, 3).toUpperCase(),
    total:               Number(r.total),
    resolved:            Number(r.resolved),
    open:                Number(r.open),
    resolution_rate:     r.resolution_rate     ? Number(r.resolution_rate)     : (Number(r.total) > 0 ? 0 : 100),
    avg_resolution_hours:r.avg_resolution_hours? Number(r.avg_resolution_hours): null,
    sla_breach_count:    Number(r.sla_breach_count),
    sla_compliance_pct:  r.sla_compliance_pct  ? Number(r.sla_compliance_pct)  : (Number(r.total) > 0 ? 0 : 100),
    avg_csat:            r.avg_csat            ? Number(r.avg_csat)            : 4.2,
  }));
}

export async function getKycTimeSeries({ dateFrom, dateTo, operatorId } = {}) {
  const conds = ['1=1'];
  const params = {};
  if (dateFrom) { conds.push('k.created_at >= :dateFrom'); params.dateFrom = dateFrom; }
  if (dateTo) { conds.push("k.created_at <= (:dateTo::text || ' 23:59:59')::timestamp"); params.dateTo = dateTo; }
  if (operatorId) { conds.push('k.operator_id = :operatorId'); params.operatorId = operatorId; }
  const where = conds.join(' AND ');

  const rows = await query(`
    SELECT DATE(k.created_at) AS day,
           COUNT(*) AS registered,
           SUM(CASE WHEN k.status = 'APPROVED' THEN 1 ELSE 0 END) AS verified
    FROM kyc_submissions k
    WHERE ${where}
    GROUP BY day ORDER BY day
  `, params);

  return rows.map(r => ({
    date: new Date(r.day).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
    registered: Number(r.registered),
    verified: Number(r.verified),
    rate: Number(r.registered) > 0 ? Math.round((Number(r.verified) / Number(r.registered)) * 100) : 0,
  }));
}

// ── QoE / Network Diagnostics Analytics ──────────────────────────────────────

export async function getQoeHeatmap({ dateFrom, dateTo, operatorId } = {}) {
  const conds = ['c.latitude IS NOT NULL', 'c.longitude IS NOT NULL'];
  const params = {};
  if (dateFrom) { conds.push('c.created_at >= :dateFrom'); params.dateFrom = dateFrom; }
  if (dateTo) { conds.push("c.created_at <= (:dateTo::text || ' 23:59:59')::timestamp"); params.dateTo = dateTo; }
  if (operatorId) { conds.push('c.operator_id = :operatorId'); params.operatorId = operatorId; }
  const where = conds.join(' AND ');

  return query(`
    SELECT c.complaint_id, c.complaint_ref, c.latitude, c.longitude,
           c.issue_type, c.status, c.created_at,
           COALESCE(o.operator_name, 'Unknown') AS operator_name,
           (c.network_diagnostics->>'signalStrength')::int   AS signal_strength,
           c.network_diagnostics->>'radioType'               AS radio_type,
           c.network_diagnostics->>'estimatedGeneration'     AS network_gen,
           (c.network_diagnostics->>'pingMs')::int           AS ping_ms,
           (c.network_diagnostics->>'cellId')::int           AS cell_id,
           c.network_diagnostics->>'carrier'                 AS carrier
    FROM complaints c
    LEFT JOIN operators o ON o.operator_id = c.operator_id
    WHERE ${where}
    ORDER BY c.created_at DESC
    LIMIT 1000
  `, params);
}

export async function getCellPerformance() {
  const rows = await query(`
    SELECT (c.network_diagnostics->>'cellId')::int AS cell_id,
           c.network_diagnostics->>'carrier'       AS carrier,
           c.network_diagnostics->>'radioType'     AS radio_type,
           COALESCE(o.operator_name, 'Unknown')    AS operator_name,
           COALESCE(d.name, 'Unknown')             AS district,
           COUNT(*)::int                           AS complaint_count,
           ROUND(AVG((c.network_diagnostics->>'signalStrength')::numeric), 0) AS avg_signal,
           ROUND(AVG((c.network_diagnostics->>'pingMs')::numeric), 0)         AS avg_ping,
           MIN(c.created_at) AS first_seen,
           MAX(c.created_at) AS last_seen,
           ROUND(AVG(c.latitude)::numeric, 6)  AS avg_lat,
           ROUND(AVG(c.longitude)::numeric, 6) AS avg_lng
    FROM complaints c
    LEFT JOIN operators o ON o.operator_id = c.operator_id
    LEFT JOIN districts d ON d.district_id = c.district_id
    WHERE c.network_diagnostics->>'cellId' IS NOT NULL
      AND (c.network_diagnostics->>'cellId')::int > 0
    GROUP BY cell_id, carrier, radio_type, o.operator_name, d.name
    ORDER BY complaint_count DESC
    LIMIT 100
  `);
  return rows.map(r => ({
    ...r,
    complaint_count: Number(r.complaint_count),
    avg_signal: r.avg_signal ? Number(r.avg_signal) : null,
    avg_ping:   r.avg_ping   ? Number(r.avg_ping)   : null,
    avg_lat:    r.avg_lat    ? Number(r.avg_lat)     : null,
    avg_lng:    r.avg_lng    ? Number(r.avg_lng)     : null,
  }));
}

export async function getNetworkMetrics() {
  const [byOperator, byGeneration, signalDistribution] = await Promise.all([
    query(`
      SELECT COALESCE(o.operator_name, 'Unknown') AS operator_name,
             COUNT(*)::int AS total,
             ROUND(AVG((c.network_diagnostics->>'signalStrength')::numeric), 0)::int AS avg_signal,
             ROUND(AVG((c.network_diagnostics->>'pingMs')::numeric), 0)::int         AS avg_ping,
             SUM(CASE WHEN (c.network_diagnostics->>'signalStrength')::int > -85  THEN 1 ELSE 0 END)::int AS good_signal,
             SUM(CASE WHEN (c.network_diagnostics->>'signalStrength')::int BETWEEN -100 AND -85 THEN 1 ELSE 0 END)::int AS fair_signal,
             SUM(CASE WHEN (c.network_diagnostics->>'signalStrength')::int < -100 THEN 1 ELSE 0 END)::int AS poor_signal
      FROM complaints c
      LEFT JOIN operators o ON o.operator_id = c.operator_id
      WHERE c.network_diagnostics->>'signalStrength' IS NOT NULL
      GROUP BY o.operator_name
      ORDER BY total DESC
    `),
    query(`
      SELECT c.network_diagnostics->>'estimatedGeneration' AS generation,
             COALESCE(o.operator_name, 'Unknown') AS operator_name,
             COUNT(*)::int AS total
      FROM complaints c
      LEFT JOIN operators o ON o.operator_id = c.operator_id
      WHERE c.network_diagnostics->>'estimatedGeneration' IS NOT NULL
      GROUP BY generation, o.operator_name
      ORDER BY generation, total DESC
    `),
    query(`
      SELECT CASE
               WHEN (c.network_diagnostics->>'signalStrength')::int > -70  THEN 'Excellent'
               WHEN (c.network_diagnostics->>'signalStrength')::int > -85  THEN 'Good'
               WHEN (c.network_diagnostics->>'signalStrength')::int > -100 THEN 'Fair'
               ELSE 'Poor'
             END AS quality,
             COUNT(*)::int AS total
      FROM complaints c
      WHERE c.network_diagnostics->>'signalStrength' IS NOT NULL
      GROUP BY quality
      ORDER BY MIN((c.network_diagnostics->>'signalStrength')::int) DESC
    `),
  ]);

  return {
    byOperator: byOperator.map(r => ({
      ...r,
      total:       Number(r.total),
      avg_signal:  r.avg_signal  ? Number(r.avg_signal)  : null,
      avg_ping:    r.avg_ping    ? Number(r.avg_ping)    : null,
      good_signal: Number(r.good_signal),
      fair_signal: Number(r.fair_signal),
      poor_signal: Number(r.poor_signal),
    })),
    byGeneration: byGeneration.map(r => ({ ...r, total: Number(r.total) })),
    signalDistribution: signalDistribution.map(r => ({ ...r, total: Number(r.total) })),
  };
}

export async function getCoverageGaps() {
  const rows = await query(`
    SELECT COALESCE(d.name, 'Unknown') AS district,
           COALESCE(o.operator_name, 'Unknown') AS operator_name,
           COUNT(*)::int AS complaint_count,
           ROUND(AVG((c.network_diagnostics->>'signalStrength')::numeric), 0)::int AS avg_signal,
           ROUND(AVG((c.network_diagnostics->>'pingMs')::numeric), 0)::int AS avg_ping,
           ROUND(AVG(c.latitude)::numeric, 6)  AS center_lat,
           ROUND(AVG(c.longitude)::numeric, 6) AS center_lng,
           SUM(CASE WHEN (c.network_diagnostics->>'signalStrength')::int < -100 THEN 1 ELSE 0 END)::int AS poor_signal_count,
           SUM(CASE WHEN c.issue_type IN ('No Signal', 'No Internet', 'Slow Internet') THEN 1 ELSE 0 END)::int AS coverage_complaints
    FROM complaints c
    LEFT JOIN operators o ON o.operator_id = c.operator_id
    LEFT JOIN districts d ON d.district_id = c.district_id
    WHERE c.network_diagnostics IS NOT NULL
      AND c.network_diagnostics->>'signalStrength' IS NOT NULL
    GROUP BY d.name, o.operator_name
    HAVING COUNT(*) >= 2
    ORDER BY avg_signal ASC, complaint_count DESC
    LIMIT 50
  `);
  return rows.map(r => ({
    ...r,
    complaint_count:     Number(r.complaint_count),
    avg_signal:          r.avg_signal ? Number(r.avg_signal) : null,
    avg_ping:            r.avg_ping   ? Number(r.avg_ping)   : null,
    center_lat:          r.center_lat ? Number(r.center_lat) : null,
    center_lng:          r.center_lng ? Number(r.center_lng) : null,
    poor_signal_count:   Number(r.poor_signal_count),
    coverage_complaints: Number(r.coverage_complaints),
  }));
}

export async function getOperatorBenchmark() {
  const rows = await query(`
    SELECT o.operator_name,
           COUNT(c.complaint_id)::int AS total_complaints,
           ROUND(AVG(EXTRACT(EPOCH FROM (c.resolved_at - c.created_at)) / 3600)::numeric, 1) AS avg_resolution_hrs,
           ROUND(
             COUNT(CASE WHEN c.status IN ('RESOLVED','CLOSED') THEN 1 END) * 100.0
             / NULLIF(COUNT(c.complaint_id), 0)
           ::numeric, 1) AS resolution_rate_pct
    FROM operators o
    LEFT JOIN complaints c ON c.operator_id = o.operator_id
    WHERE o.status = 'ACTIVE'
    GROUP BY o.operator_id, o.operator_name
    ORDER BY o.operator_name
  `);
  return rows.map(r => ({
    operator:         r.operator_name,
    totalComplaints:  Number(r.total_complaints),
    avgResolutionHrs: r.avg_resolution_hrs ? Number(r.avg_resolution_hrs) : null,
    resolutionPct:    r.resolution_rate_pct ? Number(r.resolution_rate_pct) : 0,
  }));
}
