import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketIO } from 'socket.io';
import apiRoutes from './routes/index.js';
import { notFoundHandler, errorHandler } from './middleware/error.js';
import { optionalAuth } from './middleware/auth.js';
import * as complaintSvc from './modules/complaints/complaints.service.js';
import { broadcastToAdmins } from './modules/notifications/notifications.service.js';

export function createApp() {
  const app = express();
  const httpServer = createServer(app);

  const io = new SocketIO(httpServer, {
    cors: { origin: '*' },
  });

  app.use(helmet({ crossOriginResourcePolicy: false }));
  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));
  app.set('trust proxy', 1);

  // Attach Socket.io instance for use in routes
  app.set('io', io);

  // Root health check
  app.get('/', (_req, res) => {
    res.json({ status: 'ok', message: 'NatCA CMS & QoE API is online' });
  });

  // Prevent stale JSON on CDNs / mobile browsers
  app.use('/api', (_req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    next();
  });

  // Versioned API
  app.use('/api/v1', apiRoutes);

  // Flutter compatibility layer — maps /api/qoe/* to complaints module
  const qoeCompat = express.Router();
  qoeCompat.post('/submit', optionalAuth, async (req, res, next) => {
    try {
      const { operator_id, issue_type, severity, district, area_detail, lat, lng, description,
              billing_sub_category, transaction_ref, disputed_amount, transaction_date } = req.body;
      const result = await complaintSvc.submitComplaint({
        operatorId:         operator_id,
        issueType:          issue_type,
        severity:           severity || 'MEDIUM',
        areaDetail:         area_detail,
        latitude:           lat,
        longitude:          lng,
        description,
        billingSubCategory: billing_sub_category,
        transactionRef:     transaction_ref,
        disputedAmount:     disputed_amount,
        transactionDate:    transaction_date,
        source:             'MOBILE',
        userId:             req.user?.userId,
        ip:                 req.ip,
      }, req.app.get('io'));
      res.json({ complaint_id: result.complaint_id, complaint_ref: result.complaint_ref, status: result.status });
    } catch (err) { next(err); }
  });
  qoeCompat.get('/', optionalAuth, async (req, res, next) => {
    try {
      const data = await complaintSvc.listComplaints({ limit: 50, offset: 0, userId: req.user?.userId });
      res.json({ rows: data.rows });
    } catch (err) { next(err); }
  });
  app.use('/api/qoe', qoeCompat);

  // Static uploads
  app.use('/uploads', express.static('uploads'));

  app.use(notFoundHandler);
  app.use(errorHandler);

  io.on('connection', (socket) => {
    // Staff join their personal room for targeted notifications
    socket.on('join', (userId) => {
      socket.join(`user:${userId}`);
    });

    // Staff join the shared admin room for broadcast SLA/status events
    socket.on('join:admin', () => {
      socket.join('admin');
    });

    // Admin subscribes to a specific complaint room for live updates
    socket.on('join:complaint', (complaintId) => {
      socket.join(`complaint:${complaintId}`);
    });
    socket.on('leave:complaint', (complaintId) => {
      socket.leave(`complaint:${complaintId}`);
    });

    // Operator joins their operator-specific room
    socket.on('join:operator', (operatorId) => {
      socket.join(`operator:${operatorId}`);
    });
  });

  return { app, httpServer };
}
