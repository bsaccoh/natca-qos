import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box, Paper, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, TextField, MenuItem, Stack, IconButton,
  Tooltip, TablePagination, InputAdornment,
} from '@mui/material';
import SearchIcon   from '@mui/icons-material/Search';
import RefreshIcon  from '@mui/icons-material/Refresh';
import { get } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { STATUS_COLOR, SEVERITY_COLOR } from '../theme/theme.js';

const STATUSES  = ['', 'NEW', 'UNDER_REVIEW', 'ASSIGNED', 'ESCALATED', 'RESOLVED', 'CLOSED'];
const SEVERITIES = ['', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export default function Complaints() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { socket } = useAuth();
  const [rows, setRows]       = useState([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(0);
  const [perPage, setPerPage] = useState(25);
  const [status, setStatus]   = useState(params.get('status') || '');
  const [severity, setSeverity] = useState('');
  const [search, setSearch]   = useState(params.get('search') || '');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ limit: perPage, offset: page * perPage });
      if (status)   q.set('status', status);
      if (severity) q.set('severity', severity);
      if (search)   q.set('search', search);
      const r = await get(`/operator-portal/complaints?${q}`);
      setRows(r.data?.rows || []);
      setTotal(r.data?.total || 0);
    } catch (err) {
      console.error('Failed to load complaints', err);
    } finally {
      setLoading(false);
    }
  }, [page, perPage, status, severity, search]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!socket) return;
    socket.on('complaint:new', load);
    return () => socket.off('complaint:new', load);
  }, [socket, load]);

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h5" fontWeight={700}>Complaints</Typography>
        <Tooltip title="Refresh">
          <IconButton onClick={load}><RefreshIcon /></IconButton>
        </Tooltip>
      </Stack>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <TextField size="small" placeholder="Search ref or description..."
            value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }}
            sx={{ minWidth: 220 }} />
          <TextField select size="small" label="Status" value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(0); }}
            sx={{ minWidth: 140 }}>
            {STATUSES.map((s) => <MenuItem key={s} value={s}>{s || 'All'}</MenuItem>)}
          </TextField>
          <TextField select size="small" label="Severity" value={severity}
            onChange={(e) => { setSeverity(e.target.value); setPage(0); }}
            sx={{ minWidth: 140 }}>
            {SEVERITIES.map((s) => <MenuItem key={s} value={s}>{s || 'All'}</MenuItem>)}
          </TextField>
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
