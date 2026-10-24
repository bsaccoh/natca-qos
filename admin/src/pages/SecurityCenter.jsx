import { useState, useEffect, useCallback } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress, Divider, IconButton,
  InputAdornment, Paper, Stack, Switch, Tab, Table,
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
import PhonelinkLockIcon     from '@mui/icons-material/PhonelinkLock';
import { get, del, put, patch } from '../api/client.js';
import { useAuth }           from '../auth/AuthContext.jsx';
import { useToast }          from '../components/ToastContext.jsx';
import PageHeader            from '../components/PageHeader.jsx';
import ConfirmDialog         from '../components/ConfirmDialog.jsx';
import { formatDate, timeSince } from '../utils/formatters.js';
import { ROLE_COLORS }       from '../theme/theme.js';

function parseDevice(ua) {
  if (!ua) return 'Unknown device';
  if (ua.includes('Postman')) return 'Postman';
  if (ua.includes('Mobile')) return 'Mobile browser';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Safari')) return 'Safari';
  return ua.slice(0, 40);
}

const ROLES_ORDER = ['SYSTEM_ADMIN', 'NATCA_ADMIN', 'NATCA_ANALYST', 'INSPECTOR', 'OPERATOR_ADMIN', 'CITIZEN'];
const PERM_META = [
  { key: 'complaints.view',       group: 'Complaints', label: 'View all complaints' },
  { key: 'complaints.manage',     group: 'Complaints', label: 'Manage / update complaints' },
  { key: 'complaints.assign',     group: 'Complaints', label: 'Assign & note complaints' },
  { key: 'complaints.export',     group: 'Complaints', label: 'Export complaint reports' },
  { key: 'kyc.view',              group: 'KYC',        label: 'View KYC submissions' },
  { key: 'kyc.approve',           group: 'KYC',        label: 'Approve / reject KYC' },
  { key: 'analytics.view',        group: 'Analytics',  label: 'View analytics dashboard' },
  { key: 'analytics.speed',       group: 'Analytics',  label: 'Speed test analytics' },
  { key: 'analytics.benchmark',   group: 'Analytics',  label: 'Operator benchmark report' },
  { key: 'network.view',          group: 'Network',    label: 'View network incidents' },
  { key: 'network.manage',        group: 'Network',    label: 'Create / manage incidents' },
  { key: 'content.manage',        group: 'Content',    label: 'Manage news & FAQs' },
  { key: 'content.ussd',          group: 'Content',    label: 'Manage USSD codes' },
  { key: 'content.tariffs',       group: 'Content',    label: 'Manage tariff rates' },
  { key: 'admin.operators',       group: 'Admin',      label: 'Manage operators' },
  { key: 'admin.users',           group: 'Admin',      label: 'Manage staff users' },
  { key: 'security.audit',        group: 'Security',   label: 'View audit logs' },
  { key: 'security.sessions',     group: 'Security',   label: 'Manage sessions' },
  { key: 'security.settings',     group: 'Security',   label: 'System settings' },
  { key: 'security.reset_pw',     group: 'Security',   label: 'Force password reset' },
  { key: 'security.suspend',      group: 'Security',   label: 'Suspend accounts' },
  { key: 'citizen.submit',        group: 'Citizen',    label: 'Submit complaints' },
  { key: 'citizen.track',         group: 'Citizen',    label: 'Track own complaints' },
];

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

/* ── TAB 0 — Active Sessions ── */
function SessionsTab() {
  const { showToast } = useToast();
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(false);
  const [revoking, setRevoking] = useState(null);
  const [err, setErr]         = useState('');
  const [confirmRevokeAll, setConfirmRevokeAll] = useState(false);
  const theme = useTheme();

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      const res = await get('/admin/sessions');
      setRows(res.data || []);
    } catch {
      setErr('Failed to load active sessions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const revoke = async (id) => {
    setRevoking(id);
    try {
      await del(`/admin/sessions/${id}`);
      setRows((r) => r.filter((s) => s.session_id !== id));
      showToast('Session revoked successfully', 'success');
    } catch {
      showToast('Revoke failed', 'error');
    } finally {
      setRevoking(null);
    }
  };

  const revokeAll = async () => {
    setLoading(true);
    try {
      await del('/admin/sessions?exceptCurrentUser=1');
      await load();
      showToast('All other active sessions revoked', 'success');
      setConfirmRevokeAll(false);
    } catch {
      showToast('Failed to revoke sessions', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" fontWeight={700}>
          Active Sessions <Chip label={rows.length} size="small" color="primary" sx={{ ml: 1, fontWeight: 800 }} />
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button size="small" startIcon={<RefreshIcon />} onClick={load} sx={{ textTransform: 'none' }}>Refresh</Button>
          <Button
            size="small"
            color="error"
            variant="outlined"
            startIcon={<DeleteOutlineIcon />}
            onClick={() => setConfirmRevokeAll(true)}
            disabled={rows.length === 0}
            sx={{ textTransform: 'none' }}
          >
            Revoke All Others
          </Button>
        </Stack>
      </Stack>

      {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}><CircularProgress /></Box>
      ) : (
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
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">No active sessions</Typography>
                  </TableCell>
                </TableRow>
              )}
              {rows.map((s) => {
                const roleColor = ROLE_COLORS[s.role_key] || '#888';
                return (
                  <TableRow key={s.session_id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={700}>{s.full_name}</Typography>
                      <Typography variant="caption" color="text.secondary">{s.email}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={s.role_key}
                        sx={{
                          fontWeight: 700,
                          fontSize: 10,
                          borderRadius: 1,
                          bgcolor: alpha(roleColor, 0.12),
                          color: roleColor,
                        }}
                      />
                    </TableCell>
                    <TableCell><Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{s.ip_address || '—'}</Typography></TableCell>
                    <TableCell><Typography variant="body2" noWrap sx={{ maxWidth: 160 }}>{parseDevice(s.user_agent)}</Typography></TableCell>
                    <TableCell><Typography variant="caption">{timeSince(s.created_at)}</Typography></TableCell>
                    <TableCell><Typography variant="caption" color="text.secondary">{formatDate(s.expires_at)}</Typography></TableCell>
                    <TableCell align="center">
                      <Tooltip title="Revoke session">
                        <IconButton size="small" color="error" onClick={() => revoke(s.session_id)} disabled={revoking === s.session_id}>
                          {revoking === s.session_id ? <CircularProgress size={16} /> : <DeleteOutlineIcon fontSize="small" />}
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <ConfirmDialog
        open={confirmRevokeAll}
        title="Revoke All Other Sessions"
        message="Are you sure you want to terminate all active sessions across all devices except your current session? Users will need to log in again."
        confirmLabel="Revoke All"
        color="error"
        onConfirm={revokeAll}
        onClose={() => setConfirmRevokeAll(false)}
      />
    </Box>
  );
}

/* ── TAB 1 — Audit Log ── */
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
      const res = await get(`/admin/audit-logs?${params.toString()}`);
      setRows(res.data?.rows || []);
      setTotal(res.data?.total || 0);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
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
        <TextField
          size="small"
          placeholder="Filter by action…"
          value={action}
          onChange={(e) => { setAction(e.target.value); setPage(0); }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
          sx={{ width: 220, '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
        />
        <TextField
          size="small"
          type="date"
          label="From"
          value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); setPage(0); }}
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ width: 160, '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
        />
        <TextField
          size="small"
          type="date"
          label="To"
          value={dateTo}
          onChange={(e) => { setDateTo(e.target.value); setPage(0); }}
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ width: 160, '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
        />
        <Button size="small" startIcon={<RefreshIcon />} onClick={load} sx={{ textTransform: 'none', ml: 'auto' }}>
          Refresh
        </Button>
      </Stack>

      <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
        {total} events total
      </Typography>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}><CircularProgress /></Box>
      ) : (
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
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">No audit events found</Typography>
                  </TableCell>
                </TableRow>
              )}
              {rows.map((r) => (
                <TableRow key={r.log_id} hover>
                  <TableCell>
                    <Chip
                      size="small"
                      label={r.action}
                      sx={{
                        fontWeight: 700,
                        fontSize: 10,
                        borderRadius: 1,
                        bgcolor: alpha(ACTION_COLORS[r.action] || '#64748b', 0.12),
                        color: ACTION_COLORS[r.action] || '#64748b',
                        maxWidth: 200,
                      }}
                    />
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
                  <TableCell><Typography variant="caption">{formatDate(r.created_at)}</Typography></TableCell>
                  <TableCell sx={{ maxWidth: 200 }}>
                    {r.changes && (
                      <Typography variant="caption" sx={{ fontFamily: 'monospace', fontSize: '0.72rem', wordBreak: 'break-all' }}>
                        {JSON.stringify(r.changes).slice(0, 80)}
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {total > PAGE && (
        <Stack direction="row" spacing={1} justifyContent="center" mt={2}>
          <Button size="small" disabled={page === 0} onClick={() => setPage((p) => p - 1)} sx={{ textTransform: 'none' }}>
            ← Prev
          </Button>
          <Typography variant="body2" sx={{ py: 0.5 }}>
            Page {page + 1} of {Math.ceil(total / PAGE)}
          </Typography>
          <Button size="small" disabled={(page + 1) * PAGE >= total} onClick={() => setPage((p) => p + 1)} sx={{ textTransform: 'none' }}>
            Next →
          </Button>
        </Stack>
      )}
    </Box>
  );
}

/* ── TAB 2 — Login History ── */
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
      const res = await get(`/admin/login-history?${params.toString()}`);
      setRows(res.data || []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => { load(); }, [load]);

  const sessionStatus = (s) => {
    if (s.revoked_at) return { label: 'Revoked', color: '#ef4444' };
    if (new Date(s.expires_at) < new Date()) return { label: 'Expired', color: '#94a3b8' };
    return { label: 'Active', color: '#10b981' };
  };

  return (
    <Box>
      <Stack direction="row" spacing={1.5} mb={2}>
        <TextField
          size="small"
          placeholder="Search by user, email, or IP…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
          sx={{ flex: 1, maxWidth: 320, '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
        />
        <Button size="small" startIcon={<RefreshIcon />} onClick={load} sx={{ textTransform: 'none' }}>
          Refresh
        </Button>
      </Stack>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}><CircularProgress /></Box>
      ) : (
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
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">No login records found</Typography>
                  </TableCell>
                </TableRow>
              )}
              {rows.map((s) => {
                const st = sessionStatus(s);
                const roleColor = ROLE_COLORS[s.role_key] || '#888';
                return (
                  <TableRow key={s.session_id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={700}>{s.full_name}</Typography>
                      <Typography variant="caption" color="text.secondary">{s.email}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={s.role_key}
                        sx={{
                          fontWeight: 700,
                          fontSize: 10,
                          borderRadius: 1,
                          bgcolor: alpha(roleColor, 0.12),
                          color: roleColor,
                        }}
                      />
                    </TableCell>
                    <TableCell><Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>{s.ip_address || '—'}</Typography></TableCell>
                    <TableCell><Typography variant="body2" noWrap sx={{ maxWidth: 180 }}>{parseDevice(s.user_agent)}</Typography></TableCell>
                    <TableCell><Typography variant="caption">{formatDate(s.created_at)}</Typography></TableCell>
                    <TableCell><Typography variant="caption" color="text.secondary">{formatDate(s.expires_at)}</Typography></TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={st.label}
                        sx={{
                          fontWeight: 700,
                          fontSize: 10,
                          borderRadius: 1,
                          bgcolor: alpha(st.color, 0.12),
                          color: st.color,
                        }}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Stack direction="row" spacing={1} justifyContent="center" mt={2}>
        <Button size="small" disabled={page === 0} onClick={() => setPage((p) => p - 1)} sx={{ textTransform: 'none' }}>
          ← Prev
        </Button>
        <Typography variant="body2" sx={{ py: 0.5 }}>Page {page + 1}</Typography>
        <Button size="small" disabled={rows.length < PAGE} onClick={() => setPage((p) => p + 1)} sx={{ textTransform: 'none' }}>
          Next →
        </Button>
      </Stack>
    </Box>
  );
}

/* ── TAB 3 — Roles & Permissions Matrix ── */
function PermissionsTab() {
  const theme = useTheme();
  const { user } = useAuth();
  const { showToast } = useToast();
  const isSystemAdmin = user?.role === 'SYSTEM_ADMIN';
  const groups = [...new Set(PERM_META.map((p) => p.group))];

  const [matrix, setMatrix]     = useState({});
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [dirty, setDirty]       = useState({});

  const loadPermissions = useCallback(async () => {
    setLoading(true);
    try {
      const rows = (await get('/admin/role-permissions')).data || [];
      const m = {};
      rows.forEach((r) => { m[`${r.permission_key}::${r.role_key}`] = r.granted; });
      setMatrix(m);
    } catch {
      showToast('Failed to load permissions', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadPermissions();
  }, [loadPermissions]);

  const toggle = (permKey, role) => {
    const k = `${permKey}::${role}`;
    const next = !matrix[k];
    setMatrix((prev) => ({ ...prev, [k]: next }));
    setDirty((prev) => ({ ...prev, [k]: { role_key: role, permission_key: permKey, granted: next } }));
  };

  const save = async () => {
    const changes = Object.values(dirty);
    if (changes.length === 0) return;
    setSaving(true);
    try {
      await put('/admin/role-permissions', { permissions: changes });
      setDirty({});
      showToast(`${changes.length} permission${changes.length > 1 ? 's' : ''} updated`, 'success');
    } catch {
      showToast('Failed to save permissions', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}><CircularProgress /></Box>;

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="body2" color="text.secondary">
          {isSystemAdmin ? 'Toggle switches to grant or revoke permissions for each role.' : 'View which roles have access to each system feature.'}
        </Typography>
        {isSystemAdmin && Object.keys(dirty).length > 0 && (
          <Button
            size="small"
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={save}
            disabled={saving}
            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 1.5 }}
          >
            {saving ? 'Saving…' : `Save ${Object.keys(dirty).length} change${Object.keys(dirty).length > 1 ? 's' : ''}`}
          </Button>
        )}
      </Stack>
      <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, overflow: 'auto' }}>
        <Table size="small" sx={{ minWidth: 720 }}>
          <TableHead sx={{ bgcolor: alpha(theme.palette.primary.main, 0.04) }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, minWidth: 220 }}>PERMISSION</TableCell>
              {ROLES_ORDER.map((role) => (
                <TableCell key={role} align="center" sx={{ fontWeight: 700, minWidth: 80 }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: ROLE_COLORS[role] || '#888' }} />
                    <Typography sx={{ fontSize: '0.65rem', fontWeight: 800, color: ROLE_COLORS[role] || '#888', letterSpacing: '0.02em' }}>
                      {role.replace(/_/g, '\u200B_')}
                    </Typography>
                  </Box>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {groups.map((group) => [
              <TableRow key={`g-${group}`}>
                <TableCell colSpan={ROLES_ORDER.length + 1}
                  sx={{ bgcolor: alpha(theme.palette.primary.main, 0.03), py: 0.5, pl: 2 }}>
                  <Typography variant="overline" sx={{ fontWeight: 800, fontSize: '0.65rem', color: 'text.secondary', letterSpacing: '0.08em' }}>
                    {group}
                  </Typography>
                </TableCell>
              </TableRow>,
              ...PERM_META.filter((p) => p.group === group).map((p) => (
                <TableRow key={p.key} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                  <TableCell sx={{ pl: 3 }}>
                    <Typography variant="body2">{p.label}</Typography>
                  </TableCell>
                  {ROLES_ORDER.map((role) => {
                    const k = `${p.key}::${role}`;
                    const granted = Boolean(matrix[k]);
                    const changed = k in dirty;
                    return (
                      <TableCell key={role} align="center">
                        {isSystemAdmin ? (
                          <Switch
                            size="small"
                            checked={granted}
                            onChange={() => toggle(p.key, role)}
                            sx={changed ? { '& .MuiSwitch-track': { bgcolor: '#f59e0b' } } : {}}
                          />
                        ) : granted ? (
                          <CheckCircleIcon sx={{ fontSize: 18, color: ROLE_COLORS[role] || '#10b981' }} />
                        ) : (
                          <CancelIcon sx={{ fontSize: 16, color: alpha('#94a3b8', 0.4) }} />
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              )),
            ])}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

/* ── TAB 4 — System Settings ── */
function SettingsTab() {
  const [vals, setVals]       = useState({ ...DEFAULT_SETTINGS });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState('');
  const [err, setErr]         = useState('');

  useEffect(() => {
    setLoading(true);
    get('/admin/system-settings')
      .then((r) => {
        const m = {};
        (r.data || []).forEach(({ key, value }) => { m[key] = value; });
        setVals((v) => ({ ...v, ...m }));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const set = (key) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : (e.target.type === 'number' ? Number(e.target.value) : e.target.value);
    setVals((v) => ({ ...v, [key]: val }));
  };

  const saveGroup = async (keys) => {
    setSaving(true); setSaved(''); setErr('');
    try {
      await put('/admin/system-settings', { settings: keys.map((k) => ({ key: k, value: vals[k] })) });
      setSaved(`${keys.join(', ')} saved`);
      setTimeout(() => setSaved(''), 3000);
    } catch (ex) {
      setErr(ex.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
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
        <Button
          size="small"
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={() => saveGroup(keys)}
          disabled={saving}
          sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 1.5 }}
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </Button>
      </Box>
    </Paper>
  );

  const NumField = ({ label, k, min, max }) => (
    <Stack direction="row" justifyContent="space-between" alignItems="center" py={0.75}>
      <Typography variant="body2">{label}</Typography>
      <TextField
        size="small"
        type="number"
        value={vals[k] ?? ''}
        onChange={set(k)}
        slotProps={{ htmlInput: { min, max } }}
        sx={{ width: 100, '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
      />
    </Stack>
  );

  const Toggle = ({ label, sub, k }) => (
    <Stack direction="row" justifyContent="space-between" alignItems="center" py={0.5}>
      <Box>
        <Typography variant="body2">{label}</Typography>
        {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
      </Box>
      <Switch size="small" checked={Boolean(vals[k])} onChange={(e) => setVals((v) => ({ ...v, [k]: e.target.checked }))} />
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
          <TextField
            size="small"
            value={Array.isArray(vals.file_access_allowed_roles) ? vals.file_access_allowed_roles.join(',') : vals.file_access_allowed_roles}
            onChange={(e) => setVals((v) => ({ ...v, file_access_allowed_roles: e.target.value.split(',').map((s) => s.trim()) }))}
            sx={{ width: 320, '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
          />
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

/* ── TAB 5 — SIM Cap & Fraud Sentinel ── */
function SimFraudTab() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [ninSearch, setNinSearch] = useState('');
  const [auditResult, setAuditResult] = useState(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const { showToast } = useToast();

  const loadAlerts = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const res = await get('/sim/fraud-alerts?status=OPEN');
      setAlerts(res.data?.rows || []);
    } catch {
      setErr('Failed to load SIM fraud alerts.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAlerts(); }, [loadAlerts]);

  const handleAudit = async (e) => {
    e.preventDefault();
    if (!ninSearch.trim()) return;
    setAuditLoading(true);
    setAuditResult(null);
    try {
      const res = await get(`/sim/audit/${encodeURIComponent(ninSearch.trim())}`);
      setAuditResult(res.data);
    } catch (error) {
      showToast(error?.response?.data?.error || 'Failed to audit NIN', 'error');
    } finally {
      setAuditLoading(false);
    }
  };

  const handleResolve = async (alertId) => {
    try {
      await patch(`/sim/fraud-alerts/${alertId}`, { status: 'CLEARED', resolutionNote: 'Audited and cleared by regulator' });
      showToast('Fraud alert cleared', 'success');
      loadAlerts();
    } catch {
      showToast('Failed to resolve alert', 'error');
    }
  };

  return (
    <Box>
      {/* NIN Audit Quick-Search Box */}
      <Paper sx={{ p: 2.5, mb: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <Typography variant="subtitle1" fontWeight={700} mb={1}>National NIN Multi-SIM Registry Cross-Check</Typography>
        <Typography variant="body2" color="text.secondary" mb={2}>
          Audits real-time SIM registrations across all operators (Orange, Africell, QCell). Enforces statutory maximum cap (4 SIMs per citizen NIN).
        </Typography>
        <Box component="form" onSubmit={handleAudit} sx={{ display: 'flex', gap: 1.5, maxWidth: 540 }}>
          <TextField
            size="small"
            placeholder="Enter Citizen National ID (NIN) e.g. SL-NIN-99281"
            fullWidth
            value={ninSearch}
            onChange={(e) => setNinSearch(e.target.value)}
          />
          <Button variant="contained" type="submit" disabled={auditLoading || !ninSearch.trim()} sx={{ minWidth: 120 }}>
            {auditLoading ? <CircularProgress size={20} color="inherit" /> : 'Audit NIN'}
          </Button>
        </Box>

        {auditResult && (
          <Box sx={{ mt: 2.5, p: 2, bgcolor: alpha(auditResult.is_compliant ? '#10b981' : '#ef4444', 0.05), border: '1px solid', borderColor: auditResult.is_compliant ? 'success.main' : 'error.main', borderRadius: 1.5 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="subtitle2" fontWeight={700}>
                NIN: {auditResult.nin} · Total Registered SIMs: <strong>{auditResult.total_sims}</strong> / {auditResult.max_allowed} max
              </Typography>
              <Chip
                label={auditResult.is_compliant ? 'COMPLIANT' : 'CAP BREACH / FRAUD ALERT'}
                color={auditResult.is_compliant ? 'success' : 'error'}
                size="small"
                sx={{ fontWeight: 800 }}
              />
            </Stack>

            {auditResult.violations?.length > 0 && (
              <Stack spacing={0.5} sx={{ mb: 1.5 }}>
                {auditResult.violations.map((v, i) => (
                  <Typography key={i} variant="caption" color="error.main" fontWeight={600}>
                    ⚠️ {v.message}
                  </Typography>
                ))}
              </Stack>
            )}

            <Typography variant="caption" color="text.secondary" fontWeight={700} textTransform="uppercase">Registered Active Numbers:</Typography>
            <TableContainer sx={{ mt: 1 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Phone</TableCell>
                    <TableCell>Operator</TableCell>
                    <TableCell>ICCID</TableCell>
                    <TableCell>Registered Name</TableCell>
                    <TableCell>Date</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(auditResult.registrations || []).map((r) => (
                    <TableRow key={r.kyc_id}>
                      <TableCell sx={{ fontWeight: 600 }}>{r.phone}</TableCell>
                      <TableCell><Chip label={r.operator_name || 'MNO'} size="small" variant="outlined" /></TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: 11 }}>{r.iccid || '-'}</TableCell>
                      <TableCell>{r.first_name} {r.last_name}</TableCell>
                      <TableCell>{new Date(r.created_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </Paper>

      {/* Flagged Alerts Table */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
        <Typography variant="h6" fontWeight={700}>
          Regulatory SIM Cap Violations & Fraud Alerts <Chip label={alerts.length} size="small" color="error" sx={{ ml: 1, fontWeight: 800 }} />
        </Typography>
        <Button size="small" startIcon={<RefreshIcon />} onClick={loadAlerts}>Refresh</Button>
      </Stack>

      {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}><CircularProgress /></Box>
      ) : alerts.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center', border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
          <CheckCircleIcon sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
          <Typography variant="subtitle1" fontWeight={700}>No active SIM fraud or cap alerts</Typography>
          <Typography variant="body2" color="text.secondary">All audited NIN records are compliant with the 4-SIM statutory limit.</Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, overflow: 'hidden' }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: (t) => alpha(t.palette.error.main, 0.04) }}>
              <TableRow sx={{ '& th': { fontWeight: 700 } }}>
                <TableCell>NIN</TableCell>
                <TableCell>Alert Type</TableCell>
                <TableCell>Severity</TableCell>
                <TableCell align="right">Active SIMs</TableCell>
                <TableCell>Triggered</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {alerts.map((a) => (
                <TableRow key={a.alert_id} hover>
                  <TableCell sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{a.nin}</TableCell>
                  <TableCell>
                    <Chip label={a.alert_type?.replace(/_/g, ' ')} size="small" variant="outlined" color="error" sx={{ fontSize: 11, fontWeight: 700 }} />
                  </TableCell>
                  <TableCell>
                    <Chip label={a.severity} size="small" color={a.severity === 'CRITICAL' ? 'error' : 'warning'} sx={{ fontSize: 10, fontWeight: 800 }} />
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800, color: 'error.main' }}>
                    {a.total_sims} / 4
                  </TableCell>
                  <TableCell>{timeSince(a.created_at)}</TableCell>
                  <TableCell align="right">
                    <Button size="small" variant="outlined" color="success" onClick={() => handleResolve(a.alert_id)} sx={{ textTransform: 'none' }}>
                      Clear Alert
                    </Button>
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

/* ── MAIN — SecurityCenter ── */
export default function SecurityCenter() {
  const [tab, setTab] = useState(0);

  const TABS = [
    { label: 'Active Sessions',      icon: <DevicesIcon fontSize="small" /> },
    { label: 'Audit Log',            icon: <HistoryIcon fontSize="small" /> },
    { label: 'Login History',        icon: <LoginIcon fontSize="small" /> },
    { label: 'Roles & Permissions',  icon: <GridViewIcon fontSize="small" /> },
    { label: 'System Settings',      icon: <SettingsIcon fontSize="small" /> },
    { label: 'SIM Cap & Fraud',      icon: <PhonelinkLockIcon fontSize="small" /> },
  ];

  return (
    <Box sx={{ width: '100%', pb: 4 }}>
      <PageHeader
        icon={<SecurityIcon />}
        title="Administration & Security Center"
        subtitle="Manage active sessions, audit trails, role permission matrix, multi-SIM cap fraud, and system configurations"
      />

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
      {tab === 5 && <SimFraudTab />}
    </Box>
  );
}
