import { useState, useEffect, useCallback } from 'react';
import {
  Box, Paper, Typography, Grid, Stack, Chip, Tooltip, Button, IconButton,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer, TablePagination,
  FormControl, InputLabel, Select, MenuItem, TextField, Drawer, Divider,
  CircularProgress, Alert, Checkbox, Collapse, alpha,
} from '@mui/material';
import ReportProblemIcon  from '@mui/icons-material/ReportProblem';
import CloseIcon          from '@mui/icons-material/Close';
import DownloadIcon       from '@mui/icons-material/Download';
import RefreshIcon        from '@mui/icons-material/Refresh';
import ArrowUpwardIcon    from '@mui/icons-material/ArrowUpward';
import PersonAddIcon      from '@mui/icons-material/PersonAdd';
import CheckBoxIcon       from '@mui/icons-material/CheckBox';
import { get, patch, api } from '../api/client.js';
import PageHeader         from '../components/PageHeader.jsx';
import { useToast }       from '../components/ToastContext.jsx';
import { timeSince, formatDate } from '../utils/formatters.js';
import { getOperatorColor, STATUS_COLORS, SEVERITY_COLORS } from '../theme/theme.js';

function slaLabel(c) {
  if (!c.sla_deadline || ['RESOLVED', 'CLOSED'].includes(c.status)) return null;
  const remaining = (new Date(c.sla_deadline) - Date.now()) / 3600000;
  if (remaining > 0) return { label: `${Math.round(remaining)}h left`, color: 'success' };
  return { label: `${Math.round(-remaining)}h over`, color: 'error' };
}

function ComplaintDrawer({ complaint, onClose, onUpdated, users }) {
  const [status, setStatus]       = useState('');
  const [note, setNote]           = useState('');
  const [officerId, setOfficerId] = useState('');
  const [saving, setSaving]       = useState(false);
  const [err, setErr]             = useState('');

  useEffect(() => {
    if (complaint) {
      setStatus(complaint.status);
      setNote('');
      setErr('');
      setOfficerId(complaint.assigned_officer_id || '');
    }
  }, [complaint]);

  if (!complaint) return null;

  const save = async () => {
    setSaving(true);
    try {
      await patch(`/complaints/${complaint.complaint_id}`, { status, resolutionNote: note || undefined });
      if (officerId !== (complaint.assigned_officer_id || '')) {
        await patch(`/complaints/${complaint.complaint_id}/assign`, { officerId: officerId || null });
      }
      onUpdated();
    } catch (e) {
      setErr(e.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const sl = slaLabel(complaint);

  return (
    <Drawer
      anchor="right"
      open={Boolean(complaint)}
      onClose={onClose}
      slotProps={{ paper: { sx: { width: { xs: '100%', sm: 540 } } } }}
    >
      <Box sx={{
        p: 2.5,
        background: 'linear-gradient(135deg, #1d4ed8 0%, #0b1f3a 100%)',
        color: '#fff',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
      }}>
        <Box>
          <Typography variant="caption" sx={{ opacity: 0.8, fontFamily: 'monospace', letterSpacing: '0.05em' }}>
            {complaint.complaint_ref}
          </Typography>
          <Typography variant="h6" fontWeight={700}>
            {complaint.issue_type?.replace(/_/g, ' ')}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 0.75 }}>
            <Chip
              size="small"
              label={complaint.operator_name || 'Unknown Operator'}
              sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff', fontSize: '0.72rem', fontWeight: 700 }}
            />
            <Chip
              size="small"
              label={complaint.severity}
              sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff', fontSize: '0.72rem', fontWeight: 700 }}
            />
            {sl && <Chip size="small" label={sl.label} color={sl.color} sx={{ fontSize: '0.72rem', fontWeight: 700 }} />}
          </Stack>
        </Box>
        <IconButton onClick={onClose} aria-label="Close modal" sx={{ color: 'rgba(255,255,255,0.8)' }}><CloseIcon /></IconButton>
      </Box>

      <Box sx={{ p: 3, overflowY: 'auto', flex: 1 }}>
        <Grid container spacing={2} sx={{ mb: 2.5 }}>
          {[
            { l: 'Status',   v: complaint.status },
            { l: 'Priority', v: complaint.priority },
            { l: 'District', v: complaint.district },
            { l: 'Source',   v: complaint.source },
            { l: 'Submitted', v: timeSince(complaint.created_at) },
            { l: 'Category', v: complaint.category_name || complaint.issue_type },
          ].map(({ l, v }) => v ? (
            <Grid item xs={6} key={l}>
              <Paper sx={{ p: 1.5, borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="caption" color="text.secondary" fontWeight={700}>{l.toUpperCase()}</Typography>
                <Typography variant="body2" fontWeight={600}>{v}</Typography>
              </Paper>
            </Grid>
          ) : null)}
        </Grid>

        {complaint.description && (
          <Box sx={{ mb: 2.5 }}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>Description</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', bgcolor: 'action.hover', p: 1.5, borderRadius: 1.5 }}>
              {complaint.description}
            </Typography>
          </Box>
        )}

        {complaint.area_detail && (
          <Box sx={{ mb: 2.5 }}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>Location / Landmark</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {complaint.area_detail}
            </Typography>
          </Box>
        )}

        {complaint.reporter_name ? (
          <Box sx={{ mb: 2.5 }}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>Reporter</Typography>
            <Typography variant="body2">{complaint.reporter_name} {complaint.reporter_phone && `· ${complaint.reporter_phone}`}</Typography>
            <Divider sx={{ my: 2 }} />
          </Box>
        ) : complaint.contact_name ? (
          <Box sx={{ mb: 2.5 }}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>
              Reporter (Guest)
            </Typography>
            <Typography variant="body2">
              {complaint.contact_name}
              {complaint.contact_phone && ` · ${complaint.contact_phone}`}
              {complaint.contact_email && ` · ${complaint.contact_email}`}
            </Typography>
            <Divider sx={{ my: 2 }} />
          </Box>
        ) : null}

        {complaint.network_diagnostics && (() => {
          const d = typeof complaint.network_diagnostics === 'string'
            ? JSON.parse(complaint.network_diagnostics)
            : complaint.network_diagnostics;

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

          const hasCellData = d.carrier || d.radioType || d.cellId != null || d.lac != null || d.signalStrength != null || d.mcc || d.mnc;
          const hasConnectionData = d.connectionType || d.estimatedGeneration || d.pingMs != null;
          const hasDeviceData = (typeof d.device === 'string' && d.device) || d.deviceModel || d.osVersion;
          const hasLegacyData = d.geo || (typeof d.connection === 'object' && d.connection) || (typeof d.ping === 'object' && d.ping) || (typeof d.device === 'object' && d.device);

          const DiagRow = ({ label, value, color }) => value != null && value !== '' ? (
            <>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>{label}</Typography>
              <Typography variant="caption" fontFamily="monospace" sx={{ color: color || 'text.primary' }}>{value}</Typography>
            </>
          ) : null;

          return (
            <Box sx={{ mb: 2.5 }}>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Network Diagnostics</Typography>
              <Stack spacing={1.5}>
                {hasConnectionData && (
                  <Paper sx={{ p: 2, borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="caption" fontWeight={700} color="primary.main" sx={{ mb: 1, display: 'block' }}>CONNECTION</Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 0.75, fontSize: 13 }}>
                      <DiagRow label="Type" value={d.connectionType} />
                      <DiagRow label="Generation" value={d.estimatedGeneration} />
                      <DiagRow label="Ping" value={d.pingMs != null ? `${d.pingMs} ms` : null} />
                    </Box>
                  </Paper>
                )}

                {hasCellData && (
                  <Paper sx={{ p: 2, borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="caption" fontWeight={700} color="primary.main" sx={{ mb: 1, display: 'block' }}>CELL / SITE DETAILS</Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 0.75, fontSize: 13 }}>
                      <DiagRow label="Carrier" value={d.carrier} />
                      <DiagRow label="Radio Type" value={d.radioType} />
                      <DiagRow label="Cell ID" value={d.cellId} />
                      <DiagRow label="LAC / TAC" value={d.lac} />
                      {d.signalStrength != null && (
                        <>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Signal</Typography>
                          <Stack direction="row" spacing={0.75} alignItems="center">
                            <Typography variant="caption" fontFamily="monospace" sx={{ color: signalColor(d.signalStrength) }}>
                              {d.signalStrength} dBm
                            </Typography>
                            <Chip size="small" label={signalLabel(d.signalStrength)} sx={{
                              height: 18, fontSize: 10, fontWeight: 700,
                              bgcolor: alpha(signalColor(d.signalStrength), 0.12),
                              color: signalColor(d.signalStrength),
                            }} />
                          </Stack>
                        </>
                      )}
                      <DiagRow label="MCC / MNC" value={d.mcc && d.mnc ? `${d.mcc} / ${d.mnc}` : (d.mcc || d.mnc || null)} />
                    </Box>
                  </Paper>
                )}

                {hasDeviceData && (
                  <Paper sx={{ p: 2, borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="caption" fontWeight={700} color="primary.main" sx={{ mb: 1, display: 'block' }}>DEVICE</Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 0.75, fontSize: 13 }}>
                      <DiagRow label="Screen" value={typeof d.device === 'string' ? d.device : null} />
                      <DiagRow label="Model" value={d.deviceModel} />
                      <DiagRow label="OS" value={d.osVersion} />
                    </Box>
                  </Paper>
                )}

                {hasLegacyData && (
                  <Paper sx={{ p: 2, borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 0.75, fontSize: 13 }}>
                      <DiagRow label="GPS Location" value={
                        d.geo?.available
                          ? `${d.geo.latitude?.toFixed(5)}, ${d.geo.longitude?.toFixed(5)} (±${Math.round(d.geo.accuracy_m || 0)}m)`
                          : (d.geo ? 'Not shared' : null)
                      } />
                      <DiagRow label="Network Type" value={
                        d.connection?.available
                          ? `${(d.connection.effectiveType || '?').toUpperCase()} · ${d.connection.downlinkMbps ?? '?'} Mbps down`
                          : (d.connection ? 'unavailable' : null)
                      } />
                      <DiagRow label="Ping to NatCA" value={
                        d.ping?.available ? `${d.ping.rttMs} ms` : (d.ping ? '—' : null)
                      } />
                      {typeof d.device === 'object' && d.device && (
                        <>
                          <DiagRow label="Screen" value={d.device.screen} />
                          <DiagRow label="Platform" value={d.device.platform} />
                        </>
                      )}
                    </Box>
                  </Paper>
                )}
              </Stack>
              <Divider sx={{ my: 2 }} />
            </Box>
          );
        })()}

        {/* Attachments */}
        {complaint.attachments?.length > 0 && (
          <Box sx={{ mb: 2.5 }}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
              Attachments ({complaint.attachments.length})
            </Typography>
            <Stack spacing={1}>
              {complaint.attachments.map((a) => (
                <Box key={a.attachment_id} sx={{
                  display: 'flex', alignItems: 'center', gap: 1, p: 1.25,
                  border: 1, borderColor: 'divider', borderRadius: 1.5,
                }}>
                  <Typography variant="body2" sx={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {a.file_name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {Math.round((a.file_size || 0) / 1024)} KB
                  </Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={async () => {
                      try {
                        const res = await api.get(`/attachments/${a.attachment_id}`, { responseType: 'blob' });
                        const url = URL.createObjectURL(res.data);
                        window.open(url, '_blank');
                        setTimeout(() => URL.revokeObjectURL(url), 60_000);
                      } catch {
                        // Ignore
                      }
                    }}
                  >
                    View
                  </Button>
                </Box>
              ))}
            </Stack>
            <Divider sx={{ my: 2 }} />
          </Box>
        )}

        {/* Timeline */}
        {complaint.timeline?.length > 0 && (
          <Box sx={{ mb: 2.5 }}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Event History</Typography>
            <Stack spacing={1}>
              {complaint.timeline.map((t) => (
                <Paper key={t.event_id} sx={{ p: 1.5, borderRadius: 1.5, borderLeft: '3px solid', borderLeftColor: 'primary.main' }}>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="caption" fontWeight={700} color="primary.main">{t.event_type}</Typography>
                    <Typography variant="caption" color="text.secondary">{timeSince(t.created_at)}</Typography>
                  </Stack>
                  {t.note && <Typography variant="body2" sx={{ mt: 0.5 }}>{t.note}</Typography>}
                  {t.actor_name && <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>By: {t.actor_name}</Typography>}
                </Paper>
              ))}
            </Stack>
            <Divider sx={{ my: 2 }} />
          </Box>
        )}

        {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}

        {/* Assignment & Status Controls */}
        <Paper sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'action.hover' }}>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>Case Management</Typography>
          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>Assigned Officer</InputLabel>
            <Select value={officerId} label="Assigned Officer" onChange={(e) => setOfficerId(e.target.value)}>
              <MenuItem value="">Unassigned</MenuItem>
              {(users || []).map((u) => <MenuItem key={u.user_id} value={u.user_id}>{u.full_name}</MenuItem>)}
            </Select>
          </FormControl>

          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>Complaint Status</InputLabel>
            <Select value={status} label="Complaint Status" onChange={(e) => setStatus(e.target.value)}>
              {['NEW','UNDER_REVIEW','ASSIGNED','ESCALATED','RESOLVED','CLOSED'].map((s) => (
                <MenuItem key={s} value={s}>{s.replace(/_/g, ' ')}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {['RESOLVED', 'CLOSED'].includes(status) && (
            <TextField
              fullWidth
              multiline
              rows={3}
              size="small"
              label="Resolution Summary Note *"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              sx={{ mb: 2 }}
            />
          )}

          <Button variant="contained" fullWidth onClick={save} disabled={saving} sx={{ fontWeight: 600, py: 1 }}>
            {saving ? <CircularProgress size={20} color="inherit" /> : 'Save Complaint Changes'}
          </Button>
        </Paper>
      </Box>
    </Drawer>
  );
}

export default function Complaints() {
  const { showToast } = useToast();
  const [complaints, setComplaints] = useState([]);
  const [total, setTotal]           = useState(0);
  const [loading, setLoading]       = useState(true);
  const [selected, setSelected]     = useState(null);
  const [operators, setOperators]   = useState([]);
  const [users, setUsers]           = useState([]);
  const [page, setPage]             = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [filters, setFilters]       = useState({ status: '', operatorId: '', severity: '', search: '' });
  const [checkedIds, setCheckedIds] = useState(new Set());
  const [bulkBusy, setBulkBusy]     = useState(false);
  const [bulkAssignId, setBulkAssignId] = useState('');

  const setF = (k) => (e) => { setFilters((f) => ({ ...f, [k]: e.target.value })); setPage(0); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: rowsPerPage, offset: page * rowsPerPage });
      if (filters.status)     params.set('status',     filters.status);
      if (filters.operatorId) params.set('operatorId', filters.operatorId);
      if (filters.severity)   params.set('severity',   filters.severity);
      if (filters.search)     params.set('search',     filters.search);
      const r = await get(`/complaints?${params.toString()}`);
      setComplaints(r.data?.rows || []);
      setTotal(r.data?.total || 0);
    } catch {
      showToast('Failed to load complaints', 'error');
    } finally {
      setLoading(false);
    }
  }, [filters, page, rowsPerPage, showToast]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    get('/operators').then((r) => setOperators(r.data || [])).catch(() => {});
    get('/users').then((r) => setUsers(r.data || [])).catch(() => {});
  }, []);

  const openDetail = async (c) => {
    if (checkedIds.size > 0) return;
    try {
      const r = await get(`/complaints/${c.complaint_id}`);
      setSelected(r.data);
    } catch {
      setSelected(c);
    }
  };

  const toggleCheck = (id) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (checkedIds.size === complaints.length) {
      setCheckedIds(new Set());
    } else {
      setCheckedIds(new Set(complaints.map((c) => c.complaint_id)));
    }
  };

  const bulkEscalate = async () => {
    setBulkBusy(true);
    try {
      await Promise.all([...checkedIds].map((id) => patch(`/complaints/${id}`, { status: 'ESCALATED' })));
      showToast(`${checkedIds.size} complaint(s) escalated`, 'success');
      setCheckedIds(new Set());
      load();
    } catch {
      showToast('Bulk escalate failed', 'error');
    } finally {
      setBulkBusy(false);
    }
  };

  const bulkAssign = async () => {
    if (!bulkAssignId) return;
    setBulkBusy(true);
    try {
      await Promise.all([...checkedIds].map((id) => patch(`/complaints/${id}/assign`, { officerId: Number(bulkAssignId) })));
      showToast(`${checkedIds.size} complaint(s) assigned`, 'success');
      setCheckedIds(new Set()); setBulkAssignId('');
      load();
    } catch {
      showToast('Bulk assign failed', 'error');
    } finally {
      setBulkBusy(false);
    }
  };

  const downloadCsv = async () => {
    const params = new URLSearchParams();
    if (filters.status)     params.set('status',     filters.status);
    if (filters.operatorId) params.set('operatorId', filters.operatorId);
    if (filters.severity)   params.set('severity',   filters.severity);
    try {
      const res = await api.get(`/complaints/export?${params.toString()}`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `NatCA_Complaints_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      showToast('CSV export failed', 'error');
    }
  };

  return (
    <Box sx={{ width: '100%', minHeight: '100%', pb: 4 }}>
      <PageHeader
        icon={<ReportProblemIcon />}
        title="Telecom Complaint Registry"
        subtitle={`Total registered cases: ${total}`}
        actions={
          <Stack direction="row" spacing={1.5}>
            <Button size="small" variant="outlined" startIcon={<DownloadIcon />} onClick={downloadCsv} sx={{ borderRadius: 1.5, textTransform: 'none', fontWeight: 600 }}>
              Export CSV
            </Button>
            <IconButton onClick={load} aria-label="Refresh complaints" sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}>
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Stack>
        }
      />

      {/* Filters */}
      <Paper sx={{ p: 2.5, mb: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} flexWrap="wrap" useFlexGap alignItems="center">
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Status</InputLabel>
            <Select value={filters.status} label="Status" onChange={setF('status')}>
              <MenuItem value="">All Statuses</MenuItem>
              {['NEW','UNDER_REVIEW','ASSIGNED','ESCALATED','RESOLVED','CLOSED'].map((s) => (
                <MenuItem key={s} value={s}>{s.replace(/_/g, ' ')}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Operator</InputLabel>
            <Select value={filters.operatorId} label="Operator" onChange={setF('operatorId')}>
              <MenuItem value="">All Operators</MenuItem>
              {operators.map((o) => <MenuItem key={o.operator_id} value={o.operator_id}>{o.operator_name}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel>Severity</InputLabel>
            <Select value={filters.severity} label="Severity" onChange={setF('severity')}>
              <MenuItem value="">All Severities</MenuItem>
              {['LOW','MEDIUM','HIGH','CRITICAL'].map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField
            size="small"
            placeholder="Search ref, description, or phone…"
            value={filters.search}
            onChange={setF('search')}
            sx={{ flex: 1, minWidth: 240 }}
          />
          {(filters.status || filters.operatorId || filters.severity || filters.search) && (
            <Button size="small" onClick={() => setFilters({ status: '', operatorId: '', severity: '', search: '' })}>
              Clear
            </Button>
          )}
        </Stack>
      </Paper>

      {/* Bulk action bar */}
      <Collapse in={checkedIds.size > 0}>
        <Paper variant="outlined" sx={{ mb: 2, px: 2.5, py: 1.5, bgcolor: (t) => alpha(t.palette.primary.main, 0.08), border: 1, borderColor: 'primary.main', borderRadius: 2 }}>
          <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
            <Stack direction="row" spacing={0.75} alignItems="center">
              <CheckBoxIcon color="primary" fontSize="small" />
              <Typography variant="body2" fontWeight={700} color="primary.main">
                {checkedIds.size} complaint(s) selected
              </Typography>
            </Stack>
            <Divider orientation="vertical" flexItem />
            <Button
              size="small"
              variant="contained"
              color="warning"
              startIcon={bulkBusy ? <CircularProgress size={14} color="inherit" /> : <ArrowUpwardIcon fontSize="small" />}
              onClick={bulkEscalate}
              disabled={bulkBusy}
              sx={{ borderRadius: 1.5, textTransform: 'none', fontWeight: 600 }}
            >
              Escalate Selected
            </Button>
            <Stack direction="row" spacing={1} alignItems="center">
              <FormControl size="small" sx={{ minWidth: 180 }}>
                <InputLabel>Assign to officer</InputLabel>
                <Select value={bulkAssignId} label="Assign to officer" onChange={(e) => setBulkAssignId(e.target.value)}>
                  <MenuItem value="">— select officer —</MenuItem>
                  {users.map((u) => <MenuItem key={u.user_id} value={u.user_id}>{u.full_name}</MenuItem>)}
                </Select>
              </FormControl>
              <Button
                size="small"
                variant="outlined"
                startIcon={<PersonAddIcon fontSize="small" />}
                onClick={bulkAssign}
                disabled={bulkBusy || !bulkAssignId}
                sx={{ borderRadius: 1.5, textTransform: 'none', fontWeight: 600 }}
              >
                Assign
              </Button>
            </Stack>
            <Button size="small" onClick={() => setCheckedIds(new Set())} sx={{ ml: 'auto', textTransform: 'none' }}>
              Clear selection
            </Button>
          </Stack>
        </Paper>
      </Collapse>

      {/* Table */}
      <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
        <Table size="small">
          <TableHead sx={{ bgcolor: (t) => alpha(t.palette.primary.main, 0.04) }}>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  size="small"
                  indeterminate={checkedIds.size > 0 && checkedIds.size < complaints.length}
                  checked={complaints.length > 0 && checkedIds.size === complaints.length}
                  onChange={toggleAll}
                />
              </TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Reference</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Issue Type</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Operator</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>District</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Severity</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>SLA Status</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Submitted</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && (
              <TableRow><TableCell colSpan={9} align="center"><CircularProgress size={28} sx={{ my: 4 }} /></TableCell></TableRow>
            )}
            {!loading && complaints.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  <Typography color="text.secondary" sx={{ py: 6 }}>No complaints match your query</Typography>
                </TableCell>
              </TableRow>
            )}
            {complaints.map((c) => {
              const sl = slaLabel(c);
              const checked = checkedIds.has(c.complaint_id);
              const stColor = STATUS_COLORS[c.status] || '#64748b';
              const sevColor = SEVERITY_COLORS[c.severity] || '#64748b';
              const opColor = getOperatorColor(c.operator_name, '#2563eb');

              return (
                <TableRow
                  key={c.complaint_id}
                  hover
                  selected={checked}
                  sx={{ cursor: 'pointer' }}
                  onClick={() => checkedIds.size > 0 ? toggleCheck(c.complaint_id) : openDetail(c)}
                >
                  <TableCell padding="checkbox" onClick={(e) => { e.stopPropagation(); toggleCheck(c.complaint_id); }}>
                    <Checkbox size="small" checked={checked} onChange={() => toggleCheck(c.complaint_id)} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 800, color: 'primary.main' }}>
                      {c.complaint_ref}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>{c.issue_type?.replace(/_/g, ' ')}</Typography>
                    <Typography variant="caption" color="text.secondary">{c.category_name}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={c.operator_name || '—'}
                      sx={{
                        fontWeight: 700,
                        fontSize: 11,
                        borderRadius: 1,
                        bgcolor: alpha(opColor, 0.12),
                        color: opColor,
                        border: `1px solid ${alpha(opColor, 0.25)}`,
                      }}
                    />
                  </TableCell>
                  <TableCell>{c.district || '—'}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={c.severity}
                      sx={{
                        fontWeight: 700,
                        fontSize: 10,
                        borderRadius: 1,
                        bgcolor: alpha(sevColor, 0.12),
                        color: sevColor,
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    {sl ? (
                      <Chip size="small" label={sl.label} color={sl.color} sx={{ fontSize: '0.7rem', fontWeight: 700 }} />
                    ) : (
                      <Typography variant="caption" color="text.disabled">—</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Tooltip title={formatDate(c.created_at)}>
                      <Typography variant="caption">{timeSince(c.created_at)}</Typography>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={c.status?.replace(/_/g, ' ')}
                      sx={{
                        fontWeight: 700,
                        borderRadius: 1,
                        bgcolor: alpha(stColor, 0.14),
                        color: stColor,
                      }}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
          rowsPerPageOptions={[10, 25, 50, 100]}
        />
      </TableContainer>

      <ComplaintDrawer
        complaint={selected}
        onClose={() => setSelected(null)}
        onUpdated={() => { load(); setSelected(null); }}
        users={users}
      />
    </Box>
  );
}
