import { useState, useEffect } from 'react';
import {
  Box, Paper, Typography, Stack, Button, TextField, Switch, FormControlLabel,
  Alert, Chip, Divider, CircularProgress, Tooltip,
} from '@mui/material';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import AddIcon    from '@mui/icons-material/Add';
import CloseIcon  from '@mui/icons-material/Close';
import SaveIcon   from '@mui/icons-material/Save';
import { adminService } from '../services/adminService.js';
import PageHeader from '../components/PageHeader.jsx';
import { useToast } from '../components/ToastContext.jsx';
import { getErrorMessage } from '../api/client.js';

export default function AlertSettings() {
  const { showToast } = useToast();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const [emailInput, setEmailInput] = useState('');

  useEffect(() => {
    setLoading(true);
    adminService.getAlertSettings()
      .then((r) => setSettings(r.data))
      .catch((err) => setError(getErrorMessage(err, 'Failed to load alert settings.')))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      await adminService.updateAlertSettings(settings);
      showToast('Notification settings saved successfully', 'success');
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to save settings.'));
      showToast('Failed to save settings', 'error');
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
    <Box sx={{ maxWidth: 780, pb: 4 }}>
      <PageHeader
        icon={<NotificationsActiveIcon />}
        title="Notification & Alert Settings"
        subtitle="Configure automated SLA breach warnings, email distribution lists, and SMS alerts"
      />

      {error && <Alert severity="error" sx={{ mb: 2.5, borderRadius: 1.5 }} onClose={() => setError('')}>{error}</Alert>}

      {settings && (
        <Stack spacing={2.5}>
          {/* SLA thresholds */}
          <Paper sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>SLA Thresholds</Typography>
            <Divider sx={{ mb: 2 }} />

            <Stack spacing={2}>
              <TextField
                label="SLA Warning Threshold (hours)"
                type="number"
                size="small"
                value={settings.sla_warning_hours ?? 48}
                onChange={(e) => setSettings((s) => ({ ...s, sla_warning_hours: Number(e.target.value) }))}
                helperText="Send early warning notifications this many hours before the SLA deadline expires"
                slotProps={{ htmlInput: { min: 1, max: 168 } }}
                sx={{ maxWidth: 320 }}
              />
            </Stack>
          </Paper>

          {/* Email recipients */}
          <Paper sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>SLA Breach Email Distribution List</Typography>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              These regulatory and carrier NOC email addresses receive automatic email dispatch when a complaint exceeds SLA resolution limits.
            </Typography>

            <Stack direction="row" spacing={1.5} sx={{ mb: 2 }}>
              <TextField
                size="small"
                placeholder="regulatory-noc@natca.gov.sl"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addEmail(); } }}
                sx={{ flex: 1 }}
              />
              <Tooltip title="Add email">
                <Button
                  variant="outlined"
                  size="small"
                  onClick={addEmail}
                  startIcon={<AddIcon />}
                  disabled={!emailInput.trim()}
                  sx={{ borderRadius: 1.5, px: 2.5, fontWeight: 600 }}
                >
                  Add
                </Button>
              </Tooltip>
            </Stack>

            <Stack direction="row" flexWrap="wrap" spacing={1} useFlexGap>
              {(settings.sla_breach_emails || []).length === 0 && (
                <Typography variant="caption" color="text.disabled">No email recipients configured</Typography>
              )}
              {(settings.sla_breach_emails || []).map((email) => (
                <Chip
                  key={email}
                  label={email}
                  size="small"
                  variant="outlined"
                  onDelete={() => removeEmail(email)}
                  deleteIcon={<CloseIcon fontSize="small" />}
                  sx={{ borderRadius: 1, fontWeight: 600 }}
                />
              ))}
            </Stack>
          </Paper>

          {/* Toggles */}
          <Paper sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>Notification Channels</Typography>
            <Divider sx={{ mb: 2 }} />

            <Stack spacing={2}>
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
                    <Typography variant="body2" fontWeight={600}>SMS Alert Dispatch</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Send SMS to registered officer mobile numbers upon critical SLA breach
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
                    <Typography variant="body2" fontWeight={600}>New Complaint In-App Notifications</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Send real-time alerts to all logged-in administrative analysts when new cases are submitted
                    </Typography>
                  </Box>
                }
              />
            </Stack>
          </Paper>

          <Box sx={{ pt: 1 }}>
            <Button
              variant="contained"
              startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
              onClick={save}
              disabled={saving}
              sx={{ borderRadius: 1.5, px: 3, py: 1, fontWeight: 600 }}
            >
              {saving ? 'Saving…' : 'Save Notification Settings'}
            </Button>
          </Box>
        </Stack>
      )}
    </Box>
  );
}
