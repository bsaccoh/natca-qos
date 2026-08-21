import { get, post } from '../api/client.js';

export const citizenService = {
  // Public Content & Announcements
  getNews: () => get('/content/public/NEWS'),
  getFaqs: () => get('/content/public/FAQ'),
  getRights: () => get('/content/public/RIGHTS').catch(() => ({ data: [] })),
  getTariffs: () => get('/content/public/TARIFFS').catch(() => ({ data: [] })),

  // USSD Directory
  getUssdCodes: () => get('/ussd/public'),

  // Complaints
  submitComplaint: (formData) => post('/complaints', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  trackComplaint: (reference) => get(`/complaints/track/${encodeURIComponent(reference)}`),
  getMyComplaints: (params = {}) => get('/complaints/my', { params }),
  rateResolution: (complaintId, rating, feedback) => post(`/complaints/${complaintId}/rate`, { rating, feedback }),

  // KYC / SIM Verification
  submitKyc: (formData) => post('/kyc/submit', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  checkKycStatus: (nin) => get(`/kyc/status/${encodeURIComponent(nin)}`),

  // Speed Test & QoS Diagnostics
  recordSpeedTest: (data) => post('/speed/submit', data),
  getSpeedBenchmarks: () => get('/speed/compare'),
};
