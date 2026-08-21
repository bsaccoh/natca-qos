import { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  AppBar, Box, Button, Container, Drawer, IconButton, List, ListItemButton,
  ListItemIcon, ListItemText, Stack, Toolbar, Typography, Avatar, Divider,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import MenuIcon          from '@mui/icons-material/Menu';
import HomeIcon          from '@mui/icons-material/Home';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import SearchIcon        from '@mui/icons-material/Search';
import ListAltIcon       from '@mui/icons-material/ListAlt';
import VerifiedUserIcon  from '@mui/icons-material/VerifiedUser';
import SpeedIcon         from '@mui/icons-material/Speed';
import LogoutIcon        from '@mui/icons-material/Logout';
import ArticleIcon       from '@mui/icons-material/Article';
import DialpadIcon       from '@mui/icons-material/Dialpad';
import { useAuth }       from '../auth/AuthContext.jsx';
import { BRAND }         from '../theme/theme.js';

const LINKS = [
  { label: 'Home',             to: '/',              icon: <HomeIcon fontSize="small" />,          public: true  },
  { label: 'Submit Complaint', to: '/submit',        icon: <ReportProblemIcon fontSize="small" />, public: true  },
  { label: 'Track Complaint',  to: '/track',         icon: <SearchIcon fontSize="small" />,        public: true  },
  { label: 'My Complaints',    to: '/my-complaints', icon: <ListAltIcon fontSize="small" />,       public: false },
  { label: 'KYC / SIM Reg',    to: '/kyc',           icon: <VerifiedUserIcon fontSize="small" />,  public: true  },
  { label: 'Check KYC Status', to: '/kyc/status',    icon: <SearchIcon fontSize="small" />,        public: true  },
  { label: 'USSD Directory',   to: '/ussd',          icon: <DialpadIcon fontSize="small" />,       public: true  },
  { label: 'Newsroom',         to: '/news',          icon: <ArticleIcon fontSize="small" />,       public: true  },
  { label: 'Speed Test',       to: '/speed-test',    icon: <SpeedIcon fontSize="small" />,         public: false },
];

export default function PortalLayout({ children }) {
  const navigate            = useNavigate();
  const { user, logout }    = useAuth();
  const theme               = useTheme();
  const isMobile            = useMediaQuery(theme.breakpoints.down('md'));
  const [drawer, setDrawer] = useState(false);

  const visibleLinks = user ? LINKS : LINKS.filter((l) => l.public);

  const handleLogout = async () => { await logout(); navigate('/'); };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      <AppBar position="sticky" sx={{ borderBottom: `1px solid ${BRAND.border}`, bgcolor: '#fff', color: BRAND.text }}>
        <Toolbar sx={{ height: { xs: 60, md: 68 } }}>
          {isMobile && (
            <IconButton edge="start" onClick={() => setDrawer(true)} aria-label="Open navigation drawer" sx={{ mr: 1 }}>
              <MenuIcon />
            </IconButton>
          )}

          <RouterLink to="/" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Box component="img" src="/natca_logo.png" alt="NatCA" sx={{ width: 36, height: 36, objectFit: 'contain' }} />
            <Box>
              <Typography variant="subtitle1" fontWeight={800} sx={{ color: BRAND.navy, lineHeight: 1.1 }}>NatCA Portal</Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.65rem' }}>Government of Sierra Leone</Typography>
            </Box>
          </RouterLink>

          <Box sx={{ flex: 1 }} />

          {!isMobile && (
            <Stack direction="row" spacing={0.5} sx={{ mr: 2 }}>
              {visibleLinks.map((l) => (
                <Button key={l.to} component={RouterLink} to={l.to} size="small"
                  sx={{ color: 'text.secondary', fontWeight: 600, '&:hover': { color: 'primary.main', bgcolor: BRAND.primaryLt } }}>
                  {l.label}
                </Button>
              ))}
            </Stack>
          )}

          {user ? (
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Avatar sx={{ width: 32, height: 32, bgcolor: BRAND.primary, fontSize: '0.85rem', fontWeight: 700 }}>
                {(user.fullName || user.phone || 'U')[0].toUpperCase()}
              </Avatar>
              {!isMobile && (
                <Typography variant="body2" fontWeight={600} sx={{ color: BRAND.text }}>
                  {user.fullName || user.phone}
                </Typography>
              )}
              <IconButton size="small" onClick={handleLogout} aria-label="Sign Out" title="Sign Out" sx={{ color: 'text.secondary' }}>
                <LogoutIcon fontSize="small" />
              </IconButton>
            </Stack>
          ) : (
            <Stack direction="row" spacing={1}>
              <Button component={RouterLink} to="/login" size="small" variant="outlined" sx={{ fontWeight: 600 }}>
                Sign In
              </Button>
              <Button component={RouterLink} to="/register" size="small" variant="contained" sx={{ bgcolor: BRAND.primary, fontWeight: 600 }}>
                Sign Up
              </Button>
            </Stack>
          )}
        </Toolbar>
      </AppBar>

      {/* Mobile Drawer */}
      <Drawer anchor="left" open={drawer} onClose={() => setDrawer(false)}
        PaperProps={{ sx: { width: 270, p: 2 } }}>
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
          <Box component="img" src="/natca_logo.png" alt="NatCA" sx={{ width: 36, height: 36 }} />
          <Typography variant="subtitle1" fontWeight={800} sx={{ color: BRAND.navy }}>NatCA Citizen</Typography>
        </Stack>
        <Divider sx={{ mb: 1.5 }} />
        <List disablePadding>
          {visibleLinks.map((l) => (
            <ListItemButton key={l.to} component={RouterLink} to={l.to} onClick={() => setDrawer(false)}
              sx={{ borderRadius: 1.5, mb: 0.5 }}>
              <ListItemIcon sx={{ minWidth: 36, color: 'primary.main' }}>{l.icon}</ListItemIcon>
              <ListItemText primary={l.label} primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: 600 }} />
            </ListItemButton>
          ))}
        </List>
        {user && (
          <Box sx={{ mt: 'auto', pt: 2 }}>
            <Divider sx={{ mb: 2 }} />
            <Button fullWidth startIcon={<LogoutIcon />} onClick={handleLogout} color="error" variant="outlined" size="small">
              Sign Out
            </Button>
          </Box>
        )}
      </Drawer>

      <Box component="main" sx={{ flex: 1, py: { xs: 2, sm: 3 } }}>
        <Container maxWidth="lg">
          {children}
        </Container>
      </Box>

      {/* Mini footer */}
      <Box component="footer" sx={{ py: 2.5, textAlign: 'center', borderTop: `1px solid ${BRAND.border}`, bgcolor: BRAND.alt }}>
        <Typography variant="caption" color="text.secondary">
          National Communication Authority (NatCA) · Official Consumer Protection Portal · Freetown, Sierra Leone
        </Typography>
      </Box>
    </Box>
  );
}
