import { get, post, patch } from '../api/client.js';

export const operatorService = {
  // Incidents
  getIncidents: (params = {}) => get('/incidents', { params }),
  getIncident: (id) => get(`/incidents/${id}`),
  createIncident: (data) => post('/incidents', data),
  updateIncident: (id, data) => patch(`/incidents/${id}`, data),

  // Dashboard & KPIs
  getDashboardKpis: () => get('/operator-portal/dashboard'),

  // Complaints
  getComplaints: (params = {}) => get('/operator-portal/complaints', { params }),
  getComplaint: (id) => get(`/operator-portal/complaints/${id}`),
  respondComplaint: (id, data) => patch(`/operator-portal/complaints/${id}/respond`, data),

  // KYC
  getKycRecords: (params = {}) => get('/operator-portal/kyc', { params }),
  batchVerifyKyc: (data) => post('/operator-portal/kyc/batch-verify', data),

  // Notifications
  getNotificationCount: () => get('/notifications/count'),
  getNotifications: (params = {}) => get('/notifications', { params }),
  markNotificationsRead: () => patch('/notifications/read-all'),

  // Profile & Password
  getProfile: () => get('/auth/me'),
  updateProfile: (data) => patch('/auth/me', data),
  changePassword: (data) => patch('/auth/password', data),
};
