import { useEffect } from 'react';
import { Box, Paper, Stack, Typography, Chip, Breadcrumbs, Link } from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { Link as RouterLink } from 'react-router-dom';

export default function PageHeader({
  icon,
  title,
  subtitle,
  chip,
  breadcrumbs,
  actions,
}) {
  useEffect(() => {
    if (title) {
      document.title = `${title} | NatCA QoE Admin`;
    }
  }, [title]);

  return (
    <Paper
      variant="outlined"
      sx={{
        px: { xs: 2, md: 3 },
        py: 2.25,
        mb: 3,
        borderRadius: 2,
        bgcolor: 'background.paper',
      }}
    >
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumbs
          separator={<NavigateNextIcon fontSize="small" />}
          sx={{ mb: 1, '& .MuiBreadcrumbs-li': { fontSize: '0.75rem' } }}
        >
          <Link
            component={RouterLink}
            to="/"
            underline="hover"
            color="text.secondary"
          >
            Dashboard
          </Link>
          {breadcrumbs.map((b, i) =>
            b.to ? (
              <Link
                key={i}
                component={RouterLink}
                to={b.to}
                underline="hover"
                color="text.secondary"
              >
                {b.label}
              </Link>
            ) : (
              <Typography key={i} color="text.primary" variant="caption" fontWeight={600}>
                {b.label}
              </Typography>
            )
          )}
        </Breadcrumbs>
      )}

      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        spacing={2}
        sx={{ flexWrap: 'wrap', rowGap: 1.5 }}
      >
        <Stack direction="row" alignItems="center" spacing={2} sx={{ minWidth: 0 }}>
          {icon && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 44,
                height: 44,
                borderRadius: 1.5,
                flexShrink: 0,
                bgcolor: (t) =>
                  t.palette.mode === 'dark'
                    ? 'rgba(59, 130, 246, 0.16)'
                    : 'rgba(37, 99, 235, 0.10)',
                color: 'primary.main',
                '& svg': { fontSize: 24 },
              }}
            >
              {icon}
            </Box>
          )}
          <Box sx={{ minWidth: 0 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="h5" fontWeight={700} noWrap sx={{ lineHeight: 1.25, letterSpacing: '-0.01em' }}>
                {title}
              </Typography>
              {chip && (
                <Chip
                  size="small"
                  label={chip.label || chip}
                  color={chip.color || 'primary'}
                  sx={{ fontWeight: 600, height: 22 }}
                />
              )}
            </Stack>
            {subtitle && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                {subtitle}
              </Typography>
            )}
          </Box>
        </Stack>

        {actions && (
          <Stack
            direction="row"
            spacing={1.25}
            sx={{ flexShrink: 0, alignItems: 'center', flexWrap: 'wrap', gap: 1 }}
          >
            {actions}
          </Stack>
        )}
      </Stack>
    </Paper>
  );
}
