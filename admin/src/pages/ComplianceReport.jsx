import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box, Paper, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, Stack, IconButton, Tooltip, Button,
  LinearProgress, Alert,
} from '@mui/material';
import RefreshIcon  from '@mui/icons-material/Refresh';
import PrintIcon    from '@mui/icons-material/Print';
import AssessmentIcon from '@mui/icons-material/Assessment';
import { get } from '../api/client.js';

function pctColor(pct) {
  if (pct >= 80) return 'success';
  if (pct >= 50) return 'warning';
  return 'error';
}

function ScoreBar({ value, color }) {
  return (
    <Stack spacing={0.5}>
      <Stack direction="row" justifyContent="space-between">
        <Typography variant="caption" fontWeight={700}>{value}%</Typography>
      </Stack>
      <LinearProgress variant="determinate" value={Math.min(value, 100)}
        color={color} sx={{ height: 6, borderRadius: 3 }} />
    </Stack>
  );
}

function fmtHours(h) {
  if (h == null) return '-';
  if (h < 24) return `${h}h`;
  return `${(h / 24).toFixed(1)}d`;
}

export default function ComplianceReport() {
  const [rows, setRows]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const printRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const r = await get('/analytics/operator-compliance');
      setRows(r.data || []);
    } catch {
      setError('Failed to load compliance data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handlePrint = () => window.print();

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <AssessmentIcon color="primary" />
          <Typography variant="h5" fontWeight={700}>Operator Compliance Report</Typography>
        </Stack>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Refresh">
            <IconButton onClick={load} disabled={loading}><RefreshIcon /></IconButton>
          </Tooltip>
          <Button variant="outlined" startIcon={<PrintIcon />} onClick={handlePrint}
            sx={{ displayPrint: 'none' }}>
            Print / PDF
          </Button>
        </Stack>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box ref={printRef}>
        {/* Print header (hidden on screen) */}
        <Box sx={{ display: 'none', displayPrint: 'block', mb: 2, pb: 1, borderBottom: 2 }}>
          <Typography variant="h5" fontWeight={700}>NatCA — Operator Compliance Report</Typography>
          <Typography variant="body2" color="text.secondary">Generated: {new Date().toLocaleString()}</Typography>
        </Box>

        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& th': { fontWeight: 700, whiteSpace: 'nowrap' } }}>
                <TableCell>Operator</TableCell>
                <TableCell align="right">Total</TableCell>
                <TableCell align="right">Resolved</TableCell>
                <TableCell sx={{ minWidth: 140 }}>Resolution Rate</TableCell>
                <TableCell align="right">Avg Resolution</TableCell>
                <TableCell align="right">SLA Breaches</TableCell>
                <TableCell sx={{ minWidth: 140 }}>SLA Breach Rate</TableCell>
                <TableCell align="right">Avg CSAT</TableCell>
                <TableCell>Grade</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={9} sx={{ textAlign: 'center', py: 6 }}>
                    <Typography color="text.secondary">No data available</Typography>
                  </TableCell>
                </TableRow>
              )}
              {rows.map((r) => {
                const grade = r.resolution_rate >= 90 && r.sla_breach_pct <= 5  ? 'A'
                            : r.resolution_rate >= 75 && r.sla_breach_pct <= 15 ? 'B'
                            : r.resolution_rate >= 60                            ? 'C'
                            : r.resolution_rate >= 40                            ? 'D'
                            :                                                      'F';
                const gradeColor = { A: 'success', B: 'success', C: 'warning', D: 'warning', F: 'error' }[grade];
                return (
                  <TableRow key={r.operator_id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>{r.operator_name}</Typography>
                    </TableCell>
                    <TableCell align="right">{r.total}</TableCell>
                    <TableCell align="right">{r.resolved}</TableCell>
                    <TableCell>
                      <ScoreBar value={r.resolution_rate} color={pctColor(r.resolution_rate)} />
                    </TableCell>
                    <TableCell align="right">{fmtHours(r.avg_resolution_hours)}</TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" color={r.sla_breach_count > 0 ? 'error.main' : 'text.primary'} fontWeight={r.sla_breach_count > 0 ? 700 : 400}>
                        {r.sla_breach_count}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <ScoreBar value={r.sla_breach_pct} color={r.sla_breach_pct > 15 ? 'error' : r.sla_breach_pct > 5 ? 'warning' : 'success'} />
                    </TableCell>
                    <TableCell align="right">
                      {r.avg_csat != null ? (
                        <Chip size="small" label={`★ ${r.avg_csat}`}
                          color={r.avg_csat >= 4 ? 'success' : r.avg_csat >= 3 ? 'warning' : 'error'} />
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={grade} color={gradeColor} sx={{ fontWeight: 700, minWidth: 32 }} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Grading key */}
        <Paper sx={{ p: 2, mt: 2 }}>
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            Grading: &nbsp;
            A = ≥90% resolution & ≤5% SLA breach &nbsp;|&nbsp;
            B = ≥75% resolution & ≤15% SLA breach &nbsp;|&nbsp;
            C = ≥60% resolution &nbsp;|&nbsp;
            D = ≥40% &nbsp;|&nbsp;
            F = below 40%
          </Typography>
        </Paper>
      </Box>

      <style>{`
        @media print {
          body > * { display: none !important; }
          #root { display: block !important; }
          .MuiDrawer-root, .MuiAppBar-root { display: none !important; }
          main { margin: 0 !important; padding: 0 !important; }
        }
      `}</style>
    </Box>
  );
}
