import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Alert, AlertTitle, Box, Button, CircularProgress, Container, FormControl,
  InputLabel, MenuItem, Paper, Select, Snackbar, Stack, Step, StepLabel,
  Stepper, TextField, Typography, Divider, Chip,
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ContentCopyIcon        from '@mui/icons-material/ContentCopy';
import CloudUploadIcon        from '@mui/icons-material/CloudUpload';
import FaceIcon               from '@mui/icons-material/Face';
import FingerprintIcon        from '@mui/icons-material/Fingerprint';
import CheckCircleIcon        from '@mui/icons-material/CheckCircle';
import CancelIcon             from '@mui/icons-material/Cancel';
import HelpOutlineIcon        from '@mui/icons-material/HelpOutline';
import { get, api }           from '../api/client.js';
import { useAuth }            from '../auth/AuthContext.jsx';
import { verifyFaceAgainstId } from '../utils/faceMatch.js';
import { verifyNinAgainstId, extractIdExpiry } from '../utils/ninOcr.js';
import FaceScanner              from '../components/FaceScanner.jsx';
import CameraAltIcon           from '@mui/icons-material/CameraAlt';

const STEPS = ['Phone & Operator', 'Identity Details', 'Documents', 'Face Photo', 'Review & Submit'];

const ID_TYPES = ['NATIONAL_ID', 'PASSPORT', 'VOTER_CARD', 'DRIVER_LICENSE'];

/* ── File upload button ───────────────────────────────────────────────────── */
function FileField({ label, name, value, onChange, required, capture, accept = 'image/*,application/pdf' }) {
  const isCamera = !!capture;
  const cta = value
    ? `✓ ${value.name}`
    : (isCamera
        ? (capture === 'user' ? `Take selfie` : `Take photo of ${label}`)
        : `Upload ${label}`);
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" display="block" gutterBottom>{label}{required && ' *'}</Typography>
      <Stack direction="row" spacing={1} flexWrap="wrap">
        {isCamera && (
          <Button
            component="label"
            variant="contained"
            startIcon={<CloudUploadIcon />}
            size="small"
            color={value ? 'success' : 'primary'}
            sx={{ textTransform: 'none' }}
          >
            {cta}
            <input type="file" hidden name={name} accept={accept} capture={capture} onChange={onChange} />
          </Button>
        )}
        <Button
          component="label"
          variant={isCamera ? 'outlined' : 'contained'}
          startIcon={<CloudUploadIcon />}
          size="small"
          color={value && !isCamera ? 'success' : 'primary'}
          sx={{ textTransform: 'none' }}
        >
          {isCamera ? 'Or choose from gallery' : cta}
          <input type="file" hidden name={name} accept={accept} onChange={onChange} />
        </Button>
      </Stack>
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

function Step2({ form, set, setForm, districts, chiefdoms }) {
  return (
    <Stack spacing={2.5}>
      <Typography variant="subtitle2" color="text.secondary">
        Enter your personal identity information as it appears on your ID document
      </Typography>
      <Stack direction="row" spacing={2}>
        <TextField label="First Name *" value={form.firstName} onChange={set('firstName')} fullWidth />
        <TextField label="Last Name *"  value={form.lastName}  onChange={set('lastName')}  fullWidth />
      </Stack>
      <TextField
        label="National ID Number (NIN)"
        value={form.nin}
        onChange={(e) => {
          const val = e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 8);
          setForm((f) => ({ ...f, nin: val }));
        }}
        fullWidth
        inputProps={{ maxLength: 8 }}
        helperText={form.nin && form.nin.length !== 8
          ? `NIN must be exactly 8 letters (${form.nin.length}/8)`
          : '8 uppercase letters — e.g. SAXEGTWT'}
        error={!!form.nin && form.nin.length !== 8}
      />
      <TextField label="Date of Birth" type="date" value={form.dateOfBirth} onChange={set('dateOfBirth')} fullWidth InputLabelProps={{ shrink: true }} />
      <TextField label="ID Expiry Date" type="date" value={form.idExpiryDate} onChange={set('idExpiryDate')} fullWidth InputLabelProps={{ shrink: true }} />
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

function Step3({ files, setFile, onIdFrontUploaded }) {
  const handleIdFront = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFile('idFront', file);
    onIdFrontUploaded?.(file);
  };
  return (
    <Stack spacing={3}>
      <Typography variant="subtitle2" color="text.secondary">
        Upload clear photos of your identity document and supporting files
      </Typography>
      <Alert severity="info">Photos must be clear, well-lit, and all corners visible. Accepted formats: JPG, PNG, PDF.</Alert>
      <FileField label="ID Front" name="id_front" capture="environment" accept="image/*"
        value={files.idFront} onChange={handleIdFront} required />
      <FileField label="ID Back"  name="id_back"  capture="environment" accept="image/*"
        value={files.idBack}  onChange={(e) => setFile('idBack',  e.target.files[0])} />
    </Stack>
  );
}

function Step4({ files, setFile }) {
  const [scannerOpen, setScannerOpen] = useState(false);
  return (
    <Stack spacing={3} alignItems="center" textAlign="center">
      <Typography variant="subtitle2" color="text.secondary">
        Scan your face for identity verification
      </Typography>
      <Alert severity="info" sx={{ textAlign: 'left', width: '100%' }}>
        <strong>Tips:</strong> face the camera directly, ensure good lighting, remove glasses/hat if possible.
        The scanner detects your face and captures automatically when you hold still.
      </Alert>

      {files.face ? (
        <>
          <img
            src={URL.createObjectURL(files.face)}
            alt="Face preview"
            style={{ width: 200, height: 200, objectFit: 'cover', borderRadius: 12, border: '3px solid #0d9488' }}
          />
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" size="small" startIcon={<CameraAltIcon />} onClick={() => setScannerOpen(true)}>
              Retake with scanner
            </Button>
            <Button component="label" variant="text" size="small">
              Choose from gallery
              <input type="file" hidden accept="image/*" onChange={(e) => setFile('face', e.target.files[0])} />
            </Button>
          </Stack>
        </>
      ) : (
        <>
          <Button
            variant="contained"
            size="large"
            startIcon={<CameraAltIcon />}
            onClick={() => setScannerOpen(true)}
            sx={{ py: 1.5, px: 4 }}
          >
            Start Face Scan
          </Button>
          <Button component="label" variant="text" size="small">
            Or choose a photo from gallery
            <input type="file" hidden accept="image/*" onChange={(e) => setFile('face', e.target.files[0])} />
          </Button>
        </>
      )}

      <FaceScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onCapture={(file) => setFile('face', file)}
      />
    </Stack>
  );
}

function VerificationRow({ icon, label, state, message, score }) {
  let statusIcon, color;
  if (state === 'running') { statusIcon = <CircularProgress size={16} />; color = 'text.secondary'; }
  else if (state === 'pass') { statusIcon = <CheckCircleIcon fontSize="small" sx={{ color: 'success.main' }} />; color = 'success.main'; }
  else if (state === 'fail') { statusIcon = <CancelIcon      fontSize="small" sx={{ color: 'error.main' }}   />; color = 'error.main'; }
  else if (state === 'skip') { statusIcon = <HelpOutlineIcon fontSize="small" sx={{ color: 'warning.main' }} />; color = 'warning.main'; }
  else                        { statusIcon = null; color = 'text.disabled'; }

  return (
    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start', py: 1 }}>
      <Box sx={{ color: 'primary.main', mt: 0.25 }}>{icon}</Box>
      <Box sx={{ flex: 1 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="subtitle2" fontWeight={700}>{label}</Typography>
          {typeof score === 'number' && (
            <Chip size="small" label={`${score}%`} color={state === 'pass' ? 'success' : state === 'fail' ? 'error' : 'default'} />
          )}
        </Stack>
        <Typography variant="caption" sx={{ display: 'block', color }}>
          {state === 'idle'    && 'Waiting to run…'}
          {state === 'running' && 'Analysing image…'}
          {(state === 'pass' || state === 'fail' || state === 'skip') && message}
        </Typography>
      </Box>
      <Box>{statusIcon}</Box>
    </Box>
  );
}

function VerificationPanel({ verifying, faceResult, ninResult, onRetry }) {
  const faceState = verifying?.face ? 'running' : (faceResult ? (faceResult.ok ? 'pass' : 'fail') : 'idle');
  const ninState  = verifying?.nin  ? 'running' : (ninResult
    ? (ninResult.ok === true ? 'pass' : ninResult.ok === false ? 'fail' : 'skip')
    : 'idle');

  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Identity checks</Typography>
      <VerificationRow
        icon={<FaceIcon fontSize="small" />}
        label="Face on ID matches your selfie"
        state={faceState}
        message={faceResult?.message}
        score={faceResult?.score}
      />
      <Divider />
      <VerificationRow
        icon={<FingerprintIcon fontSize="small" />}
        label="NIN matches text on ID"
        state={ninState}
        message={ninResult?.message}
      />
      {(faceResult || ninResult) && (
        <Button size="small" variant="text" onClick={onRetry} sx={{ mt: 1 }}>
          Re-run checks
        </Button>
      )}
    </Paper>
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
    { l: 'ID Expires',v: form.idExpiryDate },
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
  const [flash, setFlash]       = useState(null); // { ref, status }
  const isGuest = !user;

  // Identity verification state
  const [verifying, setVerifying] = useState({ face: false, nin: false });
  const [faceResult, setFaceResult] = useState(null);
  const [ninResult,  setNinResult]  = useState(null);

  const runVerification = async () => {
    if (!files.idFront || !files.face) return;
    // Reset + start face check
    setFaceResult(null); setNinResult(null);
    setVerifying({ face: true, nin: !!form.nin });

    // Fire both in parallel
    const facePromise = verifyFaceAgainstId({ idFrontFile: files.idFront, selfieFile: files.face })
      .then((r) => setFaceResult(r))
      .catch((e) => setFaceResult({ ok: false, score: 0, message: `Face check error: ${e.message || 'unknown'}` }))
      .finally(() => setVerifying((v) => ({ ...v, face: false })));

    const ninPromise = form.nin
      ? verifyNinAgainstId({ idFrontFile: files.idFront, nin: form.nin })
          .then((r) => setNinResult(r))
          .catch((e) => setNinResult({ ok: null, message: `OCR error: ${e.message || 'unknown'}` }))
          .finally(() => setVerifying((v) => ({ ...v, nin: false })))
      : Promise.resolve();

    await Promise.all([facePromise, ninPromise]);
  };
  const [operators,  setOperators]  = useState([]);
  const [districts,  setDistricts]  = useState([]);
  const [chiefdoms,  setChiefdoms]  = useState([]);

  const [form, setFormState] = useState({
    phone: '', iccid: '', operatorId: '',
    firstName: '', lastName: '', nin: '', dateOfBirth: '', idExpiryDate: '', sex: '',
    nationality: 'Sierra Leonean', idType: '', address: '',
    districtId: '', chiefdomId: '',
  });
  const [files, setFilesState] = useState({ idFront: null, idBack: null, face: null });

  const set    = (k) => (e) => setFormState((f) => ({ ...f, [k]: e.target.value }));
  const setFile = (k, v)   => setFilesState((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    get('/operators').then((r) => setOperators(r.data || [])).catch(() => {});
    get('/districts').then((r) => setDistricts(r.data || [])).catch(() => {});
    // Warm up the Python face match service (Render free tier cold starts ~30s)
    api.get('/kyc/compare-faces').catch(() => {});
  }, []);

  const handleIdFrontUploaded = async (file) => {
    const expiry = await extractIdExpiry(file);
    if (expiry) setFormState((f) => ({ ...f, idExpiryDate: expiry }));
  };

  useEffect(() => {
    if (!form.districtId) { setChiefdoms([]); return; }
    get(`/districts/${form.districtId}/chiefdoms`).then((r) => setChiefdoms(r.data || [])).catch(() => setChiefdoms([]));
  }, [form.districtId]);

  // Auto-run identity checks when user reaches the Review step
  useEffect(() => {
    if (step === 4 && files.idFront && files.face && !faceResult && !verifying.face) {
      runVerification();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const canNext = () => {
    if (step === 0) return !!form.phone && !!form.operatorId;
    if (step === 1) return !!form.firstName && !!form.lastName;
    if (step === 3) return !!files.face;
    return true;
  };

  // Submit blocked if face check is still running or has failed.
  // NIN OCR is best-effort; skip / unknown does NOT block.
  const canSubmit = !loading
    && !verifying.face && !verifying.nin
    && faceResult && faceResult.ok === true;

  const submit = async () => {
    setLoading(true); setErr('');
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v); });
      if (files.idFront) fd.append('id_front', files.idFront);
      if (files.idBack)  fd.append('id_back',  files.idBack);
      if (files.face)    fd.append('face',      files.face);
      if (user?.userId)  fd.append('userId',    user.userId);
      if (typeof faceResult?.score === 'number') fd.append('faceMatchScore', faceResult.score);

      const r = await api.post('/kyc/submit', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const payload = r.data?.data || r.data;
      setSubmitted(payload);
      setFlash({ ref: payload.kyc_reference, status: payload.status || 'PENDING' });
    } catch (ex) {
      setErr(ex.response?.data?.error || ex.message || 'Submission failed. Please try again.');
    } finally { setLoading(false); }
  };

  const copyRef = () => {
    navigator.clipboard.writeText(submitted.kyc_reference);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const flashSnackbar = flash ? (
    <Snackbar
      open
      autoHideDuration={7000}
      onClose={() => setFlash(null)}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
    >
      <Alert
        severity="success"
        variant="filled"
        onClose={() => setFlash(null)}
        sx={{ minWidth: { xs: 300, sm: 420 }, boxShadow: 6 }}
      >
        <AlertTitle sx={{ fontWeight: 700 }}>KYC submitted</AlertTitle>
        <Box sx={{ mt: 0.5, display: 'flex', flexDirection: 'column', gap: 0.25 }}>
          <Typography variant="body2">
            Reference: <strong style={{ fontFamily: 'monospace' }}>{flash.ref}</strong>
          </Typography>
          <Typography variant="body2">Status: <strong>{flash.status}</strong></Typography>
        </Box>
      </Alert>
    </Snackbar>
  ) : null;

  if (submitted) {
    return (
      <>
      {flashSnackbar}
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
          {isGuest && (
            <Alert severity="info" sx={{ mb: 3, textAlign: 'left' }}>
              <strong>Save your reference number.</strong> Without an account you will need it to check your status.
              Look it up any time at <Link to="/kyc/status" style={{ fontWeight: 600 }}>Check KYC Status</Link>.
            </Alert>
          )}
          <Stack spacing={1.5} direction={{ xs: 'column', sm: 'row' }} justifyContent="center">
            <Button variant="contained" onClick={() => navigate('/kyc/status')}>Check Status</Button>
            <Button variant="outlined" onClick={() => navigate('/')}>Back to Home</Button>
          </Stack>
        </Paper>
      </Container>
      </>
    );
  }

  const stepComponents = [
    <Step1 form={form} set={set} operators={operators} />,
    <Step2 form={form} set={set} setForm={setFormState} districts={districts} chiefdoms={chiefdoms} />,
    <Step3 files={files} setFile={setFile} onIdFrontUploaded={handleIdFrontUploaded} />,
    <Step4 files={files} setFile={setFile} />,
    <Step5 form={form} files={files} operators={operators} />,
  ];

  return (
    <>
    {flashSnackbar}
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
        {step === 4 && (
          <VerificationPanel
            verifying={verifying}
            faceResult={faceResult}
            ninResult={ninResult}
            onRetry={runVerification}
          />
        )}
        {stepComponents[step]}
      </Paper>

      <Stack spacing={1}>
        {step === STEPS.length - 1 && !canSubmit && !loading && (
          <Typography variant="caption" color="text.secondary" textAlign="right">
            {verifying.face || verifying.nin
              ? 'Running identity checks…'
              : !faceResult
                ? 'Waiting for face verification to complete'
                : faceResult.ok === false
                  ? 'Face check failed — retake your photo or re-run checks above'
                  : ''}
          </Typography>
        )}
        <Stack direction="row" justifyContent="space-between">
          <Button disabled={step === 0 || loading} onClick={() => setStep((s) => s - 1)} variant="outlined">
            Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button variant="contained" disabled={!canNext()} onClick={() => setStep((s) => s + 1)}>
              Next
            </Button>
          ) : (
            <Stack direction="row" spacing={1} alignItems="center">
              {faceResult && !faceResult.ok && !verifying.face && (
                <Button
                  variant="text"
                  color="warning"
                  size="small"
                  disabled={loading}
                  onClick={submit}
                  sx={{ whiteSpace: 'nowrap' }}
                >
                  Submit anyway
                </Button>
              )}
              <Button
                variant="contained"
                color="success"
                disabled={!canSubmit || loading}
                onClick={submit}
                sx={{ minWidth: 160 }}
              >
                {loading
                  ? <CircularProgress size={22} color="inherit" />
                  : verifying.face || verifying.nin
                    ? 'Checking…'
                    : 'Submit Registration'}
              </Button>
            </Stack>
          )}
        </Stack>
      </Stack>
    </Container>
    </>
  );
}
