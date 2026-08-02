import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { randomUUID } from 'crypto';
import fs from 'fs';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/http.js';
import { authenticate, optionalAuth } from '../../middleware/auth.js';
import { query } from '../../config/db.js';
import { ApiError } from '../../utils/ApiError.js';

const router = Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(process.cwd(), 'uploads', new Date().toISOString().slice(0, 10));
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${randomUUID()}${ext}`);
  },
});

const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

router.post('/upload', optionalAuth, upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('No file uploaded');
  const complaintId = req.body.complaintId ? Number(req.body.complaintId) : null;

  const [row] = await query(
    `INSERT INTO complaint_attachments (complaint_id, file_name, file_path, mime_type, file_size, uploaded_by)
     VALUES (:complaintId, :fileName, :filePath, :mimeType, :fileSize, :uploadedBy)
     RETURNING attachment_id`,
    {
      complaintId,
      fileName:   req.file.originalname,
      filePath:   req.file.path,
      mimeType:   req.file.mimetype,
      fileSize:   req.file.size,
      uploadedBy: req.user?.userId || null,
    }
  );
  ok(res, { attachment_id: row.attachment_id, file_name: req.file.originalname });
}));

router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const [att] = await query(`SELECT * FROM complaint_attachments WHERE attachment_id = :id`, { id: req.params.id });
  if (!att) throw ApiError.notFound('Attachment not found');
  res.sendFile(path.resolve(att.file_path));
}));

export default router;
