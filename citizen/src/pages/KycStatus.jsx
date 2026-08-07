import { useState } from 'react';
import {
  Container, Typography, Paper, Box, TextField, Button, Stack,
  Alert, Chip, Divider, Step, Stepper, StepLabel, CircularProgress,
  Card, CardContent
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CellTowerIcon from '@mui/icons-material/CellTower';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import ReplayIcon from '@mui/icons-material/Replay';
import WarningIcon from '@mui/icons-material/Warning';
import { get } from '../api/client.js';

function normaliseStatus(raw) {
  const s = (raw || '').toUpperCase();
  if (s.includes('APPROV')) return 'Approved';
  if (s.includes('REJECT') || s.includes('SUSPEND')) return 'Rejected';
  if (s.includes('UNDER') || s.includes('REVIEW')) return 'Under Review';
  return 'Pending';
}

function buildTimeline(data) {
  if (Array.isArray(data.timeline)) return data.timeline;
  const status = normaliseStatus(data.status);
  return [
    { label: 'Submitted to NatCA Portal', date: data.created_at ? new Date(data.created_at).toLocaleString() : '—', done: true },
    { label: `Redirected to ${data.operator_name || 'Operator'}`, date: data.created_at ? new Date(data.created_at).toLocaleString() : '—', done: true },
    { label: 'NIN & Biometric Check', date: status === 'Approved' ? 'Passed' : status === 'Rejected' ? 'Failed' : 'In Progress', done: status === 'Approved' || status === 'Rejected' },
    { label: 'SIM Activated & Certificate Issued', date: status === 'Approved' ? (data.updated_at ? new Date(data.updated_at).toLocaleString() : 'Done') : 'Pending', done: status === 'Approved' },
  ];
}

export default function KycStatus() {
  const [queryVal, setQueryVal] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const [resubmitting, setResubmitting] = useState(false);
  const [resubmitFile, setResubmitFile] = useState(null);
  const [resubmitSuccess, setResubmitSuccess] = useState(false);

  const handleSearch = async (e) => {
    e?.preventDefault();
    const q = queryVal.trim();
    if (!q) return;
    setLoading(true); setError(''); setResult(null); setResubmitSuccess(false);

    try {
      let res = null;
      // Try by reference first
      try {
        res = await get(`/kyc/status/${encodeURIComponent(q)}`);
      } catch {
        // If it looks like a NIN (8 uppercase letters), search by NIN too
        if (/^[A-Z]{8}$/i.test(q)) {
          try {
            res = await get(`/kyc/status/${encodeURIComponent(q.toUpperCase())}`);
          } catch { /* not found */ }
        }
      }

      if (res?.data) {
        const data = res.data;
        const status = normaliseStatus(data.status);
        const name = [data.first_name, data.last_name].filter(Boolean).join(' ') || data.citizen_name || '';
        setResult({
          ...data,
          status,
          citizen_name: name || data.phone,
          operator_status: data.operator_status || `${status === 'Approved' ? 'Confirmed' : 'Pending'} on ${data.operator_name || 'Operator'} network`,
          timeline: buildTimeline({ ...data, status }),
        });
      } else {
        setError('No KYC registration found for this reference or NIN. Please check your reference code.');
      }
    } catch {
      setError('Failed to lookup KYC status. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResubmit = () => {
    if (!resubmitFile) return;
    setResubmitting(true);
    setTimeout(() => {
      setResubmitting(false);
      setResubmitSuccess(true);
      if (result) {
        setResult({
          ...result,
          status: 'Pending',
          operator_status: `Resubmission Sent to ${result.operator_name} for Final Approval`,
          rejection_reason: ''
        });
      }
    }, 1500);
  };

  return (
    <Container maxWidth="md" sx={{ py: 5 }}>
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography variant="h4" fontWeight={800} color="primary.main" gutterBottom sx={{ letterSpacing: '-0.02em' }}>
          KYC Status & Operator Verification Lookup
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Track your SIM registration, verify operator status, or resubmit requested identity documents
        </Typography>
      </Box>

      <Paper sx={{ p: 3, mb: 4, borderRadius: 2, border: '1px solid', borderColor: 'divider', boxShadow: 2 }}>
        <form onSubmit={handleSearch}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
            <TextField
              placeholder="Enter KYC Reference (e.g. KYC-20260807-XXXX) or NIN..."
              value={queryVal}
              onChange={(e) => setQueryVal(e.target.value)}
              fullWidth
              required
              size="medium"
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
            />
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SearchIcon />}
              sx={{ borderRadius: 1.5, px: 4, height: 56, textTransform: 'none', fontWeight: 700, flexShrink: 0 }}
            >
              Verify Status
            </Button>
          </Stack>
        </form>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 4, borderRadius: 1.5 }}>{error}</Alert>}

      {result && (
        <Stack spacing={3}>
          <Paper sx={{ p: 3.5, borderRadius: 2, border: '1px solid', borderColor: 'divider', boxShadow: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={2} mb={3}>
              <Box>
                <Typography variant="h5" fontWeight={800} color="primary.main" sx={{ fontFamily: 'monospace' }}>
                  {result.kyc_reference}
                </Typography>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mt: 0.5 }}>
                  {result.citizen_name} ({result.phone})
                </Typography>
                {result.nin && (
                  <Typography variant="caption" color="text.secondary" display="block">
                    NIN: {result.nin}
                  </Typography>
                )}
              </Box>

              <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
                <Chip
                  label={result.status}
                  color={result.status === 'Approved' ? 'success' : result.status === 'Rejected' ? 'error' : 'warning'}
                  sx={{ fontWeight: 800, fontSize: 13, py: 2.5, px: 1, borderRadius: 1.5 }}
                />
                {result.operator_name && (
                  <Chip
                    icon={<CellTowerIcon />}
                    label={`Operator: ${result.operator_name}`}
                    sx={{
                      fontWeight: 800, fontSize: 13, py: 2.5, px: 1, borderRadius: 1.5,
                      bgcolor: '#2563eb', color: '#fff',
                    }}
                  />
                )}
              </Stack>
            </Stack>

            <Divider sx={{ my: 2 }} />

            <Alert
              severity={result.status === 'Approved' ? 'success' : result.status === 'Rejected' ? 'error' : 'warning'}
              sx={{ mb: 3, borderRadius: 1.5 }}
            >
              <Typography variant="subtitle2" fontWeight={700}>
                Network Operator Confirmation Status:
              </Typography>
              <Typography variant="body2">{result.operator_status}</Typography>
            </Alert>

            {result.rejection_reason && (
              <Card variant="outlined" sx={{ mb: 3, borderColor: 'warning.main', bgcolor: 'warning.50' }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Stack direction="row" spacing={1.5} alignItems="center" mb={1}>
                    <WarningIcon color="warning" />
                    <Typography variant="subtitle1" fontWeight={700} color="warning.dark">
                      Action Required: Document Resubmission Requested
                    </Typography>
                  </Stack>
                  <Typography variant="body2" color="text.secondary" mb={2}>
                    {result.rejection_reason}
                  </Typography>

                  <Paper sx={{ p: 2, borderRadius: 1.5, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
                    <Typography variant="subtitle2" fontWeight={700} mb={1}>
                      Upload Clear Replacement Document / Photo:
                    </Typography>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
                      <Button component="label" variant="outlined" startIcon={<CloudUploadIcon />} sx={{ textTransform: 'none', borderRadius: 1.5 }}>
                        {resubmitFile ? resubmitFile.name : 'Choose Clear ID Image'}
                        <input type="file" hidden accept="image/*,application/pdf" onChange={(e) => setResubmitFile(e.target.files?.[0])} />
                      </Button>
                      <Button
                        variant="contained" color="warning" disabled={!resubmitFile || resubmitting}
                        onClick={handleResubmit}
                        startIcon={resubmitting ? <CircularProgress size={18} color="inherit" /> : <ReplayIcon />}
                        sx={{ borderRadius: 1.5, textTransform: 'none', fontWeight: 700 }}
                      >
                        Resubmit Document
                      </Button>
                    </Stack>
                    {resubmitSuccess && (
                      <Alert severity="success" sx={{ mt: 2, borderRadius: 1.5 }}>
                        Document successfully resubmitted! Sent to {result.operator_name} for re-evaluation.
                      </Alert>
                    )}
                  </Paper>
                </CardContent>
              </Card>
            )}

            <Typography variant="subtitle2" fontWeight={700} mb={2}>
              KYC Verification & Operator Handshake Timeline:
            </Typography>

            {result.timeline && result.timeline.length > 0 && (
              <Stepper activeStep={result.timeline.filter(t => t.done).length} orientation="vertical">
                {result.timeline.map((step, index) => (
                  <Step key={index} active completed={step.done}>
                    <StepLabel
                      StepIconComponent={() => (
                        step.done ? <CheckCircleIcon color="success" /> : <HourglassEmptyIcon color="action" />
                      )}
                    >
                      <Typography variant="subtitle2" fontWeight={700}>{step.label}</Typography>
                      <Typography variant="caption" color="text.secondary">{step.date}</Typography>
                    </StepLabel>
                  </Step>
                ))}
              </Stepper>
            )}
          </Paper>
        </Stack>
      )}
    </Container>
  );
}
