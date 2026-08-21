import { get, post, put, patch, del } from '../api/client.js';

export const adminService = {
  // Users & Staff
  getUsers(params = {}) {
    const q = new URLSearchParams(params).toString();
    return get(`/admin/users${q ? `?${q}` : ''}`);
  },

  createUser(data) {
    return post('/admin/users', data);
  },

  updateUser(id, data) {
    return put(`/admin/users/${id}`, data);
  },

  toggleUserStatus(id, isActive) {
    return patch(`/admin/users/${id}/status`, { isActive });
  },

  resetPassword(id, newPassword) {
    return post(`/admin/users/${id}/reset-password`, { newPassword });
  },

  // Operators
  getOperators() {
    return get('/operators');
  },

  createOperator(data) {
    return post('/operators', data);
  },

  updateOperator(id, data) {
    return put(`/operators/${id}`, data);
  },

  // Alert Settings
  getAlertSettings() {
    return get('/admin/alert-settings');
  },

  updateAlertSettings(settings) {
    return put('/admin/alert-settings', settings);
  },

  // Security Center
  getAuditLogs(params = {}) {
    const q = new URLSearchParams(params).toString();
    return get(`/admin/security/audit-logs${q ? `?${q}` : ''}`);
  },

  getSessions() {
    return get('/admin/security/sessions');
  },

  terminateSession(id) {
    return del(`/admin/security/sessions/${id}`);
  },

  terminateAllOtherSessions() {
    return del('/admin/security/sessions/others');
  },

  getSystemSettings() {
    return get('/admin/security/settings');
  },

  updateSystemSettings(settings) {
    return put('/admin/security/settings', settings);
  },

  getPermissions() {
    return get('/admin/security/permissions');
  },

  updateRolePermissions(role, permissions) {
    return put(`/admin/security/permissions/${role}`, { permissions });
  },
};
