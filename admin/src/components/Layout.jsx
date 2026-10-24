import { useState, useEffect, useCallback, useRef } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  FileText,
  Gauge,
  Headphones,
  House,
  Key,
  LogOut,
  Menu,
  RadioTower,
  Search,
  ShieldCheck,
  Star,
  Ticket,
  User,
  Wifi,
  X,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext.jsx';
import { get, patch } from '../api/client.js';

const navigation = [
  {
    title: 'COMPLAINTS & WORKFLOW',
    items: [
      { label: 'Complaint List', icon: Ticket, to: '/complaints' },
      { label: 'SLA Alerts', icon: AlertTriangle, to: '/sla-alerts' },
      { label: 'My Queue', icon: FileText, to: '/my-queue', roles: ['NATCA_ANALYST', 'INSPECTOR', 'NATCA_ADMIN', 'SYSTEM_ADMIN'] },
    ],
  },
  {
    title: 'KYC & SIM',
    items: [
      { label: 'KYC Management', icon: ShieldCheck, to: '/kyc' },
    ],
  },
  {
    title: 'ANALYTICS & QUALITY',
    items: [
      { label: 'Analytics', icon: BarChart3, to: '/analytics' },
      { label: 'Speed Analytics', icon: Gauge, to: '/speed' },
      { label: 'Drive Tests & RF', icon: RadioTower, to: '/drivetest' },
      { label: 'Compliance Report', icon: FileText, to: '/compliance' },
      { label: 'Customer Feedback', icon: Star, to: '/feedback' },
      { label: 'Network Incidents', icon: AlertTriangle, to: '/incidents' },
      { label: 'AI Assistant', icon: Activity, to: '/assistant', roles: ['SYSTEM_ADMIN', 'NATCA_ADMIN', 'NATCA_ANALYST', 'INSPECTOR'] },
    ],
  },
  {
    title: 'ADMINISTRATION',
    items: [
      { label: 'Content Manager', icon: FileText, to: '/content' },
      { label: 'Operators', icon: RadioTower, to: '/operators', roles: ['SYSTEM_ADMIN', 'NATCA_ADMIN'] },
      { label: 'Staff & Users', icon: Headphones, to: '/users', roles: ['SYSTEM_ADMIN', 'NATCA_ADMIN'] },
      { label: 'USSD Codes', icon: Wifi, to: '/ussd' },
      { label: 'Alert Settings', icon: Bell, to: '/alert-settings', roles: ['SYSTEM_ADMIN', 'NATCA_ADMIN'] },
    ],
  },
  {
    title: 'SECURITY',
    items: [
      { label: 'Security Center', icon: ShieldCheck, to: '/security', roles: ['SYSTEM_ADMIN', 'NATCA_ADMIN'] },
    ],
  },
];

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, socket } = useAuth();

  const [mobileMenu, setMobileMenu] = useState(false);
  const [search, setSearch] = useState('');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifs, setNotifs] = useState([]);
  const [now, setNow] = useState(new Date());

  const notifRef = useRef(null);
  const userMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotificationsOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  const loadNotifs = useCallback(async () => {
    try {
      const [cRes, lRes] = await Promise.all([
        get('/notifications/count'),
        get('/notifications?limit=8'),
      ]);
      setUnreadCount(cRes.data?.unread || 0);
      setNotifs(lRes.data?.rows || []);
    } catch {
      // Keep silent fallback
    }
  }, []);

  useEffect(() => {
    loadNotifs();
  }, [loadNotifs]);

  useEffect(() => {
    if (!socket) return;
    const handleNew = (n) => {
      setUnreadCount((u) => u + 1);
      setNotifs((prev) => [n, ...prev].slice(0, 8));
    };
    socket.on('notification', handleNew);
    return () => socket.off('notification', handleNew);
  }, [socket]);

  const handleSearchSubmit = (e) => {
    if (e.key === 'Enter' && search.trim()) {
      navigate(`/complaints?search=${encodeURIComponent(search.trim())}`);
    }
  };

  const markAllRead = async () => {
    try {
      await patch('/notifications/read-all', {});
      setUnreadCount(0);
      setNotifs((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {
      // Ignore
    }
  };

  const isCurrentActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const userInitial = (user?.fullName || user?.email || 'A')[0].toUpperCase();
  const userRole = user?.role?.replace(/_/g, ' ') || 'SYSTEM ADMIN';

  return (
    <div className="qoe-app">
      {mobileMenu && (
        <button
          className="mobile-overlay"
          onClick={() => setMobileMenu(false)}
          aria-label="Close menu"
        />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${mobileMenu ? 'sidebar-open' : ''}`}>
        <div className="brand">
          <div className="brand-logo">
            <img src="/natca_logo.png" alt="NatCA Logo" className="brand-logo-img" />
          </div>

          <div className="brand-text">
            <strong>NatCA QoE</strong>
            <span>{userRole}</span>
          </div>

          <button
            className="mobile-close"
            onClick={() => setMobileMenu(false)}
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="sidebar-nav">
          <button
            className={`nav-link ${isCurrentActive('/') ? 'active' : ''}`}
            onClick={() => {
              navigate('/');
              setMobileMenu(false);
            }}
          >
            <House size={18} />
            <span>Dashboard</span>
          </button>

          {navigation.map((group) => {
            const visibleItems = group.items.filter(
              (item) => !item.roles || item.roles.includes(user?.role)
            );
            if (visibleItems.length === 0) return null;

            return (
              <div className="nav-group" key={group.title}>
                <div className="nav-heading">{group.title}</div>

                {visibleItems.map(({ label, icon: Icon, to }) => (
                  <button
                    key={label}
                    className={`nav-link ${isCurrentActive(to) ? 'active' : ''}`}
                    onClick={() => {
                      navigate(to);
                      setMobileMenu(false);
                    }}
                  >
                    <Icon size={18} />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            );
          })}
        </nav>

        <div className="sidebar-profile">
          <div className="profile-avatar">{userInitial}</div>

          <div className="profile-info">
            <strong>{user?.email || 'admin@natca.gov.sl'}</strong>
            <span>{user?.fullName || userRole}</span>
          </div>

          <button
            className="logout-button"
            aria-label="Sign out"
            onClick={() => {
              logout();
              navigate('/login');
            }}
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-area">
        <header className="topbar">
          <button
            className="menu-toggle"
            onClick={() => setMobileMenu(true)}
            aria-label="Open navigation"
          >
            <Menu size={21} />
          </button>

          <div className="global-search">
            <Search size={17} />

            <input
              type="search"
              placeholder="Search complaints, KYC, customer reference..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleSearchSubmit}
              aria-label="Search"
            />

            {search && (
              <button onClick={() => setSearch('')} aria-label="Clear search">
                <X size={15} />
              </button>
            )}
          </div>

          <div className="topbar-actions">
            <div className="notification-container" ref={notifRef}>
              <button
                className="icon-button notification-button"
                onClick={() => {
                  setNotificationsOpen((current) => !current);
                  setUserMenuOpen(false);
                }}
                aria-label="Notifications"
              >
                <Bell size={19} />
                {unreadCount > 0 && <span className="notification-count">{unreadCount}</span>}
              </button>

              {notificationsOpen && (
                <div className="notification-panel">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong>Notifications</strong>
                    {unreadCount > 0 && (
                      <button 
                        onClick={markAllRead} 
                        style={{ border: 'none', background: 'none', color: '#2463eb', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  {notifs.length === 0 ? (
                    <p style={{ color: '#8a9bb8', fontSize: 12 }}>No new notifications</p>
                  ) : (
                    notifs.map((n) => (
                      <p key={n.notification_id || Math.random()}>
                        <span className={`status-dot ${n.type === 'SLA_BREACH' ? 'red' : n.type === 'SLA_WARNING' ? 'amber' : 'green'}`} />
                        <span>{n.title || n.body}</span>
                      </p>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="date-display">
              <CalendarDays size={16} />
              <span>{now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
              <strong>{now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</strong>
            </div>

            <div className="user-menu-container" ref={userMenuRef}>
              <button 
                className="user-button" 
                aria-label="User profile menu"
                aria-expanded={userMenuOpen}
                onClick={() => {
                  setUserMenuOpen((prev) => !prev);
                  setNotificationsOpen(false);
                }}
              >
                <span>{userInitial}</span>
                <ChevronDown
                  size={15}
                  style={{
                    transform: userMenuOpen ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.2s ease',
                  }}
                />
              </button>

              {userMenuOpen && (
                <div className="user-dropdown-panel">
                  <div className="user-dropdown-header">
                    <strong className="user-dropdown-name">{user?.fullName || 'System Administrator'}</strong>
                    <span className="user-dropdown-email">{user?.email || 'admin@natca.gov.sl'}</span>
                    <span className="user-dropdown-role">{userRole}</span>
                  </div>

                  <div className="user-dropdown-list">
                    {['SYSTEM_ADMIN', 'NATCA_ADMIN'].includes(user?.role) && (
                      <button
                        className="user-dropdown-item"
                        onClick={() => {
                          setUserMenuOpen(false);
                          navigate('/users');
                        }}
                      >
                        <User size={15} />
                        <span>Staff &amp; Users</span>
                      </button>
                    )}

                    {['SYSTEM_ADMIN', 'NATCA_ADMIN'].includes(user?.role) && (
                      <button
                        className="user-dropdown-item"
                        onClick={() => {
                          setUserMenuOpen(false);
                          navigate('/security');
                        }}
                      >
                        <ShieldCheck size={15} />
                        <span>Security Center</span>
                      </button>
                    )}

                    <button
                      className="user-dropdown-item"
                      onClick={() => {
                        setUserMenuOpen(false);
                        navigate('/change-password');
                      }}
                    >
                      <Key size={15} />
                      <span>Change Password</span>
                    </button>

                    <div className="user-dropdown-divider" />

                    <button
                      className="user-dropdown-item danger"
                      onClick={() => {
                        setUserMenuOpen(false);
                        logout();
                        navigate('/login');
                      }}
                    >
                      <LogOut size={15} />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="dashboard-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
