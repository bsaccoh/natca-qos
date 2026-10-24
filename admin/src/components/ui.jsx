import { Card, CardContent, Typography, Box, Chip, CircularProgress, Alert, useTheme, alpha, Stack } from '@mui/material';
import TrendingUpIcon   from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';

export function KpiCard({ label, value, unit, sub, color = '#3b82f6', icon, trend, trendValue, loading = false }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Card sx={{ 
      height: '100%', 
      borderRadius: 2.5, 
      border: `1px solid ${theme.palette.divider}`,
      borderTop: `3px solid ${color}`,
      position: 'relative',
      overflow: 'hidden',
      background: isDark 
        ? `linear-gradient(180deg, ${alpha(color, 0.08)} 0%, ${theme.palette.background.paper} 100%)`
        : `linear-gradient(180deg, ${alpha(color, 0.04)} 0%, ${theme.palette.background.paper} 100%)`,
      transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
      '&:hover': {
        transform: 'translateY(-3px)',
        borderColor: alpha(color, 0.4),
        boxShadow: isDark 
          ? `0 14px 28px -8px rgba(0, 0, 0, 0.6), 0 0 20px -5px ${alpha(color, 0.25)}`
          : `0 14px 28px -8px rgba(15, 23, 42, 0.1), 0 0 20px -5px ${alpha(color, 0.15)}`,
      },
    }}>
      {/* Translucent Watermark Icon in background right */}
      {icon && (
        <Box sx={{
          position: 'absolute',
          right: -10,
          bottom: -10,
          opacity: isDark ? 0.06 : 0.04,
          transform: 'rotate(-10deg) scale(2.6)',
          color: color,
          pointerEvents: 'none',
        }}>
          {icon}
        </Box>
      )}

      <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 }, position: 'relative', zIndex: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Typography 
            variant="overline" 
            color="text.secondary" 
            fontWeight={700} 
            sx={{ letterSpacing: '0.06em', fontSize: '0.68rem' }}
          >
            {label}
          </Typography>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            width: 32, 
            height: 32, 
            borderRadius: 1.75, 
            bgcolor: alpha(color, 0.12), 
            color: color 
          }}>
            {icon}
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, flexWrap: 'wrap' }}>
          <Typography 
            variant="h3" 
            sx={{ 
              fontWeight: 800, 
              color: isDark ? '#ffffff' : '#0f172a',
              letterSpacing: '-0.03em',
            }}
          >
            {loading ? <CircularProgress size={26} thickness={4} sx={{ color }} /> : (value ?? '—')}
          </Typography>
          {unit && (
            <Typography variant="body1" color="text.secondary" fontWeight={600} sx={{ ml: 0.25 }}>
              {unit}
            </Typography>
          )}
          {trend && (
            <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Trend trend={trend} />
              {trendValue && (
                <Typography 
                  variant="caption" 
                  fontWeight={700}
                  sx={{ 
                    color: trend === 'UP' || trend === 'PASS' ? 'success.main' : 'error.main',
                    bgcolor: trend === 'UP' || trend === 'PASS' ? alpha('#10b981', 0.12) : alpha('#ef4444', 0.12),
                    px: 0.8,
                    py: 0.2,
                    borderRadius: 1,
                    fontSize: '0.68rem',
                  }}
                >
                  {trendValue}
                </Typography>
              )}
            </Box>
          )}
        </Box>

        {sub && (
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.75, fontSize: '0.74rem' }}>
            {sub}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

export function StatusChip({ status, label }) {
  let displayLabel = label || status?.replace(/_/g, ' ');
  if (status === 'NEW') displayLabel = 'ESCALATED';
  
  let color = '#2563eb';
  let pulse = false;
  
  if (['PASS', 'RESOLVED', 'CLOSED', 'APPROVED'].includes(status)) {
    color = '#10b981';
  } else if (['WARNING', 'UNDER_REVIEW', 'PENDING', 'REOPENED', 'Open', 'Investigating'].includes(status)) {
    color = '#f59e0b';
    pulse = true;
  } else if (['FAIL', 'NEW', 'CRITICAL', 'ESCALATED', 'Escalated', 'REJECTED', 'OPEN'].includes(status)) {
    color = '#ef4444';
    pulse = true;
  }

  return (
    <Chip 
      size="small" 
      icon={
        <Box 
          component="span" 
          className={pulse ? 'pulse-indicator' : ''} 
          sx={{ 
            width: 7, 
            height: 7, 
            borderRadius: '50%', 
            bgcolor: color, 
            color: color,
            display: 'inline-block',
            mr: 0.5,
            ml: 0.5,
            boxShadow: `0 0 6px ${color}`,
          }} 
        />
      }
      label={displayLabel} 
      sx={{ 
        borderRadius: 1.5, 
        fontWeight: 700, 
        fontSize: '0.72rem',
        letterSpacing: '0.02em',
        bgcolor: alpha(color, 0.12),
        color: color,
        border: `1px solid ${alpha(color, 0.28)}`,
        height: 24,
        '& .MuiChip-icon': {
          ml: 0.75,
          mr: 0,
        },
      }} 
    />
  );
}

export function CustomChartTooltip({ active, payload, label, unit = '' }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  if (!active || !payload || !payload.length) return null;

  return (
    <Box sx={{
      p: 1.5,
      borderRadius: 2,
      bgcolor: isDark ? 'rgba(15, 23, 42, 0.92)' : 'rgba(255, 255, 255, 0.94)',
      backdropFilter: 'blur(12px)',
      border: `1px solid ${theme.palette.divider}`,
      boxShadow: isDark ? '0 10px 25px rgba(0,0,0,0.6)' : '0 10px 25px rgba(15,23,42,0.12)',
      minWidth: 140,
    }}>
      {label && (
        <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
          {label}
        </Typography>
      )}
      <Stack spacing={0.5}>
        {payload.map((item, idx) => (
          <Box key={idx} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: item.color || item.fill, boxShadow: `0 0 6px ${item.color || item.fill}` }} />
              <Typography variant="body2" fontSize="0.78rem" color="text.secondary">
                {item.name || item.dataKey}
              </Typography>
            </Box>
            <Typography variant="body2" fontWeight={700} color="text.primary">
              {item.value} {unit}
            </Typography>
          </Box>
        ))}
      </Stack>
    </Box>
  );
}

export function GlassCard({ title, subtitle, icon, actions, height, children, sx = {} }) {
  const theme = useTheme();
  return (
    <Card sx={{ 
      p: 3, 
      borderRadius: 2.5, 
      border: `1px solid ${theme.palette.divider}`, 
      height: height || 'auto',
      display: 'flex', 
      flexDirection: 'column',
      position: 'relative',
      ...sx 
    }}>
      {(title || actions) && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Stack direction="row" spacing={1} alignItems="center">
              {icon && <Box sx={{ color: 'primary.main', display: 'flex' }}>{icon}</Box>}
              <Typography variant="subtitle1" fontWeight={700} color="text.primary">
                {title}
              </Typography>
            </Stack>
            {subtitle && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                {subtitle}
              </Typography>
            )}
          </Box>
          {actions && <Box sx={{ display: 'flex', gap: 1 }}>{actions}</Box>}
        </Box>
      )}
      <Box sx={{ flex: 1, width: '100%', minHeight: 0 }}>
        {children}
      </Box>
    </Card>
  );
}

export function Loading({ height = 240, text = 'Loading data...' }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height, gap: 1.5 }}>
      <CircularProgress size={34} thickness={4} />
      <Typography variant="caption" color="text.secondary" fontWeight={600}>
        {text}
      </Typography>
    </Box>
  );
}

export function EmptyState({ message = 'No data available.', hint, icon }) {
  return (
    <Alert 
      severity="info" 
      icon={icon}
      sx={{ 
        my: 2, 
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: (t) => alpha(t.palette.info.main, 0.08),
      }}
    >
      <Typography variant="body2" fontWeight={600}>{message}</Typography>
      {hint && <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>{hint}</Typography>}
    </Alert>
  );
}

export function Trend({ trend }) {
  if (trend === 'UP' || trend === 'PASS')   return <TrendingUpIcon sx={{ color: '#10b981', fontSize: 18 }} />;
  if (trend === 'DOWN' || trend === 'FAIL') return <TrendingDownIcon sx={{ color: '#ef4444', fontSize: 18 }} />;
  return <TrendingFlatIcon sx={{ color: 'text.secondary', fontSize: 18 }} />;
}
