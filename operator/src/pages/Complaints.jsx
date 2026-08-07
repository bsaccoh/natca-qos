import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box, Paper, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, TextField, MenuItem, Stack, IconButton,
  Tooltip, TablePagination, InputAdornment, Button, Divider,
  Menu, ListItemIcon, ListItemText,
} from '@mui/material';
import SearchIcon       from '@mui/icons-material/Search';
import RefreshIcon      from '@mui/icons-material/Refresh';
import DownloadIcon     from '@mui/icons-material/Download';
import FilterListIcon   from '@mui/icons-material/FilterList';
import CloseIcon        from '@mui/icons-material/Close';
import MoreVertIcon     from '@mui/icons-material/MoreVert';
import RateReviewIcon   from '@mui/icons-material/RateReview';
import CheckCircleIcon  from '@mui/icons-material/CheckCircle';
import ArrowUpwardIcon  from '@mui/icons-material/ArrowUpward';
import LockIcon         from '@mui/icons-material/Lock';
import { get, patch }   from '../api/client.js';
import { useAuth }      from '../auth/AuthContext.jsx';
import { useToast }     from '../components/ToastContext.jsx';
import { STATUS_COLOR, SEVERITY_COLOR } from '../theme/theme.js';

const STATUSES   = ['', 'NEW', 'UNDER_REVIEW', 'ASSIGNED', 'ESCALATED', 'RESOLVED', 'CLOSED'];
const SEVERITIES = ['', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const SESSION_KEY = 'op_complaints_filters';

function loadSavedFilters(urlStatus, urlSearch) {
  try {
    const saved = JSON.parse(sessionStorage.getItem(SESSION_KEY) || '{}');
    return {
      status:   urlStatus || saved.status   || '',
      severity: saved.severity || '',
      search:   urlSearch  || saved.search   || '',
      dateFrom: saved.dateFrom || '',
      dateTo:   saved.dateTo   || '',
    };
  } catch {
    return { status: urlStatus || '', severity: '', search: urlSearch || '', dateFrom: '', dateTo: '' };
  }
}

function toCSV(rows) {
  const headers = ['Ref', 'Issue Type', 'Severity', 'Status', 'Area', 'SLA Deadline', 'Created'];
  const lines = rows.map((r) => [
    r.complaint_ref, r.issue_type, r.severity, r.status,
    r.area_detail || '',
    r.sla_deadline ? new Date(r.sla_deadline).toLocaleString() : '',
    new Date(r.created_at).toLocaleString(),
  ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','));
  return [headers.join(','), ...lines].join('\n');
}

function downloadCSV(content, filename) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function slaUrgency(r) {
  if (!r.sla_deadline || ['RESOLVED', 'CLOSED'].includes(r.status)) return null;
  const ms = new Date(r.sla_deadline) - Date.now();
  if (ms < 0)              return 'breached';
  if (ms < 4 * 3600 * 1000) return 'warning';
  return null;
}

function QuickActionsMenu({ complaint, onDone }) {
  const [anchor, setAnchor] = useState(null);
  const [busy, setBusy]     = useState(false);
  const { showToast }       = useToast();

  const act = async (status) => {
    setAnchor(null);
    setBusy(true);
    try {
      await patch(`/complaints/${complaint.complaint_id}`, { status });
      showToast(`${complaint.complaint_ref} → ${status.replace(/_/g, ' ')}`, 'success');
      onDone();
    } catch (err) {
      showToast(err.response?.data?.error || 'Action failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Tooltip title="Quick actions">
        <IconButton size="small" disabled={busy}
          onClick={(e) => { e.stopPropagation(); setAnchor(e.currentTarget); }}>
          <MoreVertIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}
        onClick={(e) => e.stopPropagation()}
        slotProps={{ paper: { elevation: 3, sx: { borderRadius: 1.5, minWidth: 180 } } }}>
        {complaint.status !== 'UNDER_REVIEW' && (
          <MenuItem onClick={() => act('UNDER_REVIEW')} dense>
            <ListItemIcon><RateReviewIcon fontSize="small" color="info" /></ListItemIcon>
            <ListItemText>Mark Under Review</ListItemText>
          </MenuItem>
        )}
        {!['RESOLVED','CLOSED'].includes(complaint.status) && (
          <MenuItem onClick={() => act('RESOLVED')} dense>
            <ListItemIcon><CheckCircleIcon fontSize="small" color="success" /></ListItemIcon>
            <ListItemText>Mark Resolved</ListItemText>
          </MenuItem>
        )}
        {complaint.status !== 'ESCALATED' && (
          <MenuItem onClick={() => act('ESCALATED')} dense>
            <ListItemIcon><ArrowUpwardIcon fontSize="small" color="warning" /></ListItemIcon>
            <ListItemText>Escalate</ListItemText>
          </MenuItem>
        )}
        {complaint.status !== 'CLOSED' && (
          <MenuItem onClick={() => act('CLOSED')} dense>
            <ListItemIcon><LockIcon fontSize="small" color="action" /></ListItemIcon>
            <ListItemText>Close</ListItemText>
          </MenuItem>
        )}
      </Menu>
    </>
  );
}

export default function Complaints() {
  const navigate = useNavigate();
  const [urlParams] = useSearchParams();
  const { socket }  = useAuth();
  const { showToast } = useToast();

  const initFilters = loadSavedFilters(urlParams.get('status') || '', urlParams.get('search') || '');
  const [rows, setRows]         = useState([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(0);
  const [perPage, setPerPage]   = useState(25);
  const [status, setStatus]     = useState(initFilters.status);
  const [severity, setSeverity] = useState(initFilters.severity);
  const [search, setSearch]     = useState(initFilters.search);
  const [dateFrom, setDateFrom] = useState(initFilters.dateFrom);
  const [dateTo, setDateTo]     = useState(initFilters.dateTo);
  const [loading, setLoading]   = useState(false);
  const [exporting, setExporting] = useState(false);

  // persist filters to sessionStorage whenever they change
  useEffect(() => {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ status, severity, search, dateFrom, dateTo }));
  }, [status, severity, search, dateFrom, dateTo]);

  const buildQuery = useCallback((overrides = {}) => {
    const q = new URLSearchParams({
      limit: overrides.limit ?? perPage,
      offset: overrides.offset ?? page * perPage,
    });
    const s  = overrides.status   ?? status;
    const sv = overrides.severity ?? severity;
    const sr = overrides.search   ?? search;
    const df = overrides.dateFrom ?? dateFrom;
    const dt = overrides.dateTo   ?? dateTo;
    if (s)  q.set('status',   s);
    if (sv) q.set('severity', sv);
    if (sr) q.set('search',   sr);
    if (df) q.set('dateFrom', df);
    if (dt) q.set('dateTo',   dt);
    return q.toString();
  }, [perPage, page, status, severity, search, dateFrom, dateTo]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await get(`/operator-portal/complaints?${buildQuery()}`);
      setRows(r.data?.rows || []);
      setTotal(r.data?.total || 0);
    } catch (err) {
      showToast('Failed to load complaints', 'error');
    } finally {
      setLoading(false);
    }
  }, [buildQuery]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!socket) return;
    socket.on('complaint:new', load);
    return () => socket.off('complaint:new', load);
  }, [socket, load]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const q = buildQuery({ limit: 5000, offset: 0 });
      const r = await get(`/operator-portal/complaints?${q}`);
      downloadCSV(toCSV(r.data?.rows || []), `complaints-${new Date().toISOString().slice(0, 10)}.csv`);
    } catch {
      showToast('Export failed', 'error');
    } finally {
      setExporting(false);
    }
  };

  const resetFilters = () => {
    setStatus(''); setSeverity(''); setSearch('');
    setDateFrom(''); setDateTo(''); setPage(0);
  };

  const hasFilters = status || severity || search || dateFrom || dateTo;

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h5" fontWeight={700}>Complaints</Typography>
        <Typography variant="body2" color="text.secondary">{total} total</Typography>
      </Stack>

      <Paper sx={{ mb: 2, overflow: 'hidden' }}>
        <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ md: 'center' }} spacing={0}
          divider={<Divider orientation="vertical" flexItem />}>

          <Box sx={{ flex: '1 1 220px', px: 1.5, py: 1.25 }}>
            <TextField fullWidth size="small" placeholder="Search ref or description…"
              value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              slotProps={{ input: { disableUnderline: true, startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" sx={{ color: 'text.disabled' }} /></InputAdornment> } }}
              variant="standard"
              sx={{ '& .MuiInput-root': { fontSize: 14 } }} />
          </Box>

          <Box sx={{ flex: '0 0 150px', px: 1.5, py: 1.25 }}>
            <TextField select fullWidth size="small" variant="standard"
              value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }}
              slotProps={{ input: { disableUnderline: true } }}
              sx={{ '& .MuiInput-root': { fontSize: 14 } }}>
              {STATUSES.map((s) => <MenuItem key={s} value={s}>{s || 'All Statuses'}</MenuItem>)}
            </TextField>
          </Box>

          <Box sx={{ flex: '0 0 150px', px: 1.5, py: 1.25 }}>
            <TextField select fullWidth size="small" variant="standard"
              value={severity} onChange={(e) => { setSeverity(e.target.value); setPage(0); }}
              slotProps={{ input: { disableUnderline: true } }}
              sx={{ '& .MuiInput-root': { fontSize: 14 } }}>
              {SEVERITIES.map((s) => <MenuItem key={s} value={s}>{s || 'All Severities'}</MenuItem>)}
            </TextField>
          </Box>

          <Box sx={{ flex: '0 0 155px', px: 1.5, py: 1.25 }}>
            <TextField fullWidth size="small" type="date" variant="standard"
              value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(0); }}
              slotProps={{ input: { disableUnderline: true }, inputLabel: { shrink: true } }}
              label="From" sx={{ '& .MuiInput-root': { fontSize: 14 } }} />
          </Box>

          <Box sx={{ flex: '0 0 155px', px: 1.5, py: 1.25 }}>
            <TextField fullWidth size="small" type="date" variant="standard"
              value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(0); }}
              slotProps={{ input: { disableUnderline: true }, inputLabel: { shrink: true } }}
              label="To" sx={{ '& .MuiInput-root': { fontSize: 14 } }} />
          </Box>

          <Stack direction="row" alignItems="center" spacing={0.5} sx={{ px: 1.5, py: 1, flexShrink: 0 }}>
            {hasFilters && (
              <Tooltip title="Clear filters">
                <IconButton size="small" onClick={resetFilters} sx={{ color: 'text.secondary' }}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title="Refresh">
              <IconButton size="small" onClick={load} sx={{ color: 'text.secondary' }}>
                <RefreshIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
            <Button size="small" variant="contained" disableElevation
              startIcon={<DownloadIcon fontSize="small" />}
              onClick={handleExport} disabled={exporting}
              sx={{ whiteSpace: 'nowrap', fontSize: 13 }}>
              {exporting ? 'Exporting…' : 'Export CSV'}
            </Button>
          </Stack>
        </Stack>

        {hasFilters && (
          <Box sx={{ px: 2, py: 0.75, bgcolor: 'action.hover', borderTop: 1, borderColor: 'divider' }}>
            <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap">
              <FilterListIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>Active filters:</Typography>
              {status   && <Chip size="small" label={status}   onDelete={() => setStatus('')}   sx={{ height: 20, fontSize: 11 }} />}
              {severity && <Chip size="small" label={severity} onDelete={() => setSeverity('')} sx={{ height: 20, fontSize: 11 }} />}
              {dateFrom && <Chip size="small" label={`From ${dateFrom}`} onDelete={() => setDateFrom('')} sx={{ height: 20, fontSize: 11 }} />}
              {dateTo   && <Chip size="small" label={`To ${dateTo}`}     onDelete={() => setDateTo('')}   sx={{ height: 20, fontSize: 11 }} />}
              {search   && <Chip size="small" label={`"${search}"`}      onDelete={() => setSearch('')}   sx={{ height: 20, fontSize: 11 }} />}
            </Stack>
          </Box>
        )}
      </Paper>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Ref</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Issue Type</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Severity</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>SLA Deadline</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Created</TableCell>
              <TableCell sx={{ fontWeight: 700, width: 48 }} />
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={7} sx={{ textAlign: 'center', py: 6 }}>
                  <Typography color="text.secondary">No complaints found</Typography>
                </TableCell>
              </TableRow>
            )}
            {rows.map((r) => {
              const urgency = slaUrgency(r);
              const rowBg = urgency === 'breached'
                ? 'rgba(239,68,68,0.07)'
                : urgency === 'warning'
                  ? 'rgba(245,158,11,0.07)'
                  : 'transparent';
              return (
                <TableRow key={r.complaint_id} hover
                  sx={{ cursor: 'pointer', bgcolor: rowBg, '&:hover': { filter: 'brightness(0.97)' } }}
                  onClick={() => navigate(`/complaints/${r.complaint_id}`)}>
                  <TableCell>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      {urgency === 'breached' && (
                        <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'error.main', flexShrink: 0 }} />
                      )}
                      {urgency === 'warning' && (
                        <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'warning.main', flexShrink: 0 }} />
                      )}
                      <Typography variant="body2" fontWeight={700} color="primary.main">{r.complaint_ref}</Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>{r.issue_type}</TableCell>
                  <TableCell>
                    <Chip size="small" label={r.severity} color={SEVERITY_COLOR[r.severity] || 'default'} />
                  </TableCell>
                  <TableCell>
                    <Chip size="small" label={r.status} sx={{ bgcolor: STATUS_COLOR[r.status] || '#64748b', color: '#fff' }} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2"
                      color={urgency === 'breached' ? 'error.main' : urgency === 'warning' ? 'warning.main' : 'text.primary'}
                      fontWeight={urgency ? 700 : 400}>
                      {r.sla_deadline ? new Date(r.sla_deadline).toLocaleString() : '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>{new Date(r.created_at).toLocaleDateString()}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()} sx={{ pr: 0.5 }}>
                    <QuickActionsMenu complaint={r} onDone={load} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <TablePagination component="div" count={total} page={page} rowsPerPage={perPage}
          onPageChange={(_e, p) => setPage(p)}
          onRowsPerPageChange={(e) => { setPerPage(+e.target.value); setPage(0); }}
          rowsPerPageOptions={[10, 25, 50]} />
      </TableContainer>
    </Box>
  );
}
