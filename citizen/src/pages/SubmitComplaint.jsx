import { useState, useEffect } from 'react';
import { useNavigate }         from 'react-router-dom';
import {
  Box, Button, Container, Paper, Stack, Stepper, Step, StepLabel,
  Typography, Alert, CircularProgress, TextField, MenuItem,
  FormControl, InputLabel, Select, Divider, Chip,
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ContentCopyIcon        from '@mui/icons-material/ContentCopy';
import PersonOutlineIcon      from '@mui/icons-material/PersonOutline';
import { post, get }          from '../api/client.js';
import { useAuth }            from '../auth/AuthContext.jsx';
import { collectDiagnostics } from '../utils/diagnostics.js';

const STEPS_AUTH  = ['Category', 'Details', 'Location', 'Review & Submit'];
const STEPS_GUEST = ['Category', 'Details', 'Location', 'Contact Info', 'Review & Submit'];

const ISSUE_TYPES = [
  'CALL_DROP', 'NO_SIGNAL', 'SLOW_INTERNET', 'NETWORK_OUTAGE', 'SMS_FAILURE',
  'BILLING_ERROR', 'UNAUTHORIZED_CHARGE', 'SIM_REGISTRATION', 'DATA_THROTTLING',
  'ROAMING_ISSUE', 'CUSTOMER_SERVICE', 'OTHER',
];

function StepCategory({ form, set, categories, operators }) {
  return (
    <Stack spacing={2.5}>
      <Typography variant="subtitle2" color="text.secondary">
        Choose the type of telecom issue you are experiencing
      </Typography>
      <FormControl fullWidth required>
        <InputLabel>Operator *</InputLabel>
        <Select value={form.operatorId} label="Operator *" onChange={set('operatorId')}>
          <MenuItem value="">— Select operator —</MenuItem>
          {operators.map((o) => (
            <MenuItem key={o.operator_id} value={o.operator_id}>{o.operator_name}</MenuItem>
          ))}
        </Select>
      </FormControl>
      <FormControl fullWidth>
        <InputLabel>Category</InputLabel>
        <Select value={form.categoryId} label="Category" onChange={set('categoryId')}>
          <MenuItem value="">— General —</MenuItem>
          {categories.map((c) => (
            <MenuItem key={c.category_id} value={c.category_id}>{c.name}</MenuItem>
          ))}
        </Select>
      </FormControl>
      <FormControl fullWidth required>
        <InputLabel>Issue Type *</InputLabel>
        <Select value={form.issueType} label="Issue Type *" onChange={set('issueType')}>
          <MenuItem value="">— Select issue —</MenuItem>
          {ISSUE_TYPES.map((t) => (
            <MenuItem key={t} value={t}>{t.replace(/_/g, ' ')}</MenuItem>
          ))}
        </Select>
      </FormControl>
      <FormControl fullWidth>
        <InputLabel>Severity</InputLabel>
        <Select value={form.severity} label="Severity" onChange={set('severity')}>
          {['LOW','MEDIUM','HIGH','CRITICAL'].map((s) => (
            <MenuItem key={s} value={s}>{s}</MenuItem>
          ))}
        </Select>
      </FormControl>
    </Stack>
  );
}

function StepDetails({ form, set }) {
  return (
    <Stack spacing={2.5}>
      <Typography variant="subtitle2" color="text.secondary">
        Describe the issue in as much detail as possible
      </Typography>
      <TextField
        label="Description *"
        multiline rows={5} fullWidth required
        value={form.description}
        onChange={set('description')}
        placeholder="Describe the issue: when it started, how often, what error messages you see…"
        helperText={`${form.description.length}/2000 characters`}
        inputProps={{ maxLength: 2000 }}
      />
      {['BILLING_ERROR','UNAUTHORIZED_CHARGE'].includes(form.issueType) && (
        <>
          <Divider />
          <Typography variant="subtitle2" fontWeight={700}>Billing Details</Typography>
          <TextField label="Sub-category" value={form.billingSubCategory} onChange={set('billingSubCategory')} fullWidth />
          <TextField label="Transaction Reference" value={form.transactionRef} onChange={set('transactionRef')} fullWidth />
          <TextField label="Disputed Amount (SLL)" type="number" value={form.disputedAmount} onChange={set('disputedAmount')} fullWidth />
          <TextField label="Transaction Date" type="date" value={form.transactionDate} onChange={set('transactionDate')} fullWidth InputLabelProps={{ shrink: true }} />
        </>
      )}
    </Stack>
  );
}

function StepLocation({ form, set, districts, chiefdoms }) {
  return (
    <Stack spacing={2.5}>
      <Typography variant="subtitle2" color="text.secondary">
        Where did you experience the problem?
      </Typography>
      <FormControl fullWidth>
        <InputLabel>District</InputLabel>
        <Select value={form.districtId} label="District" onChange={set('districtId')}>
          <MenuItem value="">— Select district —</MenuItem>
          {districts.map((d) => (
            <MenuItem key={d.district_id} value={d.district_id}>{d.name}</MenuItem>
          ))}
        </Select>
      </FormControl>
      {chiefdoms.length > 0 && (
        <FormControl fullWidth>
          <InputLabel>Chiefdom</InputLabel>
          <Select value={form.chiefdomId} label="Chiefdom" onChange={set('chiefdomId')}>
            <MenuItem value="">— Select chiefdom —</MenuItem>
            {chiefdoms.map((c) => (
              <MenuItem key={c.chiefdom_id} value={c.chiefdom_id}>{c.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
      )}
      <TextField
        label="Area / Street detail"
        value={form.areaDetail}
        onChange={set('areaDetail')}
        fullWidth
        placeholder="e.g. Wilberforce Street, near Lumley Beach"
      />
    </Stack>
  );
}

function StepContact({ form, set }) {
  return (
    <Stack spacing={2.5}>
      <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start', p: 2, bgcolor: 'info.main', color: 'info.contrastText', borderRadius: 1.5 }}>
        <PersonOutlineIcon sx={{ mt: 0.25, flexShrink: 0 }} />
        <Box>
          <Typography variant="subtitle2" fontWeight={700}>How can NatCA reach you?</Typography>
          <Typography variant="body2" sx={{ opacity: 0.92 }}>
            Providing your contact details lets our team follow up on your complaint. At least one contact method is required.
          </Typography>
        </Box>
      </Box>
      <TextField
        label="Full Name *"
        value={form.contactName}
        onChange={set('contactName')}
        fullWidth required
        placeholder="Your full name"
      />
      <TextField
        label="Phone Number"
        value={form.contactPhone}
        onChange={set('contactPhone')}
        fullWidth
        placeholder="+232 76 000 000"
        helperText="Required if no email provided"
      />
      <TextField
        label="Email Address"
        type="email"
        value={form.contactEmail}
        onChange={set('contactEmail')}
        fullWidth
        placeholder="you@example.com"
        helperText="Required if no phone provided"
      />
    </Stack>
  );
}

function DiagnosticsPanel({ diag, loading }) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
        Network diagnostics {loading && <CircularProgress size={12} sx={{ ml: 1 }} />}
      </Typography>
      {!diag && !loading && (
        <Typography variant="body2" color="text.secondary">Not collected yet.</Typography>
      )}
      {diag && (
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.5, fontSize: 13 }}>
          <Typography variant="caption" color="text.secondary">Location</Typography>
          <Typography variant="caption" fontFamily="monospace">
            {diag.geo?.available
              ? `${diag.geo.latitude.toFixed(4)}, ${diag.geo.longitude.toFixed(4)} (±${Math.round(diag.geo.accuracy_m)}m)`
              : `unavailable (${diag.geo?.reason || 'unknown'})`}
          </Typography>

          <Typography variant="caption" color="text.secondary">Connection</Typography>
          <Typography variant="caption" fontFamily="monospace">
            {diag.connection?.available
              ? `${(diag.connection.effectiveType || '?').toUpperCase()} · ${diag.connection.downlinkMbps ?? '?'} Mbps · ${diag.connection.rttMs ?? '?'} ms`
              : 'unavailable'}
          </Typography>

          <Typography variant="caption" color="text.secondary">Ping to NatCA</Typography>
          <Typography variant="caption" fontFamily="monospace">
            {diag.ping?.available ? `${diag.ping.rttMs} ms` : 'unavailable'}
          </Typography>

          <Typography variant="caption" color="text.secondary">Device</Typography>
          <Typography variant="caption" fontFamily="monospace" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {diag.device?.platform} · {diag.device?.screen}
          </Typography>
        </Box>
      )}
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5, fontStyle: 'italic' }}>
        This information helps NatCA investigate the issue. Radio-level details (signal strength, band) require the mobile app.
      </Typography>
    </Paper>
  );
}

function StepReview({ form, operators, categories, isGuest, diag, diagLoading }) {
  const op  = operators.find((o) => String(o.operator_id) === String(form.operatorId));
  const cat = categories.find((c) => String(c.category_id) === String(form.categoryId));

  const rows = [
    { l: 'Operator',   v: op?.operator_name || '—' },
    { l: 'Category',   v: cat?.name || '—' },
    { l: 'Issue Type', v: form.issueType?.replace(/_/g, ' ') || '—' },
    { l: 'Severity',   v: form.severity },
    { l: 'District',   v: form.districtId ? 'Selected' : '—' },
    { l: 'Area',       v: form.areaDetail || '—' },
    ...(isGuest ? [
      { l: 'Contact Name',  v: form.contactName || '—' },
      { l: 'Phone',         v: form.contactPhone || '—' },
      { l: 'Email',         v: form.contactEmail || '—' },
    ] : []),
  ];

  return (
    <Stack spacing={2}>
      <Typography variant="subtitle2" color="text.secondary">
        Review your complaint before submitting
      </Typography>
      <Paper variant="outlined" sx={{ p: 2 }}>
        {rows.map(({ l, v }) => (
          <Box key={l} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.75, borderBottom: '1px solid', borderColor: 'divider', '&:last-child': { borderBottom: 0 } }}>
            <Typography variant="body2" color="text.secondary">{l}</Typography>
            <Typography variant="body2" fontWeight={600}>{v}</Typography>
          </Box>
        ))}
      </Paper>
      <Typography variant="subtitle2" fontWeight={700}>Description</Typography>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="body2">{form.description}</Typography>
      </Paper>
      <DiagnosticsPanel diag={diag} loading={diagLoading} />
    </Stack>
  );
}

export default function SubmitComplaint() {
  const { user }  = useAuth();
  const navigate  = useNavigate();
  const isGuest   = !user;

  const STEPS = isGuest ? STEPS_GUEST : STEPS_AUTH;

  const [step, setStep]           = useState(0);
  const [loading, setLoading]     = useState(false);
  const [err, setErr]             = useState('');
  const [submitted, setSubmitted] = useState(null);
  const [copied, setCopied]       = useState(false);

  const [operators,  setOperators]  = useState([]);
  const [categories, setCategories] = useState([]);
  const [districts,  setDistricts]  = useState([]);
  const [chiefdoms,  setChiefdoms]  = useState([]);
  const [diag,       setDiag]       = useState(null);
  const [diagLoading,setDiagLoading]= useState(false);

  const [form, setForm] = useState({
    operatorId: '', categoryId: '', issueType: '', severity: 'MEDIUM',
    description: '',
    billingSubCategory: '', transactionRef: '', disputedAmount: '', transactionDate: '',
    districtId: '', chiefdomId: '', areaDetail: '',
    contactName: '', contactPhone: '', contactEmail: '',
  });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  useEffect(() => {
    get('/operators').then((r) => setOperators(r.data || [])).catch(() => {});
    get('/complaints/categories').then((r) => setCategories(r.data || [])).catch(() => {});
    get('/districts').then((r) => setDistricts(r.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!form.districtId) { setChiefdoms([]); setForm((f) => ({ ...f, chiefdomId: '' })); return; }
    get(`/districts/${form.districtId}/chiefdoms`).then((r) => setChiefdoms(r.data || [])).catch(() => setChiefdoms([]));
  }, [form.districtId]);

  // Resolve which logical step index maps to which step name, accounting for the extra guest step
  const STEP_CATEGORY = 0;
  const STEP_DETAILS  = 1;
  const STEP_LOCATION = 2;
  const STEP_CONTACT  = isGuest ? 3 : -1;
  const STEP_REVIEW   = isGuest ? 4 : 3;

  // Collect diagnostics when user reaches the review step
  useEffect(() => {
    if (step === STEP_REVIEW && !diag && !diagLoading) {
      setDiagLoading(true);
      collectDiagnostics({ withLocation: true })
        .then((d) => setDiag(d))
        .finally(() => setDiagLoading(false));
    }
  }, [step, diag, diagLoading, STEP_REVIEW]);

  const canNext = () => {
    if (step === STEP_CATEGORY) return !!form.operatorId && !!form.issueType;
    if (step === STEP_DETAILS)  return form.description.trim().length >= 10;
    if (step === STEP_CONTACT)  return !!form.contactName.trim() && (!!form.contactPhone.trim() || !!form.contactEmail.trim());
    return true;
  };

  const submit = async () => {
    setLoading(true); setErr('');
    // Guarantee we have diagnostics — collect now if not already
    const diagnostics = diag || await collectDiagnostics({ withLocation: true });
    try {
      const res = await post('/complaints/submit', {
        operatorId:         form.operatorId   || undefined,
        categoryId:         form.categoryId   || undefined,
        issueType:          form.issueType,
        severity:           form.severity,
        districtId:         form.districtId   || undefined,
        chiefdomId:         form.chiefdomId   || undefined,
        areaDetail:         form.areaDetail   || undefined,
        latitude:           diagnostics.geo?.latitude,
        longitude:          diagnostics.geo?.longitude,
        description:        form.description,
        billingSubCategory: form.billingSubCategory || undefined,
        transactionRef:     form.transactionRef     || undefined,
        disputedAmount:     form.disputedAmount      ? Number(form.disputedAmount) : undefined,
        transactionDate:    form.transactionDate     || undefined,
        contactName:        isGuest ? form.contactName  || undefined : undefined,
        contactPhone:       isGuest ? form.contactPhone || undefined : undefined,
        contactEmail:       isGuest ? form.contactEmail || undefined : undefined,
        networkDiagnostics: diagnostics,
        source:             'WEB',
        userId:             user?.userId,
      });
      setSubmitted(res.data);
    } catch (ex) {
      setErr(ex.response?.data?.error || 'Submission failed. Please try again.');
    } finally { setLoading(false); }
  };

  const copyRef = () => {
    navigator.clipboard.writeText(submitted.complaint_ref || submitted.complaintRef);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (submitted) {
    const ref = submitted.complaint_ref || submitted.complaintRef;
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Paper sx={{ p: 5, textAlign: 'center' }}>
          <CheckCircleOutlineIcon sx={{ fontSize: 72, color: 'success.main', mb: 2 }} />
          <Typography variant="h5" fontWeight={700} gutterBottom>Complaint Submitted!</Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Your complaint has been received. Use the reference number below to track its status.
          </Typography>
          <Paper variant="outlined" sx={{ p: 2, mb: 3, display: 'inline-flex', alignItems: 'center', gap: 1.5, cursor: 'pointer' }} onClick={copyRef}>
            <Typography variant="h6" fontFamily="monospace" color="primary.main">{ref}</Typography>
            <ContentCopyIcon fontSize="small" color={copied ? 'success' : 'action'} />
          </Paper>
          {copied && <Typography variant="caption" color="success.main" display="block" sx={{ mb: 2 }}>Copied!</Typography>}
          <Chip label={submitted.status} color="warning" sx={{ mb: 3 }} />
          {isGuest && (
            <Alert severity="info" sx={{ mb: 3, textAlign: 'left' }}>
              <strong>Save your reference number.</strong> Without an account you will need it to track your complaint.
              You can also <Link to="/register" style={{ fontWeight: 600 }}>create a free account</Link> to track complaints automatically.
            </Alert>
          )}
          <Stack spacing={1.5} direction={{ xs: 'column', sm: 'row' }} justifyContent="center">
            <Button variant="contained" onClick={() => navigate(`/track?ref=${ref}`)}>Track This Complaint</Button>
            <Button variant="outlined" onClick={() => navigate('/')}>Back to Home</Button>
          </Stack>
        </Paper>
      </Container>
    );
  }

  const stepComponents = [
    <StepCategory key="cat"  form={form} set={set} categories={categories} operators={operators} />,
    <StepDetails  key="det"  form={form} set={set} />,
    <StepLocation key="loc"  form={form} set={set} districts={districts} chiefdoms={chiefdoms} />,
    ...(isGuest ? [<StepContact key="con" form={form} set={set} />] : []),
    <StepReview   key="rev"  form={form} operators={operators} categories={categories} isGuest={isGuest} diag={diag} diagLoading={diagLoading} />,
  ];

  return (
    <Container maxWidth="sm" sx={{ py: 5 }}>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 0.5 }}>Submit a Complaint</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: isGuest ? 2 : 3 }}>
        Report telecom service issues to NatCA for investigation and resolution
      </Typography>

      <Stepper activeStep={step} alternativeLabel sx={{ mb: 4 }}>
        {STEPS.map((l) => <Step key={l}><StepLabel>{l}</StepLabel></Step>)}
      </Stepper>

      {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}

      <Paper sx={{ p: { xs: 2.5, sm: 3.5 }, mb: 3 }}>
        {stepComponents[step]}
      </Paper>

      <Stack direction="row" justifyContent="space-between">
        <Button disabled={step === 0 || loading} onClick={() => setStep((s) => s - 1)} variant="outlined">
          Back
        </Button>
        {step < STEPS.length - 1 ? (
          <Button variant="contained" disabled={!canNext()} onClick={() => setStep((s) => s + 1)}>
            Next
          </Button>
        ) : (
          <Button variant="contained" color="success" disabled={loading} onClick={submit}>
            {loading ? <CircularProgress size={22} /> : 'Submit Complaint'}
          </Button>
        )}
      </Stack>
    </Container>
  );
}
