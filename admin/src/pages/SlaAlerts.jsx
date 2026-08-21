import { useState, useEffect, useCallback } from 'react';
import {
  Box, Paper, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, Stack, IconButton, Button,
  CircularProgress, alpha,
} from '@mui/material';
import RefreshIcon    from '@mui/icons-material/Refresh';
import WarningIcon    from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import { patch } from '../api/client.js';
import { useToast }   from '../components/ToastContext.jsx';
import { analyticsService } from '../services/analyticsService.js';
import PageHeader from '../components/PageHeader.jsx';
import { formatOverdue, formatDate } from '../utils/formatters.js';
import { getOperatorColor, SEVERITY_COLORS, STATUS_COLORS } from '../theme/theme.js';

export default function SlaAlerts() {
  const { showToast } = useToast();
  const [rows, setRows]             = useState([]);
  const [loading, setLoading]       = useState(false);
  const [escalating, setEscalating] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await analyticsService.getSlaAlerts();
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
      showToast(`${ref} escalated successfully.`, 'success');
      load();
    } catch {
      showToast(`Failed to escalate ${ref}.`, 'error');
    } finally {
      setEscalating(null);
    }
  };

  return (
    <Box sx={{ width: '100%', pb: 4 }}>
      <PageHeader
        icon={<WarningIcon />}
        title="SLA Breach & Escalation Panel"
        subtitle="Complaints exceeding mandated regulatory resolution deadlines"
        chip={!loading ? `${rows.length} Active Breaches` : undefined}
        chipColor="error"
        actions={
          <IconButton onClick={load} disabled={loading} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}>
            {loading ? <CircularProgress size={18} /> : <RefreshIcon fontSize="small" />}
          </IconButton>
        }
      />

      <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
        <Table size="small">
          <TableHead sx={{ bgcolor: (t) => alpha(t.palette.error.main, 0.05) }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Case Ref</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Issue Type</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Operator</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Severity</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Overdue Duration</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Mandated Deadline</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Assigned Officer</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={9} sx={{ textAlign: 'center', py: 6 }}>
                  <Stack alignItems="center" spacing={1.5}>
                    <CheckCircleIcon sx={{ fontSize: 44, color: 'success.main' }} />
                    <Typography variant="body1" fontWeight={700} color="text.primary">
                      All Cases Within Regulatory Limits
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      No complaints currently exceed their SLA resolution deadline
                    </Typography>
                  </Stack>
                </TableCell>
              </TableRow>
            )}
            {rows.map((r) => {
              const opColor = getOperatorColor(r.operator_name, '#2563eb');
              const sevColor = SEVERITY_COLORS[r.severity] || '#ef4444';
              const stColor = STATUS_COLORS[r.status] || '#64748b';

              return (
                <TableRow
                  key={r.complaint_id}
                  hover
                  sx={{
                    bgcolor: r.overdue_hours > 48 ? alpha('#ef4444', 0.04) : 'inherit',
                  }}
                >
                  <TableCell>
                    <Typography variant="body2" fontWeight={800} color="error.main" sx={{ fontFamily: 'monospace' }}>
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
                    <Chip
                      size="small"
                      label={formatOverdue(r.overdue_hours)}
                      color="error"
                      sx={{ fontWeight: 800, fontSize: 11, borderRadius: 1 }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {formatDate(r.sla_deadline)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {r.assigned_officer_name || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    {r.status !== 'ESCALATED' ? (
                      <Button
                        size="small"
                        variant="contained"
                        color="warning"
                        startIcon={escalating === r.complaint_id ? <CircularProgress size={14} color="inherit" /> : <ArrowUpwardIcon fontSize="small" />}
                        disabled={escalating === r.complaint_id}
                        onClick={() => escalate(r.complaint_id, r.complaint_ref)}
                        sx={{ borderRadius: 1.5, textTransform: 'none', fontWeight: 600, whiteSpace: 'nowrap' }}
                      >
                        Escalate
                      </Button>
                    ) : (
                      <Chip size="small" label="Escalated" color="warning" sx={{ fontWeight: 700, borderRadius: 1 }} />
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
