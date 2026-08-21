import { useState, useEffect, useCallback } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar, Box, Drawer, Toolbar, Typography, List, ListItemButton, ListItemIcon,
  ListItemText, IconButton, Divider, Tooltip, Stack,
  useMediaQuery, useTheme, Badge, Popover,
} from '@mui/material';
import DashboardIcon     from '@mui/icons-material/Dashboard';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import WarningAmberIcon  from '@mui/icons-material/WarningAmber';
import VerifiedUserIcon  from '@mui/icons-material/VerifiedUser';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LogoutIcon        from '@mui/icons-material/Logout';
import Brightness4Icon   from '@mui/icons-material/Brightness4';
import Brightness7Icon   from '@mui/icons-material/Brightness7';
import MenuIcon          from '@mui/icons-material/Menu';
import ChevronLeftIcon   from '@mui/icons-material/ChevronLeft';
import NotificationsIcon from '@mui/icons-material/Notifications';
import DoneAllIcon       from '@mui/icons-material/DoneAll';
import { useAuth }       from '../auth/AuthContext.jsx';
import { useColorMode }  from '../theme/ColorMode.jsx';
import { operatorService } from '../services/operatorService.js';

const FULL = 240;
const MINI = 64;

const NAV = [
  { to: '/',           label: 'Dashboard',  icon: <DashboardIcon /> },
  { to: '/complaints', label: 'Complaints', icon: <ReportProblemIcon /> },
  { to: '/incidents',  label: 'Incidents',  icon: <WarningAmberIcon /> },
  { to: '/kyc',        label: 'KYC / SIM',  icon: <VerifiedUserIcon /> },
  { to: '/profile',    label: 'My Profile', icon: <AccountCircleIcon /> },
];

function NotificationBell({ socket }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const [unread, setUnread]     = useState(0);
  const [notifs, setNotifs]     = useState([]);
  const navigate = useNavigate();

  const loadNotifs = useCallback(async () => {
    try {
      const [cRes, lRes] = await Promise.all([
        operatorService.getNotificationCount(),
        operatorService.getNotifications({ limit: 10 }),
      ]);
      setUnread(cRes.data?.unread || 0);
      setNotifs(lRes.data?.rows || []);
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => { loadNotifs(); }, [loadNotifs]);

  useEffect(() => {
    if (!socket) return;
    const handleNew = (n) => {
      setUnread((u) => u + 1);
      setNotifs((prev) => [n, ...prev].slice(0, 10));
    };
    socket.on('notification', handleNew);
    return () => socket.off('notification', handleNew);
  }, [socket]);

  const handleOpen = (e) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const handleMarkAllRead = async () => {
    try {
      await operatorService.markNotificationsRead();
      setUnread(0);
      setNotifs((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {
      /* silent */
    }
  };

  const handleItemClick = (n) => {
    handleClose();
    if (n.entity_type === 'COMPLAINT' && n.entity_id) {
      navigate(`/complaints/${n.entity_id}`);
    } else if (n.entity_type === 'INCIDENT') {
      navigate('/incidents');
    }
  };

  return (
    <>
      <Tooltip title="Notifications">
        <IconButton onClick={handleOpen} sx={{ color: 'text.primary' }}>
          <Badge badgeContent={unread} color="error">
            <NotificationsIcon />
          </Badge>
        </IconButton>
      </Tooltip>

      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{ sx: { width: 340, maxHeight: 420, borderRadius: 2 } }}
      >
        <Box sx={{ p: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="subtitle2" fontWeight={700}>Notifications</Typography>
          {unread > 0 && (
            <Tooltip title="Mark all read">
              <IconButton size="small" onClick={handleMarkAllRead}>
                <DoneAllIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
        <List dense sx={{ p: 0 }}>
          {notifs.length === 0 && (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">No notifications yet</Typography>
            </Box>
          )}
          {notifs.map((n) => (
            <ListItemButton key={n.notification_id} onClick={() => handleItemClick(n)} sx={{ bgcolor: n.is_read ? 'inherit' : 'action.hover' }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" fontWeight={n.is_read ? 400 : 700} sx={{ fontSize: '0.82rem' }}>
                  {n.title || n.message}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.2 }}>
                  {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Typography>
              </Box>
            </ListItemButton>
          ))}
        </List>
      </Popover>
    </>
  );
}

export default function Layout() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { user, logout, socket } = useAuth();
  const { mode, toggle } = useColorMode();
  const theme   = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [open,       setOpen]       = useState(!isMobile);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => { setOpen(!isMobile); }, [isMobile]);

  const width       = isMobile ? 0 : (open ? FULL : MINI);
  const drawerWidth = open ? FULL : MINI;

  const renderDrawer = (expanded) => (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Toolbar sx={{ gap: 1.5, justifyContent: expanded ? 'flex-start' : 'center', minHeight: '64px !important', px: expanded ? 2 : 1 }}>
        <Box component="img" src="/natca_logo.png" alt="NatCA" sx={{ width: 38, height: 38, objectFit: 'contain' }} />
        {expanded && (
          <Box sx={{ flex: 1, overflow: 'hidden' }}>
            <Typography variant="subtitle1" fontWeight={800} sx={{ lineHeight: 1.1, color: 'primary.main', fontSize: '0.92rem' }}>
              {user?.operator_name || 'NatCA NOC'}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem', display: 'block', lineHeight: 1 }}>
              {user?.role?.replace(/_/g, ' ') || 'Operator Admin'}
            </Typography>
          </Box>
        )}
        {!isMobile && (
          <IconButton size="small" onClick={() => setOpen(!open)} sx={{ ml: expanded ? 0 : -0.5 }}>
            {expanded ? <ChevronLeftIcon fontSize="small" /> : <MenuIcon fontSize="small" />}
          </IconButton>
        )}
      </Toolbar>
      <Divider />

      <List sx={{ flex: 1, py: 1 }}>
        {NAV.map((item) => {
          const active = item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to);
          return (
            <Tooltip key={item.to} title={expanded ? '' : item.label} placement="right" arrow>
              <ListItemButton selected={active}
                onClick={() => { navigate(item.to); if (isMobile) setMobileOpen(false); }}
                sx={{ mx: expanded ? 1 : 0.5, borderRadius: 1.5, mb: 0.5, px: expanded ? 2 : 1.5, justifyContent: expanded ? 'initial' : 'center' }}>
                <ListItemIcon sx={{ minWidth: expanded ? 40 : 'auto', color: active ? 'primary.main' : 'inherit', justifyContent: 'center' }}>
                  {item.icon}
                </ListItemIcon>
                {expanded && <ListItemText primary={item.label} sx={{ '& .MuiListItemText-primary': { fontSize: 14, fontWeight: active ? 600 : 400 } }} />}
              </ListItemButton>
            </Tooltip>
          );
        })}
      </List>

      <Divider />
      <Box sx={{ p: expanded ? 2 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Tooltip title="Log out">
          <IconButton onClick={() => { logout(); navigate('/login'); }} size="small">
            <LogoutIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        {expanded && (
          <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>Sign out</Typography>
        )}
      </Box>
    </Box>
  );

  const current = NAV.find((n) => n.to === '/' ? location.pathname === '/' : location.pathname.startsWith(n.to));

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar position="fixed" elevation={0}
        sx={{
          width: { xs: '100%', md: `calc(100% - ${width}px)` },
          ml: { xs: 0, md: `${width}px` },
          bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider',
          transition: 'width 225ms, margin 225ms',
        }}>
        <Toolbar>
          {isMobile && (
            <IconButton onClick={() => setMobileOpen(true)} sx={{ mr: 1, color: 'text.primary' }}>
              <MenuIcon />
            </IconButton>
          )}
          <Typography variant="h6" color="text.primary" noWrap fontWeight={700}>
            {current?.label || 'Operator NOC Portal'}
          </Typography>
          <Box sx={{ flex: 1 }} />
          <Stack direction="row" spacing={1} alignItems="center">
            <NotificationBell socket={socket} />
            <Tooltip title={mode === 'dark' ? 'Light mode' : 'Dark mode'}>
              <IconButton onClick={toggle} sx={{ color: 'text.primary' }}>
                {mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
              </IconButton>
            </Tooltip>
          </Stack>
        </Toolbar>
      </AppBar>

      {isMobile && (
        <Drawer variant="temporary" open={mobileOpen} onClose={() => setMobileOpen(false)}
          sx={{ '& .MuiDrawer-paper': { width: FULL, bgcolor: 'background.paper' } }}>
          {renderDrawer(true)}
        </Drawer>
      )}
      {!isMobile && (
        <Drawer variant="permanent"
          sx={{
            width, flexShrink: 0, transition: 'width 225ms',
            '& .MuiDrawer-paper': { width: drawerWidth, bgcolor: 'background.paper', borderRight: 1, borderColor: 'divider', overflowX: 'hidden', transition: 'width 225ms' },
          }}>
          {renderDrawer(open)}
        </Drawer>
      )}

      <Box component="main" sx={{ flexGrow: 1, p: { xs: 1.5, md: 3 }, mt: 8, minHeight: '100vh', bgcolor: 'background.default' }}>
        <Outlet />
      </Box>
    </Box>
  );
}
