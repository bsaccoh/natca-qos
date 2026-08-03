import { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  AppBar, Box, Button, Container, Drawer, IconButton, List, ListItemButton,
  ListItemIcon, ListItemText, Stack, Toolbar, Typography, Avatar, Divider,
  useMediaQuery,
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import CellTowerIcon     from '@mui/icons-material/CellTower';
import MenuIcon          from '@mui/icons-material/Menu';
import HomeIcon          from '@mui/icons-material/Home';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import SearchIcon        from '@mui/icons-material/Search';
import ListAltIcon       from '@mui/icons-material/ListAlt';
import VerifiedUserIcon  from '@mui/icons-material/VerifiedUser';
import SpeedIcon         from '@mui/icons-material/Speed';
import LogoutIcon        from '@mui/icons-material/Logout';
import { useAuth }       from '../auth/AuthContext.jsx';

const LINKS = [
  { label: 'Home',             to: '/',              icon: <HomeIcon fontSize="small" />,          public: true  },
  { label: 'Submit Complaint', to: '/submit',        icon: <ReportProblemIcon fontSize="small" />, public: true  },
  { label: 'Track Complaint',  to: '/track',         icon: <SearchIcon fontSize="small" />,        public: true  },
  { label: 'My Complaints',    to: '/my-complaints', icon: <ListAltIcon fontSize="small" />,       public: false },
  { label: 'KYC / SIM Reg',    to: '/kyc',           icon: <VerifiedUserIcon fontSize="small" />,  public: true  },
  { label: 'Check KYC Status', to: '/kyc/status',    icon: <SearchIcon fontSize="small" />,        public: true  },
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
      <AppBar position="sticky">
        <Toolbar>
          {isMobile && (
            <IconButton edge="start" onClick={() => setDrawer(true)} sx={{ mr: 1 }}>
              <MenuIcon />
            </IconButton>
          )}

          <RouterLink to="/" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: 8 }}>
            <CellTowerIcon sx={{ color: 'primary.main' }} />
            <Typography variant="subtitle1" fontWeight={700}>NatCA Portal</Typography>
          </RouterLink>

          <Box sx={{ flex: 1 }} />

          {!isMobile && (
            <Stack direction="row" spacing={0.5} sx={{ mr: 2 }}>
              {visibleLinks.map((l) => (
                <Button key={l.to} component={RouterLink} to={l.to} size="small"
                  sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}>
                  {l.label}
                </Button>
              ))}
            </Stack>
          )}

          {user ? (
            <Stack direction="row" spacing={1} alignItems="center">
              {!isMobile && (
                <Avatar sx={{ width: 28, height: 28, bgcolor: 'primary.main', fontSize: 13 }}>
                  {(user.fullName || user.email || '?')[0].toUpperCase()}
                </Avatar>
              )}
              <Button size="small" variant="outlined" startIcon={<LogoutIcon fontSize="small" />} onClick={handleLogout}>
                Logout
              </Button>
            </Stack>
          ) : (
            <Stack direction="row" spacing={0.5}>
              <Button size="small" variant="text" component={RouterLink} to="/login"
                sx={{ px: { xs: 1, sm: 2 }, minWidth: 0, fontWeight: 600 }}>
                Login
              </Button>
              <Button size="small" variant="contained" component={RouterLink} to="/register"
                sx={{ px: { xs: 1.5, sm: 2 }, minWidth: 0 }}>
                Sign Up
              </Button>
            </Stack>
          )}
        </Toolbar>
      </AppBar>

      <Drawer anchor="left" open={drawer} onClose={() => setDrawer(false)}>
        <Box sx={{ width: 260, p: 2 }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
            <CellTowerIcon color="primary" />
            <Typography variant="subtitle1" fontWeight={700}>NatCA Portal</Typography>
          </Stack>
          <Divider sx={{ mb: 1 }} />
          <List dense>
            {visibleLinks.map((l) => (
              <ListItemButton key={l.to} component={RouterLink} to={l.to} onClick={() => setDrawer(false)}>
                <ListItemIcon sx={{ minWidth: 36 }}>{l.icon}</ListItemIcon>
                <ListItemText primary={l.label} />
              </ListItemButton>
            ))}
          </List>
          <Divider sx={{ my: 1 }} />
          {user
            ? <Button fullWidth variant="outlined" startIcon={<LogoutIcon />} onClick={() => { handleLogout(); setDrawer(false); }}>Logout</Button>
            : <Stack spacing={1}><Button fullWidth variant="outlined" component={RouterLink} to="/login" onClick={() => setDrawer(false)}>Login</Button>
                <Button fullWidth variant="contained" component={RouterLink} to="/register" onClick={() => setDrawer(false)}>Sign Up</Button></Stack>
          }
        </Box>
      </Drawer>

      <Box component="main" sx={{ flex: 1 }}>
        <Container maxWidth="lg" sx={{ py: 4 }}>
          {children}
        </Container>
      </Box>

      <Box component="footer" sx={{ py: 3, borderTop: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Container maxWidth="lg">
          <Typography variant="caption" color="text.secondary" display="block" textAlign="center">
            © {new Date().getFullYear()} National Communication Authority (NatCA) — Sierra Leone
          </Typography>
        </Container>
      </Box>
    </Box>
  );
}
