import { useState, useEffect, useCallback } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar, Box, Drawer, Toolbar, Typography, List, ListItemButton, ListItemIcon,
  ListItemText, IconButton, Avatar, Divider, Tooltip, Stack,
  useMediaQuery, useTheme, Badge, Popover,
} from '@mui/material';
import DashboardIcon        from '@mui/icons-material/Dashboard';
import ReportProblemIcon    from '@mui/icons-material/ReportProblem';
import VerifiedUserIcon     from '@mui/icons-material/VerifiedUser';
import BarChartIcon         from '@mui/icons-material/BarChart';
import StarIcon             from '@mui/icons-material/Star';
import PeopleIcon           from '@mui/icons-material/People';
import BusinessIcon         from '@mui/icons-material/Business';
import QrCodeIcon           from '@mui/icons-material/QrCode';
import SecurityIcon         from '@mui/icons-material/Security';
import WarningIcon          from '@mui/icons-material/Warning';
import ArticleIcon          from '@mui/icons-material/Article';
import LogoutIcon           from '@mui/icons-material/Logout';
import Brightness4Icon      from '@mui/icons-material/Brightness4';
import Brightness7Icon      from '@mui/icons-material/Brightness7';
import MenuIcon             from '@mui/icons-material/Menu';
import ChevronLeftIcon      from '@mui/icons-material/ChevronLeft';
import AccessTimeIcon       from '@mui/icons-material/AccessTime';
import NotificationsIcon    from '@mui/icons-material/Notifications';
import DoneAllIcon          from '@mui/icons-material/DoneAll';
import AssessmentIcon       from '@mui/icons-material/Assessment';
import InboxIcon            from '@mui/icons-material/Inbox';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import SmartToyIcon         from '@mui/icons-material/SmartToy';
import SpeedIcon            from '@mui/icons-material/Speed';
import { useAuth }       from '../auth/AuthContext.jsx';
import { useColorMode }  from '../theme/ColorMode.jsx';
import { get, patch }    from '../api/client.js';

const FULL = 250;
const MINI = 68;

const NAV = [
  { to: '/',            label: 'Dashboard',          icon: <DashboardIcon /> },
  { section: 'Complaints & Workflow' },
  { to: '/complaints',  label: 'Complaint List',     icon: <ReportProblemIcon /> },
  { to: '/sla-alerts',  label: 'SLA Alerts',         icon: <WarningIcon /> },
  { to: '/my-queue',    label: 'My Queue',            icon: <InboxIcon />, roles: ['NATCA_ANALYST', 'INSPECTOR', 'NATCA_ADMIN', 'SYSTEM_ADMIN'] },
  { section: 'KYC & SIM' },
  { to: '/kyc',         label: 'KYC Management',     icon: <VerifiedUserIcon /> },
  { section: 'Analytics & Quality' },
  { to: '/analytics',   label: 'Analytics',           icon: <BarChartIcon /> },
  { to: '/speed',       label: 'Speed Analytics',     icon: <SpeedIcon /> },
  { to: '/compliance',  label: 'Compliance Report',   icon: <AssessmentIcon /> },
  { to: '/feedback',    label: 'Customer Feedback',   icon: <StarIcon /> },
  { to: '/incidents',   label: 'Network Incidents',   icon: <WarningIcon /> },
  { to: '/assistant',   label: 'AI Assistant',        icon: <SmartToyIcon />, roles: ['SYSTEM_ADMIN', 'NATCA_ADMIN', 'NATCA_ANALYST', 'INSPECTOR'] },
  { section: 'Administration' },
  { to: '/content',     label: 'Content Manager',     icon: <ArticleIcon /> },
  { to: '/operators',   label: 'Operators',           icon: <BusinessIcon />, roles: ['SYSTEM_ADMIN', 'NATCA_ADMIN'] },
  { to: '/users',       label: 'Staff & Users',       icon: <PeopleIcon />, roles: ['SYSTEM_ADMIN', 'NATCA_ADMIN'] },
  { to: '/ussd',        label: 'USSD Codes',          icon: <QrCodeIcon /> },
  { to: '/alert-settings', label: 'Alert Settings',  icon: <NotificationsActiveIcon />, roles: ['SYSTEM_ADMIN', 'NATCA_ADMIN'] },
  { section: 'Security' },
  { to: '/security',    label: 'Security Center',     icon: <SecurityIcon />, roles: ['SYSTEM_ADMIN', 'NATCA_ADMIN'] },
];

function LiveClock({ mode }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);
  const color = mode === 'dark' ? 'grey.300' : 'grey.800';
  return (
    <Stack direction="row" spacing={0.75} alignItems="center">
      <AccessTimeIcon sx={{ fontSize: 16, color }} />
      <Typography variant="caption" sx={{ fontFamily: 'monospace', color, fontWeight: 600, letterSpacing: '0.02em' }}>
        {now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
        {' '}
        {now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
      </Typography>
    </Stack>
  );
}

function NotificationBell({ socket }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const [unread, setUnread]     = useState(0);
  const [notifs, setNotifs]     = useState([]);
  const navigate = useNavigate();

  const loadNotifs = useCallback(async () => {
    try {
      const [cRes, lRes] = await Promise.all([
        get('/notifications/count'),
        get('/notifications?limit=10')
      ]);
      setUnread(cRes.data?.unread || 0);
      setNotifs(lRes.data?.rows || []);
    } catch {
      // Fallback silently if notifications are unavailable
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

  const open = Boolean(anchorEl);
  const handleClick = (e) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const markRead = async (id, data, type) => {
    try {
      await patch(`/notifications/${id}/read`, {});
      setUnread((u) => Math.max(0, u - 1));
      setNotifs((prev) => prev.map((n) => n.notification_id === id ? { ...n, is_read: true } : n));

      if (type === 'SLA_WARNING' || type === 'SLA_BREACH' || type === 'COMPLAINT_ASSIGNED') {
        if (data?.complaint_ref) navigate(`/complaints?search=${data.complaint_ref}`);
        else navigate('/complaints');
      }
      handleClose();
    } catch {
      handleClose();
    }
  };

  const markAllRead = async () => {
    try {
      await patch('/notifications/read-all', {});
      setUnread(0);
      setNotifs((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {
      // Ignore
    }
  };

  return (
    <>
      <Tooltip title="Notifications">
        <IconButton onClick={handleClick} aria-label="Notifications" sx={{ color: 'text.primary' }}>
          <Badge badgeContent={unread} color="error">
            <NotificationsIcon />
          </Badge>
        </IconButton>
      </Tooltip>
      <Popover open={open} anchorEl={anchorEl} onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { width: 340, maxHeight: 420, display: 'flex', flexDirection: 'column', borderRadius: 2 } } }}>
        <Box sx={{ p: 1.75, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="subtitle2" fontWeight={700}>Notifications</Typography>
          {unread > 0 && (
            <Tooltip title="Mark all as read">
              <IconButton size="small" onClick={markAllRead} aria-label="Mark all as read"><DoneAllIcon fontSize="small" /></IconButton>
            </Tooltip>
          )}
        </Box>
        <List sx={{ p: 0, overflowY: 'auto', flex: 1 }}>
          {notifs.length === 0 && (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">No new notifications</Typography>
            </Box>
          )}
          {notifs.map((n) => (
            <ListItemButton key={n.notification_id} onClick={() => markRead(n.notification_id, n.data, n.type)}
              sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: n.is_read ? 'transparent' : 'action.hover', px: 2, py: 1.5 }}>
              <Box sx={{ width: '100%' }}>
                <Typography variant="caption" fontWeight={n.is_read ? 500 : 700} color={n.is_read ? 'text.secondary' : 'primary.main'} gutterBottom display="block">
                  {n.title}
                </Typography>
                <Typography variant="body2" color="text.primary" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {n.body}
                </Typography>
                <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.5 }}>
                  {new Date(n.created_at).toLocaleString()}
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
        <Box component="img" src="/natca_logo.png" alt="NatCA Logo" sx={{ width: 38, height: 38, objectFit: 'contain' }} />
        {expanded && (
          <Box sx={{ flex: 1, overflow: 'hidden' }}>
            <Typography variant="subtitle1" fontWeight={800} sx={{ lineHeight: 1.1, color: 'primary.main', fontSize: '0.94rem' }}>
              NatCA QoE
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem', display: 'block', lineHeight: 1.2 }}>
              {user?.role?.replace(/_/g, ' ')}
            </Typography>
          </Box>
        )}
        {!isMobile && (
          <IconButton size="small" onClick={() => setOpen(!open)} aria-label="Toggle menu section" sx={{ ml: expanded ? 0 : -0.5 }}>
            {expanded ? <ChevronLeftIcon fontSize="small" /> : <MenuIcon fontSize="small" />}
          </IconButton>
        )}
      </Toolbar>
      <Divider />

      <List sx={{ flex: 1, py: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        {NAV.map((item, i) => {
          if (item.section) {
            return expanded ? (
              <Typography key={`sec-${i}`} variant="overline"
                sx={{ display: 'block', px: 2.5, pt: 2, pb: 0.5, color: 'text.disabled', fontSize: '0.65rem' }}>
                {item.section}
              </Typography>
            ) : (
              <Divider key={`sec-${i}`} sx={{ my: 1, mx: 1.5 }} />
            );
          }
          if (item.roles && !item.roles.includes(user?.role)) return null;
          const active = item.to === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(item.to);
          return (
            <Tooltip key={item.to} title={expanded ? '' : item.label} placement="right" arrow>
              <ListItemButton
                selected={active}
                onClick={() => { navigate(item.to); if (isMobile) setMobileOpen(false); }}
                sx={{
                  mx: expanded ? 1 : 0.5, borderRadius: 1.5, mb: 0.5,
                  px: expanded ? 2 : 1.5, justifyContent: expanded ? 'initial' : 'center',
                  '&.Mui-selected': {
                    bgcolor: (t) => t.palette.mode === 'dark' ? 'rgba(59, 130, 246, 0.16)' : 'rgba(37, 99, 235, 0.10)',
                    color: 'primary.main',
                    '& .MuiListItemIcon-root': { color: 'primary.main' },
                    '&:hover': {
                      bgcolor: (t) => t.palette.mode === 'dark' ? 'rgba(59, 130, 246, 0.22)' : 'rgba(37, 99, 235, 0.16)',
                    },
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: expanded ? 38 : 'auto', color: active ? 'primary.main' : 'text.secondary', justifyContent: 'center' }}>
                  {item.icon}
                </ListItemIcon>
                {expanded && (
                  <ListItemText primary={item.label} sx={{ '& .MuiListItemText-primary': { fontSize: 13.5, fontWeight: active ? 700 : 500 } }} />
                )}
              </ListItemButton>
            </Tooltip>
          );
        })}
      </List>

      <Divider />
      <Box sx={{ p: expanded ? 1.5 : 1, display: 'flex', alignItems: 'center', justifyContent: expanded ? 'space-between' : 'center' }}>
        {expanded && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, px: 1 }}>
            <Avatar sx={{ bgcolor: 'primary.main', width: 28, height: 28, fontSize: 12, borderRadius: 1 }}>
              {(user?.fullName || user?.email || '?')[0].toUpperCase()}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" fontWeight={600} noWrap sx={{ fontSize: '0.8rem' }}>
                {user?.fullName || user?.email}
              </Typography>
            </Box>
          </Box>
        )}
        <Tooltip title="Log out">
          <IconButton onClick={() => { logout(); navigate('/login'); }} aria-label="Log out" size="small" color="error">
            <LogoutIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );

  const current = NAV.find((n) => n.to && (n.to === '/' ? location.pathname === '/' : location.pathname.startsWith(n.to)));

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar position="fixed" elevation={0}
        sx={{
          width: { xs: '100%', md: `calc(100% - ${width}px)` },
          ml:    { xs: 0,      md: `${width}px` },
          bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider',
          transition: 'width 225ms, margin 225ms',
        }}>
        <Toolbar sx={{ minHeight: '64px !important', px: { xs: 2, md: 3 } }}>
          {isMobile && (
            <IconButton onClick={() => setMobileOpen(true)} aria-label="Open mobile menu" sx={{ mr: 1, color: 'text.primary' }}>
              <MenuIcon />
            </IconButton>
          )}
          <Stack direction="row" spacing={1.5} alignItems="center">
            {isMobile && <Box component="img" src="/natca_logo.png" alt="NatCA Logo" sx={{ width: 28, height: 28, objectFit: 'contain' }} />}
            <Typography variant="h6" color="text.primary" noWrap fontWeight={700} sx={{ fontSize: { xs: '1.0rem', md: '1.15rem' } }}>
              {current?.label || 'NatCA QoE Management'}
            </Typography>
          </Stack>

          <Box sx={{ flex: 1 }} />

          <Stack direction="row" spacing={2} alignItems="center" mr={1.5}>
            {!isMobile && <LiveClock mode={mode} />}
            {!isMobile && <Divider orientation="vertical" flexItem sx={{ height: 20, my: 'auto' }} />}
            <NotificationBell socket={socket} />
          </Stack>

          <Tooltip title={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
            <IconButton onClick={toggle} aria-label="Toggle dark mode" sx={{ color: 'text.primary' }}>
              {mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
            </IconButton>
          </Tooltip>
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
            '& .MuiDrawer-paper': {
              width: drawerWidth, bgcolor: 'background.paper',
              borderRight: 1, borderColor: 'divider',
              overflowX: 'hidden', transition: 'width 225ms',
            },
          }}>
          {renderDrawer(open)}
        </Drawer>
      )}

      <Box component="main" sx={{
        flexGrow: 1, px: { xs: 1, md: 1.5 }, py: { xs: 1.5, md: 2 }, mt: 8,
        minHeight: '100vh', transition: 'margin 225ms',
        bgcolor: 'background.default', overflow: 'hidden',
      }}>
        <Outlet />
      </Box>
    </Box>
  );
}
