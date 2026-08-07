import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Grid, Paper, Typography, Stack, Chip, Skeleton,
} from '@mui/material';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import CheckCircleIcon   from '@mui/icons-material/CheckCircle';
import WarningIcon       from '@mui/icons-material/Warning';
import PendingIcon       from '@mui/icons-material/Pending';
import TrendingUpIcon    from '@mui/icons-material/TrendingUp';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
} from 'recharts';
import { get } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { STATUS_COLOR } from '../theme/theme.js';

function KpiCard({ title, value, icon, color, onClick }) {
  return (
    <Paper sx={{ p: 2.5, cursor: onClick ? 'pointer' : 'default', '&:hover': onClick ? { borderColor: color } : {} }} onClick={onClick}>
      <Stack direction="row" spacing={2} alignItems="center">
        <Box sx={{ width: 48, height: 48, borderRadius: 2, bgcolor: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {icon}
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary">{title}</Typography>
          <Typography variant="h4" fontWeight={700}>{value ?? <Skeleton width={50} />}</Typography>
        </Box>
      </Stack>
    </Paper>
  );
}

export default function Dashboard() {
  const { user, socket } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [recentComplaints, setRecentComplaints] = useState([]);

  const load = async () => {
    try {
      const r = await get('/operator-portal/analytics');
      setData(r.data);
    } catch (err) {
      console.error('Failed to load analytics', err);
    }
  };

  const loadRecent = async () => {
    try {
      const r = await get('/operator-portal/complaints?limit=5');
      setRecentComplaints(r.data?.rows || []);
    } catch {}
  };

  useEffect(() => { load(); loadRecent(); }, []);

  useEffect(() => {
    if (!socket) return;
    const refresh = () => { load(); loadRecent(); };
    socket.on('complaint:new', refresh);
    return () => socket.off('complaint:new', refresh);
  }, [socket]);

  const c = data?.complaints || {};
  const trend = (data?.trend || []).map((d) => ({ ...d, day: d.day?.slice(5) }));

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Welcome, {user?.full_name || 'Operator'}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {user?.operator_name || 'Your'} complaint management overview
      </Typography>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, md: 3 }}>
          <KpiCard title="Total Complaints" value={c.total} icon={<ReportProblemIcon sx={{ color: '#3b82f6' }} />} color="#3b82f6" />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <KpiCard title="New / Open" value={c.new_count} icon={<PendingIcon sx={{ color: '#ef4444' }} />} color="#ef4444"
            onClick={() => navigate('/complaints?status=NEW')} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <KpiCard title="Resolved" value={c.resolved} icon={<CheckCircleIcon sx={{ color: '#10b981' }} />} color="#10b981"
            onClick={() => navigate('/complaints?status=RESOLVED')} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <KpiCard title="SLA Breached" value={c.sla_breached} icon={<WarningIcon sx={{ color: '#f59e0b' }} />} color="#f59e0b" />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper sx={{ p: 2.5 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
              <TrendingUpIcon color="primary" fontSize="small" />
              <Typography variant="subtitle2" fontWeight={700}>Complaints Trend (30 days)</Typography>
            </Stack>
            {trend.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
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
            ) : (
              <Box sx={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography variant="body2" color="text.secondary">No data yet</Typography>
              </Box>
            )}
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 2.5, height: '100%' }}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2 }}>Recent Complaints</Typography>
            {recentComplaints.length === 0 && (
              <Typography variant="body2" color="text.secondary">No complaints yet</Typography>
            )}
            <Stack spacing={1.5}>
              {recentComplaints.map((c) => (
                <Box key={c.complaint_id}
                  onClick={() => navigate(`/complaints/${c.complaint_id}`)}
                  sx={{ p: 1.5, borderRadius: 1.5, border: 1, borderColor: 'divider', cursor: 'pointer', '&:hover': { borderColor: 'primary.main' } }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="caption" fontWeight={700} color="primary.main">{c.complaint_ref}</Typography>
                    <Chip size="small" label={c.status} sx={{ bgcolor: STATUS_COLOR[c.status] || '#64748b', color: '#fff', height: 20, fontSize: 10 }} />
                  </Stack>
                  <Typography variant="body2" noWrap sx={{ mt: 0.5 }}>{c.issue_type}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(c.created_at).toLocaleDateString()}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
