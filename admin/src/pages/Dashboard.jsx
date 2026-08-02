import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Stack, Chip, Button, Alert, useTheme, alpha
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import FaceIcon from '@mui/icons-material/Face';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import DownloadIcon from '@mui/icons-material/Download';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { get } from '../api/client.js';
import { Loading } from '../components/ui.jsx';
import MapOverview from '../components/MapOverview.jsx';
import { exportToCSV, exportExecutivePDF } from '../utils/exportUtils.js';

const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, value, name, fill }) => {
  const RADIAN = Math.PI / 180;
  const radius = outerRadius + 22;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text x={x} y={y} fill={fill} textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={11} fontWeight={600}>
      {`${name} (${value})`}
    </text>
  );
};

const DONUT_CATEGORY_DATA = [
  { name: 'Slow Data', value: 5, fill: '#ff7900' },
  { name: 'No Coverage', value: 4, fill: '#3b82f6' },
  { name: 'Call Drop', value: 3, fill: '#10b981' },
  { name: 'Service Outage', value: 3, fill: '#a855f7' },
  { name: 'Poor Voice', value: 2, fill: '#ef4444' },
  { name: 'SMS Failure', value: 2, fill: '#eab308' },
];

const STACKED_OPERATOR_DATA = [
  { operator: 'Africell', Open: 4, Investigating: 1, Escalated: 0, Resolved: 8, Closed: 1 },
  { operator: 'Orange', Open: 2, Investigating: 1, Escalated: 2, Resolved: 4, Closed: 3 },
  { operator: 'Qcell', Open: 2, Investigating: 2, Escalated: 0, Resolved: 4, Closed: 0 },
  { operator: 'SierraTel', Open: 5, Investigating: 0, Escalated: 0, Resolved: 6, Closed: 0 },
];

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const theme = useTheme();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await get('/complaints/summary');
      setData(r.data);
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Loading height={400} />;
  if (err) return <Box sx={{ p: 3 }}><Alert severity="error" sx={{ borderRadius: 1.5 }}>{err}</Alert></Box>;

  const counts = data?.counts || {};

  const resolutionRate = counts.total > 0
    ? (((Number(counts.resolved) + Number(counts.closed)) / Number(counts.total)) * 100).toFixed(1)
    : 0;

  const slaCompliance = counts.total > 0
    ? (((Number(counts.total) - Number(counts.sla_breached)) / Number(counts.total)) * 100).toFixed(1)
    : 100;

  const handleExportCSV = () => {
    exportToCSV('NatCA_Executive_Dashboard_Summary', [
      { Metric: 'Total Complaints', Value: counts.total || 0 },
      { Metric: 'Open / Pending', Value: counts.new_count || 0 },
      { Metric: 'Resolved Cases', Value: counts.resolved || 0 },
      { Metric: 'Critical Cases', Value: counts.critical || 0 },
      { Metric: 'Resolution Rate', Value: `${resolutionRate}%` },
      { Metric: 'SLA Compliance Rate', Value: `${slaCompliance}%` }
    ]);
  };

  return (
    <Box sx={{ width: '100%', minHeight: '100%', pb: 4 }}>
      {/* Header Bar */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box sx={{ 
            width: 40, height: 40, borderRadius: 1.5, 
            bgcolor: alpha(theme.palette.primary.main, 0.12), 
            color: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center' 
          }}>
            <SupportAgentIcon fontSize="medium" />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700} sx={{ letterSpacing: '-0.02em', color: 'text.primary' }}>
              Complaint Management
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Unified overview — Regulator Caseload + Consumer Reports & GIS Spatial Health
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" spacing={1.5}>
          <Button 
            startIcon={<RefreshIcon />} 
            variant="outlined" 
            onClick={load} 
            sx={{ borderRadius: 1.5, textTransform: 'none', fontWeight: 600, borderColor: 'divider', color: 'text.primary' }}
          >
            Refresh
          </Button>

          <Button 
            startIcon={<DownloadIcon />} 
            variant="outlined" 
            onClick={handleExportCSV} 
            sx={{ borderRadius: 1.5, textTransform: 'none', fontWeight: 600, borderColor: 'divider', color: 'text.primary' }}
          >
            CSV
          </Button>

          <Button 
            startIcon={<PictureAsPdfIcon />} 
            variant="contained" 
            onClick={() => exportExecutivePDF(data)} 
            sx={{ borderRadius: 1.5, textTransform: 'none', fontWeight: 600 }}
          >
            Export PDF
          </Button>
        </Stack>
      </Box>

      {/* KPI Cards Row */}
      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', lg: 'repeat(6, 1fr)' }, 
        gap: 2, 
        mb: 3,
        width: '100%' 
      }}>
        
        {/* TOTAL COMPLAINTS */}
        <Paper sx={{ p: 2.5, borderRadius: 1.5, border: '1px solid', borderColor: 'divider', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ letterSpacing: '0.05em' }}>
              TOTAL COMPLAINTS
            </Typography>
            <Box sx={{ color: '#2563eb', display: 'flex' }}>
              <FaceIcon fontSize="small" />
            </Box>
          </Box>
          <Typography variant="h3" fontWeight={800} sx={{ mt: 1.5, color: '#2563eb' }}>
            {counts.total ?? 0}
          </Typography>
        </Paper>

        {/* OPEN / PENDING */}
        <Paper sx={{ p: 2.5, borderRadius: 1.5, border: '1px solid', borderColor: 'divider', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ letterSpacing: '0.05em' }}>
              OPEN / PENDING
            </Typography>
            <Box sx={{ color: '#f59e0b', display: 'flex' }}>
              <HourglassEmptyIcon fontSize="small" />
            </Box>
          </Box>
          <Typography variant="h3" fontWeight={800} sx={{ mt: 1.5, color: '#f59e0b' }}>
            {counts.new_count ?? 0}
          </Typography>
        </Paper>

        {/* RESOLVED */}
        <Paper sx={{ p: 2.5, borderRadius: 1.5, border: '1px solid', borderColor: 'divider', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ letterSpacing: '0.05em' }}>
              RESOLVED
            </Typography>
            <Box sx={{ color: '#10b981', display: 'flex' }}>
              <CheckCircleIcon fontSize="small" />
            </Box>
          </Box>
          <Typography variant="h3" fontWeight={800} sx={{ mt: 1.5, color: '#10b981' }}>
            {counts.resolved ?? 0}
          </Typography>
        </Paper>

        {/* RESOLUTION RATE */}
        <Paper sx={{ p: 2.5, borderRadius: 1.5, border: '1px solid', borderColor: 'divider', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ letterSpacing: '0.05em' }}>
              RESOLUTION RATE
            </Typography>
            <Box sx={{ color: '#ef4444', display: 'flex' }}>
              <CheckCircleIcon fontSize="small" />
            </Box>
          </Box>
          <Box sx={{ mt: 1.5 }}>
            <Typography variant="h3" fontWeight={800} sx={{ color: '#ef4444' }}>
              {resolutionRate}%
            </Typography>
            <Box sx={{ width: '36px', height: '4px', bgcolor: '#ef4444', borderRadius: 1, mt: 0.5 }} />
          </Box>
        </Paper>

        {/* CRITICAL (INTERNAL) */}
        <Paper sx={{ p: 2.5, borderRadius: 1.5, border: '1px solid', borderColor: 'divider', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ letterSpacing: '0.05em' }}>
              CRITICAL<br/>(INTERNAL)
            </Typography>
            <Box sx={{ color: '#ef4444', display: 'flex' }}>
              <ErrorIcon fontSize="small" />
            </Box>
          </Box>
          <Typography variant="h3" fontWeight={800} sx={{ mt: 1.5, color: '#ef4444' }}>
            {counts.critical ?? 0}
          </Typography>
        </Paper>

        {/* SLA COMPLIANCE */}
        <Paper sx={{ p: 2.5, borderRadius: 1.5, border: '1px solid', borderColor: 'divider', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ letterSpacing: '0.05em' }}>
              SLA COMPLIANCE
            </Typography>
            <Box sx={{ color: '#ef4444', display: 'flex' }}>
              <AccessTimeIcon fontSize="small" />
            </Box>
          </Box>
          <Box sx={{ mt: 1.5 }}>
            <Typography variant="h3" fontWeight={800} sx={{ color: '#ef4444' }}>
              {slaCompliance}%
            </Typography>
            <Box sx={{ width: '48px', height: '4px', bgcolor: '#ef4444', borderRadius: 1, mt: 0.5 }} />
          </Box>
        </Paper>

      </Box>

      {/* Main Charts Row - Graph Grid Lines Enabled */}
      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, 1fr)' }, 
        gap: 3,
        mb: 3,
        width: '100%' 
      }}>

        {/* Left Card: Open Complaints by Category */}
        <Paper sx={{ p: 3, borderRadius: 1.5, border: '1px solid', borderColor: 'divider', display: 'flex', flexDirection: 'column' }}>
          <Typography variant="subtitle1" fontWeight={700} color="text.primary" mb={2}>
            Open Complaints by Category
          </Typography>

          <Box sx={{ height: 280, width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={DONUT_CATEGORY_DATA}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                  label={renderCustomizedLabel}
                  labelLine={true}
                >
                  {DONUT_CATEGORY_DATA.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <RTooltip />
              </PieChart>
            </ResponsiveContainer>
          </Box>
        </Paper>

        {/* Right Card: Complaints by Operator & Status - Graph Grid Lines Enabled */}
        <Paper sx={{ p: 3, borderRadius: 1.5, border: '1px solid', borderColor: 'divider', display: 'flex', flexDirection: 'column' }}>
          <Typography variant="subtitle1" fontWeight={700} color="text.primary" mb={2}>
            Complaints by Operator & Status
          </Typography>

          <Box sx={{ height: 280, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={STACKED_OPERATOR_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                <XAxis dataKey="operator" tick={{ fontSize: 11, fontWeight: 600 }} axisLine={true} tickLine={true} />
                <YAxis tick={{ fontSize: 11 }} axisLine={true} tickLine={true} allowDecimals={false} />
                <RTooltip />
                <Legend verticalAlign="bottom" wrapperStyle={{ paddingTop: 10 }} />
                <Bar dataKey="Open" stackId="a" fill="#f59e0b" maxBarSize={55} />
                <Bar dataKey="Investigating" stackId="a" fill="#3b82f6" maxBarSize={55} />
                <Bar dataKey="Escalated" stackId="a" fill="#ef4444" maxBarSize={55} />
                <Bar dataKey="Resolved" stackId="a" fill="#10b981" maxBarSize={55} />
                <Bar dataKey="Closed" stackId="a" fill="#64748b" maxBarSize={55} />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </Paper>

      </Box>

      {/* GIS Spatial Leaflet Map Section */}
      <Box sx={{ width: '100%' }}>
        <MapOverview />
      </Box>

    </Box>
  );
}
