import { query, queryOne } from '../../config/db.js';

export async function createIncident({ operatorId, title, description, severity, actorId }) {
  const [row] = await query(
    `INSERT INTO incidents (operator_id, title, description, severity, created_by)
     VALUES (:operatorId, :title, :description, :severity, :actorId)
     RETURNING *`,
    { operatorId, title, description, severity: severity || 'MEDIUM', actorId }
  );
  return row;
}

export async function updateIncident(id, { status, severity, description }) {
  const sets = ['updated_at = NOW()'];
  const params = { id };
  if (status) { sets.push('status = :status'); params.status = status; }
  if (severity) { sets.push('severity = :severity'); params.severity = severity; }
  if (description !== undefined) { sets.push('description = :description'); params.description = description; }
  
  if (status === 'RESOLVED') { sets.push('resolved_at = NOW()'); }

  const [row] = await query(
    `UPDATE incidents SET ${sets.join(', ')} WHERE incident_id = :id RETURNING *`,
    params
  );
  return row;
}

export async function listIncidents({ operatorId, status, limit = 20, offset = 0 } = {}) {
  const conds = ['1=1'];
  const params = {};
  if (operatorId) { conds.push('i.operator_id = :operatorId'); params.operatorId = operatorId; }
  if (status) { conds.push('i.status = :status'); params.status = status; }

  const where = conds.join(' AND ');
  params.limit = Number(limit);
  params.offset = Number(offset);

  const [rows, [{ total }]] = await Promise.all([
    query(`
      SELECT i.*, o.operator_name, u.full_name AS created_by_name
      FROM incidents i
      LEFT JOIN operators o ON o.operator_id = i.operator_id
      LEFT JOIN users u ON u.user_id = i.created_by
      WHERE ${where}
      ORDER BY i.created_at DESC
      LIMIT :limit OFFSET :offset
    `, params),
    query(`SELECT COUNT(*) AS total FROM incidents i WHERE ${where}`, params)
  ]);
  
  return { rows, total: Number(total) };
}

export async function getIncident(id) {
  return queryOne(`
    SELECT i.*, o.operator_name, u.full_name AS created_by_name
    FROM incidents i
    LEFT JOIN operators o ON o.operator_id = i.operator_id
    LEFT JOIN users u ON u.user_id = i.created_by
    WHERE i.incident_id = :id
  `, { id });
}
