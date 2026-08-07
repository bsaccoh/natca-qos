import { useState, useEffect, useCallback } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar, Box, Drawer, Toolbar, Typography, List, ListItemButton, ListItemIcon,
  ListItemText, IconButton, Avatar, Chip, Divider, Tooltip, Stack,
  useMediaQuery, useTheme, Badge, Popover,
} from '@mui/material';
import DashboardIcon     from '@mui/icons-material/Dashboard';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import LogoutIcon        from '@mui/icons-material/Logout';
import Brightness4Icon   from '@mui/icons-material/Brightness4';
import Brightness7Icon   from '@mui/icons-material/Brightness7';
import MenuIcon          from '@mui/icons-material/Menu';
import ChevronLeftIcon   from '@mui/icons-material/ChevronLeft';
import NotificationsIcon from '@mui/icons-material/Notifications';
import DoneAllIcon       from '@mui/icons-material/DoneAll';
import { useAuth }       from '../auth/AuthContext.jsx';
import { useColorMode }  from '../theme/ColorMode.jsx';
import { get, patch }    from '../api/client.js';

const FULL = 240;
const MINI = 64;

const NAV = [
  { to: '/',           label: 'Dashboard',  icon: <DashboardIcon /> },
  { to: '/complaints', label: 'Complaints', icon: <ReportProblemIcon /> },
];

function NotificationBell({ socket }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const [unread, setUnread]     = useState(0);
  const [notifs, setNotifs]     = useState([]);
  const navigate = useNavigate();

  const loadNotifs = useCallback(async () => {
    try {
      const [cRes, lRes] = await Promise.all([
        get('/notifications/count'),
        get('/notifications?limit=10'),
      ]);
      setUnread(cRes.data?.unread || 0);
      setNotifs(lRes.data?.rows || []);
    } catch {}
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

  const markRead = async (id, data) => {
    try {
      await patch(`/notifications/${id}/read`, {});
      setUnread((u) => Math.max(0, u - 1));
      setNotifs((prev) => prev.map((n) => n.notification_id === id ? { ...n, is_read: true } : n));
      if (data?.complaint_ref) navigate(`/complaints?search=${data.complaint_ref}`);
      setAnchorEl(null);
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await patch('/notifications/read-all', {});
      setUnread(0);
      setNotifs((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {}
  };

  return (
    <>
      <Tooltip title="Notifications">
        <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} sx={{ color: 'text.primary' }}>
          <Badge badgeContent={unread} color="error"><NotificationsIcon /></Badge>
        </IconButton>
      </Tooltip>
      <Popover open={open} anchorEl={anchorEl} onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { width: 320, maxHeight: 400, display: 'flex', flexDirection: 'column', borderRadius: 1.5 } } }}>
        <Box sx={{ p: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="subtitle2" fontWeight={700}>Notifications</Typography>
          {unread > 0 && (
            <Tooltip title="Mark all as read">
              <IconButton size="small" onClick={markAllRead}><DoneAllIcon fontSize="small" /></IconButton>
            </Tooltip>
          )}
        </Box>
        <List sx={{ p: 0, overflowY: 'auto', flex: 1 }}>
          {notifs.length === 0 && (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">No notifications</Typography>
            </Box>
          )}
          {notifs.map((n) => (
            <ListItemButton key={n.notification_id} onClick={() => markRead(n.notification_id, n.data)}
              sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: n.is_read ? 'transparent' : 'action.hover', px: 2, py: 1.5 }}>
              <Box>
                <Typography variant="caption" fontWeight={n.is_read ? 400 : 700} color={n.is_read ? 'text.secondary' : 'primary.main'} gutterBottom display="block">
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
        <Box component="img" src="/natca_logo.png" alt="NatCA" sx={{ width: 38, height: 38, objectFit: 'contain' }} />
        {expanded && (
          <Box sx={{ flex: 1, overflow: 'hidden' }}>
            <Typography variant="subtitle1" fontWeight={800} sx={{ lineHeight: 1.1, color: 'primary.main', fontSize: '0.92rem' }}>
              Operator Portal
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem', display: 'block', lineHeight: 1 }}>
              {user?.operator_name || 'NatCA'}
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
      <Box sx={{ p: expanded ? 2 : 1, display: 'flex', alignItems: 'center', gap: 1.5, justifyContent: expanded ? 'flex-start' : 'center' }}>
        <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36, borderRadius: 1 }}>
          {(user?.full_name || user?.email || '?').charAt(0).toUpperCase()}
        </Avatar>
        {expanded && (
          <Box sx={{ flex: 1, overflow: 'hidden' }}>
            <Typography variant="body2" noWrap>{user?.full_name || user?.email}</Typography>
            <Chip size="small" label="Operator Admin" sx={{ height: 18, fontSize: 10, borderRadius: 1 }} />
          </Box>
        )}
        <Tooltip title="Log out">
          <IconButton onClick={() => { logout(); navigate('/login'); }} size="small">
            <LogoutIcon fontSize="small" />
          </IconButton>
        </Tooltip>
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
            {current?.label || 'Operator Portal'}
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
