import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../../middleware/auth.js';
import { requireRole, operatorScope } from '../../middleware/rbac.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, created } from '../../utils/http.js';
import { ApiError } from '../../utils/ApiError.js';
import * as drivetestService from './drivetest.service.js';
import { getThresholds } from './thresholds.service.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

// Regulatory thresholds definition
router.get(
  '/thresholds',
  asyncHandler(async (req, res) => {
    const technology = req.query.technology || '4G';
    const thresholds = await getThresholds(technology);
    ok(res, thresholds);
  })
);

// Heatmap grid tiles for map rendering
router.get(
  '/heatmap',
  asyncHandler(async (req, res) => {
    const { operatorId, technology, isDeadZone } = req.query;
    const tiles = await drivetestService.getHeatmapTiles({
      operatorId: operatorId ? Number(operatorId) : null,
      technology: technology || '4G',
      isDeadZone: isDeadZone !== undefined ? isDeadZone === 'true' : undefined,
    });
    ok(res, tiles);
  })
);

// Blackspots list
router.get(
  '/blackspots',
  asyncHandler(async (req, res) => {
    const { operatorId, limit } = req.query;
    const spots = await drivetestService.getBlackspots({
      operatorId: operatorId ? Number(operatorId) : null,
      limit: limit ? Number(limit) : 50,
    });
    ok(res, spots);
  })
);

// List drive tests (authenticated)
router.get(
  '/',
  authenticate,
  operatorScope,
  asyncHandler(async (req, res) => {
    const { districtId, limit, offset } = req.query;
    const operatorId = req.scope.operatorId;
    const data = await drivetestService.listDriveTests({
      operatorId,
      districtId: districtId ? Number(districtId) : null,
      limit: limit ? Number(limit) : 50,
      offset: offset ? Number(offset) : 0,
    });
    ok(res, data);
  })
);

// Upload & ingest drive test CSV/log
router.post(
  '/upload',
  authenticate,
  requireRole('SYSTEM_ADMIN', 'NATCA_ADMIN', 'NATCA_ANALYST', 'INSPECTOR'),
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw ApiError.badRequest('Please upload a CSV or log file');

    const fileContent = req.file.buffer.toString('utf-8');
    const { operatorId, testName, technology, districtId, clusterName, deviceModel, notes } = req.body;

    if (!testName) throw ApiError.badRequest('testName is required');

    const result = await drivetestService.ingestDriveTest({
      operatorId: operatorId ? Number(operatorId) : null,
      testName,
      technology: technology || '4G',
      districtId: districtId ? Number(districtId) : null,
      clusterName,
      deviceModel,
      testerName: req.user?.fullName || 'NatCA Inspector',
      notes,
      fileContent,
    });

    created(res, result);
  })
);

// Get single drive test details and samples
router.get(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const data = await drivetestService.getDriveTestDetails(Number(req.params.id));
    ok(res, data);
  })
);

export default router;
