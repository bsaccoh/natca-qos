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
      <Typography variant="body2" fontWeight={500}>{value || '-'}</Typography>
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
    } catch {
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
      setSuccess(status === 'RESOLVED'
        ? 'Case updated to Resolved. NatCA has been notified to review and close the ticket.'
        : 'Response note submitted successfully.');
      setNote('');
      setStatus('');
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit response');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcknowledge = async () => {
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      await patch(`/operator-portal/complaints/${id}/respond`, { status: 'UNDER_REVIEW', note: 'Operator acknowledged the complaint.' });
      setSuccess('Complaint acknowledged and is now Under Review.');
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to acknowledge');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}><CircularProgress /></Box>;
  if (!complaint) return <Alert severity="error">Complaint not found</Alert>;

  const c = complaint;
  const slaBreached = c.sla_deadline && new Date(c.sla_deadline) < new Date() && !['RESOLVED', 'CLOSED'].includes(c.status);
  const isClosed = c.status === 'CLOSED';
  const isResolved = c.status === 'RESOLVED';

  return (
    <Box sx={{ width: '100%' }}>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 3 }}>
        <Tooltip title="Back to complaints">
          <IconButton onClick={() => navigate('/complaints')} sx={{ border: '1px solid', borderColor: 'divider' }}>
            <ArrowBackIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Typography variant="h5" fontWeight={800} sx={{ fontFamily: 'monospace' }}>
          {c.complaint_ref || `#${c.complaint_id}`}
        </Typography>
        <Chip size="small" label={c.status} sx={{ bgcolor: STATUS_COLOR[c.status] || '#64748b', color: '#fff', fontWeight: 700 }} />
        <Chip size="small" label={c.severity} color={SEVERITY_COLOR[c.severity] || 'default'} sx={{ fontWeight: 700 }} />
        {slaBreached && <Chip size="small" icon={<WarningIcon />} label="SLA Breached" color="error" sx={{ fontWeight: 700 }} />}
      </Stack>

      <Grid container spacing={3}>
        {/* Complaint details */}
        <Grid item xs={12} md={7}>
          <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>Complaint Details</Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}><Field label="Issue Type" value={c.issue_type?.replace(/_/g, ' ')} /></Grid>
              <Grid item xs={6}><Field label="Priority" value={c.priority} /></Grid>
              <Grid item xs={6}><Field label="District" value={c.district} /></Grid>
              <Grid item xs={6}><Field label="Area Detail" value={c.area_detail} /></Grid>
              <Grid item xs={6}><Field label="Submitted On" value={new Date(c.created_at).toLocaleString()} /></Grid>
              <Grid item xs={6}>
                <Field label="SLA Target Resolution" value={c.sla_deadline ? new Date(c.sla_deadline).toLocaleString() : '-'} />
              </Grid>
              {c.contact_name && <Grid item xs={6}><Field label="Contact Person" value={c.contact_name} /></Grid>}
              {c.contact_phone && <Grid item xs={6}><Field label="Contact Phone" value={c.contact_phone} /></Grid>}
            </Grid>

            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Complainant Description</Typography>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, color: 'text.secondary' }}>
              {c.description || 'No description provided'}
            </Typography>

            {(() => {
              const raw = c.network_diagnostics;
              const d = raw
                ? (typeof raw === 'string' ? JSON.parse(raw) : raw)
                : {};

              const signalColor = (dbm) => {
                if (dbm == null) return 'text.secondary';
                if (dbm >= -75) return '#16a34a';
                if (dbm >= -95) return '#d97706';
                return '#dc2626';
              };
              const signalLabel = (dbm) => {
                if (dbm == null) return '';
                if (dbm >= -75) return 'Good';
                if (dbm >= -95) return 'Fair';
                return 'Poor';
              };

              const na = <Typography variant="caption" fontFamily="monospace" sx={{ color: 'text.disabled' }}>N/A</Typography>;

              const DiagRow = ({ label, value, color }) => (
                <>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>{label}</Typography>
                  {value != null && value !== ''
                    ? <Typography variant="caption" fontFamily="monospace" sx={{ color: color || 'text.primary' }}>{value}</Typography>
                    : na}
                </>
              );

              const gpsValue = c.latitude && c.longitude
                ? `${Number(c.latitude).toFixed(5)}, ${Number(c.longitude).toFixed(5)}`
                : (d.geo?.available ? `${d.geo.latitude?.toFixed(5)}, ${d.geo.longitude?.toFixed(5)} (±${Math.round(d.geo.accuracy_m || 0)}m)` : null);

              return (
                <Box sx={{ mb: 2.5 }}>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2 }}>Network Diagnostics</Typography>
                  <Stack spacing={1.5}>
                    <Paper sx={{ p: 2, borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
                      <Typography variant="caption" fontWeight={700} color="primary.main" sx={{ mb: 1, display: 'block' }}>GPS &amp; CONNECTION</Typography>
                      <Box sx={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 0.75, fontSize: 13 }}>
                        <DiagRow label="GPS Location" value={gpsValue} />
                        <DiagRow label="Type" value={d.connectionType || (d.connection?.available ? d.connection.effectiveType?.toUpperCase() : null)} />
                        <DiagRow label="Generation" value={d.estimatedGeneration || (d.connection?.available ? `${d.connection.effectiveType?.toUpperCase()} · ${d.connection.downlinkMbps ?? '?'} Mbps` : null)} />
                        <DiagRow label="Ping" value={d.pingMs != null ? `${d.pingMs} ms` : (d.ping?.available ? `${d.ping.rttMs} ms` : null)} />
                      </Box>
                    </Paper>

                    <Paper sx={{ p: 2, borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
                      <Typography variant="caption" fontWeight={700} color="primary.main" sx={{ mb: 1, display: 'block' }}>CELL / SITE DETAILS</Typography>
                      <Box sx={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 0.75, fontSize: 13 }}>
                        <DiagRow label="Carrier" value={d.carrier} />
                        <DiagRow label="Radio Type" value={d.radioType} />
                        <DiagRow label="Cell ID" value={d.cellId} />
                        <DiagRow label="LAC / TAC" value={d.lac} />
                        <>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Signal</Typography>
                          {d.signalStrength != null ? (
                            <Stack direction="row" spacing={0.75} alignItems="center">
                              <Typography variant="caption" fontFamily="monospace" sx={{ color: signalColor(d.signalStrength) }}>
                                {d.signalStrength} dBm
                              </Typography>
                              <Chip size="small" label={signalLabel(d.signalStrength)} sx={{
                                height: 18, fontSize: 10, fontWeight: 700,
                                bgcolor: `${signalColor(d.signalStrength)}1f`,
                                color: signalColor(d.signalStrength),
                              }} />
                            </Stack>
                          ) : na}
                        </>
                        <DiagRow label="MCC / MNC" value={d.mcc && d.mnc ? `${d.mcc} / ${d.mnc}` : (d.mcc || d.mnc || null)} />
                      </Box>
                    </Paper>

                    <Paper sx={{ p: 2, borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
                      <Typography variant="caption" fontWeight={700} color="primary.main" sx={{ mb: 1, display: 'block' }}>DEVICE</Typography>
                      <Box sx={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 0.75, fontSize: 13 }}>
                        <DiagRow label="Screen" value={typeof d.device === 'string' ? d.device : (typeof d.device === 'object' && d.device?.screen ? d.device.screen : null)} />
                        <DiagRow label="Model" value={d.deviceModel} />
                        <DiagRow label="OS / Platform" value={d.osVersion || (typeof d.device === 'object' && d.device?.platform ? d.device.platform : null)} />
                      </Box>
                    </Paper>
                  </Stack>
                </Box>
              );
            })()}

            {c.billing_sub_category && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Billing &amp; Transaction Details</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}><Field label="Category" value={c.billing_sub_category} /></Grid>
                  <Grid item xs={6}><Field label="Transaction Ref" value={c.transaction_ref} /></Grid>
                  <Grid item xs={6}><Field label="Disputed Amount" value={c.disputed_amount ? `SLE ${c.disputed_amount}` : '-'} /></Grid>
                  <Grid item xs={6}><Field label="Transaction Date" value={c.transaction_date} /></Grid>
                </Grid>
              </>
            )}
          </Paper>

          {/* Timeline */}
          {c.timeline && c.timeline.length > 0 && (
            <Paper elevation={0} sx={{ p: 3, mt: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>Audit &amp; Action Timeline</Typography>
              <Stack spacing={2}>
                {c.timeline.map((t, i) => (
                  <Box key={i} sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'primary.main', mt: 0.8, flexShrink: 0 }} />
                    <Box sx={{ flex: 1 }}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="caption" fontWeight={700}>{t.event_type?.replace(/_/g, ' ')}</Typography>
                        {t.new_value && <Chip size="small" label={t.new_value} sx={{ height: 18, fontSize: 10, fontWeight: 700 }} />}
                      </Stack>
                      {t.note && <Typography variant="body2" sx={{ mt: 0.3 }}>{t.note}</Typography>}
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.2 }}>
                        {new Date(t.created_at).toLocaleString()} {t.actor_name ? `• by ${t.actor_name}` : ''}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Stack>
            </Paper>
          )}
        </Grid>

        {/* Operator Response & Resolution Panel */}
        <Grid item xs={12} md={5}>
          <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
              {isClosed ? 'Case Closed by NatCA' : 'NOC Engineering Response'}
            </Typography>

            {success && <Alert severity="success" sx={{ mb: 2.5, borderRadius: 1.5 }}>{success}</Alert>}
            {error && <Alert severity="error" sx={{ mb: 2.5, borderRadius: 1.5 }}>{error}</Alert>}

            {isResolved && !isClosed && (
              <Alert severity="success" sx={{ mb: 2.5, borderRadius: 1.5 }}>
                <strong>Case Marked as Resolved.</strong> Technician resolution has been updated in the NatCA system. NatCA regulatory staff will review and formally close the ticket.
              </Alert>
            )}

            {c.status === 'NEW' && (
              <Alert severity="info" sx={{ mb: 2.5, borderRadius: 1.5 }} action={
                <Button color="inherit" size="small" onClick={handleAcknowledge} disabled={submitting} sx={{ fontWeight: 700 }}>
                  Acknowledge
                </Button>
              }>
                This ticket is newly assigned. Acknowledge it to begin review.
              </Alert>
            )}

            {!isClosed && (
              <Stack spacing={2.5}>
                <TextField
                  multiline rows={4}
                  label="Technician Findings &amp; Corrective Action"
                  placeholder="Detail actions taken (e.g., base station rebooted, billing refund issued, tower antenna realigned)..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  fullWidth
                />

                <TextField
                  select
                  label="Update Ticket Status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  fullWidth
                  size="small"
                >
                  <MenuItem value="">— Keep Current Status —</MenuItem>
                  <MenuItem value="UNDER_REVIEW">UNDER REVIEW (Investigation In Progress)</MenuItem>
                  <MenuItem value="RESOLVED">RESOLVED (Issue Fixed / Service Restored)</MenuItem>
                </TextField>

                {status === 'RESOLVED' && (
                  <Alert severity="info" sx={{ fontSize: '0.82rem', borderRadius: 1.5 }}>
                    Marking this ticket as <strong>Resolved</strong> updates NatCA monitors and automatically sends an SMS &amp; email notification to the complainant. Final case closure is performed by NatCA.
                  </Alert>
                )}

                <Stack direction="row" spacing={1.5}>
                  <Button
                    variant="contained"
                    startIcon={<SendIcon />}
                    onClick={handleRespond}
                    disabled={submitting || !note.trim()}
                    sx={{ fontWeight: 700, px: 2.5 }}
                  >
                    {submitting ? 'Submitting...' : status === 'RESOLVED' ? 'Resolve & Submit' : 'Submit Response'}
                  </Button>

                  {status !== 'RESOLVED' && !isResolved && (
                    <Button
                      variant="outlined"
                      color="success"
                      startIcon={<CheckCircleIcon />}
                      onClick={() => { setStatus('RESOLVED'); }}
                      disabled={submitting}
                      sx={{ fontWeight: 700 }}
                    >
                      Resolve
                    </Button>
                  )}
                </Stack>
              </Stack>
            )}

            {isClosed && (
              <Box sx={{ p: 2, bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#f8fafc', borderRadius: 2 }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                  <CheckCircleIcon color="success" />
                  <Typography variant="body2" fontWeight={700}>
                    This ticket has been officially closed by NatCA.
                  </Typography>
                </Stack>
                {c.resolved_at && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    Operator Resolved: {new Date(c.resolved_at).toLocaleString()}
                  </Typography>
                )}
                {c.closed_at && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    NatCA Closed: {new Date(c.closed_at).toLocaleString()}
                  </Typography>
                )}
              </Box>
            )}
          </Paper>

          {/* Internal Notes / Previous Responses */}
          {c.notes && c.notes.length > 0 && (
            <Paper elevation={0} sx={{ p: 3, mt: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>Operator Action Log</Typography>
              <Stack spacing={1.5}>
                {c.notes.map((n, idx) => (
                  <Box key={idx} sx={{ p: 1.5, bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#f8fafc', borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="body2" sx={{ lineHeight: 1.5 }}>{n.note}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                      {new Date(n.created_at).toLocaleString()} {n.author_name ? `• ${n.author_name}` : ''}
                    </Typography>
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
