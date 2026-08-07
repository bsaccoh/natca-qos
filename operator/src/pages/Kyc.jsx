import { useState, useEffect, useCallback } from 'react';
import {
  Box, Paper, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, TextField, MenuItem, Stack, IconButton,
  Tooltip, TablePagination, InputAdornment, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, Alert,
} from '@mui/material';
import SearchIcon   from '@mui/icons-material/Search';
import RefreshIcon  from '@mui/icons-material/Refresh';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { get, patch } from '../api/client.js';

const STATUSES = ['', 'PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'OPERATOR_CONFIRMED'];

const STATUS_COLOR = {
  PENDING: '#f59e0b',
  UNDER_REVIEW: '#3b82f6',
  APPROVED: '#10b981',
  REJECTED: '#ef4444',
  OPERATOR_CONFIRMED: '#8b5cf6',
};

export default function Kyc() {
  const [rows, setRows]         = useState([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(0);
  const [perPage, setPerPage]   = useState(25);
  const [status, setStatus]     = useState('');
  const [search, setSearch]     = useState('');
  const [loading, setLoading]   = useState(false);
  const [confirmId, setConfirmId] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmError, setConfirmError]     = useState('');
  const [confirmSuccess, setConfirmSuccess] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ limit: perPage, offset: page * perPage });
      if (status) q.set('status', status);
      if (search) q.set('search', search);
      const r = await get(`/operator-portal/kyc?${q}`);
      setRows(r.data?.rows || []);
      setTotal(r.data?.total || 0);
    } catch (err) {
      console.error('Failed to load KYC', err);
    } finally {
      setLoading(false);
    }
  }, [page, perPage, status, search]);

  useEffect(() => { load(); }, [load]);

  const handleConfirm = async () => {
    setConfirmLoading(true);
    setConfirmError('');
    try {
      await patch(`/operator-portal/kyc/${confirmId}/confirm`, {});
      setConfirmSuccess('SIM registration confirmed successfully.');
      load();
    } catch (err) {
      setConfirmError(err.response?.data?.error || 'Failed to confirm SIM registration.');
    } finally {
      setConfirmLoading(false);
    }
  };

  const closeDialog = () => {
    setConfirmId(null);
    setConfirmError('');
    setConfirmSuccess('');
  };

  const selectedRow = rows.find((r) => r.kyc_id === confirmId);

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h5" fontWeight={700}>KYC / SIM Management</Typography>
        <Tooltip title="Refresh">
          <IconButton onClick={load}><RefreshIcon /></IconButton>
        </Tooltip>
      </Stack>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <TextField size="small" placeholder="Search by NIN, phone, name..."
            value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }}
            sx={{ minWidth: 220 }} />
          <TextField select size="small" label="Status" value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(0); }} sx={{ minWidth: 160 }}>
            {STATUSES.map((s) => <MenuItem key={s} value={s}>{s || 'All'}</MenuItem>)}
          </TextField>
        </Stack>
      </Paper>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Phone</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>NIN</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>ID Type</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Submitted</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={7} sx={{ textAlign: 'center', py: 6 }}>
                  <Typography color="text.secondary">No KYC submissions found</Typography>
                </TableCell>
              </TableRow>
            )}
            {rows.map((r) => (
              <TableRow key={r.kyc_id} hover>
                <TableCell>{r.phone}</TableCell>
                <TableCell>{[r.first_name, r.last_name].filter(Boolean).join(' ') || '-'}</TableCell>
                <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>{r.nin || '-'}</TableCell>
                <TableCell>{r.id_type || '-'}</TableCell>
                <TableCell>
                  <Chip size="small" label={r.status}
                    sx={{ bgcolor: STATUS_COLOR[r.status] || '#64748b', color: '#fff' }} />
                </TableCell>
                <TableCell>{new Date(r.created_at).toLocaleDateString()}</TableCell>
                <TableCell>
                  {r.status === 'APPROVED' && (
                    <Tooltip title="Confirm physical SIM registration">
                      <Button size="small" variant="outlined" color="success"
                        startIcon={<CheckCircleIcon />}
                        onClick={() => setConfirmId(r.kyc_id)}>
                        Confirm SIM
                      </Button>
                    </Tooltip>
                  )}
                  {r.status === 'OPERATOR_CONFIRMED' && (
                    <Typography variant="caption" color="success.main" fontWeight={700}>✓ SIM Confirmed</Typography>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination component="div" count={total} page={page} rowsPerPage={perPage}
          onPageChange={(_e, p) => setPage(p)}
          onRowsPerPageChange={(e) => { setPerPage(+e.target.value); setPage(0); }}
          rowsPerPageOptions={[10, 25, 50]} />
      </TableContainer>

      {/* Confirm SIM dialog */}
      <Dialog open={Boolean(confirmId)} onClose={closeDialog} maxWidth="xs" fullWidth>
        <DialogTitle>Confirm SIM Registration</DialogTitle>
        <DialogContent>
          {confirmSuccess ? (
            <Alert severity="success">{confirmSuccess}</Alert>
          ) : (
            <>
              {confirmError && <Alert severity="error" sx={{ mb: 2 }}>{confirmError}</Alert>}
              <Typography variant="body2">
                Confirm that the SIM card has been physically registered for:
              </Typography>
              <Box sx={{ mt: 1.5, p: 1.5, borderRadius: 1, bgcolor: 'action.hover' }}>
                <Typography variant="body2"><strong>Phone:</strong> {selectedRow?.phone}</Typography>
                <Typography variant="body2"><strong>Name:</strong> {[selectedRow?.first_name, selectedRow?.last_name].filter(Boolean).join(' ') || '-'}</Typography>
                <Typography variant="body2"><strong>NIN:</strong> {selectedRow?.nin || '-'}</Typography>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
                This action confirms physical SIM issuance and cannot be undone.
              </Typography>
            </>
          )}
        </DialogContent>
        <DialogActions>
          {confirmSuccess ? (
            <Button onClick={closeDialog}>Close</Button>
          ) : (
            <>
              <Button onClick={closeDialog} disabled={confirmLoading}>Cancel</Button>
              <Button variant="contained" color="success" onClick={handleConfirm}
                disabled={confirmLoading} startIcon={<CheckCircleIcon />}>
                {confirmLoading ? 'Confirming...' : 'Confirm SIM'}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
