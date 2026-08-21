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
import { BRAND, STATUS_COLOR, getOperatorColor } from '../theme/theme.js';
import { timeSince, formatDate } from '../utils/formatters.js';

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
    if (!user) return;
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
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={2} sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={800} sx={{ color: BRAND.navy, mb: 0.5 }}>My Complaints</Typography>
          <Typography variant="body2" color="text.secondary">
            View history and track resolution progress for cases filed from your account
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={load} size="small">
            Refresh
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/submit')} sx={{ bgcolor: BRAND.primary }}>
            New Complaint
          </Button>
        </Stack>
      </Stack>

      {err && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{err}</Alert>}

      <Paper elevation={0} sx={{ border: `1px solid ${BRAND.border}`, borderRadius: 2, overflow: 'hidden' }}>
        <Box sx={{ p: 2, borderBottom: `1px solid ${BRAND.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle2" fontWeight={700}>
            {total} Total Case{total === 1 ? '' : 's'}
          </Typography>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Status Filter</InputLabel>
            <Select value={statusFilter} label="Status Filter" onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}>
              <MenuItem value="">All Statuses</MenuItem>
              <MenuItem value="NEW">New / Submitted</MenuItem>
              <MenuItem value="UNDER_REVIEW">Under Review</MenuItem>
              <MenuItem value="ASSIGNED">Assigned to Operator</MenuItem>
              <MenuItem value="ESCALATED">Escalated</MenuItem>
              <MenuItem value="RESOLVED">Resolved</MenuItem>
              <MenuItem value="CLOSED">Closed</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <TableContainer>
          <Table size="small">
            <TableHead sx={{ bgcolor: BRAND.alt }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Tracking ID</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Operator</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Issue Type</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Severity</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Submitted</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={32} />
                  </TableCell>
                </TableRow>
              )}
              {!loading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                    No complaints found.
                  </TableCell>
                </TableRow>
              )}
              {!loading && rows.map((c) => (
                <TableRow key={c.complaint_id} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                  <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700, color: 'primary.main' }}>
                    {c.reference_number || `#${c.complaint_id}`}
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={c.operator_name || 'N/A'}
                      sx={{
                        fontWeight: 700,
                        fontSize: '0.72rem',
                        bgcolor: `${getOperatorColor(c.operator_name)}15`,
                        color: getOperatorColor(c.operator_name),
                      }}
                    />
                  </TableCell>
                  <TableCell>{c.issue_type?.replace(/_/g, ' ') || 'General'}</TableCell>
                  <TableCell>
                    <Chip size="small" label={c.severity || 'LOW'} color={SEVERITY_COLOR[c.severity] || 'default'} />
                  </TableCell>
                  <TableCell>
                    <Chip size="small" label={c.status?.replace(/_/g, ' ')} color={STATUS_COLOR[c.status] || 'default'} />
                  </TableCell>
                  <TableCell title={formatDate(c.created_at, 'time')}>
                    {timeSince(c.created_at)}
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Track Details">
                      <IconButton size="small" onClick={() => navigate(`/track?ref=${encodeURIComponent(c.reference_number || c.complaint_id)}`)}>
                        <SearchIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
          rowsPerPageOptions={[5, 10, 25]}
        />
      </Paper>
    </Container>
  );
}
