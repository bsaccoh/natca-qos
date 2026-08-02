/**
 * SLA Cron Job
 * Runs every 5 minutes.
 *
 * Actions:
 *  1. Find complaints approaching SLA deadline (≥80% elapsed, not yet warned)
 *     → Create SLA_WARNING notification for assigned officer + all NATCA_ADMINs
 *     → Emit 'sla:warning' to admin Socket.io room
 *
 *  2. Find complaints that have breached SLA (deadline passed, still active)
 *     → Create SLA_BREACH notification
 *     → Auto-escalate NEW/UNDER_REVIEW → ESCALATED, record timeline event
 *     → Emit 'sla:breach' to admin Socket.io room
 *
 * Warning state is tracked via a `sla_warnings` soft field: we reuse
 * complaint_timeline events of type SLA_WARNING / SLA_BREACH to avoid
 * duplicate alerts (we check if one was created in the last 12h).
 */
import cron from 'node-cron';
import { query } from '../config/db.js';
import * as notifSvc from '../modules/notifications/notifications.service.js';

const ACTIVE_STATUSES = `'NEW','UNDER_REVIEW','ASSIGNED','REOPENED'`;

/* ── Helper: get admin user IDs (to notify) ──────────────────────────────── */
async function getAdminUserIds() {
  const rows = await query(
    `SELECT u.user_id FROM users u
     JOIN roles r ON r.role_id = u.role_id
     WHERE r.role_key IN ('SYSTEM_ADMIN','NATCA_ADMIN') AND u.is_active = TRUE`
  );
  return rows.map((r) => r.user_id);
}

/* ── Helper: check if an SLA event was fired recently ────────────────────── */
async function wasRecentlyFired(complaintId, eventType, withinHours = 12) {
  const [row] = await query(
    `SELECT 1 FROM complaint_timeline
     WHERE complaint_id = :id AND event_type = :type
       AND created_at >= NOW() - INTERVAL '${withinHours} hours'
     LIMIT 1`,
    { id: complaintId, type: eventType }
  );
  return !!row;
}

/* ── Helper: record timeline event ───────────────────────────────────────── */
async function recordTimeline(complaintId, eventType, note) {
  await query(
    `INSERT INTO complaint_timeline (complaint_id, event_type, note, is_public, created_at)
     VALUES (:id, :type, :note, FALSE, NOW())`,
    { id: complaintId, type: eventType, note }
  );
}

/* ── SLA Warning: ≥80% elapsed ───────────────────────────────────────────── */
async function runWarnings(io) {
  // Complaints where: deadline is in the future BUT ≥ 80% of time has elapsed
  const nearing = await query(`
    SELECT c.complaint_id, c.complaint_ref, c.sla_deadline, c.sla_hours,
           c.assigned_officer_id, c.issue_type, c.severity,
           EXTRACT(EPOCH FROM (c.sla_deadline - NOW())) / 3600 AS hours_remaining,
           EXTRACT(EPOCH FROM (NOW() - c.created_at))   / 3600 AS hours_elapsed
    FROM complaints c
    WHERE c.sla_deadline IS NOT NULL
      AND c.sla_deadline > NOW()
      AND c.status IN (${ACTIVE_STATUSES})
      AND EXTRACT(EPOCH FROM (NOW() - c.created_at)) / c.sla_hours >= 0.80
  `);

  const admins = await getAdminUserIds();

  for (const c of nearing) {
    if (await wasRecentlyFired(c.complaint_id, 'SLA_WARNING', 12)) continue;

    const hrs = Math.round(c.hours_remaining);
    const title = `SLA Warning — ${c.complaint_ref}`;
    const body  = `${c.issue_type?.replace(/_/g, ' ')} · ${hrs}h remaining before SLA breach`;

    // Notify assigned officer
    if (c.assigned_officer_id) {
      await notifSvc.createNotification(io, {
        userId: c.assigned_officer_id,
        type: 'SLA_WARNING',
        title, body,
        data: { complaint_id: c.complaint_id, complaint_ref: c.complaint_ref },
      });
    }

    // Notify all admins
    for (const adminId of admins) {
      if (adminId === c.assigned_officer_id) continue; // avoid duplicate
      await notifSvc.createNotification(io, {
        userId: adminId,
        type: 'SLA_WARNING',
        title, body,
        data: { complaint_id: c.complaint_id, complaint_ref: c.complaint_ref },
      });
    }

    // Record timeline
    await recordTimeline(c.complaint_id, 'SLA_WARNING', body);

    // Broadcast to admin room
    notifSvc.broadcastToAdmins(io, 'sla:warning', {
      complaint_id:  c.complaint_id,
      complaint_ref: c.complaint_ref,
      hours_remaining: hrs,
    });
  }

  if (nearing.length > 0) {
    console.log(`[SLA] ⚠  ${nearing.length} warning(s) issued`);
  }
}

/* ── SLA Breach: deadline has passed ─────────────────────────────────────── */
async function runBreaches(io) {
  const breached = await query(`
    SELECT c.complaint_id, c.complaint_ref, c.status,
           c.assigned_officer_id, c.issue_type
    FROM complaints c
    WHERE c.sla_deadline IS NOT NULL
      AND c.sla_deadline < NOW()
      AND c.status IN (${ACTIVE_STATUSES})
  `);

  const admins = await getAdminUserIds();

  for (const c of breached) {
    // Auto-escalate if still NEW or UNDER_REVIEW
    if (['NEW', 'UNDER_REVIEW'].includes(c.status)) {
      await query(
        `UPDATE complaints SET status = 'ESCALATED', updated_at = NOW() WHERE complaint_id = :id`,
        { id: c.complaint_id }
      );
      await recordTimeline(c.complaint_id, 'STATUS_CHANGE',
        'Auto-escalated by system: SLA breach');
    }

    // Only fire breach notification once (check last 24h)
    if (await wasRecentlyFired(c.complaint_id, 'SLA_BREACH', 24)) continue;

    const title = `SLA Breached — ${c.complaint_ref}`;
    const body  = `${c.issue_type?.replace(/_/g, ' ')} has exceeded its SLA deadline`;

    if (c.assigned_officer_id) {
      await notifSvc.createNotification(io, {
        userId: c.assigned_officer_id,
        type: 'SLA_BREACH',
        title, body,
        data: { complaint_id: c.complaint_id, complaint_ref: c.complaint_ref },
      });
    }

    for (const adminId of admins) {
      if (adminId === c.assigned_officer_id) continue;
      await notifSvc.createNotification(io, {
        userId: adminId,
        type: 'SLA_BREACH',
        title, body,
        data: { complaint_id: c.complaint_id, complaint_ref: c.complaint_ref },
      });
    }

    await recordTimeline(c.complaint_id, 'SLA_BREACH', body);

    notifSvc.broadcastToAdmins(io, 'sla:breach', {
      complaint_id:  c.complaint_id,
      complaint_ref: c.complaint_ref,
    });
  }

  if (breached.length > 0) {
    console.log(`[SLA] 🔴 ${breached.length} breach(es) processed`);
  }
}

/* ── Register the cron job ───────────────────────────────────────────────── */
export function startSlaJob(io) {
  // Run every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    try {
      await runWarnings(io);
      await runBreaches(io);
    } catch (err) {
      console.error('[SLA] Cron error:', err.message);
    }
  });

  console.log('✓ SLA cron job started (runs every 5 minutes)');
}
