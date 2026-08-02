import { Router } from 'express';
import authRoutes           from '../modules/auth/auth.routes.js';
import complaintRoutes      from '../modules/complaints/complaints.routes.js';
import operatorRoutes       from '../modules/operators/operators.routes.js';
import districtRoutes       from '../modules/districts/districts.routes.js';
import usersRoutes          from '../modules/users/users.routes.js';
import attachmentRoutes     from '../modules/attachments/attachments.routes.js';
import ussdRoutes           from '../modules/ussd/ussd.routes.js';
import kycRoutes            from '../modules/kyc/kyc.routes.js';
import simRoutes            from '../modules/sim/sim.routes.js';
import operatorPortalRoutes from '../modules/operator-portal/operator-portal.routes.js';
import notificationsRoutes  from '../modules/notifications/notifications.routes.js';
import analyticsRoutes      from '../modules/analytics/analytics.routes.js';
import speedRoutes          from '../modules/speed/speed.routes.js';
import contentRoutes        from '../modules/content/content.routes.js';
import incidentsRoutes      from '../modules/incidents/incidents.routes.js';
import statsRoutes          from '../modules/stats/stats.routes.js';
import tariffsRoutes        from '../modules/tariffs/tariffs.routes.js';
import adminRoutes          from '../modules/admin/admin.routes.js';

const router = Router();

router.get('/health', (_req, res) => res.json({ status: 'ok', service: 'natca-cms', ts: new Date().toISOString() }));

router.use('/auth',            authRoutes);
router.use('/complaints',      complaintRoutes);
router.use('/operators',       operatorRoutes);
router.use('/districts',       districtRoutes);
router.use('/users',           usersRoutes);
router.use('/attachments',     attachmentRoutes);
router.use('/ussd',            ussdRoutes);
router.use('/kyc',             kycRoutes);
router.use('/sim',             simRoutes);
router.use('/operator-portal', operatorPortalRoutes);
router.use('/notifications',   notificationsRoutes);
router.use('/analytics',       analyticsRoutes);
router.use('/speed',           speedRoutes);
router.use('/content',         contentRoutes);
router.use('/incidents',       incidentsRoutes);
router.use('/stats',           statsRoutes);
router.use('/tariffs',         tariffsRoutes);
router.use('/admin',           adminRoutes);

export default router;
