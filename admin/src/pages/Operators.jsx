import { useState, useEffect, useCallback } from 'react';
import {
  Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, Paper, Stack, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Typography, Alert, CircularProgress,
} from '@mui/material';
import AddIcon       from '@mui/icons-material/Add';
import EditIcon      from '@mui/icons-material/Edit';
import RefreshIcon   from '@mui/icons-material/Refresh';
import CellTowerIcon from '@mui/icons-material/CellTower';
import { get, post, put } from '../api/client.js';
import PageHeader          from '../components/PageHeader.jsx';

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
    setSaving(true); setErr('');
    try {
      if (editing) {
        await put(`/operators/${operator.operator_id}`, form);
      } else {
        await post('/operators', form);
      }
      onSaved();
    } catch (ex) {
      setErr(ex.response?.data?.error || 'Save failed');
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{editing ? 'Edit Operator' : 'Add Operator'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {err && <Alert severity="error">{err}</Alert>}
          <TextField label="Operator Name *" value={form.operatorName} onChange={set('operatorName')} fullWidth />
          <TextField label="Code *" value={form.code} onChange={set('code')} fullWidth placeholder="e.g. ORANGE" />
          <TextField label="Hotline" value={form.hotline} onChange={set('hotline')} fullWidth placeholder="e.g. 100" />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={save} disabled={saving}>
          {saving ? <CircularProgress size={18} /> : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function Operators() {
  const [operators, setOperators] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [err, setErr]             = useState('');
  const [dialog, setDialog]       = useState({ open: false, operator: null });

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      const r = await get('/operators');
      setOperators(r.data || []);
    } catch (ex) {
      setErr(ex.response?.data?.error || 'Failed to load operators');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <PageHeader icon={<CellTowerIcon />} title="Operators"
        subtitle={`${operators.length} operators`}
        actions={
          <>
            <IconButton onClick={load}><RefreshIcon /></IconButton>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialog({ open: true, operator: null })}>
              Add Operator
            </Button>
          </>
        }
      />

      {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}

      <TableContainer component={Paper} elevation={0}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'action.hover' }}>
              <TableCell>Name</TableCell>
              <TableCell>Code</TableCell>
              <TableCell>Hotline</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && (
              <TableRow><TableCell colSpan={5} align="center"><CircularProgress size={24} sx={{ my: 2 }} /></TableCell></TableRow>
            )}
            {!loading && operators.length === 0 && (
              <TableRow><TableCell colSpan={5} align="center">
                <Typography color="text.secondary" sx={{ py: 4 }}>No operators yet</Typography>
              </TableCell></TableRow>
            )}
            {operators.map((o) => (
              <TableRow key={o.operator_id} hover>
                <TableCell>
                  <Typography variant="body2" fontWeight={600}>{o.operator_name}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="caption" fontFamily="monospace" color="text.secondary">{o.code}</Typography>
                </TableCell>
                <TableCell>{o.hotline || '—'}</TableCell>
                <TableCell>
                  <Chip size="small" label={o.status} color={o.status === 'ACTIVE' ? 'success' : 'default'} variant="outlined" sx={{ fontSize: '0.68rem' }} />
                </TableCell>
                <TableCell>
                  <IconButton size="small" onClick={() => setDialog({ open: true, operator: o })}><EditIcon fontSize="small" /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <OperatorDialog
        open={dialog.open}
        operator={dialog.operator}
        onClose={() => setDialog({ open: false, operator: null })}
        onSaved={() => { setDialog({ open: false, operator: null }); load(); }}
      />
    </Box>
  );
}
