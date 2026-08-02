import { useState, useEffect, useCallback } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, Divider, FormControlLabel, IconButton,
  InputAdornment, MenuItem, Paper, Select, Stack, Switch, Tab, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs,
  TextField, Tooltip, Typography, alpha, useTheme,
} from '@mui/material';
import SecurityIcon          from '@mui/icons-material/Security';
import DevicesIcon           from '@mui/icons-material/Devices';
import HistoryIcon           from '@mui/icons-material/History';
import LoginIcon             from '@mui/icons-material/Login';
import SettingsIcon          from '@mui/icons-material/Settings';
import GridViewIcon          from '@mui/icons-material/GridView';
import DeleteOutlineIcon     from '@mui/icons-material/DeleteOutlined';
import RefreshIcon           from '@mui/icons-material/Refresh';
import SearchIcon            from '@mui/icons-material/Search';
import SaveIcon              from '@mui/icons-material/Save';
import CheckCircleIcon       from '@mui/icons-material/CheckCircle';
import CancelIcon            from '@mui/icons-material/Cancel';
import LockIcon              from '@mui/icons-material/Lock';
import VpnKeyIcon            from '@mui/icons-material/VpnKey';
import FolderLockIcon        from '@mui/icons-material/FolderShared';
import BuildIcon             from '@mui/icons-material/Build';
import PowerSettingsNewIcon  from '@mui/icons-material/PowerSettingsNew';
import { get, del, put, patch } from '../api/client.js';

/* ── helpers ──────────────────────────────────────────────────────────── */
function fmtDate(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function timeSince(ts) {
  if (!ts) return '—';
  const s = Math.floor((Date.now() - new Date(ts)) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
function parseDevice(ua) {
  if (!ua) return 'Unknown device';
  if (ua.includes('Postman')) return 'Postman';
  if (ua.includes('Mobile')) return 'Mobile browser';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Safari')) return 'Safari';
  return ua.slice(0, 40);
}

const ROLE_COLOR = {
  SYSTEM_ADMIN:   '#ef4444',
  NATCA_ADMIN:    '#2563eb',
  NATCA_ANALYST:  '#0ea5e9',
  INSPECTOR:      '#a855f7',
  OPERATOR_ADMIN: '#f59e0b',
  CITIZEN:        '#10b981',
};

/* ── permission matrix ─────────────────────────────────────────────────── */
const ROLES_ORDER = ['SYSTEM_ADMIN', 'NATCA_ADMIN', 'NATCA_ANALYST', 'INSPECTOR', 'OPERATOR_ADMIN', 'CITIZEN'];
const PERMISSIONS = [
  { group: 'Complaints',   label: 'View all complaints',        roles: ['SYSTEM_ADMIN','NATCA_ADMIN','NATCA_ANALYST','INSPECTOR','OPERATOR_ADMIN'] },
  { group: 'Complaints',   label: 'Manage / update complaints', roles: ['SYSTEM_ADMIN','NATCA_ADMIN','NATCA_ANALYST','INSPECTOR','OPERATOR_ADMIN'] },
  { group: 'Complaints',   label: 'Assign & note complaints',   roles: ['SYSTEM_ADMIN','NATCA_ADMIN','NATCA_ANALYST'] },
  { group: 'Complaints',   label: 'Export complaint reports',   roles: ['SYSTEM_ADMIN','NATCA_ADMIN','NATCA_ANALYST'] },
  { group: 'KYC',          label: 'View KYC submissions',       roles: ['SYSTEM_ADMIN','NATCA_ADMIN','NATCA_ANALYST','OPERATOR_ADMIN'] },
  { group: 'KYC',          label: 'Approve / reject KYC',       roles: ['SYSTEM_ADMIN','NATCA_ADMIN','NATCA_ANALYST'] },
  { group: 'Analytics',    label: 'View analytics dashboard',   roles: ['SYSTEM_ADMIN','NATCA_ADMIN','NATCA_ANALYST','OPERATOR_ADMIN'] },
  { group: 'Analytics',    label: 'Speed test analytics',       roles: ['SYSTEM_ADMIN','NATCA_ADMIN','NATCA_ANALYST','OPERATOR_ADMIN'] },
  { group: 'Analytics',    label: 'Operator benchmark report',  roles: ['SYSTEM_ADMIN','NATCA_ADMIN'] },
  { group: 'Network',      label: 'View network incidents',     roles: ['SYSTEM_ADMIN','NATCA_ADMIN','NATCA_ANALYST','INSPECTOR'] },
  { group: 'Network',      label: 'Create / manage incidents',  roles: ['SYSTEM_ADMIN','NATCA_ADMIN'] },
  { group: 'Content',      label: 'Manage news & FAQs',         roles: ['SYSTEM_ADMIN','NATCA_ADMIN'] },
  { group: 'Content',      label: 'Manage USSD codes',          roles: ['SYSTEM_ADMIN','NATCA_ADMIN'] },
  { group: 'Content',      label: 'Manage tariff rates',        roles: ['SYSTEM_ADMIN','NATCA_ADMIN'] },
  { group: 'Admin',        label: 'Manage operators',           roles: ['SYSTEM_ADMIN','NATCA_ADMIN'] },
  { group: 'Admin',        label: 'Manage staff users',         roles: ['SYSTEM_ADMIN','NATCA_ADMIN'] },
  { group: 'Security',     label: 'View audit logs',            roles: ['SYSTEM_ADMIN','NATCA_ADMIN'] },
  { group: 'Security',     label: 'Manage sessions',            roles: ['SYSTEM_ADMIN'] },
  { group: 'Security',     label: 'System settings',            roles: ['SYSTEM_ADMIN'] },
  { group: 'Security',     label: 'Force password reset',       roles: ['SYSTEM_ADMIN'] },
  { group: 'Security',     label: 'Suspend accounts',           roles: ['SYSTEM_ADMIN','NATCA_ADMIN'] },
  { group: 'Citizen',      label: 'Submit complaints',          roles: ['CITIZEN'] },
  { group: 'Citizen',      label: 'Track own complaints',       roles: ['CITIZEN'] },
];

/* ── default settings fallback ─────────────────────────────────────────── */
const DEFAULT_SETTINGS = {
  password_min_length:        8,
  password_require_uppercase: true,
  password_require_number:    true,
  password_require_symbol:    true,
  password_expiry_days:       90,
  max_login_attempts:         5,
  lockout_duration_minutes:   30,
  session_timeout_hours:      8,
  file_access_require_auth:   true,
  file_access_allowed_roles:  ['SYSTEM_ADMIN','NATCA_ADMIN','NATCA_ANALYST','INSPECTOR','OPERATOR_ADMIN'],
  maintenance_mode:           false,
  sla_warning_threshold_hours:48,
  sla_breach_threshold_hours: 72,
};

/* ══════════════════════════════════════════════════════════════════════
   TAB 0 — Active Sessions
═══════════════════════════════════════════════════════════════════════ */
function SessionsTab() {
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(false);
  const [revoking, setRevoking] = useState(null);
  const [err, setErr]         = useState('');
  const theme = useTheme();

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try { setRows((await get('/admin/sessions')).data || []); }
    catch { setErr('Failed to load sessions'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const revoke = async (id) => {
    setRevoking(id);
    try { await del(`/admin/sessions/${id}`); setRows(r => r.filter(s => s.session_id !== id)); }
    catch { setErr('Revoke failed'); }
    finally { setRevoking(null); }
  };

  const revokeAll = async () => {
    setLoading(true);
    try { await del('/admin/sessions?exceptCurrentUser=1'); await load(); }
    catch { setErr('Failed to revoke all'); }
    finally { setLoading(false); }
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" fontWeight={700}>Active Sessions <Chip label={rows.length} size="small" color="primary" sx={{ ml: 1, fontWeight: 800 }} /></Typography>
        <Stack direction="row" spacing={1}>
          <Button size="small" startIcon={<RefreshIcon />} onClick={load} sx={{ textTransform: 'none' }}>Refresh</Button>
          <Button size="small" color="error" variant="outlined" startIcon={<DeleteOutlineIcon />} onClick={revokeAll} disabled={rows.length === 0} sx={{ textTransform: 'none' }}>
            Revoke All Others
          </Button>
        </Stack>
      </Stack>
      {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}
      {loading ? <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}><CircularProgress /></Box> : (
        <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, overflow: 'hidden' }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: alpha(theme.palette.primary.main, 0.04) }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>USER</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>ROLE</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>IP ADDRESS</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>DEVICE</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>LOGGED IN</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>EXPIRES</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>ACTION</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.length === 0 && (
                <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4 }}><Typography color="text.secondary">No active sessions</Typography></TableCell></TableRow>
              )}
              {rows.map(s => (
                <TableRow key={s.session_id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={700}>{s.full_name}</Typography>
                    <Typography variant="caption" color="text.secondary">{s.email}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip size="small" label={s.role_key} sx={{ fontWeight: 700, fontSize: 10, borderRadius: 1, bgcolor: alpha(ROLE_COLOR[s.role_key] || '#888', 0.12), color: ROLE_COLOR[s.role_key] || '#888' }} />
                  </TableCell>
                  <TableCell><Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{s.ip_address || '—'}</Typography></TableCell>
                  <TableCell><Typography variant="body2" noWrap sx={{ maxWidth: 160 }}>{parseDevice(s.user_agent)}</Typography></TableCell>
                  <TableCell><Typography variant="caption">{timeSince(s.created_at)}</Typography></TableCell>
                  <TableCell><Typography variant="caption" color="text.secondary">{fmtDate(s.expires_at)}</Typography></TableCell>
                  <TableCell align="center">
                    <Tooltip title="Revoke session">
                      <IconButton size="small" color="error" onClick={() => revoke(s.session_id)} disabled={revoking === s.session_id}>
                        {revoking === s.session_id ? <CircularProgress size={16} /> : <DeleteOutlineIcon fontSize="small" />}
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   TAB 1 — Audit Log
═══════════════════════════════════════════════════════════════════════ */
function AuditLogTab() {
  const [rows, setRows]       = useState([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(false);
  const [action, setAction]   = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo]   = useState('');
  const [page, setPage]       = useState(0);
  const PAGE = 50;
  const theme = useTheme();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: PAGE, offset: page * PAGE });
      if (action)   params.set('action', action);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo)   params.set('dateTo', dateTo);
      const r = (await get(`/admin/audit-logs?${params}`)).data;
      setRows(r.rows || []);
      setTotal(r.total || 0);
    } catch { setRows([]); }
    finally { setLoading(false); }
  }, [action, dateFrom, dateTo, page]);

  useEffect(() => { load(); }, [load]);

  const ACTION_COLORS = {
    ACCOUNT_SUSPENDED:      '#ef4444',
    ACCOUNT_REACTIVATED:    '#10b981',
    FORCE_PASSWORD_RESET:   '#f59e0b',
    SYSTEM_SETTINGS_UPDATED:'#8b5cf6',
    LOGIN:                  '#2563eb',
    LOGOUT:                 '#64748b',
  };

  return (
    <Box>
      <Stack direction="row" spacing={1.5} mb={2} flexWrap="wrap" useFlexGap>
        <TextField size="small" placeholder="Filter by action…" value={action} onChange={e => { setAction(e.target.value); setPage(0); }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
          sx={{ width: 220, '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }} />
        <TextField size="small" type="date" label="From" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(0); }}
          InputLabelProps={{ shrink: true }} sx={{ width: 160, '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }} />
        <TextField size="small" type="date" label="To" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(0); }}
          InputLabelProps={{ shrink: true }} sx={{ width: 160, '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }} />
        <Button size="small" startIcon={<RefreshIcon />} onClick={load} sx={{ textTransform: 'none', ml: 'auto' }}>Refresh</Button>
      </Stack>

      <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>{total} events total</Typography>

      {loading ? <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}><CircularProgress /></Box> : (
        <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, overflow: 'hidden' }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: alpha(theme.palette.primary.main, 0.04) }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>ACTION</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>PERFORMED BY</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>ENTITY</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>IP ADDRESS</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>TIMESTAMP</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>DETAILS</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.length === 0 && (
                <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4 }}><Typography color="text.secondary">No audit events found</Typography></TableCell></TableRow>
              )}
              {rows.map(r => (
                <TableRow key={r.log_id} hover>
                  <TableCell>
                    <Chip size="small" label={r.action}
                      sx={{ fontWeight: 700, fontSize: 10, borderRadius: 1,
                        bgcolor: alpha(ACTION_COLORS[r.action] || '#64748b', 0.12),
                        color: ACTION_COLORS[r.action] || '#64748b', maxWidth: 200 }} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>{r.full_name || 'System'}</Typography>
                    <Typography variant="caption" color="text.secondary">{r.email}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{r.entity_type}</Typography>
                    {r.entity_id && <Typography variant="caption" color="text.secondary">#{r.entity_id}</Typography>}
                  </TableCell>
                  <TableCell><Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{r.ip_address || '—'}</Typography></TableCell>
                  <TableCell><Typography variant="caption">{fmtDate(r.created_at)}</Typography></TableCell>
                  <TableCell sx={{ maxWidth: 200 }}>
                    {r.changes && <Typography variant="caption" sx={{ fontFamily: 'monospace', fontSize: '0.72rem', wordBreak: 'break-all' }}>
                      {JSON.stringify(r.changes).slice(0, 80)}
                    </Typography>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {total > PAGE && (
        <Stack direction="row" spacing={1} justifyContent="center" mt={2}>
          <Button size="small" disabled={page === 0} onClick={() => setPage(p => p - 1)} sx={{ textTransform: 'none' }}>← Prev</Button>
          <Typography variant="body2" sx={{ py: 0.5 }}>Page {page + 1} of {Math.ceil(total / PAGE)}</Typography>
          <Button size="small" disabled={(page + 1) * PAGE >= total} onClick={() => setPage(p => p + 1)} sx={{ textTransform: 'none' }}>Next →</Button>
        </Stack>
      )}
    </Box>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   TAB 2 — Login History
═══════════════════════════════════════════════════════════════════════ */
function LoginHistoryTab() {
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch]   = useState('');
  const [page, setPage]       = useState(0);
  const PAGE = 50;
  const theme = useTheme();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: PAGE, offset: page * PAGE });
      if (search) params.set('search', search);
      setRows((await get(`/admin/login-history?${params}`)).data || []);
    } catch { setRows([]); }
    finally { setLoading(false); }
  }, [search, page]);

  useEffect(() => { load(); }, [load]);

  const sessionStatus = (s) => {
    if (s.revoked_at) return { label: 'Revoked',  color: '#ef4444' };
    if (new Date(s.expires_at) < new Date()) return { label: 'Expired', color: '#94a3b8' };
    return { label: 'Active', color: '#10b981' };
  };

  return (
    <Box>
      <Stack direction="row" spacing={1.5} mb={2}>
        <TextField size="small" placeholder="Search by user, email, or IP…" value={search}
          onChange={e => { setSearch(e.target.value); setPage(0); }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
          sx={{ flex: 1, maxWidth: 320, '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }} />
        <Button size="small" startIcon={<RefreshIcon />} onClick={load} sx={{ textTransform: 'none' }}>Refresh</Button>
      </Stack>

      {loading ? <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}><CircularProgress /></Box> : (
        <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, overflow: 'hidden' }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: alpha(theme.palette.primary.main, 0.04) }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>USER</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>ROLE</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>IP ADDRESS</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>DEVICE / BROWSER</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>LOGIN TIME</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>EXPIRES</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>STATUS</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.length === 0 && (
                <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4 }}><Typography color="text.secondary">No login records found</Typography></TableCell></TableRow>
              )}
              {rows.map(s => {
                const st = sessionStatus(s);
                return (
                  <TableRow key={s.session_id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={700}>{s.full_name}</Typography>
                      <Typography variant="caption" color="text.secondary">{s.email}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={s.role_key} sx={{ fontWeight: 700, fontSize: 10, borderRadius: 1, bgcolor: alpha(ROLE_COLOR[s.role_key] || '#888', 0.12), color: ROLE_COLOR[s.role_key] || '#888' }} />
                    </TableCell>
                    <TableCell><Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>{s.ip_address || '—'}</Typography></TableCell>
                    <TableCell><Typography variant="body2" noWrap sx={{ maxWidth: 180 }}>{parseDevice(s.user_agent)}</Typography></TableCell>
                    <TableCell><Typography variant="caption">{fmtDate(s.created_at)}</Typography></TableCell>
                    <TableCell><Typography variant="caption" color="text.secondary">{fmtDate(s.expires_at)}</Typography></TableCell>
                    <TableCell>
                      <Chip size="small" label={st.label}
                        sx={{ fontWeight: 700, fontSize: 10, borderRadius: 1, bgcolor: alpha(st.color, 0.12), color: st.color }} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Stack direction="row" spacing={1} justifyContent="center" mt={2}>
        <Button size="small" disabled={page === 0} onClick={() => setPage(p => p - 1)} sx={{ textTransform: 'none' }}>← Prev</Button>
        <Typography variant="body2" sx={{ py: 0.5 }}>Page {page + 1}</Typography>
        <Button size="small" disabled={rows.length < PAGE} onClick={() => setPage(p => p + 1)} sx={{ textTransform: 'none' }}>Next →</Button>
      </Stack>
    </Box>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   TAB 3 — Roles & Permissions Matrix
═══════════════════════════════════════════════════════════════════════ */
function PermissionsTab() {
  const theme = useTheme();
  const groups = [...new Set(PERMISSIONS.map(p => p.group))];

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Read-only reference of which roles have access to each system feature.
      </Typography>
      <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, overflow: 'auto' }}>
        <Table size="small" sx={{ minWidth: 720 }}>
          <TableHead sx={{ bgcolor: alpha(theme.palette.primary.main, 0.04) }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, minWidth: 220 }}>PERMISSION</TableCell>
              {ROLES_ORDER.map(role => (
                <TableCell key={role} align="center" sx={{ fontWeight: 700, minWidth: 80 }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: ROLE_COLOR[role] }} />
                    <Typography sx={{ fontSize: '0.65rem', fontWeight: 800, color: ROLE_COLOR[role], letterSpacing: '0.02em' }}>
                      {role.replace(/_/g, '​_')}
                    </Typography>
                  </Box>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {groups.map(group => [
              <TableRow key={`g-${group}`}>
                <TableCell colSpan={ROLES_ORDER.length + 1}
                  sx={{ bgcolor: alpha(theme.palette.primary.main, 0.03), py: 0.5, pl: 2 }}>
                  <Typography variant="overline" sx={{ fontWeight: 800, fontSize: '0.65rem', color: 'text.secondary', letterSpacing: '0.08em' }}>
                    {group}
                  </Typography>
                </TableCell>
              </TableRow>,
              ...PERMISSIONS.filter(p => p.group === group).map((p, i) => (
                <TableRow key={`${group}-${i}`} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                  <TableCell sx={{ pl: 3 }}>
                    <Typography variant="body2">{p.label}</Typography>
                  </TableCell>
                  {ROLES_ORDER.map(role => (
                    <TableCell key={role} align="center">
                      {p.roles.includes(role)
                        ? <CheckCircleIcon sx={{ fontSize: 18, color: ROLE_COLOR[role] }} />
                        : <CancelIcon     sx={{ fontSize: 16, color: alpha('#94a3b8', 0.4) }} />}
                    </TableCell>
                  ))}
                </TableRow>
              )),
            ])}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   TAB 4 — System Settings
═══════════════════════════════════════════════════════════════════════ */
function SettingsTab() {
  const [vals, setVals]   = useState({ ...DEFAULT_SETTINGS });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState('');
  const [err, setErr]         = useState('');

  useEffect(() => {
    setLoading(true);
    get('/admin/system-settings')
      .then(r => {
        const m = {};
        (r.data || []).forEach(({ key, value }) => { m[key] = value; });
        setVals(v => ({ ...v, ...m }));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const set = (key) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : (e.target.type === 'number' ? Number(e.target.value) : e.target.value);
    setVals(v => ({ ...v, [key]: val }));
  };

  const saveGroup = async (keys) => {
    setSaving(true); setSaved(''); setErr('');
    try {
      await put('/admin/system-settings', { settings: keys.map(k => ({ key: k, value: vals[k] })) });
      setSaved(keys.join(', ') + ' saved');
      setTimeout(() => setSaved(''), 3000);
    } catch (ex) {
      setErr(ex.response?.data?.error || 'Save failed');
    } finally { setSaving(false); }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}><CircularProgress /></Box>;

  const SettingGroup = ({ icon, title, children, keys }) => (
    <Paper elevation={0} sx={{ p: 3, mb: 2.5, border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}>
      <Stack direction="row" spacing={1.5} alignItems="center" mb={2.5}>
        <Box sx={{ width: 36, height: 36, borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: alpha('#2563eb', 0.1) }}>
          {icon}
        </Box>
        <Typography variant="subtitle1" fontWeight={700}>{title}</Typography>
      </Stack>
      {children}
      <Box sx={{ mt: 2.5, pt: 2, borderTop: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'flex-end' }}>
        <Button size="small" variant="contained" startIcon={<SaveIcon />} onClick={() => saveGroup(keys)} disabled={saving}
          sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 1.5 }}>
          {saving ? 'Saving…' : 'Save Changes'}
        </Button>
      </Box>
    </Paper>
  );

  const NumField = ({ label, k, min, max }) => (
    <Stack direction="row" justifyContent="space-between" alignItems="center" py={0.75}>
      <Typography variant="body2">{label}</Typography>
      <TextField size="small" type="number" value={vals[k]} onChange={set(k)}
        inputProps={{ min, max }} sx={{ width: 100, '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }} />
    </Stack>
  );

  const Toggle = ({ label, sub, k }) => (
    <Stack direction="row" justifyContent="space-between" alignItems="center" py={0.5}>
      <Box>
        <Typography variant="body2">{label}</Typography>
        {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
      </Box>
      <Switch size="small" checked={Boolean(vals[k])} onChange={e => setVals(v => ({ ...v, [k]: e.target.checked }))} />
    </Stack>
  );

  return (
    <Box>
      {saved && <Alert severity="success" sx={{ mb: 2, borderRadius: 1.5 }}>✓ {saved}</Alert>}
      {err   && <Alert severity="error"   sx={{ mb: 2, borderRadius: 1.5 }}>{err}</Alert>}

      <SettingGroup icon={<LockIcon sx={{ color: '#2563eb', fontSize: 20 }} />} title="Password Policy"
        keys={['password_min_length','password_require_uppercase','password_require_number','password_require_symbol','password_expiry_days']}>
        <Divider sx={{ mb: 1 }} />
        <NumField label="Minimum password length"       k="password_min_length"  min={6}  max={32} />
        <Toggle   label="Require uppercase letter"      k="password_require_uppercase" />
        <Toggle   label="Require numeric digit"         k="password_require_number" />
        <Toggle   label="Require special character"     k="password_require_symbol" />
        <NumField label="Password expiry (days, 0=never)" k="password_expiry_days" min={0} max={365} />
      </SettingGroup>

      <SettingGroup icon={<VpnKeyIcon sx={{ color: '#2563eb', fontSize: 20 }} />} title="Session & Login Security"
        keys={['session_timeout_hours','max_login_attempts','lockout_duration_minutes']}>
        <Divider sx={{ mb: 1 }} />
        <NumField label="Idle session timeout (hours)"     k="session_timeout_hours"      min={1}  max={72} />
        <NumField label="Max failed login attempts"        k="max_login_attempts"         min={3}  max={20} />
        <NumField label="Account lockout duration (min)"  k="lockout_duration_minutes"   min={5}  max={1440} />
      </SettingGroup>

      <SettingGroup icon={<FolderLockIcon sx={{ color: '#2563eb', fontSize: 20 }} />} title="File Access Control"
        keys={['file_access_require_auth','file_access_allowed_roles']}>
        <Divider sx={{ mb: 1 }} />
        <Toggle label="Require authentication to view uploaded files"
          sub="When on, unauthenticated requests to /uploads/* are blocked"
          k="file_access_require_auth" />
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" py={0.75}>
          <Box>
            <Typography variant="body2">Roles allowed to access attachments</Typography>
            <Typography variant="caption" color="text.secondary">Comma-separated role keys</Typography>
          </Box>
          <TextField size="small" value={Array.isArray(vals.file_access_allowed_roles) ? vals.file_access_allowed_roles.join(',') : vals.file_access_allowed_roles}
            onChange={e => setVals(v => ({ ...v, file_access_allowed_roles: e.target.value.split(',').map(s => s.trim()) }))}
            sx={{ width: 320, '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }} />
        </Stack>
      </SettingGroup>

      <SettingGroup icon={<BuildIcon sx={{ color: '#2563eb', fontSize: 20 }} />} title="SLA Thresholds"
        keys={['sla_warning_threshold_hours','sla_breach_threshold_hours']}>
        <Divider sx={{ mb: 1 }} />
        <NumField label="SLA warning trigger (hours before deadline)" k="sla_warning_threshold_hours" min={1} max={168} />
        <NumField label="SLA breach threshold (hours)"                k="sla_breach_threshold_hours"  min={1} max={720} />
      </SettingGroup>

      <SettingGroup icon={<PowerSettingsNewIcon sx={{ color: '#ef4444', fontSize: 20 }} />} title="System State"
        keys={['maintenance_mode']}>
        <Divider sx={{ mb: 1 }} />
        <Toggle label="Maintenance mode"
          sub="Puts the portal in read-only mode. Citizens cannot submit new complaints."
          k="maintenance_mode" />
        {vals.maintenance_mode && (
          <Alert severity="warning" sx={{ mt: 1, borderRadius: 1.5 }}>
            Maintenance mode is ON. Citizen complaint submission is currently disabled.
          </Alert>
        )}
      </SettingGroup>
    </Box>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   MAIN — SecurityCenter
═══════════════════════════════════════════════════════════════════════ */
export default function SecurityCenter() {
  const [tab, setTab] = useState(0);

  const TABS = [
    { label: 'Active Sessions',      icon: <DevicesIcon fontSize="small" /> },
    { label: 'Audit Log',            icon: <HistoryIcon fontSize="small" /> },
    { label: 'Login History',        icon: <LoginIcon fontSize="small" /> },
    { label: 'Roles & Permissions',  icon: <GridViewIcon fontSize="small" /> },
    { label: 'System Settings',      icon: <SettingsIcon fontSize="small" /> },
  ];

  return (
    <Box sx={{ width: '100%', pb: 4 }}>
      {/* Header */}
      <Stack direction="row" spacing={1.5} alignItems="center" mb={3}>
        <Box sx={{ width: 42, height: 42, borderRadius: 1.5, bgcolor: alpha('#ef4444', 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <SecurityIcon sx={{ color: '#ef4444', fontSize: 22 }} />
        </Box>
        <Box>
          <Typography variant="h5" fontWeight={700} sx={{ letterSpacing: '-0.02em' }}>
            Administration & Security
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Sessions, audit trail, access control, roles, and system configuration
          </Typography>
        </Box>
      </Stack>

      {/* Tabs */}
      <Paper elevation={0} sx={{ mb: 3, borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto" sx={{ px: 2, pt: 1 }}>
          {TABS.map((t, i) => (
            <Tab key={i} icon={t.icon} iconPosition="start" label={t.label} sx={{ fontWeight: 700, textTransform: 'none', minHeight: 48 }} />
          ))}
        </Tabs>
      </Paper>

      {/* Tab panels */}
      {tab === 0 && <SessionsTab />}
      {tab === 1 && <AuditLogTab />}
      {tab === 2 && <LoginHistoryTab />}
      {tab === 3 && <PermissionsTab />}
      {tab === 4 && <SettingsTab />}
    </Box>
  );
}
