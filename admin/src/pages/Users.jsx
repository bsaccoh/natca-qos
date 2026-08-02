import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControl, IconButton, InputLabel, MenuItem, Paper, Select, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, Tooltip, Typography, Alert, CircularProgress, Tabs, Tab,
  useTheme, alpha
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RefreshIcon from '@mui/icons-material/Refresh';
import PeopleIcon from '@mui/icons-material/People';
import PersonIcon from '@mui/icons-material/Person';
import ShieldIcon from '@mui/icons-material/Shield';
import SearchIcon from '@mui/icons-material/Search';
import DownloadIcon from '@mui/icons-material/Download';
import LockResetIcon from '@mui/icons-material/LockReset';
import { get, post, put, patch } from '../api/client.js';
import { exportToCSV } from '../utils/exportUtils.js';

function timeSince(ts) {
  if (!ts) return '—';
  const s = Math.floor((Date.now() - new Date(ts)) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(ts).toLocaleDateString();
}

const ROLE_COLOR = {
  SYSTEM_ADMIN: 'error',
  NATCA_ADMIN: 'primary',
  NATCA_ANALYST: 'info',
  INSPECTOR: 'secondary',
  OPERATOR_ADMIN: 'warning',
  CITIZEN: 'default',
};

const OPERATOR_COLORS = {
  'Orange SL': '#ff7900',
  'Africell': '#8e24aa',
  'Qcell': '#5b2d8e',
  'SierraTel': '#00a3e0',
};

function PwResetDialog({ open, user, onClose }) {
  const [pw, setPw]     = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr]   = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => { if (open) { setPw(''); setErr(''); setDone(false); } }, [open]);

  const save = async () => {
    if (pw.length < 8) { setErr('Minimum 8 characters'); return; }
    setSaving(true); setErr('');
    try {
      await post(`/admin/users/${user.user_id}/reset-password`, { newPassword: pw });
      setDone(true);
    } catch (ex) {
      setErr(ex.response?.data?.error || 'Reset failed');
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: 1.5 } } }}>
      <DialogTitle sx={{ fontWeight: 700 }}>Force Password Reset</DialogTitle>
      <DialogContent dividers>
        {done ? (
          <Alert severity="success">Password reset successfully for {user?.full_name}.</Alert>
        ) : (
          <Stack spacing={2} sx={{ pt: 1 }}>
            {err && <Alert severity="error">{err}</Alert>}
            <Typography variant="body2">Set a new password for <strong>{user?.full_name}</strong>. They must use this password on next login.</Typography>
            <TextField label="New Password *" type="password" value={pw} onChange={e => setPw(e.target.value)}
              fullWidth size="small" autoComplete="new-password" />
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} sx={{ borderRadius: 1.5, textTransform: 'none' }}>{done ? 'Close' : 'Cancel'}</Button>
        {!done && (
          <Button variant="contained" color="warning" onClick={save} disabled={saving} sx={{ borderRadius: 1.5, textTransform: 'none', fontWeight: 600 }}>
            {saving ? <CircularProgress size={18} /> : 'Reset Password'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

function UserDialog({ open, user, roles, operators, onClose, onSaved }) {
  const editing = !!user;
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', roleKey: 'NATCA_ANALYST', operatorId: '', password: '' });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (user) setForm({ fullName: user.full_name, email: user.email || '', phone: user.phone || '', roleKey: user.role_key || 'NATCA_ANALYST', operatorId: user.operator_id || '', password: '' });
    else setForm({ fullName: '', email: '', phone: '', roleKey: 'NATCA_ANALYST', operatorId: '', password: '' });
    setErr('');
  }, [user, open]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    if (!form.fullName) { setErr('Full Name is required'); return; }
    setSaving(true); setErr('');
    try {
      if (editing) {
        await put(`/users/${user.user_id}`, { fullName: form.fullName, email: form.email || undefined, phone: form.phone || undefined, roleKey: form.roleKey, operatorId: form.operatorId || undefined }).catch(() => {});
      } else {
        await post('/users', { fullName: form.fullName, email: form.email || undefined, phone: form.phone || undefined, roleKey: form.roleKey, operatorId: form.operatorId || undefined, password: form.password || undefined }).catch(() => {});
      }
      onSaved(form);
    } catch (ex) {
      setErr(ex.response?.data?.error || 'Save failed');
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: 1.5 } } }}>
      <DialogTitle sx={{ fontWeight: 700 }}>{editing ? 'Edit Administrative User' : 'Create Administrative User'}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          {err && <Alert severity="error">{err}</Alert>}
          <TextField label="Full Name *" value={form.fullName} onChange={set('fullName')} fullWidth size="small" required />
          <TextField label="Email Address" type="email" value={form.email} onChange={set('email')} fullWidth size="small" />
          <TextField label="Phone Number" value={form.phone} onChange={set('phone')} fullWidth size="small" />
          <FormControl fullWidth size="small">
            <InputLabel>Role *</InputLabel>
            <Select value={form.roleKey} label="Role *" onChange={set('roleKey')}>
              <MenuItem value="NATCA_ADMIN">NATCA_ADMIN (Regulator Director)</MenuItem>
              <MenuItem value="NATCA_ANALYST">NATCA_ANALYST (QoE Monitor)</MenuItem>
              <MenuItem value="INSPECTOR">INSPECTOR (Field Auditor)</MenuItem>
              <MenuItem value="OPERATOR_ADMIN">OPERATOR_ADMIN (Telecom NOC)</MenuItem>
              <MenuItem value="SYSTEM_ADMIN">SYSTEM_ADMIN (Full Admin)</MenuItem>
            </Select>
          </FormControl>
          {['OPERATOR_ADMIN'].includes(form.roleKey) && (
            <FormControl fullWidth size="small">
              <InputLabel>Telecom Operator</InputLabel>
              <Select value={form.operatorId} label="Telecom Operator" onChange={set('operatorId')}>
                <MenuItem value="">— Select Operator —</MenuItem>
                <MenuItem value="1">Orange SL</MenuItem>
                <MenuItem value="2">Africell</MenuItem>
                <MenuItem value="3">Qcell</MenuItem>
                <MenuItem value="4">SierraTel</MenuItem>
              </Select>
            </FormControl>
          )}
          {!editing && (
            <TextField label="Password (Default: NatCA@2026)" type="password" value={form.password} onChange={set('password')} fullWidth size="small" />
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} sx={{ borderRadius: 1.5, textTransform: 'none' }}>Cancel</Button>
        <Button variant="contained" onClick={save} disabled={saving} sx={{ borderRadius: 1.5, textTransform: 'none', fontWeight: 600 }}>
          {saving ? <CircularProgress size={18} /> : 'Save User Account'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function Users() {
  const [activeTab, setActiveTab] = useState(0);
  const [adminUsers, setAdminUsers] = useState([]);
  const [citizens, setCitizens] = useState([]);
  const [roles, setRoles] = useState([]);
  const [operators, setOperators] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [dialog, setDialog] = useState({ open: false, user: null });
  const [pwDialog, setPwDialog] = useState({ open: false, user: null });

  const theme = useTheme();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersR, rolesR, opsR] = await Promise.all([
        get('/users').catch(() => null),
        get('/users/roles').catch(() => null),
        get('/operators').catch(() => null),
      ]);
      if (usersR?.data) {
        const all = usersR.data;
        setAdminUsers(all.filter(u => u.role_key !== 'CITIZEN'));
        setCitizens(all.filter(u => u.role_key === 'CITIZEN').map(u => ({
          ...u,
          citizen_id: `CIT-${u.user_id}`,
          registered_at: u.created_at?.slice(0, 10),
          kyc_status: 'Pending',
        })));
      }
      if (rolesR?.data) setRoles(rolesR.data);
      if (opsR?.data) setOperators(opsR.data);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const toggleDeactivateUser = async (userId) => {
    const u = adminUsers.find(x => x.user_id === userId);
    if (!u) return;
    const suspend = u.is_active;
    setAdminUsers(prev => prev.map(x => x.user_id === userId ? { ...x, is_active: !suspend } : x));
    try { await patch(`/admin/users/${userId}/suspend`, { suspend, reason: 'Admin action' }); }
    catch { setAdminUsers(prev => prev.map(x => x.user_id === userId ? { ...x, is_active: suspend } : x)); }
  };

  const toggleDeactivateCitizen = async (citizenId) => {
    const c = citizens.find(x => x.citizen_id === citizenId);
    if (!c) return;
    const suspend = c.is_active;
    const userId = c.user_id || citizenId.replace('CIT-', '');
    setCitizens(prev => prev.map(x => x.citizen_id === citizenId ? { ...x, is_active: !suspend } : x));
    try { await patch(`/admin/users/${userId}/suspend`, { suspend, reason: 'Admin action' }); }
    catch { setCitizens(prev => prev.map(x => x.citizen_id === citizenId ? { ...x, is_active: suspend } : x)); }
  };

  const handleSavedUser = (form) => {
    if (dialog.user) {
      setAdminUsers(prev => prev.map(u => u.user_id === dialog.user.user_id ? { ...u, full_name: form.fullName, email: form.email, phone: form.phone, role_key: form.roleKey } : u));
    } else {
      const newUser = {
        user_id: String(Date.now()),
        full_name: form.fullName,
        email: form.email,
        phone: form.phone,
        role_key: form.roleKey,
        operator_name: 'NatCA Regulator',
        is_active: true,
        last_login_at: new Date().toISOString()
      };
      setAdminUsers(prev => [newUser, ...prev]);
    }
    setDialog({ open: false, user: null });
  };

  const filteredAdmins = useMemo(() => {
    return adminUsers.filter(u => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (u.full_name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q) || (u.phone || '').includes(q) || (u.role_key || '').toLowerCase().includes(q);
    });
  }, [adminUsers, search]);

  const filteredCitizens = useMemo(() => {
    return citizens.filter(c => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (c.full_name || '').toLowerCase().includes(q) || (c.phone || '').includes(q) || (c.nin || '').toLowerCase().includes(q) || (c.operator_name || '').toLowerCase().includes(q) || (c.district || '').toLowerCase().includes(q);
    });
  }, [citizens, search]);

  const handleExportCSV = () => {
    if (activeTab === 0) {
      exportToCSV('NatCA_Administrative_Users', filteredAdmins.map(u => ({
        UserID: u.user_id,
        FullName: u.full_name,
        Email: u.email,
        Phone: u.phone,
        Role: u.role_key,
        Department_Operator: u.operator_name,
        Status: u.is_active ? 'Active' : 'Inactive',
        LastLogin: u.last_login_at
      })));
    } else {
      exportToCSV('NatCA_Registered_Citizens', filteredCitizens.map(c => ({
        CitizenRef: c.citizen_id,
        FullName: c.full_name,
        MobilePhone: c.phone,
        NIN: c.nin,
        Operator: c.operator_name,
        District: c.district,
        KYC_Status: c.kyc_status,
        AccountStatus: c.is_active ? 'Active' : 'Suspended',
        RegistrationDate: c.registered_at
      })));
    }
  };

  return (
    <Box sx={{ width: '100%', minHeight: '100%', pb: 4 }}>
      {/* Header Bar - Clean Responsive Flex Layout */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box sx={{ 
            width: 40, height: 40, borderRadius: 1.5, flexShrink: 0,
            bgcolor: alpha(theme.palette.primary.main, 0.12), 
            color: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center' 
          }}>
            <PeopleIcon fontSize="medium" />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700} sx={{ letterSpacing: '-0.02em', color: 'text.primary' }}>
              User & Subscriber Management
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Separate Directories for Regulator Administrative Staff & Registered Mobile Citizens
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" spacing={1.5} sx={{ flexShrink: 0 }}>
          <Button startIcon={<RefreshIcon />} variant="outlined" onClick={loadData} sx={{ borderRadius: 1.5, textTransform: 'none', fontWeight: 600 }}>
            Refresh
          </Button>
          <Button startIcon={<DownloadIcon />} variant="outlined" onClick={handleExportCSV} sx={{ borderRadius: 1.5, textTransform: 'none', fontWeight: 600 }}>
            Export CSV
          </Button>
          {activeTab === 0 && (
            <Button startIcon={<AddIcon />} variant="contained" onClick={() => setDialog({ open: true, user: null })} sx={{ borderRadius: 1.5, textTransform: 'none', fontWeight: 600 }}>
              Add Admin User
            </Button>
          )}
        </Stack>
      </Box>

      {/* KPI Cards Row - Clean 4 Column CSS Grid */}
      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' }, 
        gap: 2, 
        mb: 3, 
        width: '100%' 
      }}>
        <Paper sx={{ p: 2.5, borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
            <Typography variant="caption" fontWeight={700} color="text.secondary">ADMIN & REGULATOR USERS</Typography>
            <ShieldIcon sx={{ color: '#2563eb', fontSize: 22 }} />
          </Box>
          <Typography variant="h3" fontWeight={800} color="#2563eb" sx={{ mt: 1 }}>{adminUsers.length}</Typography>
          <Typography variant="caption" color="text.secondary">NatCA & Operator Accounts</Typography>
        </Paper>

        <Paper sx={{ p: 2.5, borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
            <Typography variant="caption" fontWeight={700} color="text.secondary">REGISTERED CITIZENS</Typography>
            <PersonIcon sx={{ color: '#10b981', fontSize: 22 }} />
          </Box>
          <Typography variant="h3" fontWeight={800} color="#10b981" sx={{ mt: 1 }}>{citizens.length}</Typography>
          <Typography variant="caption" color="text.secondary">All active mobile accounts</Typography>
        </Paper>

        <Paper sx={{ p: 2.5, borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
            <Typography variant="caption" fontWeight={700} color="text.secondary">VERIFIED KYC SUBSCRIBERS</Typography>
            <CheckCircleIcon sx={{ color: '#a855f7', fontSize: 22 }} />
          </Box>
          <Typography variant="h3" fontWeight={800} color="#a855f7" sx={{ mt: 1 }}>{citizens.filter(c => c.kyc_status === 'Approved').length}</Typography>
          <Typography variant="caption" color="text.secondary">SIM Bound & NIN Verified</Typography>
        </Paper>

        <Paper sx={{ p: 2.5, borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
            <Typography variant="caption" fontWeight={700} color="text.secondary">SUSPENDED ACCOUNTS</Typography>
            <BlockIcon sx={{ color: '#ef4444', fontSize: 22 }} />
          </Box>
          <Typography variant="h3" fontWeight={800} color="#ef4444" sx={{ mt: 1 }}>{citizens.filter(c => !c.is_active).length + adminUsers.filter(u => !u.is_active).length}</Typography>
          <Typography variant="caption" color="text.secondary">Manually suspended</Typography>
        </Paper>
      </Box>

      {/* Tabs Navigation for Separate Tables */}
      <Paper sx={{ mb: 3, borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ px: 2, pt: 1 }}>
          <Tab 
            icon={<ShieldIcon fontSize="small" />} 
            iconPosition="start" 
            label={`Administrative & Regulator Users (${adminUsers.length})`} 
            sx={{ fontWeight: 700, textTransform: 'none' }} 
          />
          <Tab 
            icon={<PersonIcon fontSize="small" />} 
            iconPosition="start" 
            label={`Registered Mobile Citizens (${citizens.length})`} 
            sx={{ fontWeight: 700, textTransform: 'none' }} 
          />
        </Tabs>
      </Paper>

      {/* Search Input Bar */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
        <TextField
          placeholder={activeTab === 0 ? "Search admin user by name, email, phone, or role..." : "Search citizen by name, mobile, NIN, operator, or district..."}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          size="small"
          fullWidth
          InputProps={{
            startAdornment: <SearchIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />,
          }}
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
        />
      </Paper>

      {/* TAB 0: Administrative & Regulator Users Table */}
      {activeTab === 0 && (
        <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 1.5, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
          <Table>
            <TableHead sx={{ bgcolor: (t) => alpha(t.palette.primary.main, 0.04) }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>FULL NAME</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>EMAIL & PHONE</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>SYSTEM ROLE</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>DEPARTMENT / OPERATOR</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>LAST LOGIN</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>STATUS</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>ACTIONS</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredAdmins.map((u) => (
                <TableRow key={u.user_id} hover>
                  <TableCell>
                    <Typography variant="subtitle2" fontWeight={700}>{u.full_name}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{u.email}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>{u.phone}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip size="small" label={u.role_key} color={ROLE_COLOR[u.role_key] || 'default'} sx={{ fontWeight: 800, fontSize: 11, borderRadius: 1 }} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>{u.operator_name || 'NatCA Central'}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">{timeSince(u.last_login_at)}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip size="small" label={u.is_active ? 'Active' : 'Inactive'} color={u.is_active ? 'success' : 'default'} sx={{ fontWeight: 700, borderRadius: 1 }} />
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <Tooltip title="Edit User">
                        <IconButton size="small" color="primary" onClick={() => setDialog({ open: true, user: u })}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Reset Password">
                        <IconButton size="small" color="warning" onClick={() => setPwDialog({ open: true, user: u })}>
                          <LockResetIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={u.is_active ? 'Suspend Account' : 'Activate Account'}>
                        <IconButton size="small" color={u.is_active ? 'error' : 'success'} onClick={() => toggleDeactivateUser(u.user_id)}>
                          <BlockIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
              {filteredAdmins.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" color="text.secondary">No administrative users match your query</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* TAB 1: Registered Citizens Table */}
      {activeTab === 1 && (
        <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 1.5, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
          <Table>
            <TableHead sx={{ bgcolor: (t) => alpha(t.palette.primary.main, 0.04) }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>CITIZEN REF</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>FULL NAME & MOBILE</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>NATIONAL ID (NIN)</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>REGISTERED OPERATOR</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>DISTRICT / LOCATION</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>KYC STATUS</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>ACCOUNT STATUS</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>ACTIONS</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredCitizens.map((c) => {
                const opColor = OPERATOR_COLORS[c.operator_name] || '#2563eb';

                return (
                  <TableRow key={c.citizen_id} hover>
                    <TableCell>
                      <Typography variant="subtitle2" fontWeight={800} color="primary.main" sx={{ fontFamily: 'monospace' }}>
                        {c.citizen_id}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">{c.registered_at}</Typography>
                    </TableCell>

                    <TableCell>
                      <Typography variant="subtitle2" fontWeight={700}>{c.full_name}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>{c.phone}</Typography>
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2" fontWeight={800} color="primary.main" sx={{ fontFamily: 'monospace' }}>
                        {c.nin}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={c.operator_name}
                        size="small"
                        sx={{
                          fontWeight: 700, fontSize: 11, borderRadius: 1,
                          bgcolor: alpha(opColor, 0.12),
                          color: opColor,
                          border: `1px solid ${alpha(opColor, 0.3)}`
                        }}
                      />
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2">{c.district}</Typography>
                    </TableCell>

                    <TableCell>
                      {c.kyc_status === 'Approved' && <Chip label="Approved" size="small" sx={{ bgcolor: alpha('#10b981', 0.12), color: '#10b981', fontWeight: 800, borderRadius: 1 }} />}
                      {c.kyc_status === 'Pending' && <Chip label="Pending" size="small" sx={{ bgcolor: alpha('#f59e0b', 0.12), color: '#f59e0b', fontWeight: 800, borderRadius: 1 }} />}
                      {c.kyc_status === 'Reject' && <Chip label="Reject" size="small" sx={{ bgcolor: alpha('#ef4444', 0.12), color: '#ef4444', fontWeight: 800, borderRadius: 1 }} />}
                    </TableCell>

                    <TableCell>
                      <Chip size="small" label={c.is_active ? 'Active' : 'Suspended'} color={c.is_active ? 'success' : 'error'} sx={{ fontWeight: 800, borderRadius: 1 }} />
                    </TableCell>

                    <TableCell align="right">
                      <Tooltip title={c.is_active ? 'Suspend Mobile Account' : 'Activate Account'}>
                        <IconButton size="small" color={c.is_active ? 'error' : 'success'} onClick={() => toggleDeactivateCitizen(c.citizen_id)}>
                          <BlockIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredCitizens.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" color="text.secondary">No registered citizens match your query</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* User Edit / Create Dialog */}
      <UserDialog
        open={dialog.open}
        user={dialog.user}
        roles={roles}
        operators={operators}
        onClose={() => setDialog({ open: false, user: null })}
        onSaved={handleSavedUser}
      />

      {/* Password Reset Dialog */}
      <PwResetDialog
        open={pwDialog.open}
        user={pwDialog.user}
        onClose={() => setPwDialog({ open: false, user: null })}
      />
    </Box>
  );
}
