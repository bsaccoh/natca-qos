import { useState, useEffect } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box, Button, Paper, Stack, TextField, Typography, Alert, CircularProgress,
  Stepper, Step, StepLabel, MenuItem,
} from '@mui/material';
import { post, get }  from '../api/client.js';
import { useAuth }    from '../auth/AuthContext.jsx';
import { BRAND }      from '../theme/theme.js';

const STEPS = ['Account Details', 'Verify Phone', 'Done'];

export default function Register() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [step, setStep]     = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr]       = useState('');
  const [form, setForm]     = useState({
    fullName: '', phone: '', email: '', password: '', confirmPassword: '', districtId: '',
  });
  const [otp, setOtp]   = useState('');
  const [districts, setDistrictList] = useState([]);

  useEffect(() => {
    get('/districts').then((r) => setDistrictList(r.data || [])).catch(() => {});
  }, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  /* ── Step 0: register ────────────────────────────────────────────────── */
  const submitRegister = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) { setErr('Passwords do not match'); return; }
    setLoading(true); setErr('');
    try {
      await post('/auth/register', {
        fullName:   form.fullName,
        phone:      form.phone || undefined,
        email:      form.email || undefined,
        password:   form.password,
        districtId: form.districtId || undefined,
      });
      if (form.phone) setStep(1); else setStep(2);
    } catch (ex) {
      setErr(ex.response?.data?.error || 'Registration failed');
    } finally { setLoading(false); }
  };

  /* ── Step 1: verify OTP ──────────────────────────────────────────────── */
  const submitOtp = async (e) => {
    e.preventDefault();
    setLoading(true); setErr('');
    try {
      await post('/auth/otp/verify', { phone: form.phone, code: otp });
      setStep(2);
    } catch (ex) {
      setErr(ex.response?.data?.error || 'OTP verification failed');
    } finally { setLoading(false); }
  };

  const resendOtp = async () => {
    try { await post('/auth/otp/send', { phone: form.phone }); }
    catch { /* ignore */ }
  };

  /* ── Step 2: auto-login and redirect ─────────────────────────────────── */
  const goLogin = async () => {
    try {
      setLoading(true);
      await login(form.phone || form.email, form.password);
      navigate('/my-complaints');
    } catch {
      navigate('/login');
    } finally { setLoading(false); }
  };

  return (
    <Box sx={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      bgcolor: '#f8fafc', p: 2,
    }}>
      <Paper elevation={0} sx={{ width: '100%', maxWidth: 480, p: { xs: 3, sm: 4 }, borderRadius: 3, border: `1px solid ${BRAND.border}`, boxShadow: '0 10px 30px rgba(0,0,0,0.06)' }}>
        <Stack alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
          <Box component="img" src="/natca_logo.png" alt="NatCA Logo"
            sx={{ width: 64, height: 64, objectFit: 'contain' }}
          />
          <Typography variant="h5" fontWeight={700} sx={{ color: BRAND.navy }}>Create Account</Typography>
          <Typography variant="body2" color="text.secondary">NatCA Citizen Portal</Typography>
        </Stack>

        <Stepper activeStep={step} alternativeLabel sx={{ mb: 3 }}>
          {STEPS.map((l) => <Step key={l}><StepLabel>{l}</StepLabel></Step>)}
        </Stepper>

        {err && <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }}>{err}</Alert>}

        {/* ── Step 0 ── */}
        {step === 0 && (
          <form onSubmit={submitRegister}>
            <Stack spacing={2}>
              <TextField label="Full Name *" value={form.fullName} onChange={set('fullName')} fullWidth autoFocus required />
              <TextField label="Phone Number" value={form.phone} onChange={set('phone')} fullWidth
                helperText="You will receive an OTP to verify your phone" placeholder="+232 XX XXXXXX" />
              <TextField label="Email Address" type="email" value={form.email} onChange={set('email')} fullWidth />
              <TextField label="Password *" type="password" value={form.password} onChange={set('password')} fullWidth required
                helperText="Minimum 8 characters" />
              <TextField label="Confirm Password *" type="password" value={form.confirmPassword} onChange={set('confirmPassword')} fullWidth required />
              <TextField select label="District (optional)" value={form.districtId} onChange={set('districtId')} fullWidth>
                <MenuItem value="">— Select district —</MenuItem>
                {districts.map((d) => <MenuItem key={d.district_id} value={d.district_id}>{d.name}</MenuItem>)}
              </TextField>
              <Button type="submit" variant="contained" fullWidth size="large" disabled={loading} sx={{ bgcolor: BRAND.primary, py: 1.3, borderRadius: 2, fontWeight: 700 }}>
                {loading ? <CircularProgress size={22} color="inherit" /> : 'Create Account'}
              </Button>
            </Stack>
          </form>
        )}

        {/* ── Step 1: OTP ── */}
        {step === 1 && (
          <form onSubmit={submitOtp}>
            <Stack spacing={2}>
              <Typography variant="body2" color="text.secondary" textAlign="center">
                A 6-digit code was sent to <strong>{form.phone}</strong>
              </Typography>
              <TextField
                label="Verification Code"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                fullWidth
                autoFocus
                slotProps={{ htmlInput: { maxLength: 6, style: { letterSpacing: '0.3em', fontSize: '1.4rem', textAlign: 'center' } } }}
              />
              <Button type="submit" variant="contained" fullWidth size="large" disabled={loading || otp.length < 6} sx={{ bgcolor: BRAND.primary, py: 1.3, borderRadius: 2, fontWeight: 700 }}>
                {loading ? <CircularProgress size={22} color="inherit" /> : 'Verify Code'}
              </Button>
              <Button size="small" onClick={resendOtp} sx={{ alignSelf: 'center' }}>Resend Code</Button>
            </Stack>
          </form>
        )}

        {/* ── Step 2: Done ── */}
        {step === 2 && (
          <Stack spacing={2} alignItems="center">
            <Typography variant="h6" color="success.main" fontWeight={700}>✓ Registration successful!</Typography>
            <Typography variant="body2" color="text.secondary" textAlign="center">
              Your account has been created. You can now sign in to submit and track complaints.
            </Typography>
            <Button variant="contained" fullWidth size="large" onClick={goLogin} disabled={loading} sx={{ bgcolor: BRAND.primary, py: 1.3, borderRadius: 2, fontWeight: 700 }}>
              {loading ? <CircularProgress size={22} color="inherit" /> : 'Sign In Now'}
            </Button>
          </Stack>
        )}

        <Stack direction="row" justifyContent="center" sx={{ mt: 3 }}>
          <Typography variant="body2">
            Already have an account?{' '}
            <RouterLink to="/login" style={{ color: BRAND.primary, fontWeight: 600 }}>Sign In</RouterLink>
          </Typography>
        </Stack>
      </Paper>
    </Box>
  );
}
