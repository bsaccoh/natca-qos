import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, IconButton, Stack, Typography,
} from '@mui/material';
import CloseIcon        from '@mui/icons-material/Close';
import CameraAltIcon    from '@mui/icons-material/CameraAlt';
import * as faceapi from '@vladmandic/face-api';

const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.13/model';

// Debounce detection loop
const DETECT_INTERVAL_MS = 400;
// How long a face must be steadily detected before auto-capture (ms)
const STABLE_MS_TO_CAPTURE = 1500;

let modelsLoaded = false;
let modelsLoading = null;
async function loadDetectorModel() {
  if (modelsLoaded) return;
  if (!modelsLoading) {
    modelsLoading = faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL)
      .then(() => { modelsLoaded = true; });
  }
  await modelsLoading;
}

export default function FaceScanner({ open, onClose, onCapture }) {
  const videoRef  = useRef(null);
  const canvasRef = useRef(null);
  const overlayRef = useRef(null);
  const streamRef = useRef(null);
  const detectTimer = useRef(null);
  const stableSince = useRef(null);

  const [status, setStatus] = useState('starting');   // starting | ready | detected | stable | error | captured
  const [error, setError]   = useState('');
  const [modelReady, setModelReady] = useState(false);

  // Load face detector model
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setStatus('starting'); setError('');
    loadDetectorModel()
      .then(() => { if (!cancelled) setModelReady(true); })
      .catch((e) => { if (!cancelled) { setError(`Could not load face model: ${e.message}`); setStatus('error'); } });
    return () => { cancelled = true; };
  }, [open]);

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStatus('ready');
    } catch (e) {
      setError(e.name === 'NotAllowedError'
        ? 'Camera permission denied. Please allow camera access and try again.'
        : `Could not start camera: ${e.message}`);
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    if (!open || !modelReady) return;
    startCamera();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (detectTimer.current) { clearInterval(detectTimer.current); detectTimer.current = null; }
      stableSince.current = null;
    };
  }, [open, modelReady, startCamera]);

  // Detection loop
  useEffect(() => {
    if (status !== 'ready' && status !== 'detected' && status !== 'stable') return;
    if (!videoRef.current) return;

    const opts = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.4 });

    detectTimer.current = setInterval(async () => {
      const video = videoRef.current;
      if (!video || video.videoWidth === 0) return;

      const detection = await faceapi.detectSingleFace(video, opts);
      const overlay = overlayRef.current;
      if (!overlay) return;
      const ctx = overlay.getContext('2d');
      overlay.width  = video.videoWidth;
      overlay.height = video.videoHeight;
      ctx.clearRect(0, 0, overlay.width, overlay.height);

      // Draw guide oval
      ctx.strokeStyle = detection ? '#5be12c' : '#ffffff';
      ctx.lineWidth = 4;
      ctx.beginPath();
      const cx = overlay.width / 2;
      const cy = overlay.height / 2;
      ctx.ellipse(cx, cy, overlay.width * 0.28, overlay.height * 0.38, 0, 0, Math.PI * 2);
      ctx.stroke();

      if (detection) {
        // Face box
        const b = detection.box;
        ctx.strokeStyle = '#5be12c';
        ctx.lineWidth = 3;
        ctx.strokeRect(b.x, b.y, b.width, b.height);

        // Check face is roughly centered and large enough
        const faceCx = b.x + b.width / 2;
        const faceCy = b.y + b.height / 2;
        const centered = Math.abs(faceCx - cx) < overlay.width * 0.15
                      && Math.abs(faceCy - cy) < overlay.height * 0.18;
        const largeEnough = b.width > overlay.width * 0.22;

        if (centered && largeEnough) {
          if (!stableSince.current) stableSince.current = Date.now();
          const held = Date.now() - stableSince.current;
          if (held >= STABLE_MS_TO_CAPTURE) {
            setStatus('stable');
            clearInterval(detectTimer.current);
            capture();
            return;
          }
          setStatus('detected');
        } else {
          stableSince.current = null;
          setStatus('ready');
        }
      } else {
        stableSince.current = null;
        setStatus('ready');
      }
    }, DETECT_INTERVAL_MS);

    return () => { if (detectTimer.current) clearInterval(detectTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status === 'ready' || status === 'detected']);

  const capture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    // Mirror image so the saved photo matches what user saw on screen
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `selfie-${Date.now()}.jpg`, { type: 'image/jpeg' });
      setStatus('captured');
      onCapture?.(file);
      handleClose();
    }, 'image/jpeg', 0.92);
  };

  const handleClose = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (detectTimer.current) { clearInterval(detectTimer.current); detectTimer.current = null; }
    stableSince.current = null;
    setStatus('starting');
    onClose?.();
  };

  const statusText = {
    starting:  'Loading face scanner…',
    ready:     'Position your face inside the oval',
    detected:  'Face detected — hold still…',
    stable:    'Capturing…',
    captured:  'Captured',
    error:     error || 'Camera error',
  }[status];

  const statusColor = {
    starting: 'text.secondary',
    ready:    'primary.main',
    detected: 'warning.main',
    stable:   'success.main',
    captured: 'success.main',
    error:    'error.main',
  }[status];

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: 'grey.900', color: 'white' } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <CameraAltIcon /> Face Scanner
        <Box sx={{ flex: 1 }} />
        <IconButton onClick={handleClose} sx={{ color: 'grey.400' }}><CloseIcon /></IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0, position: 'relative', minHeight: 320 }}>
        {status === 'error' && (
          <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>
        )}
        {status === 'starting' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 5 }}>
            <CircularProgress />
            <Typography variant="body2" color="grey.300">Loading face detector…</Typography>
          </Box>
        )}
        <Box sx={{ position: 'relative', display: (status === 'starting' || status === 'error') ? 'none' : 'block', bgcolor: 'black' }}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{ width: '100%', display: 'block', transform: 'scaleX(-1)' /* mirror preview */ }}
          />
          <canvas
            ref={overlayRef}
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              transform: 'scaleX(-1)',
              pointerEvents: 'none',
            }}
          />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </Box>

        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="subtitle2" sx={{ color: statusColor, fontWeight: 700, textAlign: 'center' }}>
            {statusText}
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions sx={{ borderTop: 1, borderColor: 'grey.800', px: 2 }}>
        <Button onClick={handleClose} sx={{ color: 'grey.300' }}>Cancel</Button>
        <Button
          variant="contained"
          color="success"
          startIcon={<CameraAltIcon />}
          disabled={status === 'starting' || status === 'error' || status === 'captured'}
          onClick={capture}
        >
          Capture Now
        </Button>
      </DialogActions>
    </Dialog>
  );
}
