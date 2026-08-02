import { Router }       from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok }           from '../../utils/http.js';
import { authenticate } from '../../middleware/auth.js';
import { requireRole }  from '../../middleware/rbac.js';
import * as svc         from './notifications.service.js';

const router = Router();
router.use(authenticate);

const STAFF = ['SYSTEM_ADMIN', 'NATCA_ADMIN', 'NATCA_ANALYST', 'INSPECTOR', 'OPERATOR_ADMIN'];

router.get('/', requireRole(...STAFF), asyncHandler(async (req, res) => {
  ok(res, await svc.listNotifications(req.user.userId, {
    limit:      req.query.limit     ?? 30,
    unreadOnly: req.query.unread === 'true',
  }));
}));

router.get('/count', requireRole(...STAFF), asyncHandler(async (req, res) => {
  ok(res, { unread: await svc.unreadCount(req.user.userId) });
}));

router.patch('/:id/read', requireRole(...STAFF), asyncHandler(async (req, res) => {
  await svc.markRead(req.params.id, req.user.userId);
  ok(res, { marked: true });
}));

router.patch('/read-all', requireRole(...STAFF), asyncHandler(async (req, res) => {
  ok(res, await svc.markAllRead(req.user.userId));
}));

export default router;
