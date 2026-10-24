/**
 * NatCA CMS — Multi-SIM Cap & Fraud Sentinel Service
 * Tracks national SIM registration caps and cross-operator registration velocity.
 */
import { query, queryOne } from '../../config/db.js';
import { ApiError } from '../../utils/ApiError.js';

export const MAX_REGULATORY_SIMS = 4; // NatCA Sierra Leone statutory threshold per NIN

/**
 * Audits all registered SIMs for a given NIN across all telecom operators.
 */
export async function auditSimRegistrations(nin) {
  if (!nin) throw ApiError.badRequest('NIN is required for SIM audit');

  const cleanNin = nin.trim().toUpperCase();

  // 1. Fetch all approved KYC registrations matching this NIN
  const registrations = await query(
    `SELECT k.kyc_id, k.kyc_reference, k.phone, k.iccid, k.first_name, k.last_name,
            k.status, k.created_at, k.expires_at, k.liveness_passed, k.liveness_score, k.risk_score,
            o.operator_id, o.operator_name, o.code AS operator_code
     FROM kyc_submissions k
     LEFT JOIN operators o ON o.operator_id = k.operator_id
     WHERE UPPER(TRIM(k.nin)) = :nin
       AND k.status = 'APPROVED'
     ORDER BY k.created_at DESC`,
    { nin: cleanNin }
  );

  const totalSims = registrations.length;
  const violations = [];

  // Check 1: Exceeds regulatory cap
  if (totalSims > MAX_REGULATORY_SIMS) {
    violations.push({
      type: 'EXCEEDS_REGULATORY_CAP',
      message: `Registered SIM count (${totalSims}) exceeds national regulatory limit of ${MAX_REGULATORY_SIMS} SIMs per citizen NIN.`,
      severity: 'HIGH',
    });
  }

  // Check 2: Registration velocity (more than 2 SIMs across different operators within 48h)
  const twoDaysAgo = new Date(Date.now() - 48 * 3600 * 1000);
  const recentRegistrations = registrations.filter((r) => new Date(r.created_at) >= twoDaysAgo);
  const uniqueOperators = new Set(recentRegistrations.map((r) => r.operator_id));

  if (recentRegistrations.length >= 3 || (recentRegistrations.length >= 2 && uniqueOperators.size > 1)) {
    violations.push({
      type: 'VELOCITY_ALERT',
      message: `Suspicious registration velocity: ${recentRegistrations.length} SIM cards registered across ${uniqueOperators.size} operator(s) in the last 48 hours.`,
      severity: 'CRITICAL',
    });
  }

  // If violations exist, trigger or update an alert
  if (violations.length > 0) {
    const highestSeverity = violations.some((v) => v.severity === 'CRITICAL') ? 'CRITICAL' : 'HIGH';
    await query(
      `INSERT INTO sim_fraud_alerts (nin, alert_type, severity, total_sims, details, status, created_at, updated_at)
       VALUES (:nin, :alertType, :severity, :totalSims, :details, 'OPEN', NOW(), NOW())
       ON CONFLICT DO NOTHING`,
      {
        nin: cleanNin,
        alertType: violations[0].type,
        severity: highestSeverity,
        totalSims,
        details: JSON.stringify({ violations, phone_numbers: registrations.map((r) => r.phone) }),
      }
    );
  }

  return {
    nin: cleanNin,
    total_sims: totalSims,
    max_allowed: MAX_REGULATORY_SIMS,
    is_compliant: violations.length === 0,
    violations,
    registrations,
  };
}

/**
 * Pre-activation check for telecom operators before registering a new SIM.
 */
export async function checkSimCapPreActivation({ nin, phone, operatorId }) {
  if (!nin) throw ApiError.badRequest('NIN is required');

  const audit = await auditSimRegistrations(nin);

  if (audit.total_sims >= MAX_REGULATORY_SIMS) {
    return {
      allowed: false,
      reason: `Citizen has reached the statutory cap of ${MAX_REGULATORY_SIMS} SIM cards. Additional registration requires NatCA regulatory clearance.`,
      current_count: audit.total_sims,
      max_allowed: MAX_REGULATORY_SIMS,
    };
  }

  return {
    allowed: true,
    current_count: audit.total_sims,
    max_allowed: MAX_REGULATORY_SIMS,
    remaining_slots: MAX_REGULATORY_SIMS - audit.total_sims,
  };
}

/**
 * List all SIM fraud & regulatory cap violation alerts.
 */
export async function listSimFraudAlerts({ status = 'OPEN', limit = 50, offset = 0 } = {}) {
  const conds = ['1=1'];
  const params = {};

  if (status && status !== 'ALL') {
    conds.push('status = :status');
    params.status = status;
  }

  const where = conds.join(' AND ');
  params.limit = Number(limit);
  params.offset = Number(offset);

  const [rows, [{ total }]] = await Promise.all([
    query(
      `SELECT a.*, u.full_name AS resolved_by_name
       FROM sim_fraud_alerts a
       LEFT JOIN users u ON u.user_id = a.resolved_by
       WHERE ${where}
       ORDER BY a.created_at DESC
       LIMIT :limit OFFSET :offset`,
      params
    ),
    query(`SELECT COUNT(*) AS total FROM sim_fraud_alerts WHERE ${where}`, params),
  ]);

  return { rows, total: Number(total) };
}

/**
 * Resolve or update the status of a SIM fraud alert.
 */
export async function resolveFraudAlert(alertId, { resolutionNote, status, resolvedBy }) {
  const alert = await queryOne(`SELECT * FROM sim_fraud_alerts WHERE alert_id = :alertId`, { alertId });
  if (!alert) throw ApiError.notFound('Fraud alert not found');

  const [updated] = await query(
    `UPDATE sim_fraud_alerts
     SET status = :status,
         resolution_note = :resolutionNote,
         resolved_by = :resolvedBy,
         updated_at = NOW()
     WHERE alert_id = :alertId
     RETURNING *`,
    {
      alertId,
      status: status || 'CLEARED',
      resolutionNote: resolutionNote || 'Reviewed and cleared by regulator',
      resolvedBy: resolvedBy || null,
    }
  );

  return updated;
}
