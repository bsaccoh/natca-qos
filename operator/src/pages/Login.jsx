import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Alert, IconButton, Stack, Divider,
} from '@mui/material';
import Visibility       from '@mui/icons-material/Visibility';
import VisibilityOff    from '@mui/icons-material/VisibilityOff';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import BusinessIcon     from '@mui/icons-material/Business';
import { useAuth } from '../auth/AuthContext.jsx';

const NAVY   = '#0b1f3a';
const BLUE   = '#1d4ed8';
const WHITE  = '#ffffff';
const BORDER = '#e2e8f0';
const TEXT_PRI = '#0f172a';
const TEXT_SEC = '#64748b';

export default function Login() {
  const { login }  = useAuth();
  const navigate   = useNavigate();
  const [id, setId]         = useState('');
  const [pw, setPw]         = useState('');
  const [show, setShow]     = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr]       = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErr('');
    try {
      await login(id, pw);
      navigate('/');
    } catch (ex) {
      setErr(ex.message || ex.response?.data?.error || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const inputSx = {
    width: '100%', boxSizing: 'border-box',
    pl: 5, pr: 2, py: 1.6, borderRadius: '12px',
    border: `1.5px solid ${BORDER}`, bgcolor: '#f8fafc',
    color: TEXT_PRI, fontSize: '0.9rem', fontFamily: 'inherit',
    outline: 'none', transition: 'all .2s',
    '&::placeholder': { color: '#b0bec5' },
    '&:focus': { borderColor: BLUE, boxShadow: `0 0 0 4px rgba(29,78,216,0.08)`, bgcolor: WHITE },
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', fontFamily: '"Inter","Segoe UI",system-ui,sans-serif' }}>
      {/* Left branding panel */}
      <Box sx={{
        display: { xs: 'none', md: 'flex' }, flexDirection: 'column', width: { md: 380, lg: 440 },
        flexShrink: 0, position: 'relative', overflow: 'hidden',
      }}>
        <Box sx={{ position: 'absolute', inset: 0, zIndex: 0, backgroundImage: 'url(/natca_logo.png)', backgroundSize: '60%', backgroundRepeat: 'no-repeat', backgroundPosition: 'center', opacity: 0.06 }} />
        <Box sx={{ position: 'absolute', inset: 0, zIndex: 0, bgcolor: NAVY }} />
        <Box sx={{ position: 'relative', zIndex: 2, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', p: 5 }}>
          <Box component="img" src="/natca_logo.png" alt="NatCA" sx={{ width: 80, height: 80, objectFit: 'contain', borderRadius: '50%', bgcolor: '#fff', boxShadow: '0 4px 16px rgba(0,0,0,0.2)', mb: 3 }} />
          <Typography sx={{ fontFamily: 'Georgia,serif', fontWeight: 700, fontSize: '1.6rem', color: WHITE, mb: 0.5 }}>NatCA</Typography>
          <Typography sx={{ color: '#3b82f6', fontSize: '0.8rem', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700, mb: 4 }}>Operator Portal</Typography>
          <Box sx={{ width: 36, height: 3, bgcolor: '#3b82f6', borderRadius: 2, mb: 3 }} />
          <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.88rem', textAlign: 'center', maxWidth: 280, lineHeight: 1.65 }}>
            Manage customer complaints, track KPIs, and maintain service quality for your network operations.
          </Typography>
          <Box sx={{ mt: 'auto' }}>
            <Stack direction="row" sx={{ width: 100, height: 3, borderRadius: 2, overflow: 'hidden', mx: 'auto' }}>
              <Box sx={{ flex: 1, bgcolor: '#1eb53a' }} />
              <Box sx={{ flex: 1, bgcolor: '#fff' }} />
              <Box sx={{ flex: 1, bgcolor: '#0072c6' }} />
            </Stack>
          </Box>
        </Box>
      </Box>

      {/* Right form panel */}
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f1f5f9', p: { xs: 3, sm: 5 } }}>
        <Box sx={{ width: '100%', maxWidth: 460, bgcolor: WHITE, borderRadius: '24px', boxShadow: '0 25px 50px rgba(0,0,0,0.06)', p: { xs: 4, sm: 6 } }}>
          <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="center" sx={{ mb: 4, display: { xs: 'flex', md: 'none' } }}>
            <Box component="img" src="/natca_logo.png" alt="NatCA" sx={{ width: 48, height: 48, objectFit: 'contain', borderRadius: '50%', bgcolor: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }} />
            <Box>
              <Typography sx={{ fontFamily: 'Georgia,serif', fontWeight: 700, fontSize: '1.2rem', color: NAVY }}>NatCA</Typography>
              <Typography sx={{ fontSize: '0.7rem', color: '#3b82f6', fontWeight: 700 }}>OPERATOR PORTAL</Typography>
            </Box>
          </Stack>

          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Box sx={{ width: 56, height: 56, borderRadius: '50%', bgcolor: 'rgba(29,78,216,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
              <BusinessIcon sx={{ fontSize: 28, color: BLUE }} />
            </Box>
            <Typography sx={{ fontFamily: 'Georgia,serif', fontSize: '1.65rem', fontWeight: 700, color: NAVY, mb: 0.8 }}>Operator Sign In</Typography>
            <Typography sx={{ color: TEXT_SEC, fontSize: '0.88rem' }}>Access your operator management dashboard</Typography>
          </Box>

          {err && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{err}</Alert>}

          <form onSubmit={submit}>
            <Stack spacing={2.5}>
              <Box>
                <Typography component="label" sx={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: TEXT_PRI, mb: 0.8 }}>Email address</Typography>
                <Box sx={{ position: 'relative' }}>
                  <PersonOutlinedIcon sx={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 20 }} />
                  <Box component="input" type="email" placeholder="your@operator.sl" value={id} onChange={e => setId(e.target.value)} required autoComplete="username" sx={inputSx} />
                </Box>
              </Box>
              <Box>
                <Typography component="label" sx={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: TEXT_PRI, mb: 0.8 }}>Password</Typography>
                <Box sx={{ position: 'relative' }}>
                  <LockOutlinedIcon sx={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 20 }} />
                  <Box component="input" type={show ? 'text' : 'password'} placeholder="Enter your password" value={pw} onChange={e => setPw(e.target.value)} required autoComplete="current-password" sx={{ ...inputSx, pr: 5 }} />
                  <IconButton size="small" onClick={() => setShow(s => !s)} tabIndex={-1} sx={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                    {show ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                  </IconButton>
                </Box>
              </Box>
              <Button type="submit" disabled={loading} fullWidth endIcon={!loading && <ArrowForwardIcon />}
                sx={{
                  py: 1.6, borderRadius: '12px', bgcolor: loading ? '#94a3b8' : BLUE, color: WHITE,
                  fontWeight: 700, fontSize: '0.95rem', textTransform: 'none',
                  boxShadow: loading ? 'none' : '0 4px 14px rgba(29,78,216,0.35)',
                  '&:hover:not(:disabled)': { bgcolor: '#1e40af' },
                  '&.Mui-disabled': { bgcolor: '#cbd5e1', color: WHITE },
                }}>
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </Stack>
          </form>

          <Divider sx={{ mt: 4, '&::before, &::after': { borderColor: '#f1f5f9' } }}>
            <Typography sx={{ color: '#94a3b8', fontSize: '0.75rem' }}>NatCA Regulated Operator</Typography>
          </Divider>
        </Box>
      </Box>
    </Box>
  );
}
