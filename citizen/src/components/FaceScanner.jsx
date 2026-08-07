import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Alert, Box, Button, CircularProgress, Dialog, DialogContent,
  IconButton, Stack, Typography, keyframes,
} from '@mui/material';
import CloseIcon        from '@mui/icons-material/Close';
import CameraAltIcon    from '@mui/icons-material/CameraAlt';
import CheckCircleIcon  from '@mui/icons-material/CheckCircle';
import * as faceapi from '@vladmandic/face-api';

const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.13/model';

const DETECT_INTERVAL_MS = 350;
const STABLE_MS_TO_CAPTURE = 1200;

// CSS animation: green line sweeping top → bottom → top over 2.2s.
// Uses a CSS variable --sweep-distance so we can control the range from JS.
const scanSweep = keyframes`
  0%   { top: 6%;  opacity: 0.9; }
  50%  { top: 88%; opacity: 1;   }
  100% { top: 6%;  opacity: 0.9; }
`;

const SCORE_THRESHOLD    = 0.65;
const BRIGHTNESS_MIN     = 40;
const BRIGHTNESS_MAX     = 215;
const BLUR_VAR_THRESHOLD = 80;

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

function computeBrightness(imageData) {
  const { data } = imageData;
  let total = 0;
  for (let i = 0; i < data.length; i += 4) {
    total += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }
  return total / (data.length / 4);
}

function computeLaplacianVariance(imageData) {
  const { data, width, height } = imageData;
  const kernel = [0, 1, 0, 1, -4, 1, 0, 1, 0];
  let sum = 0, sumSq = 0, n = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let v = 0;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const idx = ((y + ky) * width + (x + kx)) * 4;
          const gray = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
          v += gray * kernel[(ky + 1) * 3 + (kx + 1)];
        }
      }
      sum += v; sumSq += v * v; n++;
    }
  }
  const mean = sum / n;
  return sumSq / n - mean * mean;
}

export default function FaceScanner({ open, onClose, onCapture }) {
  const videoRef  = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const detectTimer = useRef(null);
  const stableSince = useRef(null);

  const [phase, setPhase]           = useState('starting');
    // starting | ready | detecting | pass | error
  const [message, setMessage]       = useState('');
  const [modelReady, setModelReady] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [capturedFile, setCapturedFile] = useState(null);
  const [qualityMessage, setQualityMessage] = useState('');

  const cleanup = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (detectTimer.current) { clearInterval(detectTimer.current); detectTimer.current = null; }
    stableSince.current = null;
  }, []);

  const handleClose = () => { cleanup(); onClose?.(); };

  // Load models when dialog opens
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setPhase('starting');
    setMessage('Loading face scanner…');
    setCapturedFile(null);
    setFaceDetected(false);
    loadDetectorModel()
      .then(() => { if (!cancelled) setModelReady(true); })
      .catch((e) => { if (!cancelled) { setMessage(`Could not load face model: ${e.message}`); setPhase('error'); } });
    return () => { cancelled = true; };
  }, [open]);

  // Reset when dialog closes
  useEffect(() => { if (!open) { cleanup(); setModelReady(false); } }, [open, cleanup]);

  // Start camera after models ready
  useEffect(() => {
    if (!open || !modelReady) return;
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setPhase('ready');
        setMessage('Position your face within the frame');
      } catch (e) {
        setPhase('error');
        setMessage(e.name === 'NotAllowedError'
          ? 'Camera permission denied. Please allow camera access and try again.'
          : `Could not start camera: ${e.message}`);
      }
    })();
    return () => { cancelled = true; };
  }, [open, modelReady]);

  // Detection loop (runs during ready/detecting)
  useEffect(() => {
    if (phase !== 'ready' && phase !== 'detecting') return;
    const opts = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: SCORE_THRESHOLD });

    detectTimer.current = setInterval(async () => {
      const video = videoRef.current;
      if (!video || video.videoWidth === 0) return;

      const detection = await faceapi.detectSingleFace(video, opts);

      if (detection) {
        setFaceDetected(true);
        const b = detection.box;
        const cx = video.videoWidth / 2;
        const cy = video.videoHeight / 2;
        const faceCx = b.x + b.width / 2;
        const faceCy = b.y + b.height / 2;
        const centered = Math.abs(faceCx - cx) < video.videoWidth * 0.18
                      && Math.abs(faceCy - cy) < video.videoHeight * 0.18;
        const largeEnough = b.width > video.videoWidth * 0.20;

        if (centered && largeEnough) {
          // Sample face-box pixels for quality checks
          try {
            const qCanvas = document.createElement('canvas');
            const bw = Math.max(1, Math.round(b.width));
            const bh = Math.max(1, Math.round(b.height));
            qCanvas.width = bw; qCanvas.height = bh;
            const qCtx = qCanvas.getContext('2d');
            qCtx.drawImage(video, b.x, b.y, bw, bh, 0, 0, bw, bh);
            const imageData = qCtx.getImageData(0, 0, bw, bh);

            const brightness   = computeBrightness(imageData);
            const blurVariance = computeLaplacianVariance(imageData);

            if (brightness < BRIGHTNESS_MIN) {
              stableSince.current = null;
              setQualityMessage('Too dark — find better lighting');
              return;
            }
            if (brightness > BRIGHTNESS_MAX) {
              stableSince.current = null;
              setQualityMessage('Too bright — avoid direct light behind you');
              return;
            }
            if (blurVariance < BLUR_VAR_THRESHOLD) {
              stableSince.current = null;
              setQualityMessage('Image blurry — hold still and steady');
              return;
            }
          } catch (_) {
            // Canvas pixel read failed (e.g. CORS taint) — skip quality check and proceed
          }

          setQualityMessage('');
          if (!stableSince.current) stableSince.current = Date.now();
          const held = Date.now() - stableSince.current;
          if (held >= STABLE_MS_TO_CAPTURE) {
            clearInterval(detectTimer.current);
            capture();
            return;
          }
          setPhase('detecting');
          setMessage('Hold still — capturing…');
        } else {
          stableSince.current = null;
          setQualityMessage('');
          setPhase('ready');
          setMessage(largeEnough ? 'Center your face in the circle' : 'Come a bit closer');
        }
      } else {
        setFaceDetected(false);
        stableSince.current = null;
        setQualityMessage('');
        setPhase('ready');
        setMessage('Position your face within the frame');
      }
    }, DETECT_INTERVAL_MS);

    return () => { if (detectTimer.current) clearInterval(detectTimer.current); };
  }, [phase]);

  const capture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    // Mirror so saved photo matches what user saw
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], `selfie-${Date.now()}.jpg`, { type: 'image/jpeg' });
      setCapturedFile(file);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      setPhase('pass');
      setMessage('Face captured successfully');
    }, 'image/jpeg', 0.92);
  };

  const handleContinue = () => {
    if (capturedFile) onCapture?.(capturedFile);
    handleClose();
  };

  const handleRetake = () => {
    setCapturedFile(null);
    setFaceDetected(false);
    setQualityMessage('');
    setPhase('starting');
    setMessage('Restarting…');
    // Re-trigger camera by faking the modelReady effect
    setModelReady(false);
    setTimeout(() => setModelReady(true), 50);
  };

  const SIZE = 260; // px diameter of the circular viewport
  const isScanning = phase === 'ready' || phase === 'detecting';
  const isDone     = phase === 'pass';

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth
      PaperProps={{ sx: { bgcolor: 'background.paper', borderRadius: 3 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', px: 2, pt: 2 }}>
        <Typography variant="subtitle1" fontWeight={700}>Face Scan</Typography>
        <Box sx={{ flex: 1 }} />
        <IconButton onClick={handleClose}><CloseIcon /></IconButton>
      </Box>

      <DialogContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', pt: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, textAlign: 'center', maxWidth: 320 }}>
          Position your face within the frame. We will capture your face and compare it securely with your uploaded ID.
        </Typography>

        {phase === 'error' && (
          <Alert severity="error" sx={{ mb: 2, width: '100%' }}>{message}</Alert>
        )}

        {/* Circular viewport — always mounted (with black background) once dialog opens,
             so videoRef is available before we try to attach the stream */}
        {phase !== 'error' && (
          <Box sx={{
            position: 'relative',
            width: SIZE, height: SIZE,
            borderRadius: '50%',
            overflow: 'hidden',
            border: '4px solid',
            borderColor: phase === 'pass'      ? 'success.main'
                       : phase === 'detecting' ? 'warning.main'
                       : faceDetected           ? 'primary.main'
                       : 'divider',
            bgcolor: 'black',
            boxShadow: 3,
          }}>
            {/* Video is always in the DOM (just visually covered by loading spinner
                 while phase === 'starting'), so the srcObject assignment can find it */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: '100%', height: '100%', objectFit: 'cover',
                transform: 'scaleX(-1)',
                display: capturedFile ? 'none' : 'block',
              }}
            />
            {capturedFile && (
              <img
                src={URL.createObjectURL(capturedFile)}
                alt="Captured face"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            )}

            {/* Loading spinner while starting */}
            {phase === 'starting' && (
              <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(0,0,0,0.65)' }}>
                <CircularProgress sx={{ color: '#fff' }} />
              </Box>
            )}

            {/* Animated scan line — visible only while actively scanning */}
            {isScanning && (
              <Box sx={{
                position: 'absolute',
                left: '5%', right: '5%',
                height: '3px',
                background: 'linear-gradient(90deg, transparent, #22c55e 20%, #22c55e 80%, transparent)',
                boxShadow: '0 0 12px 2px rgba(34, 197, 94, 0.7)',
                animation: `${scanSweep} 2.2s ease-in-out infinite`,
                borderRadius: 2,
                pointerEvents: 'none',
              }} />
            )}

            {/* Overlay tick once captured */}
            {phase === 'pass' && (
              <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(34, 197, 94, 0.35)' }}>
                <CheckCircleIcon sx={{ fontSize: 90, color: '#fff' }} />
              </Box>
            )}
          </Box>
        )}

        <Canvas hidden ref={canvasRef} />

        {phase !== 'starting' && phase !== 'error' && (
          <Typography
            variant="subtitle2"
            fontWeight={700}
            sx={{
              mt: 3, textAlign: 'center', minHeight: 24,
              color: phase === 'pass' ? 'success.main'
                   : phase === 'detecting' ? 'warning.main'
                   : 'text.primary',
            }}
          >
            {message}
          </Typography>
        )}
        {qualityMessage && isScanning && (
          <Typography variant="caption" color="warning.main" sx={{ mt: 0.5, textAlign: 'center' }}>
            {qualityMessage}
          </Typography>
        )}

        <Stack direction="row" spacing={1} sx={{ mt: 3, width: '100%' }}>
          {isDone ? (
            <>
              <Button size="small" variant="outlined" fullWidth onClick={handleRetake} sx={{ py: 1.2 }}>
                Retake
              </Button>
              <Button
                size="small"
                variant="contained"
                color="success"
                fullWidth
                onClick={handleContinue}
                sx={{ py: 1.2, whiteSpace: 'nowrap' }}
              >
                Continue
              </Button>
            </>
          ) : (
            <>
              <Button size="small" variant="outlined" fullWidth onClick={handleClose} sx={{ py: 1.2 }}>
                Cancel
              </Button>
              <Button
                size="small"
                variant="contained"
                fullWidth
                startIcon={<CameraAltIcon />}
                disabled={phase !== 'ready' && phase !== 'detecting'}
                onClick={capture}
                sx={{ py: 1.2, whiteSpace: 'nowrap' }}
              >
                Capture Now
              </Button>
            </>
          )}
        </Stack>
      </DialogContent>
    </Dialog>
  );
}

// Small wrapper so the hidden canvas doesn't complain about React DOM attrs
function Canvas({ hidden, ...rest }) {
  return <canvas {...rest} style={{ display: hidden ? 'none' : 'block' }} />;
}
