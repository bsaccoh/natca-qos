import { useEffect } from 'react';
import { Breadcrumbs, Link, Typography } from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { Link as RouterLink } from 'react-router-dom';
import { RadioTower } from 'lucide-react';

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
    <div style={{ marginBottom: 20 }}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumbs
          separator={<NavigateNextIcon fontSize="small" sx={{ opacity: 0.5, fontSize: 13 }} />}
          sx={{ mb: 1, '& .MuiBreadcrumbs-li': { fontSize: '0.75rem', fontWeight: 600 } }}
        >
          <Link
            component={RouterLink}
            to="/"
            underline="hover"
            color="text.secondary"
            sx={{ fontWeight: 600, transition: 'color 0.2s', '&:hover': { color: 'primary.main' } }}
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
                sx={{ fontWeight: 600, transition: 'color 0.2s', '&:hover': { color: 'primary.main' } }}
              >
                {b.label}
              </Link>
            ) : (
              <Typography key={i} color="text.primary" variant="caption" fontWeight={700}>
                {b.label}
              </Typography>
            )
          )}
        </Breadcrumbs>
      )}

      <section className="hero-banner" style={{ minHeight: 84, padding: '16px 22px' }}>
        {icon && (
          <div className="hero-icon" style={{ width: 46, height: 46, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {icon}
          </div>
        )}

        <div className="hero-copy">
          {chip && (
            <span className="quality-tag">
              {typeof chip === 'string' ? chip : chip.label || 'REGULATORY PORTAL'}
            </span>
          )}
          <h1 style={{ fontSize: 19, margin: '2px 0 3px', color: '#ffffff', fontWeight: 800 }}>
            {title}
          </h1>
          {subtitle && (
            <p style={{ fontSize: 11.5, opacity: 0.9, margin: 0, color: 'rgba(232, 239, 255, 0.9)' }}>
              {subtitle}
            </p>
          )}
        </div>

        {actions && (
          <div className="hero-actions">
            {actions}
          </div>
        )}

        <div className="hero-tower" style={{ margin: '-16px -22px -16px 0' }}>
          <RadioTower size={56} />
        </div>
      </section>
    </div>
  );
}
