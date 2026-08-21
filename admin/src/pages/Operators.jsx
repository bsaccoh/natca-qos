import { useState, useEffect, useCallback } from 'react';
import {
  Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, Paper, Stack, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Typography, Alert, CircularProgress, alpha,
} from '@mui/material';
import AddIcon       from '@mui/icons-material/Add';
import EditIcon      from '@mui/icons-material/Edit';
import RefreshIcon   from '@mui/icons-material/Refresh';
import CellTowerIcon from '@mui/icons-material/CellTower';
import { get, post, put, getErrorMessage } from '../api/client.js';
import PageHeader from '../components/PageHeader.jsx';
import { useToast } from '../components/ToastContext.jsx';
import { getOperatorColor } from '../theme/theme.js';

function OperatorDialog({ open, operator, onClose, onSaved }) {
  const editing = !!operator;
  const [form, setForm] = useState({ operatorName: '', code: '', hotline: '' });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (operator) setForm({ operatorName: operator.operator_name, code: operator.code, hotline: operator.hotline || '' });
    else setForm({ operatorName: '', code: '', hotline: '' });
    setErr('');
  }, [operator, open]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    if (!form.operatorName.trim() || !form.code.trim()) {
      setErr('Operator name and short code are required');
      return;
    }
    setSaving(true); setErr('');
    try {
      if (editing) {
        await put(`/operators/${operator.operator_id}`, form);
      } else {
        await post('/operators', form);
      }
      onSaved();
    } catch (ex) {
      setErr(getErrorMessage(ex, 'Save failed'));
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: 2 } } }}>
      <DialogTitle sx={{ fontWeight: 700 }}>{editing ? 'Edit Telecom Operator' : 'Register Telecom Operator'}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          {err && <Alert severity="error">{err}</Alert>}
          <TextField label="Operator Name *" value={form.operatorName} onChange={set('operatorName')} fullWidth size="small" required />
          <TextField label="Operator Code *" value={form.code} onChange={set('code')} fullWidth size="small" placeholder="e.g. ORANGE" required />
          <TextField label="Customer Care Hotline" value={form.hotline} onChange={set('hotline')} fullWidth size="small" placeholder="e.g. 111" />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} sx={{ borderRadius: 1.5, textTransform: 'none' }}>Cancel</Button>
        <Button variant="contained" onClick={save} disabled={saving} sx={{ borderRadius: 1.5, textTransform: 'none', fontWeight: 600 }}>
          {saving ? <CircularProgress size={18} /> : 'Save Operator'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function Operators() {
  const { showToast } = useToast();
  const [operators, setOperators] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [dialog, setDialog]       = useState({ open: false, operator: null });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await get('/operators');
      setOperators(r.data || []);
    } catch (ex) {
      showToast(getErrorMessage(ex, 'Failed to load operators'), 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  return (
    <Box sx={{ width: '100%', pb: 4 }}>
      <PageHeader
        icon={<CellTowerIcon />}
        title="Telecom Operator Registry"
        subtitle={`Licensed Mobile Network Operators and ISPs (${operators.length} registered)`}
        actions={
          <Stack direction="row" spacing={1.5}>
            <IconButton onClick={load} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}>
              <RefreshIcon fontSize="small" />
            </IconButton>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setDialog({ open: true, operator: null })}
              sx={{ borderRadius: 1.5, textTransform: 'none', fontWeight: 600 }}
            >
              Add Operator
            </Button>
          </Stack>
        }
      />

      <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
        <Table size="small">
          <TableHead sx={{ bgcolor: (t) => alpha(t.palette.primary.main, 0.04) }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Operator Name</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Code</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Customer Hotline</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Regulatory Status</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && (
              <TableRow><TableCell colSpan={5} align="center"><CircularProgress size={28} sx={{ my: 4 }} /></TableCell></TableRow>
            )}
            {!loading && operators.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  <Typography color="text.secondary" sx={{ py: 6 }}>No operators registered yet</Typography>
                </TableCell>
              </TableRow>
            )}
            {operators.map((o) => {
              const opColor = getOperatorColor(o.operator_name, '#2563eb');
              return (
                <TableRow key={o.operator_id} hover>
                  <TableCell>
                    <Typography variant="subtitle2" fontWeight={700}>{o.operator_name}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={o.code}
                      sx={{
                        fontWeight: 800,
                        fontSize: 11,
                        borderRadius: 1,
                        bgcolor: alpha(opColor, 0.12),
                        color: opColor,
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{o.hotline || '—'}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={o.status || 'ACTIVE'}
                      color={o.status === 'ACTIVE' || !o.status ? 'success' : 'default'}
                      sx={{ fontWeight: 700, borderRadius: 1 }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" color="primary" onClick={() => setDialog({ open: true, operator: o })}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <OperatorDialog
        open={dialog.open}
        operator={dialog.operator}
        onClose={() => setDialog({ open: false, operator: null })}
        onSaved={() => {
          setDialog({ open: false, operator: null });
          showToast('Operator updated successfully', 'success');
          load();
        }}
      />
    </Box>
  );
}
