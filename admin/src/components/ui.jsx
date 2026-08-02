import { Card, CardContent, Typography, Box, Chip, CircularProgress, Alert, useTheme, alpha } from '@mui/material';
import TrendingUpIcon   from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';

export function useChartTip() {
  const theme = useTheme();
  return {
    background: theme.palette.background.paper,
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: 6,
    color: theme.palette.text.primary,
    boxShadow: theme.palette.mode === 'dark' ? 'none' : '0 2px 8px rgba(0,0,0,0.08)',
  };
}

export function KpiCard({ label, value, unit, sub, color = 'primary.main', icon, trend }) {
  const theme = useTheme();
  return (
    <Card sx={{ 
      height: '100%', 
      borderRadius: 1.5, 
      border: `1px solid ${theme.palette.divider}`,
      position: 'relative',
    }}>
      <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="overline" color="text.secondary" fontWeight={700} sx={{ letterSpacing: '0.05em' }}>
            {label}
          </Typography>
          {icon}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
          <Typography variant="h3" sx={{ fontWeight: 800, color }}>
            {value ?? '—'}
          </Typography>
          {unit && <Typography variant="h6" color="text.secondary" fontWeight={600}>{unit}</Typography>}
          {trend && <Trend trend={trend} />}
        </Box>
        {sub && <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>{sub}</Typography>}
      </CardContent>
    </Card>
  );
}

export function StatusChip({ status, label }) {
  const displayLabel = label || status?.replace(/_/g, ' ');
  let color = '#2563eb';
  
  if (['PASS', 'RESOLVED', 'CLOSED'].includes(status)) color = '#10b981';
  else if (['WARNING', 'UNDER_REVIEW', 'REOPENED', 'Open', 'Investigating'].includes(status)) color = '#f59e0b';
  else if (['FAIL', 'NEW', 'CRITICAL', 'ESCALATED', 'Escalated'].includes(status)) color = '#ef4444';

  return (
    <Chip 
      size="small" 
      label={displayLabel} 
      sx={{ 
        borderRadius: 1, 
        fontWeight: 700, 
        fontSize: '0.7rem',
        bgcolor: alpha(color, 0.12),
        color: color,
        border: `1px solid ${alpha(color, 0.25)}`,
      }} 
    />
  );
}

export function Loading({ height = 200 }) {
  return <Box sx={{ display: 'grid', placeItems: 'center', height }}><CircularProgress size={32} /></Box>;
}

export function EmptyState({ message = 'No data available.', hint }) {
  return (
    <Alert severity="info" sx={{ my: 2, borderRadius: 1.5 }}>
      {message}
      {hint && <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>{hint}</Typography>}
    </Alert>
  );
}

export function Trend({ trend }) {
  if (trend === 'UP' || trend === 'PASS')   return <TrendingUpIcon sx={{ color: '#10b981', fontSize: 18 }} />;
  if (trend === 'DOWN' || trend === 'FAIL') return <TrendingDownIcon sx={{ color: '#ef4444', fontSize: 18 }} />;
  return <TrendingFlatIcon sx={{ color: 'text.secondary', fontSize: 18 }} />;
}

export const fmt = (v, d = 2) => (v == null || isNaN(v) ? '—' : Number(v).toFixed(d));
