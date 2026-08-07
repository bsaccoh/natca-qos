import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Paper, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, Stack, IconButton, Tooltip, TablePagination,
  TextField, MenuItem, InputAdornment,
} from '@mui/material';
import SearchIcon   from '@mui/icons-material/Search';
import RefreshIcon  from '@mui/icons-material/Refresh';
import InboxIcon    from '@mui/icons-material/Inbox';
import { get }      from '../api/client.js';
import { useAuth }  from '../auth/AuthContext.jsx';

const STATUS_COLOR = {
  NEW:          '#3b82f6',
  UNDER_REVIEW: '#f59e0b',
  ASSIGNED:     '#8b5cf6',
  ESCALATED:    '#ef4444',
  RESOLVED:     '#10b981',
  CLOSED:       '#64748b',
};

const SEVERITY_COLOR = { LOW: 'default', MEDIUM: 'warning', HIGH: 'error', CRITICAL: 'error' };

const STATUSES = ['', 'NEW', 'UNDER_REVIEW', 'ASSIGNED', 'ESCALATED', 'RESOLVED', 'CLOSED'];

export default function MyQueue() {
  const { user }   = useAuth();
  const navigate   = useNavigate();
  const [rows, setRows]       = useState([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(0);
  const [perPage, setPerPage] = useState(25);
  const [status, setStatus]   = useState('');
  const [search, setSearch]   = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!user?.userId) return;
    setLoading(true);
    try {
      const q = new URLSearchParams({
        assignedTo: user.userId,
        limit:  perPage,
        offset: page * perPage,
      });
      if (status) q.set('status', status);
      if (search) q.set('search', search);
      const r = await get(`/complaints?${q}`);
      setRows(r.data?.rows || []);
      setTotal(r.data?.total || 0);
    } catch (err) {
      console.error('My Queue load failed', err);
    } finally {
      setLoading(false);
    }
  }, [user, page, perPage, status, search]);

  useEffect(() => { load(); }, [load]);

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <InboxIcon color="primary" />
          <Typography variant="h5" fontWeight={700}>My Queue</Typography>
          <Chip label={`${total} complaints`} size="small" />
        </Stack>
        <Tooltip title="Refresh">
          <IconButton onClick={load} disabled={loading}><RefreshIcon /></IconButton>
        </Tooltip>
      </Stack>

      <Paper sx={{ p: 1.5, mb: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <TextField size="small" placeholder="Search ref or description…" value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }}
            sx={{ minWidth: 240 }} />
          <TextField select size="small" label="Status" value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(0); }} sx={{ minWidth: 160 }}>
            {STATUSES.map((s) => <MenuItem key={s} value={s}>{s || 'All Statuses'}</MenuItem>)}
          </TextField>
        </Stack>
      </Paper>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Ref</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Issue Type</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Operator</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Severity</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>SLA Deadline</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Created</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={7} sx={{ textAlign: 'center', py: 6 }}>
                  <Stack alignItems="center" spacing={1}>
                    <InboxIcon sx={{ fontSize: 40, color: 'text.disabled' }} />
                    <Typography color="text.secondary">No complaints assigned to you</Typography>
                  </Stack>
                </TableCell>
              </TableRow>
            )}
            {rows.map((r) => {
              const slaBreached = r.sla_deadline && new Date(r.sla_deadline) < new Date()
                && !['RESOLVED', 'CLOSED'].includes(r.status);
              return (
                <TableRow key={r.complaint_id} hover sx={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/complaints?search=${r.complaint_ref}`)}>
                  <TableCell>
                    <Typography variant="body2" fontWeight={700} color="primary.main">{r.complaint_ref}</Typography>
                  </TableCell>
                  <TableCell>{r.issue_type}</TableCell>
                  <TableCell>{r.operator_name || '-'}</TableCell>
                  <TableCell>
                    <Chip size="small" label={r.severity} color={SEVERITY_COLOR[r.severity] || 'default'} />
                  </TableCell>
                  <TableCell>
                    <Chip size="small" label={r.status}
                      sx={{ bgcolor: STATUS_COLOR[r.status] || '#64748b', color: '#fff' }} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2"
                      color={slaBreached ? 'error.main' : 'text.primary'}
                      fontWeight={slaBreached ? 700 : 400}>
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
