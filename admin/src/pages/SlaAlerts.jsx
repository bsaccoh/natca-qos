import { useState, useEffect, useCallback } from 'react';
import {
  Box, Paper, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, Stack, IconButton, Tooltip, Button,
  CircularProgress,
} from '@mui/material';
import RefreshIcon    from '@mui/icons-material/Refresh';
import WarningIcon    from '@mui/icons-material/Warning';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import { get, patch } from '../api/client.js';
import { useToast }   from '../components/ToastContext.jsx';

const SEVERITY_COLOR = { LOW: 'default', MEDIUM: 'warning', HIGH: 'error', CRITICAL: 'error' };

function fmtOverdue(hours) {
  if (hours < 1) return `${Math.round(hours * 60)}m overdue`;
  if (hours < 24) return `${hours.toFixed(1)}h overdue`;
  return `${(hours / 24).toFixed(1)}d overdue`;
}

export default function SlaAlerts() {
  const { showToast } = useToast();
  const [rows, setRows]             = useState([]);
  const [loading, setLoading]       = useState(false);
  const [escalating, setEscalating] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await get('/analytics/sla-alerts');
      setRows(r.data || []);
    } catch {
      showToast('Failed to load SLA alerts.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const escalate = async (id, ref) => {
    setEscalating(id);
    try {
      await patch(`/complaints/${id}`, { status: 'ESCALATED', internalNote: 'Auto-escalated via SLA Alert Panel' });
      showToast(`${ref} escalated.`, 'success');
      load();
    } catch {
      showToast(`Failed to escalate ${ref}.`, 'error');
    } finally {
      setEscalating(null);
    }
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <WarningIcon color="error" />
          <Typography variant="h5" fontWeight={700}>SLA Alert Panel</Typography>
          {!loading && (
            <Chip label={`${rows.length} breached`} color="error" size="small" />
          )}
        </Stack>
        <Tooltip title="Refresh">
          <IconButton onClick={load} disabled={loading}>
            {loading ? <CircularProgress size={20} /> : <RefreshIcon />}
          </IconButton>
        </Tooltip>
      </Stack>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Ref</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Issue Type</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Operator</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Severity</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Overdue</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>SLA Deadline</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Assigned To</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={9} sx={{ textAlign: 'center', py: 6 }}>
                  <Stack alignItems="center" spacing={1}>
                    <WarningIcon sx={{ fontSize: 40, color: 'success.main' }} />
                    <Typography color="text.secondary">No SLA breaches — all complaints are within deadline</Typography>
                  </Stack>
                </TableCell>
              </TableRow>
            )}
            {rows.map((r) => (
              <TableRow key={r.complaint_id} hover
                sx={{ bgcolor: r.overdue_hours > 48 ? 'error.main' : r.overdue_hours > 24 ? 'warning.main' : 'inherit',
                      '&:hover': { filter: 'brightness(0.95)' }, opacity: 1 }}>
                <TableCell>
                  <Typography variant="body2" fontWeight={700} color={r.overdue_hours > 24 ? 'error.contrastText' : 'primary.main'}>
                    {r.complaint_ref}
                  </Typography>
                </TableCell>
                <TableCell sx={{ color: r.overdue_hours > 24 ? 'error.contrastText' : 'inherit' }}>
                  {r.issue_type}
                </TableCell>
                <TableCell sx={{ color: r.overdue_hours > 24 ? 'error.contrastText' : 'inherit' }}>
                  {r.operator_name}
                </TableCell>
                <TableCell>
                  <Chip size="small" label={r.severity} color={SEVERITY_COLOR[r.severity] || 'default'} />
                </TableCell>
                <TableCell>
                  <Chip size="small" label={r.status} sx={{ bgcolor: '#64748b', color: '#fff' }} />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight={700} color="error.main">
                    {fmtOverdue(r.overdue_hours)}
                  </Typography>
                </TableCell>
                <TableCell sx={{ color: r.overdue_hours > 24 ? 'error.contrastText' : 'inherit' }}>
                  {new Date(r.sla_deadline).toLocaleString()}
                </TableCell>
                <TableCell sx={{ color: r.overdue_hours > 24 ? 'error.contrastText' : 'text.secondary' }}>
                  {r.assigned_officer_name || '-'}
                </TableCell>
                <TableCell>
                  {r.status !== 'ESCALATED' && (
                    <Button size="small" variant="contained" color="warning" disableElevation
                      startIcon={escalating === r.complaint_id ? <CircularProgress size={14} /> : <ArrowUpwardIcon fontSize="small" />}
                      disabled={escalating === r.complaint_id}
                      onClick={() => escalate(r.complaint_id, r.complaint_ref)}
                      sx={{ whiteSpace: 'nowrap' }}>
                      Escalate
                    </Button>
                  )}
                  {r.status === 'ESCALATED' && (
                    <Chip size="small" label="Escalated" color="warning" />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
