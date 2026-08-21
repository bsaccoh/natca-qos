import { get, post, put, del } from '../api/client.js';

export const contentService = {
  // News & FAQs Content
  getContent(params = {}) {
    const q = new URLSearchParams(params).toString();
    return get(`/content${q ? `?${q}` : ''}`);
  },

  createContent(data) {
    return post('/content', data);
  },

  updateContent(id, data) {
    return put(`/content/${id}`, data);
  },

  deleteContent(id) {
    return del(`/content/${id}`);
  },

  // USSD Codes
  getUssdCodes(params = {}) {
    const q = new URLSearchParams(params).toString();
    return get(`/ussd${q ? `?${q}` : ''}`);
  },

  createUssd(data) {
    return post('/ussd', data);
  },

  updateUssd(id, data) {
    return put(`/ussd/${id}`, data);
  },

  deleteUssd(id) {
    return del(`/ussd/${id}`);
  },

  // Network Incidents
  getIncidents(params = {}) {
    const q = new URLSearchParams(params).toString();
    return get(`/incidents${q ? `?${q}` : ''}`);
  },

  createIncident(data) {
    return post('/incidents', data);
  },

  updateIncident(id, data) {
    return put(`/incidents/${id}`, data);
  },
};
