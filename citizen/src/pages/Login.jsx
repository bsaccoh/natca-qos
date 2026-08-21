import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Box, Button, Paper, TextField, Typography, Alert, CircularProgress, Stack,
} from '@mui/material';
import { useAuth } from '../auth/AuthContext.jsx';
import { BRAND } from '../theme/theme.js';

export default function Login() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const [form, setForm]     = useState({ identifier: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [err, setErr]         = useState('');

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true); setErr('');
    try {
      await login(form.identifier.trim(), form.password);
      navigate('/my-complaints');
    } catch (ex) {
      setErr(ex.response?.data?.error || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f8fafc', p: 2 }}>
      <Paper elevation={0} sx={{ width: '100%', maxWidth: 420, p: { xs: 3, sm: 4 }, borderRadius: 3, border: `1px solid ${BRAND.border}`, boxShadow: '0 10px 30px rgba(0,0,0,0.06)' }}>
        <Stack alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
          <Box component="img" src="/natca_logo.png" alt="NatCA Logo"
            sx={{ width: 64, height: 64, objectFit: 'contain' }}
          />
          <Typography variant="h5" fontWeight={700} sx={{ color: BRAND.navy }}>Sign In</Typography>
          <Typography variant="body2" color="text.secondary">NatCA Citizen Portal</Typography>
        </Stack>

        {err && <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }}>{err}</Alert>}

        <form onSubmit={submit}>
          <Stack spacing={2.5}>
            <TextField
              label="Email or Phone Number"
              value={form.identifier}
              onChange={set('identifier')}
              fullWidth
              autoFocus
              required
            />
            <TextField
              label="Password"
              type="password"
              value={form.password}
              onChange={set('password')}
              fullWidth
              required
            />
            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={loading}
              sx={{ bgcolor: BRAND.primary, py: 1.3, borderRadius: 2, fontWeight: 700 }}
            >
              {loading ? <CircularProgress size={22} color="inherit" /> : 'Sign In'}
            </Button>
          </Stack>
        </form>

        <Stack direction="row" justifyContent="space-between" sx={{ mt: 3 }}>
          <Typography variant="body2">
            No account? <Link to="/register" style={{ color: BRAND.primary, fontWeight: 600 }}>Register</Link>
          </Typography>
          <Typography variant="body2">
            <Link to="/" style={{ color: 'inherit', textDecoration: 'none' }}>Back to home</Link>
          </Typography>
        </Stack>
      </Paper>
    </Box>
  );
}
