import { Box, Paper, Stack, Typography } from '@mui/material';

export default function PageHeader({ icon, title, subtitle, actions }) {
  return (
    <Paper variant="outlined" sx={{ px: { xs: 2, md: 3 }, py: 2, mb: 3, borderRadius: 2 }}>
      <Stack direction="row" alignItems="center" spacing={2} sx={{ flexWrap: 'wrap', rowGap: 1.5 }}>
        {icon && (
          <Box sx={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 44, height: 44, borderRadius: 1.5, flexShrink: 0,
            bgcolor: (t) => t.palette.mode === 'dark' ? 'rgba(45,212,191,0.14)' : 'rgba(13,148,136,0.10)',
            color: 'primary.main',
            '& svg': { fontSize: 24 },
          }}>
            {icon}
          </Box>
        )}
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="h5" noWrap sx={{ lineHeight: 1.25 }}>{title}</Typography>
          {subtitle && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>{subtitle}</Typography>
          )}
        </Box>
        {actions && (
          <Stack direction="row" spacing={1} sx={{ flexShrink: 0, alignItems: 'center' }}>
            {actions}
          </Stack>
        )}
      </Stack>
    </Paper>
  );
}
