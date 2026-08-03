import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Alert, Box, Button, CircularProgress, Dialog, DialogContent,
  IconButton, Stack, Typography, keyframes,
} from '@mui/material';
import CloseIcon        from '@mui/icons-material/Close';
import CameraAltIcon    from '@mui/icons-material/CameraAlt';
import CheckCircleIcon  from '@mui/icons-material/CheckCircle';
import CancelIcon       from '@mui/icons-material/Cancel';
import * as faceapi from '@vladmandic/face-api';
import { verifyFaceAgainstId } from '../utils/faceMatch.js';

const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.13/model';

const DETECT_INTERVAL_MS = 350;
const STABLE_MS_TO_CAPTURE = 1200;

// CSS animation: green line sweeping top → bottom → top over 2s
const scanSweep = keyframes`
  0%   { transform: translateY(0%);   opacity: 0.9; }
  50%  { transform: translateY(1400%); opacity: 1;  }
  100% { transform: translateY(0%);   opacity: 0.9; }
`;

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

export default function FaceScanner({ open, onClose, onCapture, idFrontFile }) {
  const videoRef  = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const detectTimer = useRef(null);
  const stableSince = useRef(null);

  const [phase, setPhase]           = useState('starting');
    // starting | ready | detecting | captured | comparing | pass | fail | error
  const [message, setMessage]       = useState('');
  const [modelReady, setModelReady] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [capturedFile, setCapturedFile] = useState(null);
  const [matchResult, setMatchResult]   = useState(null);

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
    setMatchResult(null);
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
    const opts = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.4 });

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
          setPhase('ready');
          setMessage(largeEnough ? 'Center your face in the circle' : 'Come a bit closer');
        }
      } else {
        setFaceDetected(false);
        stableSince.current = null;
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
      setPhase('captured');
      // Stop the camera stream once captured
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      // Immediately compare against uploaded ID if provided
      if (idFrontFile) {
        setPhase('comparing');
        setMessage('Comparing with ID… please wait');
        try {
          const result = await verifyFaceAgainstId({ idFrontFile, selfieFile: file });
          setMatchResult(result);
          setPhase(result.ok ? 'pass' : 'fail');
          setMessage(result.message);
        } catch (e) {
          setPhase('fail');
          setMessage(`Face comparison failed: ${e.message}`);
        }
      } else {
        // No ID to compare — just finish
        setPhase('pass');
        setMessage('Face captured');
      }
    }, 'image/jpeg', 0.92);
  };

  const handleContinue = () => {
    if (capturedFile) onCapture?.(capturedFile, matchResult);
    handleClose();
  };

  const handleRetake = () => {
    setCapturedFile(null);
    setMatchResult(null);
    setFaceDetected(false);
    setPhase('starting');
    setMessage('Restarting…');
    // Re-trigger camera by faking the modelReady effect
    setModelReady(false);
    setTimeout(() => setModelReady(true), 50);
  };

  const SIZE = 260; // px diameter of the circular viewport
  const isScanning = phase === 'ready' || phase === 'detecting';
  const isDone     = phase === 'pass' || phase === 'fail';

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

        {phase === 'starting' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 5 }}>
            <CircularProgress />
            <Typography variant="body2" color="text.secondary">Loading face scanner…</Typography>
          </Box>
        )}

        {phase !== 'starting' && phase !== 'error' && (
          <Box sx={{
            position: 'relative',
            width: SIZE, height: SIZE,
            borderRadius: '50%',
            overflow: 'hidden',
            border: '4px solid',
            borderColor: phase === 'pass'      ? 'success.main'
                       : phase === 'fail'      ? 'error.main'
                       : phase === 'detecting' ? 'warning.main'
                       : faceDetected           ? 'primary.main'
                       : 'divider',
            bgcolor: 'black',
            boxShadow: 3,
          }}>
            {/* Live video OR captured still */}
            {capturedFile ? (
              <img
                src={URL.createObjectURL(capturedFile)}
                alt="Captured face"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
              />
            )}

            {/* Animated scan line — visible only while actively scanning */}
            {isScanning && (
              <Box sx={{
                position: 'absolute',
                left: '5%', right: '5%', top: '6%',
                height: '3px',
                background: 'linear-gradient(90deg, transparent, #22c55e 20%, #22c55e 80%, transparent)',
                boxShadow: '0 0 12px 2px rgba(34, 197, 94, 0.7)',
                animation: `${scanSweep} 2.2s ease-in-out infinite`,
                borderRadius: 2,
              }} />
            )}

            {/* Overlay tick or cross once done */}
            {phase === 'pass' && (
              <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(34, 197, 94, 0.35)' }}>
                <CheckCircleIcon sx={{ fontSize: 90, color: '#fff' }} />
              </Box>
            )}
            {phase === 'fail' && (
              <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(239, 68, 68, 0.35)' }}>
                <CancelIcon sx={{ fontSize: 90, color: '#fff' }} />
              </Box>
            )}
            {phase === 'comparing' && (
              <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(0, 0, 0, 0.35)' }}>
                <CircularProgress sx={{ color: '#fff' }} />
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
                   : phase === 'fail' ? 'error.main'
                   : phase === 'comparing' ? 'primary.main'
                   : phase === 'detecting' ? 'warning.main'
                   : 'text.primary',
            }}
          >
            {message}
          </Typography>
        )}
        {matchResult && typeof matchResult.score === 'number' && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
            Match score: {matchResult.score}%
          </Typography>
        )}

        <Stack direction="row" spacing={1.5} sx={{ mt: 3, width: '100%' }}>
          {isDone ? (
            <>
              <Button variant="outlined" fullWidth onClick={handleRetake}>Retake</Button>
              <Button variant="contained" color={phase === 'pass' ? 'success' : 'primary'} fullWidth onClick={handleContinue}>
                {phase === 'pass' ? 'Continue' : 'Use this photo anyway'}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outlined" fullWidth onClick={handleClose}>Cancel</Button>
              <Button
                variant="contained"
                fullWidth
                startIcon={<CameraAltIcon />}
                disabled={phase !== 'ready' && phase !== 'detecting'}
                onClick={capture}
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
