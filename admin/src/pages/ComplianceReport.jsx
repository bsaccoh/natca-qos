import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box, Paper, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, Stack, IconButton, Button,
  LinearProgress, Alert, alpha, Grid,
} from '@mui/material';
import RefreshIcon  from '@mui/icons-material/Refresh';
import PrintIcon    from '@mui/icons-material/Print';
import AssessmentIcon from '@mui/icons-material/Assessment';
import { analyticsService } from '../services/analyticsService.js';
import PageHeader from '../components/PageHeader.jsx';
import { formatHours } from '../utils/formatters.js';

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
      <LinearProgress
        variant="determinate"
        value={Math.min(value, 100)}
        color={color}
        sx={{ height: 6, borderRadius: 3 }}
      />
    </Stack>
  );
}

export default function ComplianceReport() {
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const printRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const r = await analyticsService.getOperatorCompliance();
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
    <Box sx={{ width: '100%', pb: 4 }}>
      <PageHeader
        icon={<AssessmentIcon />}
        title="Telecom Operator Compliance Report"
        subtitle="Regulatory SLA audit metrics, complaint resolution grading, and CSAT benchmarks"
        actions={
          <Stack direction="row" spacing={1.5}>
            <IconButton onClick={load} disabled={loading} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}>
              <RefreshIcon fontSize="small" />
            </IconButton>
            <Button
              variant="contained"
              startIcon={<PrintIcon />}
              onClick={handlePrint}
              sx={{ borderRadius: 1.5, textTransform: 'none', fontWeight: 600 }}
            >
              Print / Save PDF
            </Button>
          </Stack>
        }
      />

      {error && <Alert severity="error" sx={{ mb: 2.5, borderRadius: 1.5 }}>{error}</Alert>}

      <Box ref={printRef}>
        {/* Print header (hidden on screen) */}
        <Box sx={{ display: 'none', displayPrint: 'block', mb: 2, pb: 1, borderBottom: 2 }}>
          <Typography variant="h5" fontWeight={700}>NatCA — Operator Compliance Report</Typography>
          <Typography variant="body2" color="text.secondary">Generated: {new Date().toLocaleString()}</Typography>
        </Box>

        {/* Summary KPI Cards */}
        <Grid container spacing={2.5} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={4}>
            <Paper sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={700} textTransform="uppercase">Total SLA Breaches</Typography>
              <Typography variant="h4" fontWeight={800} color="error.main" sx={{ mt: 0.5 }}>
                {rows.reduce((acc, r) => acc + Number(r.sla_breach_count || 0), 0)}
              </Typography>
              <Typography variant="caption" color="text.secondary">Regulatory deadline violations across all operators</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Paper sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={700} textTransform="uppercase">Estimated Regulatory Fines</Typography>
              <Typography variant="h4" fontWeight={800} color="warning.main" sx={{ mt: 0.5 }}>
                SLE {(rows.reduce((acc, r) => acc + Number(r.sla_breach_count || 0), 0) * 2500).toLocaleString()}
              </Typography>
              <Typography variant="caption" color="text.secondary">Statutory enforcement rate (SLE 2,500 / SLA breach)</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Paper sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={700} textTransform="uppercase">Top Performing Operator</Typography>
              <Typography variant="h4" fontWeight={800} color="success.main" sx={{ mt: 0.5 }}>
                {rows.length > 0 ? [...rows].sort((a,b) => b.resolution_rate - a.resolution_rate)[0]?.operator_name : 'N/A'}
              </Typography>
              <Typography variant="caption" color="text.secondary">Highest complaint resolution & lowest breach rate</Typography>
            </Paper>
          </Grid>
        </Grid>

        <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: (t) => alpha(t.palette.primary.main, 0.04) }}>
              <TableRow sx={{ '& th': { fontWeight: 700, whiteSpace: 'nowrap' } }}>
                <TableCell>Operator</TableCell>
                <TableCell align="right">Total Cases</TableCell>
                <TableCell align="right">Resolved</TableCell>
                <TableCell sx={{ minWidth: 140 }}>Resolution Rate</TableCell>
                <TableCell align="right">Avg Resolution</TableCell>
                <TableCell align="right">SLA Breaches</TableCell>
                <TableCell sx={{ minWidth: 140 }}>SLA Breach Rate</TableCell>
                <TableCell align="right">Est. Penalty (SLE)</TableCell>
                <TableCell align="right">Avg CSAT</TableCell>
                <TableCell>Grade</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={10} sx={{ textAlign: 'center', py: 6 }}>
                    <Typography color="text.secondary">No compliance metrics available</Typography>
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
                const estPenalty = Number(r.sla_breach_count || 0) * 2500;
                return (
                  <TableRow key={r.operator_id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={700}>{r.operator_name}</Typography>
                    </TableCell>
                    <TableCell align="right">{r.total}</TableCell>
                    <TableCell align="right">{r.resolved}</TableCell>
                    <TableCell>
                      <ScoreBar value={r.resolution_rate} color={pctColor(r.resolution_rate)} />
                    </TableCell>
                    <TableCell align="right">{formatHours(r.avg_resolution_hours)}</TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" color={r.sla_breach_count > 0 ? 'error.main' : 'text.primary'} fontWeight={r.sla_breach_count > 0 ? 700 : 400}>
                        {r.sla_breach_count}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <ScoreBar value={r.sla_breach_pct} color={r.sla_breach_pct > 15 ? 'error' : r.sla_breach_pct > 5 ? 'warning' : 'success'} />
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={700} color={estPenalty > 0 ? 'warning.main' : 'text.secondary'}>
                        {estPenalty > 0 ? `SLE ${estPenalty.toLocaleString()}` : 'SLE 0'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      {r.avg_csat != null ? (
                        <Chip
                          size="small"
                          label={`★ ${r.avg_csat}`}
                          color={r.avg_csat >= 4 ? 'success' : r.avg_csat >= 3 ? 'warning' : 'error'}
                          sx={{ fontWeight: 700 }}
                        />
                      ) : '—'}
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={grade} color={gradeColor} sx={{ fontWeight: 800, minWidth: 32, borderRadius: 1 }} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Grading key */}
        <Paper sx={{ p: 2.5, mt: 2.5, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            Regulatory Performance Grading Scale: &nbsp;
            <strong>A</strong> = ≥90% resolution & ≤5% SLA breach &nbsp;|&nbsp;
            <strong>B</strong> = ≥75% resolution & ≤15% SLA breach &nbsp;|&nbsp;
            <strong>C</strong> = ≥60% resolution &nbsp;|&nbsp;
            <strong>D</strong> = ≥40% resolution &nbsp;|&nbsp;
            <strong>F</strong> = below 40% resolution
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
