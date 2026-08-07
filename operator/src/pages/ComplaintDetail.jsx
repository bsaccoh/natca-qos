import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Paper, Typography, Grid, Chip, Stack, Button, TextField,
  MenuItem, Divider, Alert, IconButton, Tooltip, CircularProgress,
} from '@mui/material';
import ArrowBackIcon    from '@mui/icons-material/ArrowBack';
import SendIcon         from '@mui/icons-material/Send';
import CheckCircleIcon  from '@mui/icons-material/CheckCircle';
import WarningIcon      from '@mui/icons-material/Warning';
import { get, patch }   from '../api/client.js';
import { STATUS_COLOR, SEVERITY_COLOR } from '../theme/theme.js';

function Field({ label, value }) {
  return (
    <Box sx={{ mb: 1.5 }}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="body2">{value || '-'}</Typography>
    </Box>
  );
}

export default function ComplaintDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [note, setNote]           = useState('');
  const [status, setStatus]       = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess]     = useState('');
  const [error, setError]         = useState('');

  const load = async () => {
    try {
      const r = await get(`/operator-portal/complaints/${id}`);
      setComplaint(r.data);
    } catch (err) {
      setError('Failed to load complaint');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const handleRespond = async () => {
    if (!note.trim()) return;
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const body = { note: note.trim() };
      if (status) body.status = status;
      await patch(`/operator-portal/complaints/${id}/respond`, body);
      setSuccess(status === 'CLOSED' ? 'Complaint closed. Citizen has been notified.' : 'Response submitted successfully.');
      setNote('');
      setStatus('');
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit response');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}><CircularProgress /></Box>;
  if (!complaint) return <Alert severity="error">Complaint not found</Alert>;

  const c = complaint;
  const slaBreached = c.sla_deadline && new Date(c.sla_deadline) < new Date() && !['RESOLVED', 'CLOSED'].includes(c.status);
  const isClosed = c.status === 'CLOSED' || c.status === 'RESOLVED';

  return (
    <Box>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
        <Tooltip title="Back to list">
          <IconButton onClick={() => navigate('/complaints')}><ArrowBackIcon /></IconButton>
        </Tooltip>
        <Typography variant="h5" fontWeight={700}>{c.complaint_ref}</Typography>
        <Chip size="small" label={c.status} sx={{ bgcolor: STATUS_COLOR[c.status] || '#64748b', color: '#fff' }} />
        <Chip size="small" label={c.severity} color={SEVERITY_COLOR[c.severity] || 'default'} />
        {slaBreached && <Chip size="small" icon={<WarningIcon />} label="SLA Breached" color="error" />}
      </Stack>

      <Grid container spacing={2}>
        {/* Complaint details */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>Complaint Details</Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 6 }}><Field label="Issue Type" value={c.issue_type} /></Grid>
              <Grid size={{ xs: 6 }}><Field label="Priority" value={c.priority} /></Grid>
              <Grid size={{ xs: 6 }}><Field label="District" value={c.district} /></Grid>
              <Grid size={{ xs: 6 }}><Field label="Area" value={c.area_detail} /></Grid>
              <Grid size={{ xs: 6 }}><Field label="Created" value={new Date(c.created_at).toLocaleString()} /></Grid>
              <Grid size={{ xs: 6 }}>
                <Field label="SLA Deadline" value={c.sla_deadline ? new Date(c.sla_deadline).toLocaleString() : '-'} />
              </Grid>
              {c.contact_name && <Grid size={{ xs: 6 }}><Field label="Contact Name" value={c.contact_name} /></Grid>}
              {c.contact_phone && <Grid size={{ xs: 6 }}><Field label="Contact Phone" value={c.contact_phone} /></Grid>}
            </Grid>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Description</Typography>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{c.description || 'No description provided'}</Typography>

            {c.billing_sub_category && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Billing Details</Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 6 }}><Field label="Category" value={c.billing_sub_category} /></Grid>
                  <Grid size={{ xs: 6 }}><Field label="Transaction Ref" value={c.transaction_ref} /></Grid>
                  <Grid size={{ xs: 6 }}><Field label="Disputed Amount" value={c.disputed_amount ? `SLE ${c.disputed_amount}` : '-'} /></Grid>
                  <Grid size={{ xs: 6 }}><Field label="Transaction Date" value={c.transaction_date} /></Grid>
                </Grid>
              </>
            )}
          </Paper>

          {/* Timeline */}
          {c.timeline && c.timeline.length > 0 && (
            <Paper sx={{ p: 3, mt: 2 }}>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>Timeline</Typography>
              <Stack spacing={1.5}>
                {c.timeline.map((t, i) => (
                  <Box key={i} sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'primary.main', mt: 0.8, flexShrink: 0 }} />
                    <Box>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="caption" fontWeight={700}>{t.event_type}</Typography>
                        {t.new_value && <Chip size="small" label={t.new_value} sx={{ height: 18, fontSize: 10 }} />}
                      </Stack>
                      <Typography variant="body2">{t.note}</Typography>
                      <Typography variant="caption" color="text.secondary">{new Date(t.created_at).toLocaleString()}</Typography>
                    </Box>
                  </Box>
                ))}
              </Stack>
            </Paper>
          )}
        </Grid>

        {/* Response panel */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
              {isClosed ? 'Complaint is closed' : 'Submit Response'}
            </Typography>

            {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {!isClosed && (
              <Stack spacing={2}>
                <TextField
                  multiline rows={4}
                  label="Response Note"
                  placeholder="Enter your response or findings..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  fullWidth
                />
                <TextField select label="Update Status (optional)" value={status}
                  onChange={(e) => setStatus(e.target.value)} fullWidth size="small">
                  <MenuItem value="">No status change</MenuItem>
                  <MenuItem value="UNDER_REVIEW">Under Review</MenuItem>
                  <MenuItem value="RESOLVED">Resolved</MenuItem>
                  <MenuItem value="ESCALATED">Escalate to NatCA</MenuItem>
                  <MenuItem value="CLOSED">Close Complaint</MenuItem>
                </TextField>

                {status === 'CLOSED' && (
                  <Alert severity="info" sx={{ fontSize: '0.82rem' }}>
                    Closing this complaint will notify the citizen via SMS, email, and in-app notification.
                  </Alert>
                )}

                <Stack direction="row" spacing={1.5}>
                  <Button variant="contained" startIcon={<SendIcon />}
                    onClick={handleRespond} disabled={submitting || !note.trim()}>
                    {submitting ? 'Submitting...' : 'Submit Response'}
                  </Button>
                  {status !== 'CLOSED' && (
                    <Button variant="outlined" color="error"
                      startIcon={<CheckCircleIcon />}
                      onClick={() => { setStatus('CLOSED'); }}
                      disabled={submitting}>
                      Close Complaint
                    </Button>
                  )}
                </Stack>
              </Stack>
            )}

            {isClosed && (
              <Box>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                  <CheckCircleIcon color="success" />
                  <Typography variant="body2" fontWeight={600}>
                    This complaint has been {c.status.toLowerCase()}.
                  </Typography>
                </Stack>
                {c.resolved_at && (
                  <Typography variant="caption" color="text.secondary">
                    Resolved at: {new Date(c.resolved_at).toLocaleString()}
                  </Typography>
                )}
                {c.closed_at && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    Closed at: {new Date(c.closed_at).toLocaleString()}
                  </Typography>
                )}
              </Box>
            )}
          </Paper>

          {/* Notes */}
          {c.notes && c.notes.length > 0 && (
            <Paper sx={{ p: 3, mt: 2 }}>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>Notes</Typography>
              <Stack spacing={1.5}>
                {c.notes.map((n, i) => (
                  <Box key={i} sx={{ p: 1.5, borderRadius: 1.5, bgcolor: 'action.hover' }}>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{n.note}</Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">{n.actor_name || 'System'}</Typography>
                      <Typography variant="caption" color="text.disabled">{new Date(n.created_at).toLocaleString()}</Typography>
                    </Stack>
                  </Box>
                ))}
              </Stack>
            </Paper>
          )}
        </Grid>
      </Grid>
    </Box>
  );
}
