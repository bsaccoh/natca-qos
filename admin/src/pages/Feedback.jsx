import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Stack, Alert, TextField, MenuItem, Select,
  FormControl, InputLabel, Table, TableHead, TableBody, TableRow, TableCell,
  TableContainer, Chip, Divider, Tooltip,
} from '@mui/material';
import StarIcon        from '@mui/icons-material/Star';
import StarBorderIcon  from '@mui/icons-material/StarBorder';
import ThumbUpIcon     from '@mui/icons-material/ThumbUp';
import ThumbDownIcon   from '@mui/icons-material/ThumbDown';
import AnalyticsIcon   from '@mui/icons-material/Analytics';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { get }         from '../api/client.js';
import { Loading }     from '../components/ui.jsx';

const STAR_COLORS = { 5: '#10b981', 4: '#84cc16', 3: '#f59e0b', 2: '#f97316', 1: '#ef4444' };

function StarDisplay({ value }) {
  return (
    <Stack direction="row" spacing={0.25} alignItems="center">
      {[1, 2, 3, 4, 5].map((s) => (
        s <= Math.round(value || 0)
          ? <StarIcon key={s} sx={{ fontSize: 16, color: '#f59e0b' }} />
          : <StarBorderIcon key={s} sx={{ fontSize: 16, color: 'action.disabled' }} />
      ))}
      <Typography variant="caption" fontWeight={600} ml={0.5} color="text.secondary">
        {value ? Number(value).toFixed(1) : '—'}
      </Typography>
    </Stack>
  );
}

function SummaryCard({ label, value, icon, color, sub }) {
  return (
    <Paper sx={{ p: 2.5, borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {label}
        </Typography>
        <Box sx={{ color, display: 'flex' }}>{icon}</Box>
      </Box>
      <Typography variant="h3" fontWeight={800} sx={{ mt: 1.5, color }}>
        {value ?? '—'}
      </Typography>
      {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
    </Paper>
  );
}

export default function Feedback() {
  const [data,       setData]       = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [err,        setErr]        = useState('');
  const [search,     setSearch]     = useState('');
  const [opFilter,   setOpFilter]   = useState('');
  const [operators,  setOperators]  = useState([]);

  const load = useCallback(async (operatorId) => {
    setLoading(true); setErr('');
    try {
      const params = operatorId ? `?operatorId=${operatorId}&limit=200` : '?limit=200';
      const r = await get(`/analytics/feedback${params}`);
      setData(r.data);
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }, []);

  // Load operators list once for the filter
  useEffect(() => {
    get('/operators?limit=100').then((r) => {
      setOperators(r.data?.rows || []);
    }).catch(() => {});
    load();
  }, [load]);

  const handleOpChange = (e) => {
    setOpFilter(e.target.value);
    load(e.target.value || undefined);
  };

  const rows    = data?.rows    || [];
  const summary = data?.summary || {};

  const filtered = rows.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.complaint_ref?.toLowerCase().includes(q) ||
      r.operator_name?.toLowerCase().includes(q) ||
      r.citizen_feedback?.toLowerCase().includes(q)
    );
  });

  // Build rating distribution for the chart from rows
  const distMap = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  rows.forEach((r) => { if (r.citizen_rating >= 1 && r.citizen_rating <= 5) distMap[r.citizen_rating]++; });
  const distData = [1, 2, 3, 4, 5].map((star) => ({ star: `${'★'.repeat(star)}`, count: distMap[star], rating: star }));

  // Avg rating per operator
  const opMap = {};
  rows.forEach((r) => {
    if (!opMap[r.operator_name]) opMap[r.operator_name] = { operator: r.operator_name, sum: 0, count: 0 };
    opMap[r.operator_name].sum   += Number(r.citizen_rating);
    opMap[r.operator_name].count += 1;
  });
  const opData = Object.values(opMap).map((o) => ({ operator: o.operator, avg: Number((o.sum / o.count).toFixed(2)), count: o.count }));

  return (
    <Box sx={{ pb: 4 }}>

      {/* ── Header ── */}
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 3 }}>
        <Box sx={{ width: 40, height: 40, borderRadius: 1.5, bgcolor: 'rgba(245,158,11,0.12)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <AnalyticsIcon />
        </Box>
        <Box>
          <Typography variant="h5" fontWeight={700} sx={{ letterSpacing: '-0.02em' }}>Customer Feedback & Ratings</Typography>
          <Typography variant="body2" color="text.secondary">Citizen satisfaction scores and comments on resolved complaints</Typography>
        </Box>
      </Stack>

      {err && <Alert severity="error" sx={{ mb: 2, borderRadius: 1.5 }}>{err}</Alert>}
      {loading && <Loading height={240} />}

      {!loading && data && (
        <>
          {/* ── Summary Cards ── */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2,1fr)', sm: 'repeat(4,1fr)' }, gap: 2, mb: 3 }}>
            <SummaryCard
              label="Avg Rating"
              value={summary.avgRating ? `${Number(summary.avgRating).toFixed(1)} / 5` : 'No data'}
              icon={<StarIcon />}
              color="#f59e0b"
              sub={`${summary.totalRated || 0} total ratings`}
            />
            <SummaryCard
              label="Total Rated"
              value={summary.totalRated || 0}
              icon={<StarIcon />}
              color="#2563eb"
            />
            <SummaryCard
              label="Positive (4-5 ★)"
              value={summary.positive || 0}
              icon={<ThumbUpIcon />}
              color="#10b981"
              sub={summary.totalRated > 0 ? `${((summary.positive / summary.totalRated) * 100).toFixed(0)}% of rated` : undefined}
            />
            <SummaryCard
              label="Negative (1-2 ★)"
              value={summary.negative || 0}
              icon={<ThumbDownIcon />}
              color="#ef4444"
              sub={summary.totalRated > 0 ? `${((summary.negative / summary.totalRated) * 100).toFixed(0)}% of rated` : undefined}
            />
          </Box>

          {/* ── Charts ── */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2,1fr)' }, gap: 3, mb: 3 }}>

            <Paper sx={{ p: 3, borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle1" fontWeight={700} mb={2}>Rating Distribution</Typography>
              <Box sx={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={distData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="star" tick={{ fontSize: 13 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <RTooltip formatter={(v, _, p) => [v, `${p.payload.rating}-star`]} />
                    <Bar dataKey="count" name="Responses" maxBarSize={50} radius={[4,4,0,0]}>
                      {distData.map((d) => <Cell key={d.rating} fill={STAR_COLORS[d.rating]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </Paper>

            <Paper sx={{ p: 3, borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle1" fontWeight={700} mb={2}>Avg Rating by Operator</Typography>
              <Box sx={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={opData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="operator" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 5]} tick={{ fontSize: 11 }} />
                    <RTooltip formatter={(v, _, p) => [`${v}/5 (${p.payload.count} ratings)`, 'Avg Rating']} />
                    <Bar dataKey="avg" name="Avg Rating" maxBarSize={50} radius={[4,4,0,0]}>
                      {opData.map((d, i) => (
                        <Cell key={i} fill={d.avg >= 4 ? '#10b981' : d.avg >= 3 ? '#f59e0b' : '#ef4444'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </Paper>

          </Box>

          {/* ── Feedback Table ── */}
          <Paper sx={{ borderRadius: 1.5, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
            <Box sx={{ p: 2, display: 'flex', gap: 2, alignItems: 'center', borderBottom: 1, borderColor: 'divider', flexWrap: 'wrap' }}>
              <Typography variant="subtitle1" fontWeight={700} sx={{ flex: 1, minWidth: 120 }}>Recent Feedback</Typography>
              <TextField
                size="small" placeholder="Search complaints…" value={search}
                onChange={(e) => setSearch(e.target.value)}
                sx={{ minWidth: 200 }}
              />
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <InputLabel>Operator</InputLabel>
                <Select value={opFilter} label="Operator" onChange={handleOpChange}>
                  <MenuItem value="">All Operators</MenuItem>
                  {operators.map((o) => (
                    <MenuItem key={o.operator_id} value={o.operator_id}>{o.operator_name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {filtered.length === 0 ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography color="text.secondary">No feedback records found</Typography>
              </Box>
            ) : (
              <TableContainer sx={{ maxHeight: 520 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Reference</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Operator</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Rating</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Comment</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filtered.map((r, i) => (
                      <TableRow key={i} hover>
                        <TableCell>
                          <Typography variant="caption" fontFamily="monospace" fontWeight={600}>
                            {r.complaint_ref}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label={r.operator_name} size="small" variant="outlined" sx={{ borderRadius: 1 }} />
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">{r.category}</Typography>
                        </TableCell>
                        <TableCell>
                          <StarDisplay value={r.citizen_rating} />
                        </TableCell>
                        <TableCell sx={{ maxWidth: 280 }}>
                          {r.citizen_feedback ? (
                            <Tooltip title={r.citizen_feedback} placement="top">
                              <Typography variant="caption" color="text.secondary" sx={{
                                display: '-webkit-box', WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical', overflow: 'hidden',
                              }}>
                                {r.citizen_feedback}
                              </Typography>
                            </Tooltip>
                          ) : (
                            <Typography variant="caption" color="text.disabled">No comment</Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(r.updated_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </>
      )}
    </Box>
  );
}
