import { get, patch } from '../api/client.js';

export const kycService = {
  list(params = {}) {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '' && v !== 'ALL') {
        q.set(k, v);
      }
    });
    return get(`/kyc?${q.toString()}`);
  },

  getById(id) {
    return get(`/kyc/${id}`);
  },

  review(id, { status, rejectionReason, notes }) {
    return patch(`/kyc/${id}`, {
      status,
      rejectionReason,
      notes,
    });
  },
};
