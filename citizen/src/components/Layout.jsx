import { Outlet, Link as RouterLink, useNavigate } from 'react';
import {
  AppBar, Box, Button, Container, IconButton, Stack, Toolbar, Typography,
  Drawer, List, ListItemButton, ListItemIcon, ListItemText, Divider, useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import CellTowerIcon      from '@mui/icons-material/CellTower';
import MenuIcon           from '@mui/icons-material/Menu';
import DarkModeIcon       from '@mui/icons-material/DarkMode';
import LightModeIcon      from '@mui/icons-material/LightMode';
import ReportProblemIcon  from '@mui/icons-material/ReportProblem';
import SearchIcon         from '@mui/icons-material/Search';
import ListAltIcon        from '@mui/icons-material/ListAlt';
import VerifiedUserIcon   from '@mui/icons-material/VerifiedUser';
import LoginIcon          from '@mui/icons-material/Login';
import LogoutIcon         from '@mui/icons-material/Logout';
import SpeedIcon          from '@mui/icons-material/Speed';
import ArticleIcon        from '@mui/icons-material/Article';
import { useState } from 'react';
import { useColorMode }   from '../theme/ColorMode.jsx';
import { useAuth }        from '../auth/AuthContext.jsx';

const NAV = [
  { label: 'Submit Complaint', to: '/submit',     icon: <ReportProblemIcon fontSize="small" /> },
  { label: 'Track Complaint',  to: '/track',      icon: <SearchIcon fontSize="small" /> },
  { label: 'SIM Registration', to: '/kyc',        icon: <ListAltIcon fontSize="small" /> },
  { label: 'Verify KYC Status', to: '/kyc-status', icon: <VerifiedUserIcon fontSize="small" /> },
  { label: 'Speed Test',       to: '/speed-test', icon: <SpeedIcon fontSize="small" /> },
  { label: 'News & Info',      to: '/news',       icon: <ArticleIcon fontSize="small" /> },
];

export default function Layout() {
  const { mode, toggle } = useColorMode();
  const { user, logout } = useAuth();
  const navigate          = useNavigate();
  const theme             = useTheme();
  const isMobile          = useMediaQuery(theme.breakpoints.down('sm'));
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const navLinks = [
    ...NAV,
    ...(user ? [{ label: 'My Complaints', to: '/my-complaints', icon: <ListAltIcon fontSize="small" /> }] : []),
  ];

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      <AppBar position="sticky" sx={{ bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider', color: 'text.primary' }}>
        <Toolbar>
          {isMobile && (
            <IconButton edge="start" onClick={() => setDrawerOpen(true)} sx={{ mr: 1 }}>
              <MenuIcon />
            </IconButton>
          )}
          <RouterLink to="/" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Box component="img" src="/natca_logo.png" alt="NatCA Logo" sx={{ width: 32, height: 32, objectFit: 'contain' }} onError={(e) => { e.target.style.display = 'none'; }} />
            <Typography variant="subtitle1" fontWeight={700} sx={{ letterSpacing: '-0.01em' }}>
              NatCA Citizen Portal
            </Typography>
          </RouterLink>

          <Box sx={{ flexGrow: 1 }} />

          {!isMobile && (
            <Stack direction="row" spacing={1} sx={{ mr: 2 }}>
              {navLinks.map((n) => (
                <Button
                  key={n.to}
                  component={RouterLink}
                  to={n.to}
                  size="small"
                  startIcon={n.icon}
                  sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' }, textTransform: 'none' }}
                >
                  {n.label}
                </Button>
              ))}
            </Stack>
          )}

          <IconButton onClick={toggle} size="small" sx={{ mr: 1 }}>
            {mode === 'dark' ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
          </IconButton>

          {user ? (
            <Button
              size="small"
              variant="outlined"
              color="inherit"
              startIcon={<LogoutIcon fontSize="small" />}
              onClick={handleLogout}
              sx={{ textTransform: 'none' }}
            >
              Logout
            </Button>
          ) : (
            <Button
              component={RouterLink}
              to="/login"
              size="small"
              variant="contained"
              startIcon={<LoginIcon fontSize="small" />}
              sx={{ textTransform: 'none' }}
            >
              Login
            </Button>
          )}
        </Toolbar>
      </AppBar>

      {/* Mobile Drawer */}
      <Drawer anchor="left" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Box sx={{ width: 240, p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <CellTowerIcon color="primary" />
            <Typography variant="subtitle1" fontWeight={700}>NatCA Portal</Typography>
          </Box>
          <Divider sx={{ mb: 1 }} />
          <List>
            {navLinks.map((n) => (
              <ListItemButton
                key={n.to}
                component={RouterLink}
                to={n.to}
                onClick={() => setDrawerOpen(false)}
              >
                <ListItemIcon>{n.icon}</ListItemIcon>
                <ListItemText primary={n.label} />
              </ListItemButton>
            ))}
          </List>
        </Box>
      </Drawer>

      {/* Main Content Body */}
      <Box component="main" sx={{ flexGrow: 1 }}>
        <Outlet />
      </Box>

      {/* Footer */}
      <Box component="footer" sx={{ py: 3, borderTop: 1, borderColor: 'divider', bgcolor: 'background.paper', mt: 'auto' }}>
        <Container maxWidth="lg">
          <Typography variant="body2" color="text.secondary" align="center">
            © {new Date().getFullYear()} National Communications Authority (NatCA) — Sierra Leone. Quality of Experience & SIM Registration Portal.
          </Typography>
        </Container>
      </Box>
    </Box>
  );
}
