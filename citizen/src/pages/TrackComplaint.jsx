import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Box, Button, Container, Paper, Stack, TextField, Typography,
  Alert, CircularProgress, Chip, Divider, Stepper, Step, StepLabel, StepContent,
  IconButton,
} from '@mui/material';
import SearchIcon        from '@mui/icons-material/Search';
import StarIcon          from '@mui/icons-material/Star';
import StarBorderIcon    from '@mui/icons-material/StarBorder';
import { get, patch }    from '../api/client.js';
import { STATUS_COLOR }  from '../theme/theme.js';

function timeSince(ts) {
  if (!ts) return '—';
  const s = Math.floor((Date.now() - new Date(ts)) / 1000);
  if (s < 60)    return `${s}s ago`;
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(ts).toLocaleDateString();
}

function RatingForm({ complaintRef, existingRating, existingFeedback }) {
  const [rating,       setRating]       = useState(existingRating || 0);
  const [hovered,      setHovered]      = useState(0);
  const [comment,      setComment]      = useState(existingFeedback || '');
  const [submitting,   setSubmitting]   = useState(false);
  const [submitted,    setSubmitted]    = useState(!!existingRating);
  const [ratingErr,    setRatingErr]    = useState('');

  const submit = async () => {
    if (!rating) { setRatingErr('Please select a star rating.'); return; }
    setSubmitting(true); setRatingErr('');
    try {
      await patch(`/complaints/track/${complaintRef}/rate`, { rating, feedback: comment.trim() || undefined });
      setSubmitted(true);
    } catch (e) {
      setRatingErr(e.response?.data?.error || 'Failed to submit rating. Please try again.');
    } finally { setSubmitting(false); }
  };

  if (submitted) {
    return (
      <Alert severity="success" sx={{ borderRadius: 1.5 }}>
        Thank you for your feedback! Your rating helps us improve service quality.
      </Alert>
    );
  }

  const displayRating = hovered || rating;

  return (
    <Box>
      <Typography variant="subtitle2" fontWeight={700} gutterBottom>Rate Your Experience</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        How satisfied were you with how your complaint was handled?
      </Typography>
      <Stack direction="row" spacing={0.5} sx={{ mb: 1.5 }}>
        {[1, 2, 3, 4, 5].map((s) => (
          <IconButton key={s} size="small"
            onMouseEnter={() => setHovered(s)} onMouseLeave={() => setHovered(0)}
            onClick={() => { setRating(s); setRatingErr(''); }}
            sx={{ color: s <= displayRating ? '#f59e0b' : 'action.disabled', p: 0.5 }}>
            {s <= displayRating ? <StarIcon fontSize="medium" /> : <StarBorderIcon fontSize="medium" />}
          </IconButton>
        ))}
        {rating > 0 && (
          <Typography variant="caption" sx={{ alignSelf: 'center', ml: 1, color: 'text.secondary' }}>
            {['', 'Very dissatisfied', 'Dissatisfied', 'Neutral', 'Satisfied', 'Very satisfied'][rating]}
          </Typography>
        )}
      </Stack>
      {ratingErr && <Alert severity="error" sx={{ mb: 1.5, py: 0.5, borderRadius: 1.5 }}>{ratingErr}</Alert>}
      <TextField
        multiline rows={3} fullWidth
        label="Comment (optional)"
        placeholder="Tell us about your experience…"
        value={comment} onChange={(e) => setComment(e.target.value)}
        sx={{ mb: 1.5 }}
      />
      <Button variant="contained" onClick={submit} disabled={submitting || !rating}
        startIcon={submitting ? <CircularProgress size={16} /> : null}
        sx={{ borderRadius: 1.5, textTransform: 'none', fontWeight: 600 }}>
        {submitting ? 'Submitting…' : 'Submit Feedback'}
      </Button>
    </Box>
  );
}

export default function TrackComplaint() {
  const [params]      = useSearchParams();
  const navigate      = useNavigate();
  const [ref, setRef] = useState(params.get('ref') || '');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [data, setData] = useState(null);

  const search = async (e) => {
    if (e) e.preventDefault();
    if (!ref.trim()) return;
    setLoading(true); setErr(''); setData(null);
    try {
      const r = await get(`/complaints/track/${encodeURIComponent(ref.trim().toUpperCase())}`);
      setData(r.data);  // get() → axios response.data → { data: complaint }
    } catch (ex) {
      setErr(ex.response?.data?.error || 'Complaint not found. Please check the reference number.');
    } finally { setLoading(false); }
  };

  // Auto-search if ref comes from URL
  useEffect(() => {
    if (params.get('ref')) search();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Container maxWidth="sm" sx={{ py: 5 }}>
      <Typography variant="h5" fontWeight={700} gutterBottom>Track Your Complaint</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Enter your complaint reference number (e.g. COMP-20240115-XY7Z) to check its status
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <form onSubmit={search}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <TextField
              value={ref} onChange={(e) => setRef(e.target.value)}
              placeholder="COMP-YYYYMMDD-XXXX"
              fullWidth
              autoFocus
              inputProps={{ style: { fontFamily: 'monospace', textTransform: 'uppercase' } }}
              label="Complaint Reference"
            />
            <Button type="submit" variant="contained" disabled={loading || !ref.trim()}
              startIcon={loading ? <CircularProgress size={18} /> : <SearchIcon />}
              sx={{ minWidth: 120 }}>
              {loading ? 'Searching…' : 'Track'}
            </Button>
          </Stack>
        </form>
      </Paper>

      {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}

      {data && (
        <Paper sx={{ p: { xs: 2.5, sm: 3.5 } }}>
          {/* Header */}
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
            <Box>
              <Typography variant="caption" color="text.secondary" fontFamily="monospace">
                {data.complaint_ref}
              </Typography>
              <Typography variant="h6" fontWeight={700}>
                {data.issue_type?.replace(/_/g, ' ')}
              </Typography>
            </Box>
            <Chip
              label={data.status?.replace(/_/g, ' ')}
              color={STATUS_COLOR[data.status] || 'default'}
              variant="filled"
            />
          </Stack>

          {/* Details */}
          <Stack direction="row" flexWrap="wrap" gap={2} sx={{ mb: 2 }}>
            {[
              { l: 'Operator',  v: data.operator_name },
              { l: 'Category',  v: data.category_name },
              { l: 'District',  v: data.district },
              { l: 'Submitted', v: timeSince(data.created_at) },
              { l: 'Updated',   v: timeSince(data.updated_at) },
              { l: 'Resolved',  v: data.resolved_at ? timeSince(data.resolved_at) : null },
            ].filter((d) => d.v).map(({ l, v }) => (
              <Box key={l}>
                <Typography variant="caption" color="text.secondary" display="block">{l}</Typography>
                <Typography variant="body2" fontWeight={600}>{v}</Typography>
              </Box>
            ))}
          </Stack>

          {/* SLA bar */}
          {data.sla_deadline && !['RESOLVED','CLOSED'].includes(data.status) && (() => {
            const remaining = (new Date(data.sla_deadline) - Date.now()) / 3600000;
            const overdue = remaining < 0;
            return (
              <Alert severity={overdue ? 'error' : remaining < 24 ? 'warning' : 'info'} sx={{ mb: 2 }}>
                {overdue
                  ? `SLA exceeded by ${Math.round(-remaining)} hours`
                  : `SLA: ${Math.round(remaining)} hours remaining`}
              </Alert>
            );
          })()}

          {data.description && (
            <>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="subtitle2" fontWeight={700} gutterBottom>Description</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{data.description}</Typography>
            </>
          )}

          {/* Timeline */}
          {data.timeline?.length > 0 && (
            <>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>Updates</Typography>
              <Stepper orientation="vertical" nonLinear activeStep={-1}>
                {[...data.timeline].reverse().map((t) => (
                  <Step key={t.event_id || t.created_at} active completed={false}>
                    <StepLabel
                      optional={<Typography variant="caption" color="text.secondary">{timeSince(t.created_at)}</Typography>}
                    >
                      <Typography variant="body2" fontWeight={600}>
                        {t.event_type?.replace(/_/g, ' ')}
                        {t.new_value && ` → ${t.new_value}`}
                      </Typography>
                    </StepLabel>
                    <StepContent>
                      {t.note && <Typography variant="body2" color="text.secondary">{t.note}</Typography>}
                    </StepContent>
                  </Step>
                ))}
              </Stepper>
            </>
          )}

          <Divider sx={{ my: 2 }} />

          {/* Rating section — only for resolved/closed complaints */}
          {['RESOLVED', 'CLOSED'].includes(data.status) && (
            <>
              <RatingForm
                complaintRef={data.complaint_ref}
                existingRating={data.citizen_rating}
                existingFeedback={data.citizen_feedback}
              />
              <Divider sx={{ my: 2 }} />
            </>
          )}

          <Button variant="outlined" size="small" onClick={() => navigate('/submit')}>
            Submit another complaint
          </Button>
        </Paper>
      )}
    </Container>
  );
}
