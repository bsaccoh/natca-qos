import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, created } from '../../utils/http.js';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import * as svc from './content.service.js';

const router = Router();
const STAFF = ['SYSTEM_ADMIN', 'NATCA_ADMIN', 'NATCA_ANALYST'];

// Public route for Citizen portal to fetch active content (Fraud alerts, etc)
router.get('/public/:type', asyncHandler(async (req, res) => {
  ok(res, await svc.getActiveContent(req.params.type));
}));

router.use(authenticate);

router.get('/', requireRole(...STAFF), asyncHandler(async (req, res) => {
  const { limit, offset, type, is_published, category } = req.query;
  ok(res, await svc.listContent({
    limit, offset,
    type, category,
    is_published: is_published !== undefined ? is_published === 'true' : undefined,
  }));
}));

router.get('/:id', requireRole(...STAFF), asyncHandler(async (req, res) => {
  ok(res, await svc.getContent(Number(req.params.id)));
}));

router.post('/', requireRole('SYSTEM_ADMIN', 'NATCA_ADMIN'), asyncHandler(async (req, res) => {
  const body = z.object({
    contentType: z.string().min(1),
    title: z.string().min(1),
    body: z.string().min(1),
    category: z.string().optional().nullable(),
    isPublished: z.boolean().optional(),
    expiresAt: z.string().optional().nullable(),
    mediaType: z.string().optional().nullable(),
    mediaUrl: z.string().optional().nullable()
  }).parse(req.body);

  created(res, await svc.createContent({ ...body, authorId: req.user.userId }));
}));

router.put('/:id', requireRole('SYSTEM_ADMIN', 'NATCA_ADMIN'), asyncHandler(async (req, res) => {
  const body = z.object({
    contentType: z.string().optional(),
    title: z.string().optional(),
    body: z.string().optional(),
    category: z.string().optional().nullable(),
    isPublished: z.boolean().optional(),
    expiresAt: z.string().optional().nullable(),
    mediaType: z.string().optional().nullable(),
    mediaUrl: z.string().optional().nullable()
  }).parse(req.body);

  ok(res, await svc.updateContent(Number(req.params.id), body));
}));

router.delete('/:id', requireRole('SYSTEM_ADMIN', 'NATCA_ADMIN'), asyncHandler(async (req, res) => {
  ok(res, await svc.deleteContent(Number(req.params.id)));
}));

export default router;
