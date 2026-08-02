import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/http.js';
import { authenticate, optionalAuth } from '../../middleware/auth.js';
import { requireRole, operatorScope } from '../../middleware/rbac.js';
import * as svc from './speed.service.js';

const router = Router();
const STAFF = ['SYSTEM_ADMIN', 'NATCA_ADMIN', 'NATCA_ANALYST'];

// Public: Submit a speed test
router.post('/submit', optionalAuth, asyncHandler(async (req, res) => {
  const body = z.object({
    operatorId:    z.number().int().optional(),
    districtId:    z.number().int().optional(),
    latitude:      z.number().optional(),
    longitude:     z.number().optional(),
    networkType:   z.string().optional(),
    downloadMbps:  z.number(),
    uploadMbps:    z.number(),
    pingMs:        z.number(),
    jitterMs:      z.number().optional(),
    packetLossPct: z.number().optional(),
    cellId:        z.string().optional(),
    source:        z.string().optional(),
  }).parse(req.body);

  ok(res, await svc.submitSpeedTest({ ...body, userId: req.user?.userId }));
}));

// Public: Get operator averages
router.get('/compare', asyncHandler(async (req, res) => {
  ok(res, await svc.getOperatorComparison());
}));

// Staff: List specific tests
router.get('/', authenticate, requireRole(...STAFF, 'OPERATOR_ADMIN'), operatorScope, asyncHandler(async (req, res) => {
  ok(res, await svc.listTests({
    operatorId:  req.scope?.operatorId || (req.query.operatorId ? Number(req.query.operatorId) : undefined),
    districtId:  req.query.districtId ? Number(req.query.districtId) : undefined,
    networkType: req.query.networkType,
    limit:       req.query.limit,
    offset:      req.query.offset,
  }));
}));

// Public: 5MB payload for download speed test
router.get('/payload', (req, res) => {
  res.set({
    'Content-Type': 'application/octet-stream',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Content-Length': 5 * 1024 * 1024 // 5MB
  });
  const buffer = Buffer.alloc(5 * 1024 * 1024, '0');
  res.send(buffer);
});

// Public: Upload sink for upload speed test
router.post('/payload', (req, res) => {
  res.status(200).json({ success: true, size: req.headers['content-length'] });
});

// Admin: Map Data
router.get('/analytics/map', authenticate, requireRole(...STAFF, 'OPERATOR_ADMIN'), operatorScope, asyncHandler(async (req, res) => {
  ok(res, await svc.getMapData());
}));

// Admin: Historical
router.get('/analytics/historical', authenticate, requireRole(...STAFF, 'OPERATOR_ADMIN'), operatorScope, asyncHandler(async (req, res) => {
  ok(res, await svc.getHistorical(req.query.days || 30));
}));

// Admin: Districts
router.get('/analytics/districts', authenticate, requireRole(...STAFF, 'OPERATOR_ADMIN'), operatorScope, asyncHandler(async (req, res) => {
  ok(res, await svc.getDistrictAverages());
}));

// Admin: Peak Analysis
router.get('/analytics/peak', authenticate, requireRole(...STAFF, 'OPERATOR_ADMIN'), operatorScope, asyncHandler(async (req, res) => {
  ok(res, await svc.getPeakAnalysis());
}));

export default router;
