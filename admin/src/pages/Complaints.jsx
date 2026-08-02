import { useState, useEffect, useCallback } from 'react';
import {
  Box, Paper, Typography, Grid, Stack, Chip, Tooltip, Button, IconButton,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer, TablePagination,
  FormControl, InputLabel, Select, MenuItem, TextField, Drawer, Divider,
  CircularProgress, Alert,
} from '@mui/material';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import CloseIcon         from '@mui/icons-material/Close';
import DownloadIcon      from '@mui/icons-material/Download';
import RefreshIcon       from '@mui/icons-material/Refresh';
import { get, patch, api } from '../api/client.js';
import PageHeader        from '../components/PageHeader.jsx';
import { STATUS_COLOR, SEVERITY_COLOR } from '../theme/theme.js';

function timeSince(ts) {
  if (!ts) return '—';
  const s = Math.floor((Date.now() - new Date(ts)) / 1000);
  if (s < 60)    return `${s}s ago`;
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function slaLabel(c) {
  if (!c.sla_deadline || ['RESOLVED','CLOSED'].includes(c.status)) return null;
  const remaining = (new Date(c.sla_deadline) - Date.now()) / 3600000;
  if (remaining > 0) return { label: `${Math.round(remaining)}h left`, color: 'success' };
  return { label: `${Math.round(-remaining)}h over`, color: 'error' };
}

function ComplaintDrawer({ complaint, onClose, onUpdated, operators, users }) {
  const [status, setStatus]       = useState('');
  const [note, setNote]           = useState('');
  const [officerId, setOfficerId] = useState('');
  const [saving, setSaving]       = useState(false);
  const [err, setErr]             = useState('');

  useEffect(() => {
    if (complaint) { setStatus(complaint.status); setNote(''); setErr(''); setOfficerId(complaint.assigned_officer_id || ''); }
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
    } catch (e) { setErr(e.response?.data?.error || 'Save failed'); }
    finally { setSaving(false); }
  };

  const sl = slaLabel(complaint);

  return (
    <Drawer anchor="right" open={Boolean(complaint)} onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 520 } } }}>
      <Box sx={{ p: 2.5, background: 'linear-gradient(135deg,#0d9488,#0f766e)', color: '#fff',
                 display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="caption" sx={{ opacity: 0.75 }}>{complaint.complaint_ref}</Typography>
          <Typography variant="h6" fontWeight={700}>{complaint.issue_type?.replace(/_/g, ' ')}</Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
            <Chip size="small" label={complaint.operator_name || 'Unknown'}
              sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: '0.7rem' }} />
            <Chip size="small" label={complaint.severity}
              sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: '0.7rem' }} />
            {sl && <Chip size="small" label={sl.label} color={sl.color} sx={{ fontSize: '0.7rem' }} />}
          </Stack>
        </Box>
        <IconButton onClick={onClose} sx={{ color: 'rgba(255,255,255,0.7)' }}><CloseIcon /></IconButton>
      </Box>

      <Box sx={{ p: 2.5, overflowY: 'auto', flex: 1 }}>
        <Grid container spacing={1} sx={{ mb: 2 }}>
          {[
            { l: 'Status',   v: complaint.status },
            { l: 'Priority', v: complaint.priority },
            { l: 'District', v: complaint.district },
            { l: 'Source',   v: complaint.source },
            { l: 'Submitted', v: timeSince(complaint.created_at) },
            { l: 'Category', v: complaint.category_name || complaint.issue_type },
          ].map(({ l, v }) => v ? (
            <Grid item xs={6} key={l}>
              <Typography variant="caption" color="text.secondary">{l}</Typography>
              <Typography variant="body2" fontWeight={600}>{v}</Typography>
            </Grid>
          ) : null)}
        </Grid>

        {complaint.description && (
          <>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>Description</Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>{complaint.description}</Typography>
          </>
        )}

        {complaint.area_detail && (
          <>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>Location</Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>{complaint.area_detail}</Typography>
          </>
        )}

        {complaint.reporter_name ? (
          <>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>Reporter</Typography>
            <Typography variant="body2">{complaint.reporter_name} {complaint.reporter_phone && `· ${complaint.reporter_phone}`}</Typography>
            <Divider sx={{ my: 2 }} />
          </>
        ) : complaint.contact_name ? (
          <>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>
              Reporter (Guest)
            </Typography>
            <Typography variant="body2">
              {complaint.contact_name}
              {complaint.contact_phone && ` · ${complaint.contact_phone}`}
              {complaint.contact_email && ` · ${complaint.contact_email}`}
            </Typography>
            <Divider sx={{ my: 2 }} />
          </>
        ) : null}

        {complaint.network_diagnostics && (() => {
          const d = typeof complaint.network_diagnostics === 'string'
            ? JSON.parse(complaint.network_diagnostics)
            : complaint.network_diagnostics;
          return (
            <>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Network Diagnostics</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 0.5, mb: 2, fontSize: 13 }}>
                <Typography variant="caption" color="text.secondary">GPS</Typography>
                <Typography variant="caption" fontFamily="monospace">
                  {d.geo?.available
                    ? `${d.geo.latitude.toFixed(5)}, ${d.geo.longitude.toFixed(5)} (±${Math.round(d.geo.accuracy_m)}m)`
                    : `unavailable (${d.geo?.reason || 'unknown'})`}
                </Typography>
                <Typography variant="caption" color="text.secondary">Connection</Typography>
                <Typography variant="caption" fontFamily="monospace">
                  {d.connection?.available
                    ? `${(d.connection.effectiveType || '?').toUpperCase()} · ${d.connection.downlinkMbps ?? '?'} Mbps down · ${d.connection.rttMs ?? '?'} ms RTT${d.connection.saveData ? ' · data-saver on' : ''}`
                    : 'unavailable'}
                </Typography>
                <Typography variant="caption" color="text.secondary">Ping to NatCA</Typography>
                <Typography variant="caption" fontFamily="monospace">
                  {d.ping?.available ? `${d.ping.rttMs} ms` : 'unavailable'}
                </Typography>
                {d.speedTest && (
                  <>
                    <Typography variant="caption" color="text.secondary">Measured Speed</Typography>
                    <Typography variant="caption" fontFamily="monospace">
                      ↓ {d.speedTest.downloadMbps ?? '?'} Mbps · ↑ {d.speedTest.uploadMbps ?? '?'} Mbps · {d.speedTest.pingMs} ms ping · {d.speedTest.jitterMs} ms jitter
                    </Typography>
                  </>
                )}
                <Typography variant="caption" color="text.secondary">Device</Typography>
                <Typography variant="caption" fontFamily="monospace" sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {d.device?.platform} · {d.device?.screen} · {d.device?.language}
                </Typography>
                <Typography variant="caption" color="text.secondary">User Agent</Typography>
                <Typography variant="caption" fontFamily="monospace" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', wordBreak: 'break-all' }}>
                  {d.device?.userAgent}
                </Typography>
                <Typography variant="caption" color="text.secondary">Collected</Typography>
                <Typography variant="caption" fontFamily="monospace">
                  {d.collected_at ? new Date(d.collected_at).toLocaleString() : '—'}
                </Typography>
              </Box>
              <Divider sx={{ my: 2 }} />
            </>
          );
        })()}

        {/* Timeline */}
        {complaint.timeline?.length > 0 && (
          <>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Timeline</Typography>
            {complaint.timeline.map((t) => (
              <Box key={t.event_id} sx={{ mb: 1, pl: 1.5, borderLeft: '2px solid', borderColor: 'primary.main' }}>
                <Typography variant="caption" color="text.secondary">
                  {t.event_type} · {timeSince(t.created_at)} {t.actor_name && `· ${t.actor_name}`}
                </Typography>
                {t.note && <Typography variant="body2">{t.note}</Typography>}
                {t.new_value && !t.note && <Typography variant="body2">{t.old_value} → {t.new_value}</Typography>}
              </Box>
            ))}
            <Divider sx={{ my: 2 }} />
          </>
        )}

        {err && <Alert severity="error" sx={{ mb: 1 }}>{err}</Alert>}

        {/* Assign */}
        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Assign Officer</Typography>
        <FormControl fullWidth size="small" sx={{ mb: 2 }}>
          <InputLabel>Officer</InputLabel>
          <Select value={officerId} label="Officer" onChange={(e) => setOfficerId(e.target.value)}>
            <MenuItem value="">Unassigned</MenuItem>
            {(users || []).map((u) => <MenuItem key={u.user_id} value={u.user_id}>{u.full_name}</MenuItem>)}
          </Select>
        </FormControl>

        {/* Status update */}
        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Update Status</Typography>
        <FormControl fullWidth size="small" sx={{ mb: 2 }}>
          <InputLabel>Status</InputLabel>
          <Select value={status} label="Status" onChange={(e) => setStatus(e.target.value)}>
            {['NEW','UNDER_REVIEW','ASSIGNED','ESCALATED','RESOLVED','CLOSED'].map((s) => (
              <MenuItem key={s} value={s}>{s.replace(/_/g, ' ')}</MenuItem>
            ))}
          </Select>
        </FormControl>

        {['RESOLVED','CLOSED'].includes(status) && (
          <TextField fullWidth multiline rows={3} size="small" label="Resolution Note"
            value={note} onChange={(e) => setNote(e.target.value)} sx={{ mb: 2 }} />
        )}

        <Button variant="contained" fullWidth onClick={save} disabled={saving}>
          {saving ? <CircularProgress size={20} /> : 'Save Changes'}
        </Button>
      </Box>
    </Drawer>
  );
}

export default function Complaints() {
  const [complaints, setComplaints] = useState([]);
  const [total, setTotal]           = useState(0);
  const [loading, setLoading]       = useState(true);
  const [selected, setSelected]     = useState(null);
  const [operators, setOperators]   = useState([]);
  const [users, setUsers]           = useState([]);
  const [page, setPage]             = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [filters, setFilters]       = useState({ status: '', operatorId: '', severity: '', search: '' });

  const setF = (k) => (e) => { setFilters((f) => ({ ...f, [k]: e.target.value })); setPage(0); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: rowsPerPage, offset: page * rowsPerPage });
      if (filters.status)     params.set('status',     filters.status);
      if (filters.operatorId) params.set('operatorId', filters.operatorId);
      if (filters.severity)   params.set('severity',   filters.severity);
      if (filters.search)     params.set('search',     filters.search);
      const r = await get(`/complaints?${params}`);
      setComplaints(r.data?.rows || []);
      setTotal(r.data?.total || 0);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [filters, page, rowsPerPage]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    get('/operators').then((r) => setOperators(r.data || [])).catch(() => {});
    get('/users').then((r) => setUsers(r.data || [])).catch(() => {});
  }, []);

  const openDetail = async (c) => {
    try {
      const r = await get(`/complaints/${c.complaint_id}`);
      setSelected(r.data);
    } catch { setSelected(c); }
  };

  const downloadCsv = async () => {
    const params = new URLSearchParams();
    if (filters.status)     params.set('status',     filters.status);
    if (filters.operatorId) params.set('operatorId', filters.operatorId);
    if (filters.severity)   params.set('severity',   filters.severity);
    const res = await api.get(`/complaints/export?${params}`, { responseType: 'blob' });
    const url = URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement('a'); a.href = url; a.download = 'complaints.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <PageHeader icon={<ReportProblemIcon />} title="Complaint List"
        subtitle={`${total} complaints`}
        actions={
          <>
            <Button size="small" variant="outlined" startIcon={<DownloadIcon />} onClick={downloadCsv}>Export CSV</Button>
            <IconButton onClick={load}><RefreshIcon /></IconButton>
          </>
        }
      />

      {/* Filters */}
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
        <FormControl size="small" sx={{ minWidth: 130 }}>
          <InputLabel>Status</InputLabel>
          <Select value={filters.status} label="Status" onChange={setF('status')}>
            <MenuItem value="">All</MenuItem>
            {['NEW','UNDER_REVIEW','ASSIGNED','ESCALATED','RESOLVED','CLOSED'].map((s) =>
              <MenuItem key={s} value={s}>{s.replace(/_/g, ' ')}</MenuItem>
            )}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 130 }}>
          <InputLabel>Operator</InputLabel>
          <Select value={filters.operatorId} label="Operator" onChange={setF('operatorId')}>
            <MenuItem value="">All</MenuItem>
            {operators.map((o) => <MenuItem key={o.operator_id} value={o.operator_id}>{o.operator_name}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 110 }}>
          <InputLabel>Severity</InputLabel>
          <Select value={filters.severity} label="Severity" onChange={setF('severity')}>
            <MenuItem value="">All</MenuItem>
            {['LOW','MEDIUM','HIGH','CRITICAL'].map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
          </Select>
        </FormControl>
        <TextField size="small" placeholder="Search ref or description…" value={filters.search}
          onChange={setF('search')} sx={{ minWidth: 220 }} />
        {(filters.status || filters.operatorId || filters.severity || filters.search) && (
          <Button size="small" onClick={() => setFilters({ status: '', operatorId: '', severity: '', search: '' })}>Clear</Button>
        )}
      </Stack>

      <TableContainer component={Paper} elevation={0}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'action.hover' }}>
              <TableCell>Reference</TableCell>
              <TableCell>Issue</TableCell>
              <TableCell>Operator</TableCell>
              <TableCell>District</TableCell>
              <TableCell>Severity</TableCell>
              <TableCell>SLA</TableCell>
              <TableCell>Submitted</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && (
              <TableRow><TableCell colSpan={8} align="center"><CircularProgress size={24} sx={{ my: 2 }} /></TableCell></TableRow>
            )}
            {!loading && complaints.length === 0 && (
              <TableRow><TableCell colSpan={8} align="center">
                <Typography color="text.secondary" sx={{ py: 4 }}>No complaints found</Typography>
              </TableCell></TableRow>
            )}
            {complaints.map((c) => {
              const sl = slaLabel(c);
              return (
                <TableRow key={c.complaint_id} hover sx={{ cursor: 'pointer' }} onClick={() => openDetail(c)}>
                  <TableCell><Typography variant="caption" fontFamily="monospace">{c.complaint_ref}</Typography></TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>{c.issue_type?.replace(/_/g, ' ')}</Typography>
                    <Typography variant="caption" color="text.secondary">{c.category_name}</Typography>
                  </TableCell>
                  <TableCell>{c.operator_name || '—'}</TableCell>
                  <TableCell>{c.district || '—'}</TableCell>
                  <TableCell>
                    <Chip size="small" label={c.severity} color={SEVERITY_COLOR[c.severity] || 'default'} variant="outlined" sx={{ fontSize: '0.68rem' }} />
                  </TableCell>
                  <TableCell>
                    {sl ? <Chip size="small" label={sl.label} color={sl.color} sx={{ fontSize: '0.68rem' }} /> : <Typography variant="caption" color="text.disabled">—</Typography>}
                  </TableCell>
                  <TableCell>
                    <Tooltip title={new Date(c.created_at).toLocaleString()}>
                      <Typography variant="caption">{timeSince(c.created_at)}</Typography>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Chip size="small" label={c.status?.replace(/_/g, ' ')} color={STATUS_COLOR[c.status] || 'default'}
                      variant={c.status === 'NEW' ? 'filled' : 'outlined'} sx={{ fontSize: '0.68rem' }} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <TablePagination component="div" count={total} page={page}
          onPageChange={(_, p) => setPage(p)} rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
          rowsPerPageOptions={[10, 25, 50, 100]} />
      </TableContainer>

      <ComplaintDrawer
        complaint={selected}
        onClose={() => setSelected(null)}
        onUpdated={() => { load(); setSelected(null); }}
        operators={operators}
        users={users}
      />
    </Box>
  );
}
