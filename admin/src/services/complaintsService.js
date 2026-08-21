import { get, patch } from '../api/client.js';

export const complaintsService = {
  list(params = {}) {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '' && v !== 'ALL') {
        q.set(k, v);
      }
    });
    return get(`/complaints?${q.toString()}`);
  },

  getById(id) {
    return get(`/complaints/${id}`);
  },

  updateStatus(id, { status, resolutionNote, internalNote }) {
    return patch(`/complaints/${id}`, {
      status,
      resolutionNote,
      internalNote,
    });
  },

  assignOfficer(id, officerId) {
    return patch(`/complaints/${id}/assign`, { officerId: officerId || null });
  },

  escalate(id, internalNote = 'Auto-escalated via SLA Alert Panel') {
    return patch(`/complaints/${id}`, { status: 'ESCALATED', internalNote });
  },
};
