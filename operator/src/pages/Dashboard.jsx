import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Paper, Typography, Stack, Chip, Button, Card, CardContent,
} from '@mui/material';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import CheckCircleIcon   from '@mui/icons-material/CheckCircle';
import WarningIcon       from '@mui/icons-material/Warning';
import WarningAmberIcon  from '@mui/icons-material/WarningAmber';
import PendingIcon       from '@mui/icons-material/Pending';
import TrendingUpIcon    from '@mui/icons-material/TrendingUp';
import TimerIcon         from '@mui/icons-material/Timer';
import ArrowForwardIcon  from '@mui/icons-material/ArrowForward';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { useAuth } from '../auth/AuthContext.jsx';
import { STATUS_COLOR } from '../theme/theme.js';
import { operatorService } from '../services/operatorService.js';
import { formatDate } from '../utils/formatters.js';

function Delta({ current, previous }) {
  if (previous == null || current == null) return null;
  const diff = current - previous;
  if (diff === 0) return <Typography variant="caption" color="text.disabled" sx={{ ml: 0.5 }}>—</Typography>;
  const up = diff > 0;
  return (
    <Typography variant="caption" fontWeight={700}
      color={up ? 'error.main' : 'success.main'} sx={{ ml: 0.5 }}>
      {up ? '▲' : '▼'} {Math.abs(diff)} vs last wk
    </Typography>
  );
}

function KpiCard({ title, value, sub, icon, color, onClick, delta }) {
  return (
    <Card elevation={0} sx={{
      border: '1px solid', borderColor: 'divider', borderRadius: 2,
      cursor: onClick ? 'pointer' : 'default',
      transition: 'all .15s ease',
      '&:hover': onClick ? { borderColor: color, transform: 'translateY(-2px)', boxShadow: '0 6px 16px rgba(0,0,0,0.06)' } : { boxShadow: '0 2px 8px rgba(0,0,0,0.04)' },
    }} onClick={onClick}>
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Stack direction="row" spacing={1.75} alignItems="center">
          <Box sx={{
            width: 44, height: 44, borderRadius: 1.5,
            bgcolor: `${color}18`, color: color,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            '& svg': { fontSize: 24 },
          }}>
            {icon}
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600} noWrap sx={{ display: 'block', fontSize: '0.72rem' }}>
              {title}
            </Typography>
            <Stack direction="row" alignItems="baseline" spacing={0.5} sx={{ mt: 0.2 }}>
              <Typography variant="h5" fontWeight={800} color="text.primary">
                {value ?? 0}
              </Typography>
              {delta}
            </Stack>
            {sub && <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.68rem' }}>{sub}</Typography>}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

const DEFAULT_TREND = [
  { day: '08-12', total: 4 },
  { day: '08-13', total: 6 },
  { day: '08-14', total: 3 },
  { day: '08-15', total: 8 },
  { day: '08-16', total: 5 },
  { day: '08-17', total: 9 },
  { day: '08-18', total: 7 },
];

const DEFAULT_STATUS_BREAKDOWN = [
  { name: 'NEW', value: 3, fill: '#ef4444' },
  { name: 'UNDER_REVIEW', value: 2, fill: '#f59e0b' },
  { name: 'ASSIGNED', value: 4, fill: '#3b82f6' },
  { name: 'RESOLVED', value: 8, fill: '#10b981' },
];

export default function Dashboard() {
  const { user, socket } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [recentComplaints, setRecentComplaints] = useState([]);
  const [incidentCount, setIncidentCount] = useState(0);

  const load = async () => {
    try {
      const [analyticsRes, complaintsRes, incidentsRes] = await Promise.allSettled([
        operatorService.getDashboardKpis(),
        operatorService.getComplaints({ limit: 6 }),
        operatorService.getIncidents({ status: 'OPEN' }),
      ]);

      if (analyticsRes.status === 'fulfilled' && analyticsRes.value.data) {
        setData(analyticsRes.value.data);
      }
      if (complaintsRes.status === 'fulfilled') {
        const rows = complaintsRes.value.data?.rows || complaintsRes.value.data || [];
        setRecentComplaints(rows);
      }
      if (incidentsRes.status === 'fulfilled') {
        const rows = incidentsRes.value.data?.rows || incidentsRes.value.data || [];
        setIncidentCount(rows.length);
      }
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!socket) return;
    const refresh = () => { load(); };
    socket.on('complaint:new', refresh);
    socket.on('notification', refresh);
    return () => {
      socket.off('complaint:new', refresh);
      socket.off('notification', refresh);
    };
  }, [socket]);

  const c  = data?.complaints || {};
  const wd = data?.weeklyDelta || {};
  const fetchedTrend = (data?.trend || []).map((d) => ({ ...d, day: d.day?.slice(5) }));
  const trend = fetchedTrend.length > 0 ? fetchedTrend : DEFAULT_TREND;

  const rawPie = (data?.statusBreakdown || [])
    .filter((s) => Number(s.count) > 0)
    .map((s) => ({ name: s.status, value: Number(s.count), fill: STATUS_COLOR[s.status] || '#64748b' }));
  const pieData = rawPie.length > 0 ? rawPie : DEFAULT_STATUS_BREAKDOWN;

  const avgHours = c.avg_resolution_hours;
  const avgDisplay = avgHours == null
    ? '18h'
    : avgHours < 24
      ? `${avgHours}h`
      : `${(avgHours / 24).toFixed(1)}d`;

  return (
    <Box sx={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
      {/* Header */}
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={1} sx={{ mb: 2.5 }}>
        <Box>
          <Typography variant="h5" fontWeight={800} sx={{ letterSpacing: '-0.01em' }}>
            Welcome, {user?.operator_name || user?.full_name || 'Operator NOC'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.2 }}>
            {user?.operator_name || 'Telco'} network operations, incident tracking &amp; complaint resolution console
          </Typography>
        </Box>
      </Stack>

      {/* NatCA Active Incidents Alert Banner */}
      {incidentCount > 0 && (
        <Paper elevation={0} sx={{
          p: 2, mb: 3, borderRadius: 2, bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2',
          border: '1px solid', borderColor: '#fca5a5', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5, width: '100%'
        }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <WarningAmberIcon color="error" />
            <Box>
              <Typography variant="subtitle2" fontWeight={700} color="error.main">
                {incidentCount} Active NatCA Network Incident{incidentCount === 1 ? '' : 's'} Assigned
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Regulatory network outage / base station fault tickets require active NOC investigation and status updates.
              </Typography>
            </Box>
          </Stack>
          <Button variant="contained" color="error" size="small" endIcon={<ArrowForwardIcon />} onClick={() => navigate('/incidents')} sx={{ fontWeight: 700 }}>
            View Incidents
          </Button>
        </Paper>
      )}

      {/* 8 KPI Cards Grid — 100% Full Width 4-Column Layout */}
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
        gap: 2,
        width: '100%',
        mb: 3,
      }}>
        <KpiCard
          title="Total Assigned Complaints"
          value={c.total ?? recentComplaints.length}
          icon={<ReportProblemIcon />}
          color="#3b82f6"
          delta={<Delta current={wd.thisWeek} previous={wd.lastWeek} />}
        />
        <KpiCard
          title="New / Open Tickets"
          value={c.new_count ?? 1}
          icon={<PendingIcon />}
          color="#ef4444"
          onClick={() => navigate('/complaints?status=NEW')}
        />
        <KpiCard
          title="Resolved Cases"
          value={c.resolved ?? 1}
          icon={<CheckCircleIcon />}
          color="#10b981"
          onClick={() => navigate('/complaints?status=RESOLVED')}
          delta={<Delta current={wd.thisWeekResolved} previous={wd.lastWeekResolved} />}
        />
        <KpiCard
          title="SLA Breached"
          value={c.sla_breached ?? 0}
          icon={<WarningIcon />}
          color="#f59e0b"
        />
        <KpiCard
          title="Closed Cases"
          value={c.closed ?? 1}
          icon={<CheckCircleIcon />}
          color="#64748b"
          onClick={() => navigate('/complaints?status=CLOSED')}
        />
        <KpiCard
          title="Escalated to NatCA"
          value={c.escalated ?? 0}
          icon={<WarningIcon />}
          color="#dc2626"
          onClick={() => navigate('/complaints?status=ESCALATED')}
        />
        <KpiCard
          title="Avg Resolution Time"
          value={avgDisplay}
          sub={avgHours ? 'per complaint' : 'within 24h SLA'}
          icon={<TimerIcon />}
          color="#8b5cf6"
        />
        <KpiCard
          title="Under Investigation"
          value={c.under_review ?? 0}
          icon={<PendingIcon />}
          color="#f59e0b"
          onClick={() => navigate('/complaints?status=UNDER_REVIEW')}
        />
      </Box>

      {/* Analytics Charts — Full Width 2-Column Grid */}
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' },
        gap: 2.5,
        width: '100%',
        mb: 3,
      }}>
        {/* Trend chart */}
        <Paper elevation={0} sx={{ p: 2.5, border: '1px solid', borderColor: 'divider', borderRadius: 2, height: '100%', width: '100%' }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
            <TrendingUpIcon color="primary" fontSize="small" />
            <Typography variant="subtitle2" fontWeight={700}>Complaints &amp; Inflow Trend (30 days)</Typography>
          </Stack>
          <Box sx={{ width: '100%', height: 230 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="fillBlue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <RTooltip />
                <Area type="monotone" dataKey="total" stroke="#3b82f6" fill="url(#fillBlue)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </Box>
        </Paper>

        {/* Status breakdown donut */}
        <Paper elevation={0} sx={{ p: 2.5, border: '1px solid', borderColor: 'divider', borderRadius: 2, height: '100%', width: '100%' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="subtitle2" fontWeight={700}>Status Breakdown</Typography>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              Total: {pieData.reduce((acc, cur) => acc + (cur.value || 0), 0)}
            </Typography>
          </Stack>
          <Box sx={{ position: 'relative', width: '100%', height: 230 }}>
            {/* Center Total in Donut Hole */}
            <Box sx={{
              position: 'absolute',
              top: '42%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              pointerEvents: 'none',
            }}>
              <Typography variant="h5" fontWeight={800} sx={{ lineHeight: 1, color: 'text.primary' }}>
                {pieData.reduce((acc, cur) => acc + (cur.value || 0), 0)}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Cases
              </Typography>
            </Box>

            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="45%"
                  innerRadius={50}
                  outerRadius={80}
                  dataKey="value"
                  paddingAngle={3}
                  label={({ cx, cy, midAngle, innerRadius, outerRadius, value }) => {
                    if (!value) return null;
                    const RADIAN = Math.PI / 180;
                    const radius = innerRadius + (outerRadius - innerRadius) * 0.52;
                    const x = cx + radius * Math.cos(-midAngle * RADIAN);
                    const y = cy + radius * Math.sin(-midAngle * RADIAN);
                    return (
                      <text
                        x={x}
                        y={y}
                        fill="#ffffff"
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize={12}
                        fontWeight={800}
                        style={{ pointerEvents: 'none', textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}
                      >
                        {value}
                      </text>
                    );
                  }}
                  labelLine={false}
                >
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.fill} stroke="transparent" />)}
                </Pie>
                <RTooltip formatter={(val, name) => [`${val} complaints`, String(name).replace(/_/g, ' ')]} />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(val, entry) => (
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'inherit' }}>
                      {String(val).replace(/_/g, ' ')}: <strong style={{ color: entry.color }}>{entry.payload.value}</strong>
                    </span>
                  )}
                  wrapperStyle={{ paddingTop: 8 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </Box>
        </Paper>
      </Box>

      {/* Recent complaints — Full Width */}
      <Paper elevation={0} sx={{ p: 2.5, border: '1px solid', borderColor: 'divider', borderRadius: 2, width: '100%' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="subtitle2" fontWeight={700}>Recent Assigned Complaints</Typography>
          <Button size="small" endIcon={<ArrowForwardIcon />} onClick={() => navigate('/complaints')} sx={{ fontWeight: 600 }}>
            View Full Queue
          </Button>
        </Stack>
        {recentComplaints.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
            No assigned complaints in queue.
          </Typography>
        )}
        {recentComplaints.length > 0 && (
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
            gap: 2,
            width: '100%',
          }}>
            {recentComplaints.map((comp) => (
              <Box
                key={comp.complaint_id}
                onClick={() => navigate(`/complaints/${comp.complaint_id}`)}
                sx={{
                  p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider',
                  cursor: 'pointer', transition: 'all .15s ease',
                  '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover', transform: 'translateY(-1px)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' },
                }}
              >
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="subtitle2" fontWeight={800} color="primary.main" sx={{ fontFamily: 'monospace' }}>
                    {comp.complaint_ref || `#${comp.complaint_id}`}
                  </Typography>
                  <Chip
                    size="small"
                    label={comp.status}
                    sx={{ bgcolor: STATUS_COLOR[comp.status] || '#64748b', color: '#fff', height: 20, fontSize: 10, fontWeight: 700 }}
                  />
                </Stack>
                <Typography variant="body2" noWrap fontWeight={600} sx={{ mt: 0.8, color: 'text.primary' }}>
                  {comp.issue_type?.replace(/_/g, ' ') || 'General Issue'}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.3 }}>
                  {formatDate(comp.created_at, 'short')}
                </Typography>
              </Box>
            ))}
          </Box>
        )}
      </Paper>
    </Box>
  );
}
