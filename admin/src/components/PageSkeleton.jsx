import { Box, Skeleton, Paper, Grid } from '@mui/material';

export default function PageSkeleton({ variant = 'standard' }) {
  if (variant === 'dashboard') {
    return (
      <Box sx={{ width: '100%', pb: 4 }}>
        {/* Header Skeleton */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Skeleton variant="rounded" width={40} height={40} />
            <Box>
              <Skeleton variant="text" width={180} height={32} />
              <Skeleton variant="text" width={260} height={20} />
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Skeleton variant="rounded" width={100} height={36} />
            <Skeleton variant="rounded" width={100} height={36} />
          </Box>
        </Box>

        {/* KPI Grid Skeleton */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Grid item xs={6} sm={4} lg={2} key={i}>
              <Paper sx={{ p: 2, borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
                <Skeleton variant="text" width="60%" height={16} />
                <Skeleton variant="text" width="80%" height={40} sx={{ my: 1 }} />
                <Skeleton variant="text" width="40%" height={14} />
              </Paper>
            </Grid>
          ))}
        </Grid>

        {/* Charts Grid Skeleton */}
        <Grid container spacing={2.5}>
          <Grid item xs={12} lg={8}>
            <Paper sx={{ p: 3, borderRadius: 1.5, border: '1px solid', borderColor: 'divider', height: 360 }}>
              <Skeleton variant="text" width={200} height={24} sx={{ mb: 2 }} />
              <Skeleton variant="rounded" width="100%" height={280} />
            </Paper>
          </Grid>
          <Grid item xs={12} lg={4}>
            <Paper sx={{ p: 3, borderRadius: 1.5, border: '1px solid', borderColor: 'divider', height: 360 }}>
              <Skeleton variant="text" width={160} height={24} sx={{ mb: 2 }} />
              <Skeleton variant="rounded" width="100%" height={280} />
            </Paper>
          </Grid>
        </Grid>
      </Box>
    );
  }

  // Standard Page Skeleton (Header + Content / Table Paper)
  return (
    <Box sx={{ width: '100%', pb: 4 }}>
      {/* Header Skeleton */}
      <Paper variant="outlined" sx={{ p: 2.5, mb: 3, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Skeleton variant="rounded" width={44} height={44} />
            <Box>
              <Skeleton variant="text" width={220} height={32} />
              <Skeleton variant="text" width={320} height={20} />
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Skeleton variant="rounded" width={100} height={36} />
            <Skeleton variant="rounded" width={120} height={36} />
          </Box>
        </Box>
      </Paper>

      {/* Table / Content Skeleton */}
      <Paper sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2.5 }}>
          <Skeleton variant="rounded" width={280} height={40} />
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Skeleton variant="rounded" width={140} height={40} />
            <Skeleton variant="rounded" width={140} height={40} />
          </Box>
        </Box>
        <Skeleton variant="rounded" width="100%" height={320} />
      </Paper>
    </Box>
  );
}
