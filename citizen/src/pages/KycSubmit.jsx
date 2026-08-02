import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert, Box, Button, CircularProgress, Container, FormControl,
  InputLabel, MenuItem, Paper, Select, Stack, Step, StepLabel,
  Stepper, TextField, Typography, Divider, Chip,
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ContentCopyIcon        from '@mui/icons-material/ContentCopy';
import CloudUploadIcon        from '@mui/icons-material/CloudUpload';
import { get }                from '../api/client.js';
import { useAuth }            from '../auth/AuthContext.jsx';

const STEPS = ['Phone & Operator', 'Identity Details', 'Documents', 'Face Photo', 'Review & Submit'];

const ID_TYPES = ['NATIONAL_ID', 'PASSPORT', 'VOTER_CARD', 'DRIVER_LICENSE'];

/* ── File upload button ───────────────────────────────────────────────────── */
function FileField({ label, name, value, onChange, required }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" display="block" gutterBottom>{label}{required && ' *'}</Typography>
      <Button component="label" variant="outlined" startIcon={<CloudUploadIcon />} size="small"
        color={value ? 'success' : 'primary'} sx={{ textTransform: 'none' }}>
        {value ? `✓ ${value.name}` : `Upload ${label}`}
        <input type="file" hidden name={name} accept="image/*,application/pdf" onChange={onChange} />
      </Button>
    </Box>
  );
}

/* ── Steps ────────────────────────────────────────────────────────────────── */
function Step1({ form, set, operators }) {
  return (
    <Stack spacing={2.5}>
      <Typography variant="subtitle2" color="text.secondary">
        Provide the phone number you want to register and your telecom operator
      </Typography>
      <TextField label="Phone Number *" value={form.phone} onChange={set('phone')} fullWidth
        placeholder="+232 XX XXXXXX" required />
      <TextField label="ICCID (SIM Card Number)" value={form.iccid} onChange={set('iccid')} fullWidth
        placeholder="19-digit number on SIM card" />
      <FormControl fullWidth required>
        <InputLabel>Operator *</InputLabel>
        <Select value={form.operatorId} label="Operator *" onChange={set('operatorId')}>
          <MenuItem value="">— Select operator —</MenuItem>
          {operators.map((o) => <MenuItem key={o.operator_id} value={o.operator_id}>{o.operator_name}</MenuItem>)}
        </Select>
      </FormControl>
    </Stack>
  );
}

function Step2({ form, set, districts, chiefdoms }) {
  return (
    <Stack spacing={2.5}>
      <Typography variant="subtitle2" color="text.secondary">
        Enter your personal identity information as it appears on your ID document
      </Typography>
      <Stack direction="row" spacing={2}>
        <TextField label="First Name *" value={form.firstName} onChange={set('firstName')} fullWidth />
        <TextField label="Last Name *"  value={form.lastName}  onChange={set('lastName')}  fullWidth />
      </Stack>
      <TextField label="National ID Number (NIN)" value={form.nin} onChange={set('nin')} fullWidth />
      <TextField label="Date of Birth" type="date" value={form.dateOfBirth} onChange={set('dateOfBirth')} fullWidth InputLabelProps={{ shrink: true }} />
      <FormControl fullWidth>
        <InputLabel>Sex</InputLabel>
        <Select value={form.sex} label="Sex" onChange={set('sex')}>
          <MenuItem value="">— Select —</MenuItem>
          <MenuItem value="MALE">Male</MenuItem>
          <MenuItem value="FEMALE">Female</MenuItem>
          <MenuItem value="OTHER">Other</MenuItem>
        </Select>
      </FormControl>
      <TextField label="Nationality" value={form.nationality} onChange={set('nationality')} fullWidth defaultValue="Sierra Leonean" />
      <FormControl fullWidth>
        <InputLabel>ID Type</InputLabel>
        <Select value={form.idType} label="ID Type" onChange={set('idType')}>
          <MenuItem value="">— Select —</MenuItem>
          {ID_TYPES.map((t) => <MenuItem key={t} value={t}>{t.replace(/_/g, ' ')}</MenuItem>)}
        </Select>
      </FormControl>
      <FormControl fullWidth>
        <InputLabel>District</InputLabel>
        <Select value={form.districtId} label="District" onChange={set('districtId')}>
          <MenuItem value="">— Select —</MenuItem>
          {districts.map((d) => <MenuItem key={d.district_id} value={d.district_id}>{d.name}</MenuItem>)}
        </Select>
      </FormControl>
      {chiefdoms.length > 0 && (
        <FormControl fullWidth>
          <InputLabel>Chiefdom</InputLabel>
          <Select value={form.chiefdomId} label="Chiefdom" onChange={set('chiefdomId')}>
            <MenuItem value="">— Select —</MenuItem>
            {chiefdoms.map((c) => <MenuItem key={c.chiefdom_id} value={c.chiefdom_id}>{c.name}</MenuItem>)}
          </Select>
        </FormControl>
      )}
      <TextField label="Address" value={form.address} onChange={set('address')} fullWidth multiline rows={2} />
    </Stack>
  );
}

function Step3({ files, setFile }) {
  return (
    <Stack spacing={3}>
      <Typography variant="subtitle2" color="text.secondary">
        Upload clear photos of your identity document and supporting files
      </Typography>
      <Alert severity="info">Photos must be clear, well-lit, and all corners visible. Accepted formats: JPG, PNG, PDF.</Alert>
      <FileField label="ID Front"    name="id_front" value={files.idFront} onChange={(e) => setFile('idFront', e.target.files[0])} required />
      <FileField label="ID Back"     name="id_back"  value={files.idBack}  onChange={(e) => setFile('idBack',  e.target.files[0])} />
    </Stack>
  );
}

function Step4({ files, setFile }) {
  return (
    <Stack spacing={3} alignItems="center" textAlign="center">
      <Typography variant="subtitle2" color="text.secondary">
        Take a clear selfie photo for face verification
      </Typography>
      <Alert severity="info" sx={{ textAlign: 'left' }}>
        <strong>Tips:</strong> face the camera directly, ensure good lighting, remove glasses/hat if possible.
      </Alert>
      <FileField label="Selfie / Face Photo" name="face" value={files.face} onChange={(e) => setFile('face', e.target.files[0])} required />
      {files.face && (
        <Box sx={{ mt: 1 }}>
          <img
            src={URL.createObjectURL(files.face)}
            alt="Face preview"
            style={{ width: 160, height: 160, objectFit: 'cover', borderRadius: 8, border: '2px solid #0d9488' }}
          />
        </Box>
      )}
    </Stack>
  );
}

function Step5({ form, files, operators }) {
  const op = operators.find((o) => String(o.operator_id) === String(form.operatorId));
  const rows = [
    { l: 'Phone',     v: form.phone },
    { l: 'Operator',  v: op?.operator_name },
    { l: 'ICCID',     v: form.iccid },
    { l: 'Full Name', v: [form.firstName, form.lastName].filter(Boolean).join(' ') },
    { l: 'NIN',       v: form.nin },
    { l: 'DOB',       v: form.dateOfBirth },
    { l: 'ID Type',   v: form.idType?.replace(/_/g, ' ') },
  ];
  return (
    <Stack spacing={2}>
      <Typography variant="subtitle2" color="text.secondary">Review your details before submitting</Typography>
      <Paper variant="outlined" sx={{ p: 2 }}>
        {rows.filter((r) => r.v).map(({ l, v }) => (
          <Box key={l} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.75, borderBottom: '1px solid', borderColor: 'divider', '&:last-child': { borderBottom: 0 } }}>
            <Typography variant="body2" color="text.secondary">{l}</Typography>
            <Typography variant="body2" fontWeight={600}>{v}</Typography>
          </Box>
        ))}
      </Paper>
      <Typography variant="subtitle2" fontWeight={700}>Documents</Typography>
      <Stack direction="row" spacing={1} flexWrap="wrap">
        {files.idFront && <Chip size="small" color="success" label="✓ ID Front" />}
        {files.idBack  && <Chip size="small" color="success" label="✓ ID Back" />}
        {files.face    && <Chip size="small" color="success" label="✓ Face Photo" />}
        {!files.idFront && !files.idBack && !files.face && <Chip size="small" label="No documents" color="warning" />}
      </Stack>
    </Stack>
  );
}

/* ── Main Component ──────────────────────────────────────────────────────── */
export default function KycSubmit() {
  const navigate  = useNavigate();
  const { user }  = useAuth();
  const [step, setStep]         = useState(0);
  const [loading, setLoading]   = useState(false);
  const [err, setErr]           = useState('');
  const [submitted, setSubmitted] = useState(null);
  const [copied, setCopied]     = useState(false);
  const [operators,  setOperators]  = useState([]);
  const [districts,  setDistricts]  = useState([]);
  const [chiefdoms,  setChiefdoms]  = useState([]);

  const [form, setFormState] = useState({
    phone: '', iccid: '', operatorId: '',
    firstName: '', lastName: '', nin: '', dateOfBirth: '', sex: '',
    nationality: 'Sierra Leonean', idType: '', address: '',
    districtId: '', chiefdomId: '',
  });
  const [files, setFilesState] = useState({ idFront: null, idBack: null, face: null });

  const set    = (k) => (e) => setFormState((f) => ({ ...f, [k]: e.target.value }));
  const setFile = (k, v)   => setFilesState((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    get('/operators').then((r) => setOperators(r.data || [])).catch(() => {});
    get('/districts').then((r) => setDistricts(r.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!form.districtId) { setChiefdoms([]); return; }
    get(`/districts/${form.districtId}/chiefdoms`).then((r) => setChiefdoms(r.data || [])).catch(() => setChiefdoms([]));
  }, [form.districtId]);

  const canNext = () => {
    if (step === 0) return !!form.phone && !!form.operatorId;
    if (step === 1) return !!form.firstName && !!form.lastName;
    if (step === 3) return !!files.face;
    return true;
  };

  const submit = async () => {
    setLoading(true); setErr('');
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v); });
      if (files.idFront) fd.append('id_front', files.idFront);
      if (files.idBack)  fd.append('id_back',  files.idBack);
      if (files.face)    fd.append('face',      files.face);
      if (user?.userId)  fd.append('userId',    user.userId);

      const r = await fetch('/api/v1/kyc/submit', {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('cms_access') || ''}` },
        body: fd,
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error || 'Submission failed');
      setSubmitted(json.data || json);
    } catch (ex) {
      setErr(ex.message || 'Submission failed. Please try again.');
    } finally { setLoading(false); }
  };

  const copyRef = () => {
    navigator.clipboard.writeText(submitted.kyc_reference);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (submitted) {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Paper sx={{ p: 5, textAlign: 'center' }}>
          <CheckCircleOutlineIcon sx={{ fontSize: 72, color: 'success.main', mb: 2 }} />
          <Typography variant="h5" fontWeight={700} gutterBottom>KYC Submitted!</Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Your SIM registration request has been received and is under review. You will be notified of the outcome.
          </Typography>
          <Paper variant="outlined" sx={{ p: 2, mb: 3, display: 'inline-flex', alignItems: 'center', gap: 1.5, cursor: 'pointer' }} onClick={copyRef}>
            <Typography variant="h6" fontFamily="monospace" color="primary.main">{submitted.kyc_reference}</Typography>
            <ContentCopyIcon fontSize="small" color={copied ? 'success' : 'action'} />
          </Paper>
          {copied && <Typography variant="caption" color="success.main" display="block" sx={{ mb: 2 }}>Copied!</Typography>}
          <Chip label={submitted.status || 'PENDING'} color="warning" sx={{ mb: 3 }} />
          <Stack spacing={1.5} direction={{ xs: 'column', sm: 'row' }} justifyContent="center">
            <Button variant="contained" onClick={() => navigate('/')}>Back to Home</Button>
          </Stack>
        </Paper>
      </Container>
    );
  }

  const stepComponents = [
    <Step1 form={form} set={set} operators={operators} />,
    <Step2 form={form} set={set} districts={districts} chiefdoms={chiefdoms} />,
    <Step3 files={files} setFile={setFile} />,
    <Step4 files={files} setFile={setFile} />,
    <Step5 form={form} files={files} operators={operators} />,
  ];

  return (
    <Container maxWidth="sm" sx={{ py: 5 }}>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 0.5 }}>SIM Registration (KYC)</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Submit your identity details to verify and register your SIM card with NatCA
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
            {loading ? <CircularProgress size={22} /> : 'Submit Registration'}
          </Button>
        )}
      </Stack>
    </Container>
  );
}
