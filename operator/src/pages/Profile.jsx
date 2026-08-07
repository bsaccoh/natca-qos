import { useState } from 'react';
import {
  Box, Paper, Typography, Stack, TextField, Button, Divider,
  CircularProgress, Avatar,
} from '@mui/material';
import PersonIcon   from '@mui/icons-material/Person';
import LockIcon     from '@mui/icons-material/Lock';
import SaveIcon     from '@mui/icons-material/Save';
import { put, patch } from '../api/client.js';
import { useAuth }    from '../auth/AuthContext.jsx';
import { useToast }   from '../components/ToastContext.jsx';

export default function Profile() {
  const { user }      = useAuth();
  const { showToast } = useToast();

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [email, setEmail]       = useState(user?.email     || '');
  const [phone, setPhone]       = useState(user?.phone     || '');
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPw, setCurrentPw]   = useState('');
  const [newPw, setNewPw]           = useState('');
  const [confirmPw, setConfirmPw]   = useState('');
  const [savingPw, setSavingPw]     = useState(false);

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      await put('/auth/profile', { fullName, email: email || undefined, phone: phone || undefined });
      showToast('Profile updated successfully', 'success');
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to update profile', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async () => {
    if (newPw !== confirmPw) { showToast('New passwords do not match', 'error'); return; }
    if (newPw.length < 8)   { showToast('Password must be at least 8 characters', 'error'); return; }
    setSavingPw(true);
    try {
      await patch('/auth/password', { currentPassword: currentPw, newPassword: newPw });
      showToast('Password changed successfully', 'success');
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to change password', 'error');
    } finally {
      setSavingPw(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 560 }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 3 }}>
        <PersonIcon color="primary" />
        <Typography variant="h5" fontWeight={700}>My Profile</Typography>
      </Stack>

      {/* Avatar + name header */}
      <Paper sx={{ p: 2.5, mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Avatar sx={{ width: 56, height: 56, bgcolor: 'primary.main', fontSize: 22, borderRadius: 2 }}>
          {(user?.full_name || user?.email || '?').charAt(0).toUpperCase()}
        </Avatar>
        <Box>
          <Typography variant="subtitle1" fontWeight={700}>{user?.full_name || '—'}</Typography>
          <Typography variant="body2" color="text.secondary">{user?.email || user?.phone || '—'}</Typography>
          <Typography variant="caption" color="primary.main" fontWeight={600}>
            {user?.operator_name || 'Operator'} · Operator Admin
          </Typography>
        </Box>
      </Paper>

      {/* Profile details */}
      <Paper sx={{ p: 2.5, mb: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          <PersonIcon fontSize="small" color="action" />
          <Typography variant="subtitle2" fontWeight={700}>Personal Information</Typography>
        </Stack>
        <Divider sx={{ mb: 2 }} />
        <Stack spacing={2}>
          <TextField size="small" label="Full Name" value={fullName}
            onChange={(e) => setFullName(e.target.value)} fullWidth />
          <TextField size="small" label="Email" type="email" value={email}
            onChange={(e) => setEmail(e.target.value)} fullWidth />
          <TextField size="small" label="Phone" value={phone}
            onChange={(e) => setPhone(e.target.value)} fullWidth />
          <Box>
            <Button variant="contained" disableElevation
              startIcon={savingProfile ? <CircularProgress size={16} /> : <SaveIcon />}
              onClick={saveProfile} disabled={savingProfile || !fullName.trim()}>
              {savingProfile ? 'Saving…' : 'Save Profile'}
            </Button>
          </Box>
        </Stack>
      </Paper>

      {/* Change password */}
      <Paper sx={{ p: 2.5 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          <LockIcon fontSize="small" color="action" />
          <Typography variant="subtitle2" fontWeight={700}>Change Password</Typography>
        </Stack>
        <Divider sx={{ mb: 2 }} />
        <Stack spacing={2}>
          <TextField size="small" label="Current Password" type="password" value={currentPw}
            onChange={(e) => setCurrentPw(e.target.value)} fullWidth autoComplete="current-password" />
          <TextField size="small" label="New Password" type="password" value={newPw}
            onChange={(e) => setNewPw(e.target.value)} fullWidth autoComplete="new-password"
            helperText="Minimum 8 characters" />
          <TextField size="small" label="Confirm New Password" type="password" value={confirmPw}
            onChange={(e) => setConfirmPw(e.target.value)} fullWidth autoComplete="new-password"
            error={confirmPw.length > 0 && confirmPw !== newPw}
            helperText={confirmPw.length > 0 && confirmPw !== newPw ? 'Passwords do not match' : ''} />
          <Box>
            <Button variant="outlined" color="warning"
              startIcon={savingPw ? <CircularProgress size={16} /> : <LockIcon />}
              onClick={savePassword} disabled={savingPw || !currentPw || !newPw || !confirmPw}>
              {savingPw ? 'Changing…' : 'Change Password'}
            </Button>
          </Box>
        </Stack>
      </Paper>
    </Box>
  );
}
