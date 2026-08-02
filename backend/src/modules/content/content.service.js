import { query, queryOne } from '../../config/db.js';
import { ApiError } from '../../utils/ApiError.js';

export async function listContent({ type, is_published, category, limit = 50, offset = 0 } = {}) {
  const conds = ['1=1'];
  const params = {};

  if (type) { conds.push('c.content_type = :type'); params.type = type; }
  if (is_published !== undefined) { conds.push('c.is_published = :is_published'); params.is_published = is_published; }
  if (category) { conds.push('c.category = :category'); params.category = category; }

  const where = conds.join(' AND ');
  params.limit = Number(limit);
  params.offset = Number(offset);

  const [rows, [{ total }]] = await Promise.all([
    query(
      `SELECT c.*, u.full_name AS author_name 
       FROM content_items c 
       LEFT JOIN users u ON u.user_id = c.author_id 
       WHERE ${where} 
       ORDER BY c.created_at DESC 
       LIMIT :limit OFFSET :offset`,
      params
    ),
    query(`SELECT COUNT(*) AS total FROM content_items c WHERE ${where}`, params),
  ]);

  return { rows, total: Number(total) };
}

export async function getContent(id) {
  const row = await queryOne(
    `SELECT c.*, u.full_name AS author_name 
     FROM content_items c 
     LEFT JOIN users u ON u.user_id = c.author_id 
     WHERE c.content_id = :id`,
    { id }
  );
  if (!row) throw ApiError.notFound('Content not found');
  return row;
}

export async function createContent(data) {
  const [row] = await query(
    `INSERT INTO content_items (
       content_type, title, body, category, is_published, published_at, expires_at, author_id, media_type, media_url
     ) VALUES (
       :type, :title, :body, :category, :isPublished, 
       ${data.isPublished ? 'NOW()' : 'NULL'}, 
       :expiresAt, :authorId, :mediaType, :mediaUrl
     ) RETURNING *`,
    {
      type: data.contentType,
      title: data.title,
      body: data.body,
      category: data.category || null,
      isPublished: data.isPublished ?? false,
      expiresAt: data.expiresAt || null,
      authorId: data.authorId,
      mediaType: data.mediaType || null,
      mediaUrl: data.mediaUrl || null,
    }
  );
  return row;
}

export async function updateContent(id, data) {
  const sets = ['updated_at = NOW()'];
  const params = { id };

  if (data.contentType !== undefined) { sets.push('content_type = :type'); params.type = data.contentType; }
  if (data.title !== undefined) { sets.push('title = :title'); params.title = data.title; }
  if (data.body !== undefined) { sets.push('body = :body'); params.body = data.body; }
  if (data.category !== undefined) { sets.push('category = :category'); params.category = data.category; }
  if (data.isPublished !== undefined) { 
    sets.push('is_published = :isPublished'); 
    params.isPublished = data.isPublished; 
    if (data.isPublished) {
      sets.push('published_at = COALESCE(published_at, NOW())');
    }
  }
  if (data.expiresAt !== undefined) { sets.push('expires_at = :expiresAt'); params.expiresAt = data.expiresAt; }
  if (data.mediaType !== undefined) { sets.push('media_type = :mediaType'); params.mediaType = data.mediaType; }
  if (data.mediaUrl !== undefined) { sets.push('media_url = :mediaUrl'); params.mediaUrl = data.mediaUrl; }

  if (sets.length === 1) return getContent(id); // only updated_at

  const [row] = await query(
    `UPDATE content_items SET ${sets.join(', ')} WHERE content_id = :id RETURNING *`,
    params
  );
  if (!row) throw ApiError.notFound('Content not found');
  return row;
}

export async function deleteContent(id) {
  const [row] = await query(`DELETE FROM content_items WHERE content_id = :id RETURNING content_id`, { id });
  if (!row) throw ApiError.notFound('Content not found');
  return { deleted: true };
}

// Fetch active content by type (e.g. FRAUD_ALERT, NEWS) that hasn't expired
export async function getActiveContent(type) {
  return query(
    `SELECT * FROM content_items 
     WHERE content_type = :type 
       AND is_published = TRUE 
       AND (expires_at IS NULL OR expires_at > NOW())
     ORDER BY published_at DESC`,
    { type }
  );
}
