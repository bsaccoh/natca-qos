import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, Container, Paper, Stack, Typography, Alert, CircularProgress,
  Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TablePagination, Tooltip, FormControl, InputLabel, Select, MenuItem,
  IconButton,
} from '@mui/material';
import RefreshIcon       from '@mui/icons-material/Refresh';
import AddIcon           from '@mui/icons-material/Add';
import SearchIcon        from '@mui/icons-material/Search';
import { get }           from '../api/client.js';
import { useAuth }       from '../auth/AuthContext.jsx';
import { STATUS_COLOR }  from '../theme/theme.js';

function timeSince(ts) {
  if (!ts) return '—';
  const s = Math.floor((Date.now() - new Date(ts)) / 1000);
  if (s < 60)    return `${s}s ago`;
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(ts).toLocaleDateString();
}

const SEVERITY_COLOR = { LOW: 'default', MEDIUM: 'info', HIGH: 'warning', CRITICAL: 'error' };

export default function MyComplaints() {
  const { user }    = useAuth();
  const navigate    = useNavigate();

  const [rows, setRows]         = useState([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [err, setErr]           = useState('');
  const [page, setPage]         = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [statusFilter, setStatusFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      const params = new URLSearchParams({
        limit:  rowsPerPage,
        offset: page * rowsPerPage,
        userId: user.userId,
      });
      if (statusFilter) params.set('status', statusFilter);
      const r = await get(`/complaints?${params}`);
      setRows(r.data?.rows || r.rows || []);
      setTotal(r.data?.total || r.total || 0);
    } catch (ex) {
      setErr(ex.response?.data?.error || 'Failed to load complaints');
    } finally { setLoading(false); }
  }, [user, page, rowsPerPage, statusFilter]);

  useEffect(() => { load(); }, [load]);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>My Complaints</Typography>
          <Typography variant="body2" color="text.secondary">
            {total} complaint{total !== 1 ? 's' : ''} · Hello, {user?.fullName}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <IconButton onClick={load} title="Refresh"><RefreshIcon /></IconButton>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/submit')}>
            New Complaint
          </Button>
        </Stack>
      </Stack>

      {/* Filters */}
      <Stack direction="row" spacing={1.5} sx={{ mb: 2 }}>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Status</InputLabel>
          <Select value={statusFilter} label="Status" onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}>
            <MenuItem value="">All</MenuItem>
            {['NEW','UNDER_REVIEW','ASSIGNED','ESCALATED','RESOLVED','CLOSED'].map((s) => (
              <MenuItem key={s} value={s}>{s.replace(/_/g, ' ')}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}

      <TableContainer component={Paper} elevation={0}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'action.hover' }}>
              <TableCell>Reference</TableCell>
              <TableCell>Issue</TableCell>
              <TableCell>Operator</TableCell>
              <TableCell>Severity</TableCell>
              <TableCell>Submitted</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <CircularProgress size={24} sx={{ my: 2 }} />
                </TableCell>
              </TableRow>
            )}
            {!loading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Box sx={{ py: 5 }}>
                    <Typography color="text.secondary" gutterBottom>No complaints yet</Typography>
                    <Button variant="contained" size="small" onClick={() => navigate('/submit')}>
                      File your first complaint
                    </Button>
                  </Box>
                </TableCell>
              </TableRow>
            )}
            {rows.map((c) => (
              <TableRow key={c.complaint_id} hover>
                <TableCell>
                  <Typography variant="caption" fontFamily="monospace">{c.complaint_ref}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight={600}>{c.issue_type?.replace(/_/g, ' ')}</Typography>
                  {c.category_name && <Typography variant="caption" color="text.secondary">{c.category_name}</Typography>}
                </TableCell>
                <TableCell>{c.operator_name || '—'}</TableCell>
                <TableCell>
                  <Chip size="small" label={c.severity}
                    color={SEVERITY_COLOR[c.severity] || 'default'} variant="outlined"
                    sx={{ fontSize: '0.68rem' }} />
                </TableCell>
                <TableCell>
                  <Tooltip title={new Date(c.created_at).toLocaleString()}>
                    <Typography variant="caption">{timeSince(c.created_at)}</Typography>
                  </Tooltip>
                </TableCell>
                <TableCell>
                  <Chip size="small"
                    label={c.status?.replace(/_/g, ' ')}
                    color={STATUS_COLOR[c.status] || 'default'}
                    variant={c.status === 'NEW' ? 'filled' : 'outlined'}
                    sx={{ fontSize: '0.68rem' }}
                  />
                </TableCell>
                <TableCell>
                  <IconButton size="small" onClick={() => navigate(`/track?ref=${c.complaint_ref}`)} title="Track">
                    <SearchIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
          rowsPerPageOptions={[5, 10, 25]}
        />
      </TableContainer>
    </Container>
  );
}
