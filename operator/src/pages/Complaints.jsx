import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box, Paper, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, TextField, MenuItem, Stack, IconButton,
  Tooltip, TablePagination, InputAdornment, Button,
} from '@mui/material';
import SearchIcon    from '@mui/icons-material/Search';
import RefreshIcon   from '@mui/icons-material/Refresh';
import DownloadIcon  from '@mui/icons-material/Download';
import { get, api } from '../api/client.js';
import { useAuth }   from '../auth/AuthContext.jsx';
import { STATUS_COLOR, SEVERITY_COLOR } from '../theme/theme.js';

const STATUSES   = ['', 'NEW', 'UNDER_REVIEW', 'ASSIGNED', 'ESCALATED', 'RESOLVED', 'CLOSED'];
const SEVERITIES = ['', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

function toCSV(rows) {
  const headers = ['Ref', 'Issue Type', 'Severity', 'Status', 'Area', 'SLA Deadline', 'Created'];
  const lines = rows.map((r) => [
    r.complaint_ref,
    r.issue_type,
    r.severity,
    r.status,
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

export default function Complaints() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { socket } = useAuth();
  const [rows, setRows]         = useState([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(0);
  const [perPage, setPerPage]   = useState(25);
  const [status, setStatus]     = useState(params.get('status') || '');
  const [severity, setSeverity] = useState('');
  const [search, setSearch]     = useState(params.get('search') || '');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo]     = useState('');
  const [loading, setLoading]   = useState(false);
  const [exporting, setExporting] = useState(false);

  const buildQuery = useCallback((overrides = {}) => {
    const q = new URLSearchParams({
      limit: overrides.limit ?? perPage,
      offset: overrides.offset ?? page * perPage,
    });
    const s = overrides.status ?? status;
    const sv = overrides.severity ?? severity;
    const sr = overrides.search ?? search;
    const df = overrides.dateFrom ?? dateFrom;
    const dt = overrides.dateTo ?? dateTo;
    if (s)  q.set('status', s);
    if (sv) q.set('severity', sv);
    if (sr) q.set('search', sr);
    if (df) q.set('dateFrom', df);
    if (dt) q.set('dateTo', dt);
    return q.toString();
  }, [perPage, page, status, severity, search, dateFrom, dateTo]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await get(`/operator-portal/complaints?${buildQuery()}`);
      setRows(r.data?.rows || []);
      setTotal(r.data?.total || 0);
    } catch (err) {
      console.error('Failed to load complaints', err);
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
      const allRows = r.data?.rows || [];
      const csv = toCSV(allRows);
      const date = new Date().toISOString().slice(0, 10);
      downloadCSV(csv, `complaints-${date}.csv`);
    } catch (err) {
      console.error('Export failed', err);
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
        <Stack direction="row" spacing={1}>
          <Button size="small" variant="outlined" startIcon={<DownloadIcon />}
            onClick={handleExport} disabled={exporting}>
            {exporting ? 'Exporting...' : 'Export CSV'}
          </Button>
          <Tooltip title="Refresh">
            <IconButton onClick={load}><RefreshIcon /></IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack spacing={1.5}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} flexWrap="wrap">
            <TextField size="small" placeholder="Search ref or description..."
              value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }}
              sx={{ minWidth: 220 }} />
            <TextField select size="small" label="Status" value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(0); }} sx={{ minWidth: 140 }}>
              {STATUSES.map((s) => <MenuItem key={s} value={s}>{s || 'All'}</MenuItem>)}
            </TextField>
            <TextField select size="small" label="Severity" value={severity}
              onChange={(e) => { setSeverity(e.target.value); setPage(0); }} sx={{ minWidth: 140 }}>
              {SEVERITIES.map((s) => <MenuItem key={s} value={s}>{s || 'All'}</MenuItem>)}
            </TextField>
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems="center">
            <TextField size="small" label="Date From" type="date" value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(0); }}
              slotProps={{ inputLabel: { shrink: true } }} sx={{ minWidth: 160 }} />
            <TextField size="small" label="Date To" type="date" value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(0); }}
              slotProps={{ inputLabel: { shrink: true } }} sx={{ minWidth: 160 }} />
            {hasFilters && (
              <Button size="small" onClick={resetFilters} sx={{ whiteSpace: 'nowrap' }}>
                Clear filters
              </Button>
            )}
          </Stack>
        </Stack>
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
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={6} sx={{ textAlign: 'center', py: 6 }}>
                  <Typography color="text.secondary">No complaints found</Typography>
                </TableCell>
              </TableRow>
            )}
            {rows.map((r) => {
              const slaBreached = r.sla_deadline && new Date(r.sla_deadline) < new Date() && !['RESOLVED', 'CLOSED'].includes(r.status);
              return (
                <TableRow key={r.complaint_id} hover sx={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/complaints/${r.complaint_id}`)}>
                  <TableCell>
                    <Typography variant="body2" fontWeight={700} color="primary.main">{r.complaint_ref}</Typography>
                  </TableCell>
                  <TableCell>{r.issue_type}</TableCell>
                  <TableCell>
                    <Chip size="small" label={r.severity} color={SEVERITY_COLOR[r.severity] || 'default'} />
                  </TableCell>
                  <TableCell>
                    <Chip size="small" label={r.status} sx={{ bgcolor: STATUS_COLOR[r.status] || '#64748b', color: '#fff' }} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color={slaBreached ? 'error.main' : 'text.primary'} fontWeight={slaBreached ? 700 : 400}>
                      {r.sla_deadline ? new Date(r.sla_deadline).toLocaleString() : '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>{new Date(r.created_at).toLocaleDateString()}</TableCell>
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
