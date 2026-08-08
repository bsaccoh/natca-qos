import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Alert, IconButton, Stack, Divider,
} from '@mui/material';
import Visibility       from '@mui/icons-material/Visibility';
import VisibilityOff    from '@mui/icons-material/VisibilityOff';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import LockResetIcon    from '@mui/icons-material/LockReset';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import { useAuth } from '../auth/AuthContext.jsx';
import { patch }   from '../api/client.js';

const NAVY   = '#0b1f3a';
const BLUE   = '#1d4ed8';
const WHITE  = '#ffffff';
const BORDER = '#e2e8f0';
const TEXT_PRI = '#0f172a';
const TEXT_SEC = '#64748b';

export default function ChangePassword() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw]         = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew]     = useState(false);
  const [loading, setLoading]     = useState(false);
  const [err, setErr]             = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    if (newPw.length < 8) return setErr('New password must be at least 8 characters.');
    if (newPw !== confirmPw) return setErr('Passwords do not match.');
    if (newPw === currentPw) return setErr('New password must be different from the current password.');
    setLoading(true);
    try {
      await patch('/auth/password', { currentPassword: currentPw, newPassword: newPw });
      await refreshUser();
      navigate('/');
    } catch (ex) {
      setErr(ex.response?.data?.error || 'Failed to change password.');
    } finally {
      setLoading(false);
    }
  };

  const inputSx = {
    width: '100%', boxSizing: 'border-box',
    pl: 5, pr: 5, py: 1.6, borderRadius: '12px',
    border: `1.5px solid ${BORDER}`, bgcolor: '#f8fafc',
    color: TEXT_PRI, fontSize: '0.9rem', fontFamily: 'inherit',
    outline: 'none', transition: 'all .2s',
    '&::placeholder': { color: '#b0bec5' },
    '&:focus': { borderColor: BLUE, boxShadow: `0 0 0 4px rgba(29,78,216,0.08)`, bgcolor: WHITE },
  };

  return (
    <Box sx={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      bgcolor: '#f1f5f9',
      backgroundImage: `radial-gradient(circle at 20% 30%, rgba(59,130,246,0.04) 0%, transparent 50%),
                        radial-gradient(circle at 80% 80%, rgba(59,130,246,0.03) 0%, transparent 50%)`,
      p: { xs: 3, sm: 5 }, position: 'relative',
    }}>
      <Box sx={{
        width: '100%', maxWidth: 460, bgcolor: WHITE,
        borderRadius: '24px',
        boxShadow: '0 25px 50px rgba(0,0,0,0.06), 0 2px 6px rgba(0,0,0,0.04)',
        p: { xs: 4, sm: 6 },
      }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Box sx={{
            width: 56, height: 56, borderRadius: '50%', bgcolor: 'rgba(29,78,216,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2,
          }}>
            <LockResetIcon sx={{ color: BLUE, fontSize: 28 }} />
          </Box>
          <Typography sx={{
            fontFamily: 'Georgia,"Times New Roman",serif',
            fontSize: '1.5rem', fontWeight: 700, color: NAVY, mb: 0.8,
          }}>
            Change Your Password
          </Typography>
          <Typography sx={{ color: TEXT_SEC, fontSize: '0.88rem' }}>
            {user?.must_change_password
              ? 'You must set a new password before continuing.'
              : 'Update your account password.'}
          </Typography>
        </Box>

        {err && <Alert severity="error" sx={{ mb: 3, borderRadius: 2, fontSize: '0.85rem' }}>{err}</Alert>}

        <form onSubmit={submit}>
          <Stack spacing={2.5}>
            <Box>
              <Typography component="label" sx={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: TEXT_PRI, mb: 0.8 }}>
                Current Password
              </Typography>
              <Box sx={{ position: 'relative' }}>
                <LockOutlinedIcon sx={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 20 }} />
                <Box component="input" type={showCurrent ? 'text' : 'password'} placeholder="Enter current password"
                  value={currentPw} onChange={e => setCurrentPw(e.target.value)} required autoComplete="current-password" sx={inputSx} />
                <IconButton size="small" onClick={() => setShowCurrent(s => !s)} tabIndex={-1}
                  sx={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                  {showCurrent ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                </IconButton>
              </Box>
            </Box>

            <Box>
              <Typography component="label" sx={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: TEXT_PRI, mb: 0.8 }}>
                New Password
              </Typography>
              <Box sx={{ position: 'relative' }}>
                <LockOutlinedIcon sx={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 20 }} />
                <Box component="input" type={showNew ? 'text' : 'password'} placeholder="At least 8 characters"
                  value={newPw} onChange={e => setNewPw(e.target.value)} required autoComplete="new-password" sx={inputSx} />
                <IconButton size="small" onClick={() => setShowNew(s => !s)} tabIndex={-1}
                  sx={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                  {showNew ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                </IconButton>
              </Box>
            </Box>

            <Box>
              <Typography component="label" sx={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: TEXT_PRI, mb: 0.8 }}>
                Confirm New Password
              </Typography>
              <Box sx={{ position: 'relative' }}>
                <LockOutlinedIcon sx={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 20 }} />
                <Box component="input" type={showNew ? 'text' : 'password'} placeholder="Re-enter new password"
                  value={confirmPw} onChange={e => setConfirmPw(e.target.value)} required autoComplete="new-password" sx={inputSx} />
              </Box>
            </Box>

            <Button type="submit" disabled={loading} fullWidth
              endIcon={!loading && <ArrowForwardIcon />}
              sx={{
                py: 1.6, borderRadius: '12px',
                bgcolor: loading ? '#94a3b8' : BLUE, color: WHITE,
                fontWeight: 700, fontSize: '0.95rem', textTransform: 'none',
                boxShadow: loading ? 'none' : '0 4px 14px rgba(29,78,216,0.35)',
                transition: 'all .2s',
                '&:hover:not(:disabled)': { bgcolor: '#1e40af', boxShadow: '0 6px 20px rgba(29,78,216,0.45)' },
                '&.Mui-disabled': { bgcolor: '#cbd5e1', color: WHITE },
              }}>
              {loading ? 'Updating…' : 'Update Password'}
            </Button>
          </Stack>
        </form>

        <Divider sx={{ mt: 4, '&::before, &::after': { borderColor: '#f1f5f9' } }}>
          <Typography sx={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 500 }}>
            Secure. Reliable. Trusted.
          </Typography>
        </Divider>
      </Box>

      <Stack direction="row" spacing={0.8} alignItems="center"
        sx={{ position: 'absolute', bottom: 24, color: '#94a3b8' }}>
        <ShieldOutlinedIcon sx={{ fontSize: 14 }} />
        <Typography sx={{ fontSize: '0.7rem' }}>
          © {new Date().getFullYear()} National Communication Authority · Sierra Leone
        </Typography>
      </Stack>
    </Box>
  );
}
