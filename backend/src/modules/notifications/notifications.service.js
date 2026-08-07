import { query, queryOne } from '../../config/db.js';
import { sendSms } from '../../services/sms.js';
import { sendEmail } from '../../services/email.js';
import * as templates from './templates.js';

/**
 * Create an in-app notification for a staff user.
 * Also emits Socket.io event to user:{userId} room if io is provided.
 */
export async function createNotification(io, { userId, type, title, body, data = null, channel = 'IN_APP' }) {
  const [row] = await query(
    `INSERT INTO notifications (user_id, type, title, body, data, channel, sent_at)
     VALUES (:userId, :type, :title, :body, :data, :channel, NOW())
     RETURNING notification_id, type, title, body, data, is_read, created_at`,
    { userId, type, title, body: body || null, data: data ? JSON.stringify(data) : null, channel }
  );

  if (io) {
    io.to(`user:${userId}`).emit('notification', row);
  }

  return row;
}

/**
 * Broadcast a system event to all connected admin clients.
 * Used for SLA warnings, complaint status changes, etc.
 */
export function broadcastToAdmins(io, event, payload) {
  if (io) io.to('admin').emit(event, payload);
}

export async function notifyOperator(io, { operatorId, complaintRef, issueType }) {
  if (!operatorId) return;
  const admins = await query(
    `SELECT u.user_id FROM users u JOIN roles r ON r.role_id = u.role_id
     WHERE r.role_key = 'OPERATOR_ADMIN' AND u.operator_id = :operatorId AND u.is_active = TRUE`,
    { operatorId }
  );
  for (const { user_id } of admins) {
    await createNotification(io, {
      userId: user_id,
      type: 'NEW_COMPLAINT',
      title: 'New complaint received',
      body: `${complaintRef}: ${issueType || 'Customer complaint'}`,
      data: { complaint_ref: complaintRef },
    });
  }
  if (io) io.to(`operator:${operatorId}`).emit('complaint:new', { complaint_ref: complaintRef, issueType });
}

/**
 * List notifications for a user (unread first, then recent).
 */
export async function listNotifications(userId, { limit = 30, unreadOnly = false } = {}) {
  const cond = unreadOnly ? 'AND is_read = FALSE' : '';
  const rows = await query(
    `SELECT notification_id, type, title, body, data, is_read, created_at
     FROM notifications
     WHERE user_id = :userId ${cond}
     ORDER BY is_read ASC, created_at DESC
     LIMIT :limit`,
    { userId, limit: Number(limit) }
  );
  const [res] = await query(
    `SELECT COUNT(*) AS total,
            COALESCE(SUM(CASE WHEN is_read = FALSE THEN 1 ELSE 0 END), 0) AS unread
     FROM notifications WHERE user_id = :userId`,
    { userId }
  );
  return { rows: rows || [], total: Number(res?.total || 0), unread: Number(res?.unread || 0) };
}

/**
 * Mark a single notification as read.
 */
export async function markRead(notificationId, userId) {
  await query(
    `UPDATE notifications SET is_read = TRUE, read_at = NOW()
     WHERE notification_id = :id AND user_id = :userId`,
    { id: notificationId, userId }
  );
}

/**
 * Mark all notifications as read for a user.
 */
export async function markAllRead(userId) {
  const [{ count }] = await query(
    `UPDATE notifications SET is_read = TRUE, read_at = NOW()
     WHERE user_id = :userId AND is_read = FALSE
     RETURNING COUNT(*)`,
    { userId }
  );
  return { marked: Number(count || 0) };
}

/**
 * Multi-channel citizen notification (SMS + Email + In-app).
 * Each channel is fire-and-report — one failure never blocks the others.
 * Returns an array of channels actually delivered, e.g. ['SMS', 'EMAIL'].
 */
export async function notifyCitizen(io, { userId, contact = {}, complaintRef, status, event }) {
  const delivered = [];
  const isSubmit = event === 'SUBMITTED';
  const smsMsg   = (isSubmit ? templates.submissionSms   : templates.statusUpdateSms)({ complaintRef, status });
  const emailPkg = (isSubmit ? templates.submissionEmail : templates.statusUpdateEmail)({
    complaintRef, status, citizenName: contact.name,
  });

  // SMS
  if (contact.phone) {
    try {
      await sendSms(contact.phone, smsMsg);
      delivered.push('SMS');
      if (userId) {
        await query(
          `INSERT INTO notifications (user_id, type, title, body, data, channel, sent_at)
           VALUES (:userId, :type, :title, :body, :data, 'SMS', NOW())`,
          {
            userId, type: `COMPLAINT_${event}`,
            title: `SMS: ${complaintRef}`, body: smsMsg,
            data: JSON.stringify({ complaint_ref: complaintRef, status }),
          }
        );
      }
    } catch (err) { console.error('[notifyCitizen SMS]', err?.message || err); }
  }

  // Email
  if (contact.email) {
    try {
      await sendEmail({ to: contact.email, subject: emailPkg.subject, html: emailPkg.html, text: emailPkg.text });
      delivered.push('EMAIL');
      if (userId) {
        await query(
          `INSERT INTO notifications (user_id, type, title, body, data, channel, sent_at)
           VALUES (:userId, :type, :title, :body, :data, 'EMAIL', NOW())`,
          {
            userId, type: `COMPLAINT_${event}`,
            title: emailPkg.subject, body: emailPkg.text,
            data: JSON.stringify({ complaint_ref: complaintRef, status }),
          }
        );
      }
    } catch (err) { console.error('[notifyCitizen EMAIL]', err?.message || err); }
  }

  // In-app (only if we know who the user is)
  if (userId) {
    try {
      await createNotification(io, {
        userId,
        type: `COMPLAINT_${event}`,
        title: isSubmit ? 'Complaint received' : 'Complaint status updated',
        body: smsMsg,
        data: { complaint_ref: complaintRef, status },
        channel: 'IN_APP',
      });
      delivered.push('IN_APP');
    } catch (err) { console.error('[notifyCitizen IN_APP]', err?.message || err); }
  }

  return delivered;
}

/**
 * Unread count only — lightweight endpoint for polling.
 */
export async function unreadCount(userId) {
  const row = await queryOne(
    `SELECT COUNT(*) AS unread FROM notifications WHERE user_id = :userId AND is_read = FALSE`,
    { userId }
  );
  return Number(row?.unread || 0);
}
