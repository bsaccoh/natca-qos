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
import WarningIcon from '@mui/icons-material/Warning';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import ReplayIcon from '@mui/icons-material/Replay';
import { get } from '../api/client.js';

const SAMPLE_KYC_RESULTS = {
  'KYC-2026-9812': {
    kyc_reference: 'KYC-2026-9812',
    citizen_name: 'Mariama Sesay',
    phone: '+232 76 543 210',
    nin: 'SL-19940812-M',
    operator_name: 'Orange SL',
    status: 'Pending',
    operator_status: 'Pending Orange SL Core Network Activation',
    rejection_reason: '',
    expiry_warning: '',
    timeline: [
      { label: 'Submitted to NatCA Portal', date: '2026-08-01 10:15', done: true },
      { label: 'Redirected to Orange SL Engineering Queue', date: '2026-08-01 10:16', done: true },
      { label: 'NIN & Biometric Check', date: 'In Progress', done: false },
      { label: 'SIM Activated & Certificate Issued', date: 'Pending', done: false }
    ]
  },
  'KYC-2026-9813': {
    kyc_reference: 'KYC-2026-9813',
    citizen_name: 'Amadu Kamara',
    phone: '+232 77 123 456',
    nin: 'SL-19881104-A',
    operator_name: 'Africell',
    status: 'Approved',
    operator_status: 'Confirmed on Africell HLR/HSS Network',
    rejection_reason: '',
    expiry_warning: 'Identity document valid through Nov 2030',
    timeline: [
      { label: 'Submitted to NatCA Portal', date: '2026-07-31 14:22', done: true },
      { label: 'Redirected to Africell', date: '2026-07-31 14:30', done: true },
      { label: 'NIN & Biometric Check Passed', date: '2026-07-31 14:45', done: true },
      { label: 'SIM Active & NatCA Certificate #9813 Issued', date: '2026-07-31 15:00', done: true }
    ]
  },
  'KYC-2026-9814': {
    kyc_reference: 'KYC-2026-9814',
    citizen_name: 'Foday Bangura',
    phone: '+232 30 888 999',
    nin: 'SL-20010315-F',
    operator_name: 'Qcell',
    status: 'Pending',
    operator_status: 'Returned by Qcell NOC — Additional Info Needed',
    rejection_reason: 'The uploaded National ID Card photo was blurred. Please upload a clear photo of the ID Card back.',
    expiry_warning: '',
    timeline: [
      { label: 'Submitted to NatCA Portal', date: '2026-07-30 09:40', done: true },
      { label: 'Redirected to Qcell', date: '2026-07-30 09:41', done: true },
      { label: 'Resubmission Requested by Qcell', date: '2026-07-30 11:12', done: false },
      { label: 'SIM Active', date: 'Pending Resubmission', done: false }
    ]
  }
};

export default function KycStatus() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  // Resubmission State
  const [resubmitting, setResubmitting] = useState(false);
  const [resubmitFile, setResubmitFile] = useState(null);
  const [resubmitSuccess, setResubmitSuccess] = useState(false);

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!query.trim()) return;
    setLoading(true); setError(''); setResult(null); setResubmitSuccess(false);

    try {
      const res = await get(`/kyc/lookup?ref=${encodeURIComponent(query.trim())}`).catch(() => null);
      if (res?.data) {
        const rawStatus = (res.data.status || '').toUpperCase();
        const normStatus = rawStatus.includes('APPROV') ? 'Approved' : rawStatus.includes('REJECT') || rawStatus.includes('SUSPEND') ? 'Reject' : 'Pending';
        setResult({ ...res.data, status: normStatus });
      } else {
        const key = query.trim().toUpperCase();
        if (SAMPLE_KYC_RESULTS[key]) {
          setResult(SAMPLE_KYC_RESULTS[key]);
        } else {
          setError('No KYC registration found for this reference or NIN number. Please check your reference code.');
        }
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
      {/* Page Title */}
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography variant="h4" fontWeight={800} color="primary.main" gutterBottom sx={{ letterSpacing: '-0.02em' }}>
          KYC Status & Operator Verification Lookup
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Track your SIM registration, verify operator status, or resubmit requested identity documents
        </Typography>
      </Box>

      {/* Lookup Input Box */}
      <Paper sx={{ p: 3, mb: 4, borderRadius: 2, border: '1px solid', borderColor: 'divider', boxShadow: 2 }}>
        <form onSubmit={handleSearch}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
            <TextField
              placeholder="Enter KYC Reference (e.g. KYC-2026-9812) or NIN..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
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

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5, textAlign: 'center' }}>
          Sample Lookup References for Demo: <strong>KYC-2026-9812</strong> (Pending), <strong>KYC-2026-9813</strong> (Approved), <strong>KYC-2026-9814</strong> (Pending Resubmission)
        </Typography>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 4, borderRadius: 1.5 }}>{error}</Alert>}

      {/* Result Display Card */}
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
                <Typography variant="caption" color="text.secondary" display="block">
                  NIN: {result.nin}
                </Typography>
              </Box>

              <Stack direction="row" spacing={1.5} alignItems="center">
                {/* Simplified Status Chip: Approved, Pending, Reject */}
                <Chip
                  label={result.status}
                  color={result.status === 'Approved' ? 'success' : result.status === 'Reject' ? 'error' : 'warning'}
                  sx={{ fontWeight: 800, fontSize: 13, py: 2.5, px: 1, borderRadius: 1.5 }}
                />

                <Chip
                  icon={<CellTowerIcon />}
                  label={`Operator: ${result.operator_name}`}
                  sx={{
                    fontWeight: 800,
                    fontSize: 13,
                    py: 2.5,
                    px: 1,
                    borderRadius: 1.5,
                    bgcolor: '#2563eb',
                    color: '#fff'
                  }}
                />
              </Stack>
            </Stack>

            <Divider sx={{ my: 2 }} />

            {/* Operator Redirection Status Alert */}
            <Alert 
              severity={result.status === 'Approved' ? 'success' : result.status === 'Reject' ? 'error' : 'warning'} 
              sx={{ mb: 3, borderRadius: 1.5 }}
            >
              <Typography variant="subtitle2" fontWeight={700}>
                Network Operator Confirmation Status:
              </Typography>
              <Typography variant="body2">{result.operator_status}</Typography>
            </Alert>

            {/* Rejection / Resubmission Required Alert */}
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

                  {/* One-Click Resubmission Upload Box */}
                  <Paper sx={{ p: 2, borderRadius: 1.5, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
                    <Typography variant="subtitle2" fontWeight={700} mb={1}>
                      Upload Clear Replacement Document / Photo:
                    </Typography>

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
                      <Button
                        component="label"
                        variant="outlined"
                        startIcon={<CloudUploadIcon />}
                        sx={{ textTransform: 'none', borderRadius: 1.5 }}
                      >
                        {resubmitFile ? resubmitFile.name : 'Choose Clear ID Image'}
                        <input type="file" hidden accept="image/*,application/pdf" onChange={(e) => setResubmitFile(e.target.files?.[0])} />
                      </Button>

                      <Button
                        variant="contained"
                        color="warning"
                        disabled={!resubmitFile || resubmitting}
                        onClick={handleResubmit}
                        startIcon={resubmitting ? <CircularProgress size={18} color="inherit" /> : <ReplayIcon />}
                        sx={{ borderRadius: 1.5, textTransform: 'none', fontWeight: 700 }}
                      >
                        Resubmit Document
                      </Button>
                    </Stack>

                    {resubmitSuccess && (
                      <Alert severity="success" sx={{ mt: 2, borderRadius: 1.5 }}>
                        Document successfully resubmitted! Sent to {result.operator_name} engineering team for re-evaluation.
                      </Alert>
                    )}
                  </Paper>
                </CardContent>
              </Card>
            )}

            {/* Stepper Timeline */}
            <Typography variant="subtitle2" fontWeight={700} mb={2}>
              KYC Verification & Operator Handshake Timeline:
            </Typography>

            <Stepper activeStep={result.timeline.filter(t => t.done).length} orientation="vertical">
              {result.timeline.map((step, index) => (
                <Step key={index} active={true} completed={step.done}>
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
          </Paper>
        </Stack>
      )}
    </Container>
  );
}
