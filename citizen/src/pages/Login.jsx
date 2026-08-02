import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Box, Button, Paper, TextField, Typography, Alert, CircularProgress, Stack,
} from '@mui/material';
import CellTowerIcon from '@mui/icons-material/CellTower';
import { useAuth } from '../auth/AuthContext.jsx';

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
      await login(form.identifier, form.password);
      navigate('/my-complaints');
    } catch (ex) {
      setErr(ex.response?.data?.error || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default', p: 2 }}>
      <Paper sx={{ width: '100%', maxWidth: 420, p: 4 }}>
        <Stack alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
          <Box component="img" src="/natca_logo.png" alt="NatCA Logo"
            sx={{ width: 64, height: 64, objectFit: 'contain' }}
          />
          <Typography variant="h5">Sign In</Typography>
          <Typography variant="body2" color="text.secondary">NatCA Citizen Portal</Typography>
        </Stack>

        {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}

        <form onSubmit={submit}>
          <Stack spacing={2}>
            <TextField label="Email or Phone" value={form.identifier} onChange={set('identifier')} fullWidth autoFocus />
            <TextField label="Password" type="password" value={form.password} onChange={set('password')} fullWidth />
            <Button type="submit" variant="contained" fullWidth size="large" disabled={loading}>
              {loading ? <CircularProgress size={22} /> : 'Sign In'}
            </Button>
          </Stack>
        </form>

        <Stack direction="row" justifyContent="space-between" sx={{ mt: 3 }}>
          <Typography variant="body2">
            No account? <Link to="/register" style={{ color: 'inherit' }}>Register</Link>
          </Typography>
          <Typography variant="body2">
            <Link to="/" style={{ color: 'inherit' }}>Back to home</Link>
          </Typography>
        </Stack>
      </Paper>
    </Box>
  );
}
