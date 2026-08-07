import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Stack, Chip, Button, Alert, useTheme, alpha, Divider,
} from '@mui/material';
import RefreshIcon          from '@mui/icons-material/Refresh';
import SupportAgentIcon     from '@mui/icons-material/SupportAgent';
import HourglassEmptyIcon   from '@mui/icons-material/HourglassEmpty';
import CheckCircleIcon      from '@mui/icons-material/CheckCircle';
import ErrorIcon            from '@mui/icons-material/Error';
import AccessTimeIcon       from '@mui/icons-material/AccessTime';
import StarIcon             from '@mui/icons-material/Star';
import FingerprintIcon      from '@mui/icons-material/Fingerprint';
import VerifiedIcon         from '@mui/icons-material/Verified';
import DownloadIcon         from '@mui/icons-material/Download';
import PictureAsPdfIcon     from '@mui/icons-material/PictureAsPdf';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area,
} from 'recharts';
import { get } from '../api/client.js';
import { Loading } from '../components/ui.jsx';
import MapOverview from '../components/MapOverview.jsx';
import { exportToCSV, exportExecutivePDF } from '../utils/exportUtils.js';

const PALETTE = ['#2563eb', '#10b981', '#f59e0b', '#a855f7', '#ef4444', '#06b6d4', '#84cc16', '#f97316'];

const STAR_COLORS = { 5: '#10b981', 4: '#84cc16', 3: '#f59e0b', 2: '#f97316', 1: '#ef4444' };

function KpiCard({ label, value, sub, icon, color }) {
  const theme = useTheme();
  return (
    <Paper sx={{ p: 2.5, borderRadius: 1.5, border: '1px solid', borderColor: 'divider', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          {label}
        </Typography>
        <Box sx={{ color, display: 'flex' }}>{icon}</Box>
      </Box>
      <Typography variant="h3" fontWeight={800} sx={{ mt: 1.5, color }}>
        {value ?? '—'}
      </Typography>
      {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
    </Paper>
  );
}

function ChartCard({ title, height = 280, children }) {
  return (
    <Paper sx={{ p: 3, borderRadius: 1.5, border: '1px solid', borderColor: 'divider', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="subtitle1" fontWeight={700} color="text.primary" mb={2}>{title}</Typography>
      <Box sx={{ height, width: '100%' }}>{children}</Box>
    </Paper>
  );
}

function StarRating({ value }) {
  const full = Math.round(value || 0);
  return (
    <Stack direction="row" spacing={0.25} alignItems="center">
      {[1, 2, 3, 4, 5].map((s) => (
        <StarIcon key={s} sx={{ fontSize: 18, color: s <= full ? '#f59e0b' : 'action.disabled' }} />
      ))}
      <Typography variant="body2" fontWeight={600} ml={0.5}>{value ? value.toFixed(1) : '—'}</Typography>
    </Stack>
  );
}

export default function Dashboard() {
  const [kpis,    setKpis]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [err,     setErr]     = useState('');
  const theme = useTheme();

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      const r = await get('/analytics/dashboard-kpis');
      setKpis(r.data);
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Loading height={400} />;
  if (err)     return <Box sx={{ p: 3 }}><Alert severity="error" sx={{ borderRadius: 1.5 }}>{err}</Alert></Box>;

  const cc  = kpis?.complaintCounts || {};
  const kyc = kpis?.kycCounts       || {};

  const resolutionRate = cc.total > 0 ? ((cc.resolved / cc.total) * 100).toFixed(1) : 0;
  const slaCompliance  = cc.total > 0 ? (((cc.total - cc.slaBreached) / cc.total) * 100).toFixed(1) : 100;

  // Build combined operator table: merge assigned + resolved per operator
  const opMap = {};
  (kpis?.complaintsByOperator || []).forEach(r => { opMap[r.operator] = { operator: r.operator, total: r.total, assigned: 0, resolved: 0 }; });
  (kpis?.assignedByOperator   || []).forEach(r => { if (opMap[r.operator]) opMap[r.operator].assigned = r.assigned; });
  (kpis?.resolvedByOperator   || []).forEach(r => { if (opMap[r.operator]) opMap[r.operator].resolved = r.resolved; });
  const operatorTable = Object.values(opMap);

  const handleExportCSV = () => {
    exportToCSV('NatCA_KPI_Dashboard', [
      { Metric: 'Total Complaints',    Value: cc.total      || 0 },
      { Metric: 'Resolved',            Value: cc.resolved   || 0 },
      { Metric: 'Unresolved',          Value: cc.unresolved || 0 },
      { Metric: 'Critical',            Value: cc.critical   || 0 },
      { Metric: 'Resolution Rate',     Value: `${resolutionRate}%` },
      { Metric: 'SLA Compliance',      Value: `${slaCompliance}%` },
      { Metric: 'CSAT Score',          Value: kpis?.csat ? kpis.csat.toFixed(2) : '—' },
      { Metric: 'KYC Total',           Value: kyc.total    || 0 },
      { Metric: 'KYC Approved',        Value: kyc.approved || 0 },
    ]);
  };

  return (
    <Box sx={{ width: '100%', minHeight: '100%', pb: 4 }}>

      {/* ── Header ── */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box sx={{ width: 40, height: 40, borderRadius: 1.5, bgcolor: alpha(theme.palette.primary.main, 0.12), color: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <SupportAgentIcon fontSize="medium" />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700} sx={{ letterSpacing: '-0.02em' }}>KPI Dashboard</Typography>
            <Typography variant="body2" color="text.secondary">Live complaint, KYC, and customer satisfaction metrics</Typography>
          </Box>
        </Stack>
        <Stack direction="row" spacing={1.5}>
          <Button startIcon={<RefreshIcon />} variant="outlined" onClick={load} sx={{ borderRadius: 1.5, textTransform: 'none', fontWeight: 600, borderColor: 'divider', color: 'text.primary' }}>Refresh</Button>
          <Button startIcon={<DownloadIcon />} variant="outlined" onClick={handleExportCSV} sx={{ borderRadius: 1.5, textTransform: 'none', fontWeight: 600, borderColor: 'divider', color: 'text.primary' }}>CSV</Button>
          <Button startIcon={<PictureAsPdfIcon />} variant="contained" onClick={() => exportExecutivePDF(kpis)} sx={{ borderRadius: 1.5, textTransform: 'none', fontWeight: 600 }}>Export PDF</Button>
        </Stack>
      </Box>

      {/* ── KPI Cards — Complaints ── */}
      <Typography variant="overline" color="text.disabled" sx={{ display: 'block', mb: 1 }}>Complaints</Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2,1fr)', sm: 'repeat(3,1fr)', lg: 'repeat(6,1fr)' }, gap: 2, mb: 2 }}>
        <KpiCard label="Total Complaints" value={cc.total ?? 0}      icon={<SupportAgentIcon fontSize="small" />} color="#2563eb" />
        <KpiCard label="Open / Unresolved" value={cc.unresolved ?? 0} icon={<HourglassEmptyIcon fontSize="small" />} color="#f59e0b" />
        <KpiCard label="Resolved"          value={cc.resolved ?? 0}   icon={<CheckCircleIcon fontSize="small" />} color="#10b981" />
        <KpiCard label="Critical"          value={cc.critical ?? 0}   icon={<ErrorIcon fontSize="small" />} color="#ef4444" />
        <KpiCard label="Resolution Rate"   value={`${resolutionRate}%`} icon={<CheckCircleIcon fontSize="small" />} color="#10b981" sub="resolved + closed" />
        <KpiCard label="SLA Compliance"    value={`${slaCompliance}%`} icon={<AccessTimeIcon fontSize="small" />} color={Number(slaCompliance) >= 80 ? '#10b981' : '#ef4444'} sub={`${cc.slaBreached ?? 0} breached`} />
      </Box>

      {/* ── KPI Cards — KYC + CSAT ── */}
      <Typography variant="overline" color="text.disabled" sx={{ display: 'block', mb: 1 }}>KYC & Satisfaction</Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2,1fr)', sm: 'repeat(3,1fr)', lg: 'repeat(5,1fr)' }, gap: 2, mb: 3 }}>
        <KpiCard label="KYC Requests"   value={kyc.total    ?? 0} icon={<FingerprintIcon fontSize="small" />} color="#2563eb" />
        <KpiCard label="KYC Approved"   value={kyc.approved ?? 0} icon={<VerifiedIcon fontSize="small" />} color="#10b981" sub={`${kyc.total > 0 ? ((kyc.approved / kyc.total) * 100).toFixed(0) : 0}% approval rate`} />
        <KpiCard label="KYC Pending"    value={kyc.pending  ?? 0} icon={<HourglassEmptyIcon fontSize="small" />} color="#f59e0b" />
        <KpiCard label="KYC Rejected"   value={kyc.rejected ?? 0} icon={<ErrorIcon fontSize="small" />} color="#ef4444" />
        <KpiCard
          label="Customer CSAT"
          value={kpis?.csat ? `${kpis.csat.toFixed(1)} / 5` : 'No data'}
          icon={<StarIcon fontSize="small" />}
          color="#f59e0b"
          sub={(kpis?.ratingDistribution || []).reduce((s, r) => s + r.count, 0) + ' ratings'}
        />
      </Box>

      {/* ── Today vs Yesterday strip ── */}
      {kpis?.todayCounts && (() => {
        const tc = kpis.todayCounts;
        const items = [
          { label: 'New today',      value: tc.newComplaints, prev: tc.yesterdayNew,      good: false },
          { label: 'Resolved today', value: tc.resolved,      prev: tc.yesterdayResolved, good: true  },
          { label: 'SLA breached',   value: tc.slaBreached,   prev: null,                 good: false },
        ];
        return (
          <Paper variant="outlined" sx={{ px: 2, py: 1.5, mb: 3, borderRadius: 1.5 }}>
            <Stack direction="row" spacing={0} divider={<Divider orientation="vertical" flexItem />}
              sx={{ flexWrap: 'wrap', gap: 0 }}>
              <Typography variant="overline" color="text.disabled" sx={{ alignSelf: 'center', pr: 2 }}>Today</Typography>
              {items.map((item) => {
                const diff = item.prev != null ? item.value - item.prev : null;
                const up = diff > 0;
                const diffColor = diff === 0 ? 'text.disabled'
                  : (item.good ? (up ? 'success.main' : 'error.main') : (up ? 'error.main' : 'success.main'));
                return (
                  <Stack key={item.label} direction="row" spacing={1} alignItems="center" sx={{ px: 2, py: 0.5 }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block">{item.label}</Typography>
                      <Stack direction="row" alignItems="baseline" spacing={0.75}>
                        <Typography variant="h6" fontWeight={700} lineHeight={1}>{item.value}</Typography>
                        {diff != null && (
                          <Typography variant="caption" fontWeight={700} color={diffColor}>
                            {diff > 0 ? `▲${diff}` : diff < 0 ? `▼${Math.abs(diff)}` : '—'} vs yesterday
                          </Typography>
                        )}
                      </Stack>
                    </Box>
                  </Stack>
                );
              })}
            </Stack>
          </Paper>
        );
      })()}

      {/* ── Row: Trend + Category ── */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'repeat(2,1fr)' }, gap: 3, mb: 3 }}>

        <ChartCard title="30-Day Complaint Trend">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={kpis?.trend || []} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#2563eb" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0}   />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <RTooltip />
              <Area type="monotone" dataKey="total" stroke="#2563eb" strokeWidth={2} fill="url(#trendGrad)" name="Complaints" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Complaints by Category">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={(kpis?.complaintsByCategory || []).map((r, i) => ({ ...r, fill: PALETTE[i % PALETTE.length] }))}
                cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3}
                dataKey="total" nameKey="category"
                label={({ name, value }) => `${name} (${value})`}
                labelLine
              >
                {(kpis?.complaintsByCategory || []).map((_, i) => (
                  <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                ))}
              </Pie>
              <RTooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

      </Box>

      {/* ── Row: Complaints by Operator (stacked) ── */}
      <ChartCard title="Complaint Total, Assigned & Resolved by Operator" height={300}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={operatorTable} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="operator" tick={{ fontSize: 11, fontWeight: 600 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <RTooltip />
            <Legend verticalAlign="bottom" wrapperStyle={{ paddingTop: 10 }} />
            <Bar dataKey="total"    name="Total"    fill="#2563eb" maxBarSize={40} radius={[3,3,0,0]} />
            <Bar dataKey="assigned" name="Assigned" fill="#f59e0b" maxBarSize={40} radius={[3,3,0,0]} />
            <Bar dataKey="resolved" name="Resolved" fill="#10b981" maxBarSize={40} radius={[3,3,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <Box sx={{ mb: 3 }} />

      {/* ── Row: Resolution Time + Complaints by District ── */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'repeat(2,1fr)' }, gap: 3, mb: 3 }}>

        <ChartCard title="Avg Resolution Time by Operator (hours)">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={kpis?.resolutionTimeByOperator || []}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 10, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} unit="h" />
              <YAxis type="category" dataKey="operator" tick={{ fontSize: 11 }} width={80} />
              <RTooltip formatter={(v) => [`${v}h`, 'Avg resolution']} />
              <Bar dataKey="avg_hours" name="Avg Hours" fill="#a855f7" maxBarSize={28} radius={[0,3,3,0]}>
                {(kpis?.resolutionTimeByOperator || []).map((_, i) => (
                  <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Complaints by Region / District">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={kpis?.complaintsByDistrict || []}
              layout="vertical"
              margin={{ top: 5, right: 20, left: 10, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
              <YAxis type="category" dataKey="district" tick={{ fontSize: 11 }} width={90} />
              <RTooltip />
              <Bar dataKey="total" name="Complaints" fill="#06b6d4" maxBarSize={28} radius={[0,3,3,0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

      </Box>

      {/* ── Row: KYC by Operator + Rating Distribution ── */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'repeat(2,1fr)' }, gap: 3, mb: 3 }}>

        <ChartCard title="KYC Requests by Operator">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={kpis?.kycByOperator || []} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="operator" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <RTooltip />
              <Legend verticalAlign="bottom" wrapperStyle={{ paddingTop: 10 }} />
              <Bar dataKey="total"    name="Total"    fill="#2563eb" maxBarSize={40} stackId="a" />
              <Bar dataKey="approved" name="Approved" fill="#10b981" maxBarSize={40} stackId="a" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Customer Rating Distribution">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={(kpis?.ratingDistribution || []).map(r => ({ ...r, label: '★'.repeat(r.rating) }))}
              margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="label" tick={{ fontSize: 14 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <RTooltip formatter={(v, _, p) => [v, `${p.payload.rating}-star`]} />
              <Bar dataKey="count" name="Responses" maxBarSize={50} radius={[4,4,0,0]}>
                {(kpis?.ratingDistribution || []).map((r) => (
                  <Cell key={r.rating} fill={STAR_COLORS[r.rating] || '#94a3b8'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

      </Box>

      {/* ── Row: CSAT by Operator ── */}
      {(kpis?.feedbackByOperator || []).length > 0 && (
        <>
          <ChartCard title="Customer Satisfaction Score by Operator (avg rating / 5)" height={260}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={kpis.feedbackByOperator} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="operator" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 5]} tick={{ fontSize: 11 }} />
                <RTooltip formatter={(v, _, p) => [`${v}/5 (${p.payload.count} ratings)`, 'Avg Rating']} />
                <Bar dataKey="avg_rating" name="Avg Rating" maxBarSize={50} radius={[4,4,0,0]}>
                  {(kpis.feedbackByOperator || []).map((r, i) => (
                    <Cell key={i} fill={r.avg_rating >= 4 ? '#10b981' : r.avg_rating >= 3 ? '#f59e0b' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
          <Box sx={{ mb: 3 }} />
        </>
      )}

      {/* ── GIS Map ── */}
      <Box sx={{ width: '100%' }}>
        <MapOverview />
      </Box>

    </Box>
  );
}
