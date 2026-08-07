import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, CircularProgress, Stack, IconButton,
  Chip, useTheme, alpha,
} from '@mui/material';
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  BarChart, Bar, Cell, Legend, PieChart, Pie,
} from 'recharts';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import RefreshIcon      from '@mui/icons-material/Refresh';
import AccessTimeIcon   from '@mui/icons-material/AccessTime';
import CheckCircleIcon  from '@mui/icons-material/CheckCircle';
import SpeedIcon        from '@mui/icons-material/Speed';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import StarIcon         from '@mui/icons-material/Star';
import TrendingUpIcon   from '@mui/icons-material/TrendingUp';
import FingerprintIcon  from '@mui/icons-material/Fingerprint';
import { get } from '../api/client.js';

const OPERATOR_COLORS = {
  'Orange SL':  '#ff7900',
  'Africell':   '#8e24aa',
  'Qcell':      '#5b2d8e',
  'SierraTel':  '#00a3e0',
  'Sierra Tel': '#00a3e0',
  'Unknown':    '#6b7280',
};
const FALLBACK_COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#6366f1'];

const opColor = (name, i) => OPERATOR_COLORS[name] ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length];

const renderLabel = ({ cx, cy, midAngle, outerRadius, value, name, fill }) => {
  if (!value) return null;
  const r = Math.PI / 180;
  const x = cx + (outerRadius + 18) * Math.cos(-midAngle * r);
  const y = cy + (outerRadius + 18) * Math.sin(-midAngle * r);
  return (
    <text x={x} y={y} fill={fill} textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={11} fontWeight={600}>
      {`${name} (${value})`}
    </text>
  );
};

function KpiCard({ label, value, color, icon, sub, loading }) {
  return (
    <Paper sx={{ p: 2.5, borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Typography variant="caption" fontWeight={700} color="text.secondary">{label}</Typography>
        <Box sx={{ color }}>{icon}</Box>
      </Box>
      <Typography variant="h3" fontWeight={800} sx={{ color, mt: 1 }}>
        {loading ? <CircularProgress size={28} sx={{ color }} /> : (value ?? '—')}
      </Typography>
      {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
      <Box sx={{ width: 48, height: 4, bgcolor: color, borderRadius: 1, mt: 1 }} />
    </Paper>
  );
}

function ChartCard({ title, height = 350, children, loading }) {
  return (
    <Paper sx={{ p: 3, borderRadius: 1.5, border: '1px solid', borderColor: 'divider', height }}>
      <Typography variant="subtitle2" fontWeight={700} mb={2}>{title}</Typography>
      {loading
        ? <Box display="flex" justifyContent="center" alignItems="center" height="80%"><CircularProgress /></Box>
        : children}
    </Paper>
  );
}

export default function Analytics() {
  const theme   = useTheme();
  const [overview,   setOverview]   = useState(null);
  const [complaints, setComplaints] = useState(null);
  const [advanced,   setAdvanced]   = useState(null);
  const [benchmark,  setBenchmark]  = useState(null);
  const [heatmap,    setHeatmap]    = useState([]);
  const [kyc,        setKyc]        = useState(null);
  const [kpiData,    setKpiData]    = useState(null);
  const [loading,    setLoading]    = useState(true);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const results = await Promise.allSettled([
      get('/analytics/overview'),
      get('/analytics/complaints'),
      get('/analytics/advanced'),
      get('/analytics/operator-benchmark'),
      get('/analytics/heatmap'),
      get('/kyc/summary'),
      get('/analytics/dashboard-kpis'),
    ]);
    const [ovR, cmpR, advR, bmR, hmR, kycR, kpiR] = results;
    if (ovR.status  === 'fulfilled') setOverview(ovR.value.data);
    if (cmpR.status === 'fulfilled') setComplaints(cmpR.value.data);
    if (advR.status === 'fulfilled') setAdvanced(advR.value.data);
    if (bmR.status  === 'fulfilled') setBenchmark(bmR.value.data);
    if (hmR.status  === 'fulfilled') setHeatmap(hmR.value.data ?? []);
    if (kycR.status === 'fulfilled') setKyc(kycR.value.data);
    if (kpiR.status === 'fulfilled') setKpiData(kpiR.value.data);
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  /* ── derived values ────────────────────────────────────────────────── */
  const total       = overview?.complaints?.total ?? 0;
  const resolved    = Number(overview?.complaints?.resolved ?? 0);
  const resRate     = total > 0 ? `${Math.round((resolved / total) * 100)}%` : '—';
  const mttaHours   = advanced?.mttaHours;
  const csatScore   = advanced?.csatScore;

  /* KYC donut data */
  const kycDonut = kyc ? [
    { name: 'Approved',     value: Number(kyc.approved     ?? 0), fill: '#10b981' },
    { name: 'Pending',      value: Number(kyc.pending      ?? 0), fill: '#f59e0b' },
    { name: 'Under Review', value: Number(kyc.under_review ?? 0), fill: '#3b82f6' },
    { name: 'Rejected',     value: Number(kyc.rejected     ?? 0), fill: '#ef4444' },
  ].filter(d => d.value > 0) : [];

  /* Weekly complaint trend from overview */
  const trendData = (overview?.trend ?? []).map(r => ({
    date:  new Date(r.day).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
    Total: Number(r.count),
  }));

  /* By-status data */
  const statusData = (complaints?.byStatus ?? []).map((r, i) => ({
    status: r.status, count: Number(r.count), fill: FALLBACK_COLORS[i % FALLBACK_COLORS.length],
  }));

  /* Weekly per-operator from advanced */
  const weeklyData  = advanced?.weeklyData ?? [];
  const opNames     = advanced?.operatorNames ?? [];

  return (
    <Box sx={{ width: '100%', minHeight: '100%', pb: 4 }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight={700} color="text.primary">
            Consumer Complaint &amp; KYC Analytics
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Resolution performance, SLA compliance, operator benchmarking &amp; KYC status
          </Typography>
        </Box>
        <IconButton onClick={loadAll} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}>
          <RefreshIcon />
        </IconButton>
      </Stack>

      {/* KPI Row */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2,1fr)', sm: 'repeat(3,1fr)' }, gap: 2, mb: 3 }}>
        <KpiCard loading={loading} label="TOTAL COMPLAINTS"   value={total}         color="#2563eb" icon={<ReportProblemIcon sx={{ fontSize: 22 }} />} sub="All time" />
        <KpiCard loading={loading} label="RESOLVED"           value={resolved}      color="#10b981" icon={<CheckCircleIcon  sx={{ fontSize: 22 }} />} sub={`${resRate} resolution rate`} />
        <KpiCard loading={loading} label="SLA BREACHED"       value={overview?.complaints?.breached != null ? Number(overview.complaints.breached) : '—'}
          color="#ef4444" icon={<AccessTimeIcon sx={{ fontSize: 22 }} />} sub="Past deadline, unresolved" />
        <KpiCard loading={loading} label="MTTA (ACKNOWLEDGE)" value={mttaHours != null ? `${mttaHours}h` : '—'}
          color="#a855f7" icon={<SpeedIcon sx={{ fontSize: 22 }} />} sub="Avg hours to first action" />
        <KpiCard loading={loading} label="CITIZEN SATISFACTION" value={csatScore != null ? `${csatScore}/5` : '—'}
          color="#10b981" icon={<StarIcon sx={{ fontSize: 22 }} />} sub="Avg rating (resolved cases)" />
        <KpiCard loading={loading} label="OPEN (30 DAYS)"
          value={trendData.reduce((s, r) => s + r.Total, 0)}
          color="#f59e0b" icon={<TrendingUpIcon sx={{ fontSize: 22 }} />} sub="New complaints this month" />
      </Box>

      {/* Map + Status donut */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, gap: 3, mb: 3 }}>
        <Paper sx={{ borderRadius: 1.5, border: '1px solid', borderColor: 'divider', height: 400, overflow: 'hidden', position: 'relative' }}>
          <Box sx={{ p: 2, position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1000, bgcolor: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(4px)' }}>
            <Typography variant="subtitle2" fontWeight={700}>GIS Complaint Hotspots</Typography>
            <Typography variant="caption" color="text.secondary">{heatmap.length} georeferenced complaints</Typography>
          </Box>
          <MapContainer center={[8.460555, -11.779889]} zoom={7} style={{ height: '100%', width: '100%', zIndex: 1 }}>
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
              attribution="&copy; OpenStreetMap contributors &copy; CARTO"
            />
            {heatmap.map(c => (
              <CircleMarker key={c.complaint_id} center={[Number(c.latitude), Number(c.longitude)]}
                radius={6}
                fillColor={c.priority === 'CRITICAL' ? '#ef4444' : c.priority === 'HIGH' ? '#f59e0b' : '#3b82f6'}
                color="#fff" weight={1} opacity={1} fillOpacity={0.75}>
                <Popup>
                  <strong>{c.complaint_ref}</strong><br />
                  {c.operator_name} — {c.issue_type}
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </Paper>

        <ChartCard title="Complaints by Status" height={400} loading={loading && !complaints}>
          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={310}>
              <PieChart>
                <Pie data={statusData} dataKey="count" nameKey="status" cx="50%" cy="50%"
                  outerRadius={95} innerRadius={55} paddingAngle={3}
                  label={renderLabel} labelLine={false}>
                  {statusData.map((s, i) => <Cell key={i} fill={s.fill} />)}
                </Pie>
                <RechartsTooltip />
                <Legend verticalAlign="bottom" />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <Box display="flex" justifyContent="center" alignItems="center" height="80%">
              <Typography color="text.secondary">No complaint data</Typography>
            </Box>
          )}
        </ChartCard>
      </Box>

      {/* District volume */}
      <ChartCard title="Complaint Volume by District" height={360} loading={loading && !complaints}>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={complaints?.byDistrict ?? []} margin={{ top: 10, right: 30, left: 0, bottom: 24 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.25} vertical={false} />
            <XAxis dataKey="district" tick={{ fontSize: 11 }} interval={0} angle={-40} textAnchor="end" />
            <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <RechartsTooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
            <Bar dataKey="total" name="Complaints" fill="#8b5cf6" radius={[4,4,0,0]} barSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* 30-day trend + category radar */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.8fr 1fr' }, gap: 3, mt: 3, mb: 3 }}>
        <ChartCard title="30-Day Complaint Trend" height={350} loading={loading && !overview}>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={trendData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <RechartsTooltip />
              <Area type="monotone" dataKey="Total" stroke="#3b82f6" strokeWidth={2.5}
                fill="url(#trendGrad)" dot={{ r: 3, fill: '#3b82f6' }} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="By Category (Top 7)" height={350} loading={loading && !complaints}>
          {complaints?.byCategory?.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <RadarChart data={complaints.byCategory.slice(0, 7).map(r => ({ category: r.name, count: Number(r.count) }))}>
                <PolarGrid stroke={alpha(theme.palette.divider, 0.4)} />
                <PolarAngleAxis dataKey="category" tick={{ fontSize: 9, fontWeight: 600 }} />
                <PolarRadiusAxis tick={false} />
                <Radar name="Complaints" dataKey="count" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} />
                <RechartsTooltip />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <Box display="flex" justifyContent="center" alignItems="center" height="80%">
              <Typography color="text.secondary">No category data</Typography>
            </Box>
          )}
        </ChartCard>
      </Box>

      {/* Operator benchmark + weekly per-operator */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'repeat(2,1fr)' }, gap: 3, mb: 3 }}>
        <ChartCard title="Operator Benchmark — Avg Resolution (h)" height={340} loading={loading && !benchmark}>
          {benchmark?.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={benchmark} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="operator" tick={{ fontSize: 11, fontWeight: 600 }} width={80} />
                <RechartsTooltip formatter={(v, n) => [n === 'avgResolutionHrs' ? `${v}h` : `${v}%`, n === 'avgResolutionHrs' ? 'Avg resolution' : 'Resolution rate']} />
                <Legend />
                <Bar dataKey="avgResolutionHrs" name="Avg resolution (h)" barSize={12} radius={[0,3,3,0]}>
                  {benchmark.map((e, i) => <Cell key={i} fill={opColor(e.operator, i)} />)}
                </Bar>
                <Bar dataKey="resolutionPct" name="Resolution %" barSize={12} radius={[0,3,3,0]}>
                  {benchmark.map((e, i) => <Cell key={i} fill={alpha(opColor(e.operator, i), 0.45)} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Box display="flex" justifyContent="center" alignItems="center" height="80%">
              <Typography color="text.secondary">No benchmark data yet</Typography>
            </Box>
          )}
        </ChartCard>

        <ChartCard title="Daily Volume by Operator (30 days)" height={340} loading={loading && !advanced}>
          {weeklyData.length > 0 && opNames.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={weeklyData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                <XAxis dataKey="date" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <RechartsTooltip />
                <Legend verticalAlign="bottom" />
                {opNames.map((op, i) => (
                  <Bar key={op} dataKey={op} stackId="a" fill={opColor(op, i)} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Box display="flex" justifyContent="center" alignItems="center" height="80%">
              <Typography color="text.secondary">No complaint volume data</Typography>
            </Box>
          )}
        </ChartCard>
      </Box>

      {/* KYC section */}
      <Box>
        <Typography variant="h6" fontWeight={700} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <FingerprintIcon color="primary" /> SIM KYC Registration Analytics
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'repeat(2,1fr)' }, gap: 3 }}>
          {/* KYC Status donut */}
          <ChartCard title="KYC Submission Status" height={340} loading={loading && !kyc}>
            {kycDonut.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart margin={{ top: 10, right: 30, left: 30, bottom: 10 }}>
                  <Pie data={kycDonut} cx="50%" cy="50%" innerRadius={45} outerRadius={75}
                    paddingAngle={4} dataKey="value" label={renderLabel} labelLine>
                    {kycDonut.map((e, i) => <Cell key={i} fill={e.fill} />)}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Box display="flex" justifyContent="center" alignItems="center" height="80%">
                <Typography color="text.secondary">No KYC submissions yet</Typography>
              </Box>
            )}
          </ChartCard>

          {/* KYC by operator — real KYC submission counts */}
          <ChartCard title="KYC Submissions by Operator" height={340} loading={loading && !kpiData}>
            {(kpiData?.kycByOperator ?? []).length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={kpiData.kycByOperator} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                  <XAxis dataKey="operator" tick={{ fontSize: 11, fontWeight: 600 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <RechartsTooltip />
                  <Legend verticalAlign="bottom" wrapperStyle={{ paddingTop: 8 }} />
                  <Bar dataKey="total"    name="Total Submitted" barSize={32} stackId="k" radius={[0,0,0,0]}>
                    {(kpiData.kycByOperator).map((e, i) => <Cell key={i} fill={opColor(e.operator, i)} />)}
                  </Bar>
                  <Bar dataKey="approved" name="Approved" barSize={32} stackId="k" radius={[4,4,0,0]}>
                    {(kpiData.kycByOperator).map((e, i) => <Cell key={i} fill={alpha(opColor(e.operator, i), 0.45)} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Box display="flex" justifyContent="center" alignItems="center" height="80%">
                <Typography color="text.secondary">No KYC operator data yet</Typography>
              </Box>
            )}
          </ChartCard>
        </Box>

        {/* Complaints by Operator */}
        <Box sx={{ mt: 3 }}>
          <ChartCard title="Complaints by Operator" height={320} loading={loading && !overview}>
            {overview?.operators?.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={overview.operators.map(r => ({ ...r, complaints: Number(r.complaints) }))}
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 600 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <RechartsTooltip />
                  <Bar dataKey="complaints" name="Complaints" barSize={48} radius={[4,4,0,0]}>
                    {overview.operators.map((e, i) => <Cell key={i} fill={opColor(e.name, i)} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Box display="flex" justifyContent="center" alignItems="center" height="80%">
                <Typography color="text.secondary">No operator data</Typography>
              </Box>
            )}
          </ChartCard>
        </Box>
      </Box>
    </Box>
  );
}
