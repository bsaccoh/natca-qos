import { query, queryOne } from '../../config/db.js';

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
  const [{ total, unread }] = await query(
    `SELECT COUNT(*) AS total,
            SUM(CASE WHEN is_read = FALSE THEN 1 ELSE 0 END) AS unread
     FROM notifications WHERE user_id = :userId`,
    { userId }
  );
  return { rows, total: Number(total), unread: Number(unread) };
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
 * Unread count only — lightweight endpoint for polling.
 */
export async function unreadCount(userId) {
  const [row] = await query(
    `SELECT COUNT(*) AS unread FROM notifications WHERE user_id = :userId AND is_read = FALSE`,
    { userId }
  );
  return Number(row.unread);
}
