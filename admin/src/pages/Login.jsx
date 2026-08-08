import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Alert,
  IconButton, Stack, Checkbox, FormControlLabel, Divider
} from '@mui/material';
import Visibility    from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import LockOutlinedIcon  from '@mui/icons-material/LockOutlined';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import GroupsIcon         from '@mui/icons-material/Groups';
import TrendingUpIcon     from '@mui/icons-material/TrendingUp';
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined';
import ArrowForwardIcon   from '@mui/icons-material/ArrowForward';
import { useAuth } from '../auth/AuthContext.jsx';

/* ── design tokens ────────────────────────────────────────────────── */
const NAVY     = '#0b1f3a';
const BLUE     = '#1d4ed8';
const WHITE    = '#ffffff';
const BORDER   = '#e2e8f0';
const TEXT_PRI = '#0f172a';
const TEXT_SEC = '#64748b';

/* ── Logo mark ────────────────────────────────────────────────────── */
function LogoMark({ size = 64 }) {
  return (
    <Box
      component="img"
      src="/natca_logo.png"
      alt="NatCA"
      sx={{
        width: size, height: size, objectFit: 'contain', flexShrink: 0,
        borderRadius: '50%', bgcolor: '#fff',
        boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
      }}
    />
  );
}

/* ── Feature row ──────────────────────────────────────────────────── */
function FeatureItem({ icon, title, desc, bgColor }) {
  return (
    <Stack direction="row" spacing={2} alignItems="flex-start" sx={{ mb: 3.5 }}>
      <Box sx={{
        width: 44, height: 44, borderRadius: '50%',
        bgcolor: bgColor,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        {icon}
      </Box>
      <Box>
        <Typography sx={{ color: WHITE, fontSize: '0.9rem', fontWeight: 700, mb: 0.3 }}>{title}</Typography>
        <Typography sx={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.78rem', lineHeight: 1.45 }}>{desc}</Typography>
      </Box>
    </Stack>
  );
}

/* ── Login page ───────────────────────────────────────────────────── */
export default function Login() {
  const { login }  = useAuth();
  const navigate   = useNavigate();
  const [id, setId]         = useState('');
  const [pw, setPw]         = useState('');
  const [show, setShow]     = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr]       = useState('');
  const [remember, setRemember] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErr('');
    try {
      const u = await login(id, pw);
      navigate(u.must_change_password ? '/change-password' : '/');
    } catch (ex) {
      setErr(ex.response?.data?.error || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{
      minHeight: '100vh', display: 'flex',
      fontFamily: '"Inter","Segoe UI",system-ui,sans-serif',
    }}>

      {/* ══════════ LEFT PANEL ══════════ */}
      <Box sx={{
        display: { xs: 'none', md: 'flex' },
        flexDirection: 'column',
        width: { md: 380, lg: 440 },
        flexShrink: 0,
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Background image */}
        <Box sx={{
          position: 'absolute', inset: 0, zIndex: 0,
          backgroundImage: 'url(/login_bg.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center bottom',
        }} />
        {/* Gradient overlay */}
        <Box sx={{
          position: 'absolute', inset: 0, zIndex: 1,
          background: 'linear-gradient(180deg, rgba(11,31,58,0.6) 0%, rgba(11,31,58,0.4) 60%, rgba(11,31,58,0.15) 100%)',
        }} />

        {/* Content */}
        <Box sx={{ position: 'relative', zIndex: 2, flex: 1, display: 'flex', flexDirection: 'column', p: { md: 4.5, lg: 5 } }}>

          {/* Logo + NatCA wordmark */}
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 6 }}>
            <LogoMark size={68} />
            <Box>
              <Typography sx={{
                fontFamily: 'Georgia,"Times New Roman",serif',
                fontWeight: 700, fontSize: '1.6rem', color: WHITE, lineHeight: 1.1,
              }}>
                NatCA
              </Typography>
              <Typography sx={{
                color: '#3b82f6', fontSize: '0.75rem', letterSpacing: '0.1em',
                textTransform: 'uppercase', fontWeight: 700, mt: 0.2,
              }}>
                Staff Portal
              </Typography>
            </Box>
          </Stack>

          {/* Accent bar + headline */}
          <Box sx={{ flex: 1 }}>
            <Box sx={{ width: 36, height: 3, bgcolor: '#3b82f6', borderRadius: 2, mb: 3 }} />

            <Typography sx={{
              fontFamily: 'Georgia,"Times New Roman",serif',
              color: WHITE, fontWeight: 700,
              fontSize: '1.9rem', lineHeight: 1.2,
              letterSpacing: '-0.02em', mb: 2,
            }}>
              Customer QoE
            </Typography>

            <Typography sx={{
              color: 'rgba(255,255,255,0.6)', fontSize: '0.88rem',
              lineHeight: 1.65, maxWidth: 300, mb: 5,
            }}>
              Secure administrative access for authorised NatCA staff, inspectors, and licensed operator personnel.
            </Typography>

            {/* Features */}
            <FeatureItem
              icon={<ShieldOutlinedIcon sx={{ color: '#93c5fd', fontSize: 22 }} />}
              bgColor="rgba(96,165,250,0.18)"
              title="Secure Access"
              desc="Role-based authentication and authorization"
            />
            <FeatureItem
              icon={<GroupsIcon sx={{ color: '#f9a8d4', fontSize: 22 }} />}
              bgColor="rgba(244,114,182,0.18)"
              title="Trusted Platform"
              desc="Built for regulators, inspectors and operators"
            />
            <FeatureItem
              icon={<TrendingUpIcon sx={{ color: '#6ee7b7', fontSize: 22 }} />}
              bgColor="rgba(52,211,153,0.18)"
              title="Data Integrity"
              desc="Reliable and accurate data you can trust"
            />
          </Box>

          {/* Footer */}
          <Box>
            <Typography sx={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.72rem', mb: 0.4 }}>
              An official platform of the
            </Typography>
            <Typography sx={{ color: WHITE, fontSize: '0.82rem', fontWeight: 700, mb: 1.2 }}>
              Government of Sierra Leone
            </Typography>
            <Stack direction="row" sx={{ width: 100, height: 3, borderRadius: 2, overflow: 'hidden' }}>
              <Box sx={{ flex: 1, bgcolor: '#1eb53a' }} />
              <Box sx={{ flex: 1, bgcolor: '#fff' }} />
              <Box sx={{ flex: 1, bgcolor: '#0072c6' }} />
            </Stack>
          </Box>
        </Box>
      </Box>

      {/* ══════════ RIGHT PANEL ══════════ */}
      <Box sx={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        bgcolor: '#f1f5f9',
        backgroundImage: `radial-gradient(circle at 20% 30%, rgba(59,130,246,0.04) 0%, transparent 50%),
                          radial-gradient(circle at 80% 80%, rgba(59,130,246,0.03) 0%, transparent 50%)`,
        p: { xs: 3, sm: 5 },
        position: 'relative',
      }}>

        {/* Form card */}
        <Box sx={{
          width: '100%', maxWidth: 460,
          bgcolor: WHITE,
          borderRadius: '24px',
          boxShadow: '0 25px 50px rgba(0,0,0,0.06), 0 2px 6px rgba(0,0,0,0.04)',
          p: { xs: 4, sm: 6 },
        }}>

          {/* Mobile logo */}
          <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="center"
            sx={{ mb: 4, display: { xs: 'flex', md: 'none' } }}>
            <LogoMark size={48} />
            <Box>
              <Typography sx={{ fontFamily: 'Georgia,serif', fontWeight: 700, fontSize: '1.2rem', color: NAVY }}>NatCA</Typography>
              <Typography sx={{ fontSize: '0.7rem', color: '#3b82f6', fontWeight: 700 }}>STAFF PORTAL</Typography>
            </Box>
          </Stack>

          {/* Heading */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography sx={{
              fontFamily: 'Georgia,"Times New Roman",serif',
              fontSize: '1.65rem', fontWeight: 700, color: NAVY, mb: 0.8,
            }}>
              Welcome back
            </Typography>
            <Typography sx={{ color: TEXT_SEC, fontSize: '0.88rem' }}>
              Sign in to access the NatCA administration console
            </Typography>
          </Box>

          {/* Error */}
          {err && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: 2, fontSize: '0.85rem' }}>
              {err}
            </Alert>
          )}

          {/* Form */}
          <form onSubmit={submit}>
            <Stack spacing={2.5}>

              {/* Email */}
              <Box>
                <Typography component="label" sx={{
                  display: 'block', fontSize: '0.78rem', fontWeight: 700,
                  color: TEXT_PRI, mb: 0.8,
                }}>
                  Email address
                </Typography>
                <Box sx={{ position: 'relative' }}>
                  <PersonOutlinedIcon sx={{
                    position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                    color: '#94a3b8', fontSize: 20,
                  }} />
                  <Box
                    component="input" type="email"
                    placeholder="your@natca.gov.sl"
                    value={id} onChange={e => setId(e.target.value)}
                    required autoComplete="username"
                    sx={{
                      width: '100%', boxSizing: 'border-box',
                      pl: 5, pr: 2, py: 1.6, borderRadius: '12px',
                      border: `1.5px solid ${BORDER}`, bgcolor: '#f8fafc',
                      color: TEXT_PRI, fontSize: '0.9rem', fontFamily: 'inherit',
                      outline: 'none', transition: 'all .2s',
                      '&::placeholder': { color: '#b0bec5' },
                      '&:focus': { borderColor: BLUE, boxShadow: `0 0 0 4px rgba(29,78,216,0.08)`, bgcolor: WHITE },
                    }}
                  />
                </Box>
              </Box>

              {/* Password */}
              <Box>
                <Typography component="label" sx={{
                  display: 'block', fontSize: '0.78rem', fontWeight: 700,
                  color: TEXT_PRI, mb: 0.8,
                }}>
                  Password
                </Typography>
                <Box sx={{ position: 'relative' }}>
                  <LockOutlinedIcon sx={{
                    position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                    color: '#94a3b8', fontSize: 20,
                  }} />
                  <Box
                    component="input" type={show ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={pw} onChange={e => setPw(e.target.value)}
                    required autoComplete="current-password"
                    sx={{
                      width: '100%', boxSizing: 'border-box',
                      pl: 5, pr: 5, py: 1.6, borderRadius: '12px',
                      border: `1.5px solid ${BORDER}`, bgcolor: '#f8fafc',
                      color: TEXT_PRI, fontSize: '0.9rem', fontFamily: 'inherit',
                      outline: 'none', transition: 'all .2s',
                      '&::placeholder': { color: '#b0bec5' },
                      '&:focus': { borderColor: BLUE, boxShadow: `0 0 0 4px rgba(29,78,216,0.08)`, bgcolor: WHITE },
                    }}
                  />
                  <IconButton size="small" onClick={() => setShow(s => !s)} tabIndex={-1}
                    sx={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                    {show ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                  </IconButton>
                </Box>
              </Box>

              {/* Remember / Forgot */}
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <FormControlLabel
                  control={<Checkbox size="small" checked={remember}
                    onChange={e => setRemember(e.target.checked)}
                    sx={{ color: '#cbd5e1', '&.Mui-checked': { color: BLUE } }} />}
                  label={<Typography sx={{ fontSize: '0.82rem', color: TEXT_SEC }}>Remember me</Typography>}
                />
                <Typography component="a" href="#" sx={{
                  fontSize: '0.82rem', color: BLUE, fontWeight: 600,
                  textDecoration: 'none', '&:hover': { textDecoration: 'underline' },
                }}>
                  Forgot password?
                </Typography>
              </Stack>

              {/* Submit */}
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
                }}
              >
                {loading ? 'Authenticating…' : 'Sign In'}
              </Button>
            </Stack>
          </form>

          {/* Footer tag */}
          <Divider sx={{ mt: 4, '&::before, &::after': { borderColor: '#f1f5f9' } }}>
            <Typography sx={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 500 }}>
              Secure. Reliable. Trusted.
            </Typography>
          </Divider>
        </Box>

        {/* Page footer */}
        <Stack direction="row" spacing={0.8} alignItems="center"
          sx={{ position: 'absolute', bottom: 24, color: '#94a3b8' }}>
          <ShieldOutlinedIcon sx={{ fontSize: 14 }} />
          <Typography sx={{ fontSize: '0.7rem' }}>
            © {new Date().getFullYear()} National Communication Authority · Sierra Leone
          </Typography>
        </Stack>
      </Box>
    </Box>
  );
}
