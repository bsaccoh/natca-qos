import { useState, useEffect } from 'react';
import {
  Box, Paper, Typography, Stack, Button, TextField, Switch, FormControlLabel,
  Alert, Chip, IconButton, Divider, CircularProgress, Tooltip,
} from '@mui/material';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import AddIcon    from '@mui/icons-material/Add';
import CloseIcon  from '@mui/icons-material/Close';
import SaveIcon   from '@mui/icons-material/Save';
import { get, put } from '../api/client.js';

export default function AlertSettings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [success, setSuccess]   = useState('');
  const [error, setError]       = useState('');
  const [emailInput, setEmailInput] = useState('');

  useEffect(() => {
    setLoading(true);
    get('/admin/alert-settings')
      .then((r) => setSettings(r.data))
      .catch(() => setError('Failed to load alert settings.'))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    setSuccess('');
    setError('');
    try {
      await put('/admin/alert-settings', settings);
      setSuccess('Settings saved successfully.');
    } catch {
      setError('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const addEmail = () => {
    const email = emailInput.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    if ((settings.sla_breach_emails || []).includes(email)) return;
    setSettings((s) => ({ ...s, sla_breach_emails: [...(s.sla_breach_emails || []), email] }));
    setEmailInput('');
  };

  const removeEmail = (email) => {
    setSettings((s) => ({ ...s, sla_breach_emails: s.sla_breach_emails.filter((e) => e !== email) }));
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 680 }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 3 }}>
        <NotificationsActiveIcon color="primary" />
        <Typography variant="h5" fontWeight={700}>Notification & Alert Settings</Typography>
      </Stack>

      {error   && <Alert severity="error"   sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      {settings && (
        <Stack spacing={2}>
          {/* SLA thresholds */}
          <Paper sx={{ p: 2.5 }}>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>SLA Thresholds</Typography>
            <Divider sx={{ mb: 2 }} />

            <Stack spacing={2}>
              <TextField
                label="SLA Warning Threshold (hours)"
                type="number"
                size="small"
                value={settings.sla_warning_hours}
                onChange={(e) => setSettings((s) => ({ ...s, sla_warning_hours: Number(e.target.value) }))}
                helperText="Send a warning notification this many hours before the SLA deadline"
                inputProps={{ min: 1, max: 168 }}
                sx={{ maxWidth: 280 }}
              />
            </Stack>
          </Paper>

          {/* Email recipients */}
          <Paper sx={{ p: 2.5 }}>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>SLA Breach Email Recipients</Typography>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              These email addresses receive a notification whenever a complaint breaches its SLA deadline.
            </Typography>

            <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
              <TextField
                size="small" placeholder="email@natca.sl" value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addEmail(); } }}
                sx={{ flex: 1 }}
              />
              <Tooltip title="Add email">
                <Button variant="outlined" size="small" onClick={addEmail}
                  startIcon={<AddIcon />} disabled={!emailInput.trim()}>
                  Add
                </Button>
              </Tooltip>
            </Stack>

            <Stack direction="row" flexWrap="wrap" spacing={0.75} useFlexGap>
              {(settings.sla_breach_emails || []).length === 0 && (
                <Typography variant="caption" color="text.disabled">No email recipients configured</Typography>
              )}
              {(settings.sla_breach_emails || []).map((email) => (
                <Chip key={email} label={email} size="small" variant="outlined"
                  onDelete={() => removeEmail(email)}
                  deleteIcon={<CloseIcon fontSize="small" />} />
              ))}
            </Stack>
          </Paper>

          {/* Toggles */}
          <Paper sx={{ p: 2.5 }}>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>Notification Channels</Typography>
            <Divider sx={{ mb: 1 }} />

            <Stack spacing={1}>
              <FormControlLabel
                control={
                  <Switch
                    checked={Boolean(settings.sla_sms_enabled)}
                    onChange={(e) => setSettings((s) => ({ ...s, sla_sms_enabled: e.target.checked }))}
                    color="primary"
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2" fontWeight={600}>SMS Alerts</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Send SMS to registered officer phone when an SLA is breached
                    </Typography>
                  </Box>
                }
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={Boolean(settings.notify_new_complaint)}
                    onChange={(e) => setSettings((s) => ({ ...s, notify_new_complaint: e.target.checked }))}
                    color="primary"
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2" fontWeight={600}>New Complaint Notifications</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Send in-app notification to all admin staff when a new complaint is submitted
                    </Typography>
                  </Box>
                }
              />
            </Stack>
          </Paper>

          <Box>
            <Button variant="contained" disableElevation startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />}
              onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save Settings'}
            </Button>
          </Box>
        </Stack>
      )}
    </Box>
  );
}
