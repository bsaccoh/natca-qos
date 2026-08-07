import { query, queryOne } from '../../config/db.js';
import { ApiError }        from '../../utils/ApiError.js';

function generateKycRef() {
  const now = new Date();
  const d = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const r = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `KYC-${d}-${r}`;
}

/* ─── Submit KYC ─────────────────────────────────────────────────────────── */
export async function submitKyc({
  userId, phone, operatorId, iccid, nin,
  firstName, lastName, dateOfBirth, sex, nationality, address,
  districtId, chiefdomId, idType, idExpiryDate,
  idFrontPath, idBackPath, faceImagePath,
  faceMatchScore,
  source,
}) {
  if (!phone) throw ApiError.badRequest('Phone is required');

  const ref = generateKycRef();

  const [row] = await query(
    `INSERT INTO kyc_submissions (
       kyc_reference, user_id, phone, operator_id, iccid, nin,
       first_name, last_name, date_of_birth, sex, nationality, address,
       district_id, chiefdom_id, id_type, id_expiry_date,
       id_front_path, id_back_path, face_image_path,
       face_match_score
     ) VALUES (
       :ref, :userId, :phone, :operatorId, :iccid, :nin,
       :firstName, :lastName, :dateOfBirth, :sex, :nationality, :address,
       :districtId, :chiefdomId, :idType, :idExpiryDate,
       :idFrontPath, :idBackPath, :faceImagePath,
       :faceMatchScore
     ) RETURNING kyc_id, kyc_reference, status, created_at`,
    {
      ref, userId: userId || null, phone,
      operatorId: operatorId || null, iccid: iccid || null, nin: nin || null,
      firstName: firstName || null, lastName: lastName || null,
      dateOfBirth: dateOfBirth || null, sex: sex || null,
      nationality: nationality || null, address: address || null,
      districtId: districtId || null, chiefdomId: chiefdomId || null,
      idType: idType || null, idExpiryDate: idExpiryDate || null,
      idFrontPath: idFrontPath || null, idBackPath: idBackPath || null,
      faceImagePath: faceImagePath || null,
      faceMatchScore: faceMatchScore ?? null,
    }
  );

  return { kyc_id: row.kyc_id, kyc_reference: row.kyc_reference, status: row.status };
}

/* ─── Get KYC status by ref or NIN (public) ────────────────────────────── */
export async function getKycStatus(ref) {
  const row = await queryOne(
    `SELECT k.kyc_reference, k.phone, k.status, k.nin,
            k.first_name, k.last_name,
            k.created_at, k.updated_at, k.rejection_reason,
            o.operator_name
     FROM kyc_submissions k
     LEFT JOIN operators o ON o.operator_id = k.operator_id
     WHERE k.kyc_reference = :ref OR k.nin = :ref
     ORDER BY k.created_at DESC`,
    { ref }
  );
  if (!row) throw ApiError.notFound('KYC submission not found');
  return row;
}

/* ─── List KYC (admin) ───────────────────────────────────────────────────── */
export async function listKyc({
  status, operatorId, districtId, dateFrom, dateTo, search,
  limit = 25, offset = 0,
} = {}) {
  const conds = ['1=1'];
  const params = {};

  if (status)     { conds.push('k.status = :status');           params.status     = status; }
  if (operatorId) { conds.push('k.operator_id = :operatorId');  params.operatorId = operatorId; }
  if (districtId) { conds.push('k.district_id = :districtId');  params.districtId = districtId; }
  if (dateFrom)   { conds.push('k.created_at >= :dateFrom');    params.dateFrom   = dateFrom; }
  if (dateTo)     { conds.push('k.created_at <= :dateTo');      params.dateTo     = dateTo; }
  if (search)     {
    conds.push(`(k.phone ILIKE :search OR k.kyc_reference ILIKE :search OR k.nin ILIKE :search OR k.first_name ILIKE :search OR k.last_name ILIKE :search)`);
    params.search = `%${search}%`;
  }

  const where = conds.join(' AND ');
  params.limit  = Number(limit);
  params.offset = Number(offset);

  const [rows, [{ total }]] = await Promise.all([
    query(
      `SELECT k.kyc_id, k.kyc_reference, k.phone, k.status, k.nin,
              k.first_name, k.last_name, k.id_type, k.created_at, k.updated_at,
              o.operator_name, d.name AS district,
              u.full_name AS reviewer_name
       FROM kyc_submissions k
       LEFT JOIN operators o ON o.operator_id = k.operator_id
       LEFT JOIN districts d ON d.district_id = k.district_id
       LEFT JOIN users u     ON u.user_id      = k.reviewed_by
       WHERE ${where}
       ORDER BY k.created_at DESC
       LIMIT :limit OFFSET :offset`,
      params
    ),
    query(`SELECT COUNT(*) AS total FROM kyc_submissions k WHERE ${where}`, params),
  ]);

  return { rows, total: Number(total) };
}

/* ─── Get single KYC (admin) ─────────────────────────────────────────────── */
export async function getKyc(id) {
  const row = await queryOne(
    `SELECT k.*,
            o.operator_name, d.name AS district, ch.name AS chiefdom,
            u.full_name AS reviewer_name,
            oc.full_name AS operator_confirmed_name
     FROM kyc_submissions k
     LEFT JOIN operators o ON o.operator_id = k.operator_id
     LEFT JOIN districts d ON d.district_id = k.district_id
     LEFT JOIN chiefdoms ch ON ch.chiefdom_id = k.chiefdom_id
     LEFT JOIN users u  ON u.user_id  = k.reviewed_by
     LEFT JOIN users oc ON oc.user_id = k.operator_confirmed_by
     WHERE k.kyc_id = :id`,
    { id }
  );
  if (!row) throw ApiError.notFound('KYC submission not found');
  return row;
}

/* ─── Approve KYC ────────────────────────────────────────────────────────── */
export async function approveKyc(id, { reviewedBy }) {
  const k = await queryOne(`SELECT kyc_id, status FROM kyc_submissions WHERE kyc_id = :id`, { id });
  if (!k) throw ApiError.notFound('KYC submission not found');
  if (k.status === 'APPROVED') throw ApiError.badRequest('Already approved');

  // Set expires_at to 2 years from now
  const expiresAt = new Date();
  expiresAt.setFullYear(expiresAt.getFullYear() + 2);

  await query(
    `UPDATE kyc_submissions
     SET status = 'APPROVED', reviewed_by = :reviewedBy, reviewed_at = NOW(),
         expires_at = :expiresAt, updated_at = NOW()
     WHERE kyc_id = :id`,
    { id, reviewedBy, expiresAt }
  );
  return getKyc(id);
}

/* ─── Reject KYC ─────────────────────────────────────────────────────────── */
export async function rejectKyc(id, { reviewedBy, reason }) {
  if (!reason) throw ApiError.badRequest('Rejection reason is required');
  await query(
    `UPDATE kyc_submissions
     SET status = 'REJECTED', reviewed_by = :reviewedBy, reviewed_at = NOW(),
         rejection_reason = :reason, updated_at = NOW()
     WHERE kyc_id = :id`,
    { id, reviewedBy, reason }
  );
  return getKyc(id);
}

/* ─── Request more info ──────────────────────────────────────────────────── */
export async function requestKycInfo(id, { reviewedBy, note }) {
  await query(
    `UPDATE kyc_submissions
     SET status = 'UNDER_REVIEW', reviewed_by = :reviewedBy, reviewed_at = NOW(),
         rejection_reason = :note, updated_at = NOW()
     WHERE kyc_id = :id`,
    { id, reviewedBy, note: note || null }
  );
  return getKyc(id);
}

/* ─── Operator confirm KYC ──────────────────────────────────────────────── */
export async function operatorConfirmKyc(id, { confirmedBy }) {
  await query(
    `UPDATE kyc_submissions
     SET operator_confirmed_by = :confirmedBy, operator_confirmed_at = NOW(), updated_at = NOW()
     WHERE kyc_id = :id`,
    { id, confirmedBy }
  );
  return getKyc(id);
}

/* ─── KYC summary counts (admin) ─────────────────────────────────────────── */
export async function getKycSummary({ operatorId } = {}) {
  const cond    = operatorId ? 'WHERE operator_id = :operatorId' : '';
  const params  = operatorId ? { operatorId } : {};

  const [counts] = await query(
    `SELECT COUNT(*) AS total,
            SUM(CASE WHEN status = 'PENDING'      THEN 1 ELSE 0 END) AS pending,
            SUM(CASE WHEN status = 'UNDER_REVIEW' THEN 1 ELSE 0 END) AS under_review,
            SUM(CASE WHEN status = 'APPROVED'     THEN 1 ELSE 0 END) AS approved,
            SUM(CASE WHEN status = 'REJECTED'     THEN 1 ELSE 0 END) AS rejected
     FROM kyc_submissions ${cond}`,
    params
  );
  return { ...counts, total: Number(counts.total) };
}
