import { query } from '../../config/db.js';

export async function getOverview() {
  const [complaints] = await query(`
    SELECT COUNT(*) AS total,
           SUM(CASE WHEN status = 'NEW' THEN 1 ELSE 0 END) AS pending,
           SUM(CASE WHEN status IN ('RESOLVED','CLOSED') THEN 1 ELSE 0 END) AS resolved,
           SUM(CASE WHEN sla_deadline < NOW() AND status NOT IN ('RESOLVED','CLOSED') THEN 1 ELSE 0 END) AS breached
    FROM complaints
  `);

  const [kyc] = await query(`
    SELECT COUNT(*) AS total,
           SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) AS pending,
           SUM(CASE WHEN status = 'APPROVED' THEN 1 ELSE 0 END) AS approved,
           SUM(CASE WHEN status = 'REJECTED' THEN 1 ELSE 0 END) AS rejected
    FROM kyc_submissions
  `);

  const [users] = await query(`
    SELECT COUNT(*) AS total,
           SUM(CASE WHEN operator_id IS NOT NULL THEN 1 ELSE 0 END) AS operator_staff,
           SUM(CASE WHEN operator_id IS NULL THEN 1 ELSE 0 END) AS citizens
    FROM users
  `);

  const trend = await query(`
    SELECT DATE(created_at) AS day, COUNT(*) AS count
    FROM complaints
    WHERE created_at >= NOW() - INTERVAL '30 days'
    GROUP BY day ORDER BY day
  `);

  const operators = await query(`
    SELECT COALESCE(o.operator_name, 'Unknown') AS name, COUNT(c.complaint_id) AS complaints
    FROM complaints c
    LEFT JOIN operators o ON o.operator_id = c.operator_id
    GROUP BY o.operator_name ORDER BY complaints DESC
  `);

  return {
    complaints: { ...complaints, total: Number(complaints.total) },
    kyc:        { ...kyc,        total: Number(kyc.total) },
    users:      { ...users,      total: Number(users.total) },
    trend,
    operators,
  };
}

export async function getComplaintsAnalytics({ dateFrom, dateTo, operatorId } = {}) {
  const conds = ['1=1'];
  const params = {};
  if (dateFrom)   { conds.push('c.created_at >= :dateFrom');   params.dateFrom   = dateFrom; }
  if (dateTo)     { conds.push('c.created_at <= :dateTo');     params.dateTo     = dateTo; }
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

export async function getHeatmap() {
  return query(`
    SELECT c.complaint_id, c.complaint_ref, c.latitude, c.longitude,
           c.priority, c.issue_type, c.status,
           COALESCE(o.operator_name, 'Unknown') AS operator_name
    FROM complaints c
    LEFT JOIN operators o ON o.operator_id = c.operator_id
    WHERE c.latitude IS NOT NULL AND c.longitude IS NOT NULL
    ORDER BY c.created_at DESC
    LIMIT 500
  `);
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
