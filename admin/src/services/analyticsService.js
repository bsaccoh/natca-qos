import { get } from '../api/client.js';

export const analyticsService = {
  getDashboardKpis() {
    return get('/analytics/dashboard-kpis');
  },

  getAnalyticsDashboard(days = 30) {
    return get(`/analytics/dashboard?days=${days}`);
  },

  getSlaAlerts() {
    return get('/analytics/sla-alerts');
  },

  getOperatorCompliance() {
    return get('/analytics/operator-compliance');
  },

  getSpeedHistorical(days = 30) {
    return get(`/speed/analytics/historical?days=${days}`);
  },

  getSpeedDistricts() {
    return get('/speed/analytics/districts');
  },

  getSpeedPeak() {
    return get('/speed/analytics/peak');
  },

  getSpeedMap() {
    return get('/speed/analytics/map');
  },

  getFeedback(params = {}) {
    const q = new URLSearchParams(params).toString();
    return get(`/stats/feedback${q ? `?${q}` : ''}`);
  },
};
