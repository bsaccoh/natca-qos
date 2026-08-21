import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Paper, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, Stack, IconButton, TablePagination,
  TextField, MenuItem, InputAdornment, alpha,
} from '@mui/material';
import SearchIcon   from '@mui/icons-material/Search';
import RefreshIcon  from '@mui/icons-material/Refresh';
import InboxIcon    from '@mui/icons-material/Inbox';
import { get }      from '../api/client.js';
import { useAuth }  from '../auth/AuthContext.jsx';
import PageHeader   from '../components/PageHeader.jsx';
import { formatDate } from '../utils/formatters.js';
import { getOperatorColor, STATUS_COLORS, SEVERITY_COLORS } from '../theme/theme.js';

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
      const r = await get(`/complaints?${q.toString()}`);
      setRows(r.data?.rows || []);
      setTotal(r.data?.total || 0);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [user, page, perPage, status, search]);

  useEffect(() => { load(); }, [load]);

  return (
    <Box sx={{ width: '100%', pb: 4 }}>
      <PageHeader
        icon={<InboxIcon />}
        title="My Assigned Complaint Queue"
        subtitle={`Active cases assigned to your regulatory officer profile (${total} total)`}
        actions={
          <IconButton onClick={load} disabled={loading} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}>
            <RefreshIcon fontSize="small" />
          </IconButton>
        }
      />

      <Paper sx={{ p: 2.5, mb: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            size="small"
            placeholder="Search ref or description…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            slotProps={{
              input: {
                startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
              },
            }}
            sx={{ flex: 1, minWidth: 260 }}
          />
          <TextField
            select
            size="small"
            label="Status"
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(0); }}
            sx={{ minWidth: 180 }}
          >
            {STATUSES.map((s) => <MenuItem key={s} value={s}>{s ? s.replace(/_/g, ' ') : 'All Statuses'}</MenuItem>)}
          </TextField>
        </Stack>
      </Paper>

      <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
        <Table size="small">
          <TableHead sx={{ bgcolor: (t) => alpha(t.palette.primary.main, 0.04) }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Case Ref</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Issue Type</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Operator</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Severity</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>SLA Deadline</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Submitted</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={7} sx={{ textAlign: 'center', py: 6 }}>
                  <Stack alignItems="center" spacing={1}>
                    <InboxIcon sx={{ fontSize: 44, color: 'text.disabled' }} />
                    <Typography color="text.secondary">No complaints currently assigned to you</Typography>
                  </Stack>
                </TableCell>
              </TableRow>
            )}
            {rows.map((r) => {
              const slaBreached = r.sla_deadline && new Date(r.sla_deadline) < new Date()
                && !['RESOLVED', 'CLOSED'].includes(r.status);
              const opColor = getOperatorColor(r.operator_name, '#2563eb');
              const stColor = STATUS_COLORS[r.status] || '#64748b';
              const sevColor = SEVERITY_COLORS[r.severity] || '#64748b';

              return (
                <TableRow
                  key={r.complaint_id}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/complaints?search=${r.complaint_ref}`)}
                >
                  <TableCell>
                    <Typography variant="body2" fontWeight={800} color="primary.main" sx={{ fontFamily: 'monospace' }}>
                      {r.complaint_ref}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>{r.issue_type?.replace(/_/g, ' ')}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={r.operator_name || '—'}
                      sx={{
                        fontWeight: 700,
                        fontSize: 11,
                        borderRadius: 1,
                        bgcolor: alpha(opColor, 0.12),
                        color: opColor,
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={r.severity}
                      sx={{
                        fontWeight: 800,
                        fontSize: 10,
                        borderRadius: 1,
                        bgcolor: alpha(sevColor, 0.12),
                        color: sevColor,
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={r.status?.replace(/_/g, ' ')}
                      sx={{
                        fontWeight: 700,
                        borderRadius: 1,
                        bgcolor: alpha(stColor, 0.14),
                        color: stColor,
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography
                      variant="caption"
                      color={slaBreached ? 'error.main' : 'text.primary'}
                      fontWeight={slaBreached ? 800 : 500}
                    >
                      {formatDate(r.sla_deadline)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {formatDate(r.created_at)}
                    </Typography>
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
          rowsPerPage={perPage}
          onPageChange={(_e, p) => setPage(p)}
          onRowsPerPageChange={(e) => { setPerPage(parseInt(e.target.value, 10)); setPage(0); }}
          rowsPerPageOptions={[10, 25, 50]}
        />
      </TableContainer>
    </Box>
  );
}
