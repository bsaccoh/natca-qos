import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TablePagination, Chip, Button, TextField, InputAdornment,
  MenuItem, Select, FormControl, InputLabel, Dialog, DialogTitle, DialogContent,
  DialogActions, Stack, Tooltip, Alert, Tabs, Tab, LinearProgress,
  CircularProgress, useTheme, alpha,
} from '@mui/material';
import SearchIcon       from '@mui/icons-material/Search';
import RefreshIcon      from '@mui/icons-material/Refresh';
import DownloadIcon     from '@mui/icons-material/Download';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import CheckCircleIcon  from '@mui/icons-material/CheckCircle';
import CancelIcon       from '@mui/icons-material/Cancel';
import FaceIcon         from '@mui/icons-material/Face';
import ShieldIcon       from '@mui/icons-material/Shield';
import HistoryIcon      from '@mui/icons-material/History';
import CellTowerIcon    from '@mui/icons-material/CellTower';
import ContactPageIcon  from '@mui/icons-material/ContactPage';
import ReplayIcon       from '@mui/icons-material/Replay';
import BrokenImageIcon  from '@mui/icons-material/BrokenImage';
import { get, patch }   from '../api/client.js';
import { exportToCSV }  from '../utils/exportUtils.js';
import PageHeader       from '../components/PageHeader.jsx';
import { formatDate, getBackendFileUrl } from '../utils/formatters.js';
import { getOperatorColor, STATUS_COLORS } from '../theme/theme.js';
import { useToast }     from '../components/ToastContext.jsx';

function DocImage({ src, fallbackSrc, alt, height = 200 }) {
  const [err, setErr] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  const activeSrc = useFallback ? fallbackSrc : src;
  if (!activeSrc || err) {
    return (
      <Box sx={{
        height, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        bgcolor: 'action.hover', borderRadius: 1.5, gap: 1, p: 2,
      }}>
        <BrokenImageIcon sx={{ color: 'text.disabled', fontSize: 36 }} />
        <Typography variant="caption" color="text.disabled">Image not available</Typography>
      </Box>
    );
  }
  return (
    <Box
      component="img"
      src={activeSrc}
      alt={alt}
      onError={() => {
        if (!useFallback && fallbackSrc) setUseFallback(true);
        else setErr(true);
      }}
      sx={{ maxHeight: height, maxWidth: '100%', borderRadius: 1.5, objectFit: 'contain', display: 'block', mx: 'auto' }}
    />
  );
}

export default function Kyc() {
  const theme = useTheme();
  const { showToast } = useToast();
  const [rows,    setRows]    = useState([]);
  const [total,   setTotal]   = useState(0);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [page,    setPage]    = useState(0);
  const [rowsPerPage] = useState(25);

  const [search,   setSearch]   = useState('');
  const [opFilter, setOpFilter] = useState('ALL');
  const [stFilter, setStFilter] = useState('ALL');
  const [operators, setOperators] = useState([]);

  const [selected,    setSelected]    = useState(null);
  const [reviewTab,   setReviewTab]   = useState(0);
  const [rejectOpen,  setRejectOpen]  = useState(false);
  const [rejectReason, setRejectReason] = useState('Blurred ID Photo');
  const [rejectCustom, setRejectCustom] = useState('');
  const [actionErr,   setActionErr]   = useState('');
  const [actionBusy,  setActionBusy]  = useState(false);

  // Load operators list for filter dropdown
  useEffect(() => {
    get('/operators').then((res) => setOperators(res.data || [])).catch(() => {});
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: rowsPerPage, offset: page * rowsPerPage });
      if (stFilter !== 'ALL') params.set('status', stFilter);
      if (opFilter !== 'ALL') params.set('operatorId', opFilter);
      if (search.trim())      params.set('search', search.trim());

      const [listRes, sumRes] = await Promise.allSettled([
        get(`/kyc?${params.toString()}`),
        get('/kyc/summary'),
      ]);

      if (listRes.status === 'fulfilled') {
        setRows(listRes.value.data?.rows ?? []);
        setTotal(Number(listRes.value.data?.total ?? 0));
      }
      if (sumRes.status === 'fulfilled') setSummary(sumRes.value.data ?? {});
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, stFilter, opFilter, search]);

  useEffect(() => { loadData(); }, [loadData]);

  async function openReview(row) {
    setReviewTab(0);
    setActionErr('');
    setSelected(row);
    try {
      const res = await get(`/kyc/${row.kyc_id}`);
      if (res?.data) setSelected(res.data);
    } catch {
      // Keep list-level data
    }
  }

  async function doAction(fn, successMsg = 'Action completed successfully') {
    setActionErr('');
    setActionBusy(true);
    try {
      await fn();
      setSelected(null);
      setRejectOpen(false);
      showToast(successMsg, 'success');
      loadData();
    } catch (e) {
      const msg = e?.response?.data?.message ?? e?.response?.data?.error ?? e?.message ?? 'Action failed';
      setActionErr(msg);
      showToast(msg, 'error');
    } finally {
      setActionBusy(false);
    }
  }

  const handleApprove = () => doAction(
    () => patch(`/kyc/${selected.kyc_id}/approve`, {}),
    'KYC submission approved and subscriber verified'
  );

  const handleRequestInfo = () => doAction(
    () => patch(`/kyc/${selected.kyc_id}/request-info`, { note: 'Resubmission requested by NatCA reviewer' }),
    'Resubmission requested from subscriber'
  );

  const handleConfirmReject = () => {
    const reason = rejectReason === 'OTHER' ? rejectCustom.trim() : rejectReason;
    if (!reason) { setActionErr('Please specify a rejection reason.'); return; }
    doAction(
      () => patch(`/kyc/${selected.kyc_id}/reject`, { reason }),
      'KYC submission rejected'
    );
  };

  const handleExportCSV = () => {
    exportToCSV('NatCA_KYC_Registry', rows.map((r) => ({
      KYC_Ref:       r.kyc_reference,
      Name:          `${r.first_name ?? ''} ${r.last_name ?? ''}`.trim() || r.phone,
      Phone:         r.phone,
      NIN:           r.nin ?? '',
      ICCID:         r.iccid ?? '',
      Operator:      r.operator_name ?? '',
      ID_Type:       r.id_type ?? '',
      Status:        r.status,
      Rejection:     r.rejection_reason ?? '',
      Submitted:     r.created_at ? formatDate(r.created_at) : '',
    })));
  };

  const kpis = [
    { label: 'Total Registrations', val: summary.total    ?? 0, color: '#2563eb' },
    { label: 'Pending Review',      val: summary.pending  ?? 0, color: '#f59e0b' },
    { label: 'Approved & Active',   val: summary.approved ?? 0, color: '#10b981' },
    { label: 'Rejected',            val: summary.rejected ?? 0, color: '#ef4444' },
  ];

  return (
    <Box sx={{ width: '100%', minHeight: '100%', pb: 4 }}>
      <PageHeader
        icon={<VerifiedUserIcon />}
        title="SIM KYC & Identity Management"
        subtitle="National Subscriber Registry — review identity documents, facial biometric matches, and carrier links"
        actions={
          <Stack direction="row" spacing={1.5}>
            <Button
              startIcon={<RefreshIcon />}
              variant="outlined"
              onClick={loadData}
              sx={{ borderRadius: 1.5, textTransform: 'none', fontWeight: 600 }}
            >
              Refresh
            </Button>
            <Button
              startIcon={<DownloadIcon />}
              variant="contained"
              onClick={handleExportCSV}
              sx={{ borderRadius: 1.5, textTransform: 'none', fontWeight: 600 }}
            >
              Export CSV
            </Button>
          </Stack>
        }
      />

      {/* KPI cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2,1fr)', sm: 'repeat(4,1fr)' }, gap: 2, mb: 3 }}>
        {kpis.map((k) => (
          <Paper key={k.label} sx={{ p: 2.5, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {k.label}
            </Typography>
            <Typography variant="h3" fontWeight={800} sx={{ color: k.color, mt: 0.75 }}>
              {loading ? <CircularProgress size={28} sx={{ color: k.color }} /> : k.val}
            </Typography>
          </Paper>
        ))}
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2.5, mb: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
          <TextField
            placeholder="Search by reference, name, phone, or NIN…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            size="small"
            fullWidth
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                  </InputAdornment>
                ),
              },
            }}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
          />

          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Operator</InputLabel>
            <Select
              value={opFilter}
              label="Operator"
              onChange={(e) => { setOpFilter(e.target.value); setPage(0); }}
              sx={{ borderRadius: 1.5 }}
            >
              <MenuItem value="ALL">All Operators</MenuItem>
              {operators.map((op) => (
                <MenuItem key={op.operator_id} value={String(op.operator_id)}>
                  {op.operator_name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={stFilter}
              label="Status"
              onChange={(e) => { setStFilter(e.target.value); setPage(0); }}
              sx={{ borderRadius: 1.5 }}
            >
              <MenuItem value="ALL">All Statuses</MenuItem>
              <MenuItem value="PENDING">Pending</MenuItem>
              <MenuItem value="UNDER_REVIEW">Under Review</MenuItem>
              <MenuItem value="APPROVED">Approved</MenuItem>
              <MenuItem value="REJECTED">Rejected</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </Paper>

      {/* Table */}
      <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
        <Table>
          <TableHead sx={{ bgcolor: (t) => alpha(t.palette.primary.main, 0.04) }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>KYC Ref & Date</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Subscriber</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>NIN / Doc Type</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Operator</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Risk Score</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                  <CircularProgress size={32} />
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                  <Typography color="text.secondary">No KYC submissions match your search</Typography>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => {
                const opColor = getOperatorColor(row.operator_name, '#2563eb');
                const stColor = STATUS_COLORS[row.status] || '#64748b';
                const name = `${row.first_name ?? ''} ${row.last_name ?? ''}`.trim() || row.phone;
                return (
                  <TableRow key={row.kyc_id} hover>
                    <TableCell>
                      <Typography variant="subtitle2" fontWeight={800} color="primary.main" sx={{ fontFamily: 'monospace' }}>
                        {row.kyc_reference}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {row.created_at ? formatDate(row.created_at, false) : '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="subtitle2" fontWeight={700}>{name}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                        {row.phone}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={700} color="primary.main" sx={{ fontFamily: 'monospace' }}>
                        {row.nin ?? '—'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">{row.id_type ?? 'National ID'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={row.operator_name ?? '—'}
                        size="small"
                        sx={{
                          fontWeight: 700,
                          fontSize: 11,
                          borderRadius: 1,
                          bgcolor: alpha(opColor, 0.12),
                          color: opColor,
                          border: `1px solid ${alpha(opColor, 0.3)}`,
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      {row.risk_score != null ? (
                        <Chip
                          label={`${row.risk_score}/100`}
                          size="small"
                          color={row.risk_score >= 70 ? 'error' : row.risk_score >= 30 ? 'warning' : 'success'}
                          sx={{ fontWeight: 700, borderRadius: 1 }}
                        />
                      ) : (
                        <Typography variant="caption" color="text.secondary">—</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={row.status?.replace(/_/g, ' ')}
                        size="small"
                        sx={{
                          bgcolor: alpha(stColor, 0.12),
                          color: stColor,
                          fontWeight: 800,
                          borderRadius: 1,
                        }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Review case">
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => openReview(row)}
                          sx={{ borderRadius: 1.5, textTransform: 'none', fontWeight: 600 }}
                        >
                          Review
                        </Button>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={total}
          page={page}
          rowsPerPage={rowsPerPage}
          rowsPerPageOptions={[25]}
          onPageChange={(_, p) => setPage(p)}
        />
      </TableContainer>

      {/* Review Dialog */}
      {selected && (
        <Dialog
          open
          onClose={() => setSelected(null)}
          maxWidth="md"
          fullWidth
          slotProps={{ paper: { sx: { borderRadius: 2, minHeight: 580 } } }}
        >
          <DialogTitle sx={{ fontWeight: 700, p: 3, pb: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Box>
              <Typography variant="h6" fontWeight={800} color="primary.main">
                {selected.kyc_reference} — KYC Review
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {`${selected.first_name ?? ''} ${selected.last_name ?? ''}`.trim() || selected.phone}
                {' · '}{selected.phone}
              </Typography>
            </Box>
            <Chip
              label={selected.status?.replace(/_/g, ' ')}
              size="small"
              sx={{
                bgcolor: alpha(STATUS_COLORS[selected.status] || '#64748b', 0.12),
                color: STATUS_COLORS[selected.status] || '#64748b',
                fontWeight: 800,
                borderRadius: 1,
              }}
            />
          </DialogTitle>

          <DialogContent dividers sx={{ p: 3 }}>
            {actionErr && <Alert severity="error" sx={{ mb: 2 }}>{actionErr}</Alert>}

            <Tabs value={reviewTab} onChange={(_, v) => setReviewTab(v)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
              <Tab icon={<ContactPageIcon fontSize="small" />} iconPosition="start" label="Identity & Documents" sx={{ fontWeight: 600, textTransform: 'none' }} />
              <Tab icon={<FaceIcon fontSize="small" />}        iconPosition="start" label="Biometrics"           sx={{ fontWeight: 600, textTransform: 'none' }} />
              <Tab icon={<ShieldIcon fontSize="small" />}      iconPosition="start" label="Risk & Operator"      sx={{ fontWeight: 600, textTransform: 'none' }} />
              <Tab icon={<HistoryIcon fontSize="small" />}     iconPosition="start" label="Audit Trail"          sx={{ fontWeight: 600, textTransform: 'none' }} />
            </Tabs>

            {/* Tab 0: Identity */}
            {reviewTab === 0 && (
              <Stack spacing={3}>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3,1fr)' }, gap: 2 }}>
                  {[
                    { label: 'NIN',          val: selected.nin    ?? '—' },
                    { label: 'SIM ICCID',    val: selected.iccid  ?? '—' },
                    { label: 'ID Expires',   val: selected.id_expiry_date ? formatDate(selected.id_expiry_date, false) : '—' },
                    { label: 'Date of Birth',val: selected.date_of_birth ? formatDate(selected.date_of_birth, false) : '—' },
                    { label: 'Nationality',  val: selected.nationality ?? '—' },
                    { label: 'District',     val: selected.district ?? '—' },
                  ].map((f) => (
                    <Paper key={f.label} sx={{ p: 2, borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
                      <Typography variant="caption" color="text.secondary" fontWeight={700}>{f.label.toUpperCase()}</Typography>
                      <Typography variant="subtitle2" fontWeight={700} sx={{ mt: 0.5, fontFamily: f.label.includes('NIN') || f.label.includes('ICCID') ? 'monospace' : 'inherit' }}>
                        {f.val}
                      </Typography>
                    </Paper>
                  ))}
                </Box>

                <Typography variant="subtitle2" fontWeight={700}>Submitted Documents — {selected.id_type ?? 'Identity document'}</Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2.5 }}>
                  <Paper sx={{ p: 2, borderRadius: 1.5, border: '1px solid', borderColor: 'divider', textAlign: 'center' }}>
                    <Typography variant="caption" fontWeight={700} color="text.secondary" display="block" mb={1}>Front View</Typography>
                    <DocImage src={getBackendFileUrl(selected.id_front_path)} fallbackSrc={selected.id_front_data} alt="ID Front" />
                  </Paper>
                  <Paper sx={{ p: 2, borderRadius: 1.5, border: '1px solid', borderColor: 'divider', textAlign: 'center' }}>
                    <Typography variant="caption" fontWeight={700} color="text.secondary" display="block" mb={1}>Back View</Typography>
                    <DocImage src={getBackendFileUrl(selected.id_back_path)} fallbackSrc={selected.id_back_data} alt="ID Back" />
                  </Paper>
                </Box>
              </Stack>
            )}

            {/* Tab 1: Biometrics */}
            {reviewTab === 1 && (
              <Stack spacing={3}>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1.5fr' }, gap: 3, alignItems: 'center' }}>
                  <Paper sx={{ p: 2.5, borderRadius: 1.5, border: '1px solid', borderColor: 'divider', textAlign: 'center' }}>
                    <Typography variant="caption" fontWeight={700} color="text.secondary" display="block" mb={1.5}>Citizen Selfie</Typography>
                    {(selected.face_image_path || selected.face_image_data) ? (
                      <Box
                        component="img"
                        src={getBackendFileUrl(selected.face_image_path) || selected.face_image_data || ''}
                        alt="Selfie"
                        sx={{ width: 140, height: 140, borderRadius: '50%', objectFit: 'cover', border: '3px solid #2563eb', mx: 'auto', display: 'block' }}
                      />
                    ) : (
                      <Box sx={{ width: 140, height: 140, borderRadius: '50%', bgcolor: 'action.hover', mx: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FaceIcon sx={{ fontSize: 48, color: 'text.disabled' }} />
                      </Box>
                    )}
                  </Paper>
                  <Stack spacing={2}>
                    <Paper sx={{ p: 2, borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
                      <Typography variant="caption" fontWeight={700} color="text.secondary">FACE MATCH SCORE</Typography>
                      <Typography variant="h5" fontWeight={800} color="success.main" sx={{ mt: 0.5 }}>
                        {selected.face_match_score != null ? `${selected.face_match_score}%` : '—'}
                      </Typography>
                      {selected.face_match_score != null && (
                        <LinearProgress
                          variant="determinate"
                          value={Math.min(selected.face_match_score, 100)}
                          sx={{ height: 6, borderRadius: 1, mt: 1, bgcolor: alpha('#10b981', 0.2) }}
                        />
                      )}
                    </Paper>
                    <Paper sx={{ p: 2, borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
                      <Typography variant="caption" fontWeight={700} color="text.secondary">LIVENESS CHECK</Typography>
                      <Stack direction="row" spacing={1} alignItems="center" mt={1}>
                        {selected.liveness_passed ? (
                          <>
                            <CheckCircleIcon color="success" fontSize="small" />
                            <Typography variant="body2" fontWeight={600}>
                              Passed — {selected.liveness_score != null ? `${selected.liveness_score}%` : ''}
                            </Typography>
                          </>
                        ) : (
                          <>
                            <CancelIcon color="error" fontSize="small" />
                            <Typography variant="body2" fontWeight={600}>Failed or not run</Typography>
                          </>
                        )}
                      </Stack>
                    </Paper>
                  </Stack>
                </Box>
              </Stack>
            )}

            {/* Tab 2: Risk & Operator */}
            {reviewTab === 2 && (
              <Stack spacing={3}>
                <Paper sx={{ p: 2.5, borderRadius: 1.5, border: '1px solid', borderColor: 'divider', bgcolor: alpha(theme.palette.primary.main, 0.02) }}>
                  <Typography variant="subtitle2" fontWeight={700} mb={1}>Risk Assessment</Typography>
                  <Stack direction="row" spacing={2} alignItems="center" mb={1.5}>
                    <Typography
                      variant="h3"
                      fontWeight={800}
                      color={selected.risk_score >= 70 ? 'error.main' : selected.risk_score >= 30 ? 'warning.main' : 'success.main'}
                    >
                      {selected.risk_score != null ? `${selected.risk_score}/100` : 'N/A'}
                    </Typography>
                    {selected.risk_score != null && (
                      <Chip
                        label={selected.risk_score >= 70 ? 'HIGH RISK' : selected.risk_score >= 30 ? 'MEDIUM RISK' : 'LOW RISK'}
                        color={selected.risk_score >= 70 ? 'error' : selected.risk_score >= 30 ? 'warning' : 'success'}
                        sx={{ fontWeight: 800, borderRadius: 1 }}
                      />
                    )}
                  </Stack>
                </Paper>

                <Paper sx={{ p: 2.5, borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="subtitle2" fontWeight={700} mb={1} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CellTowerIcon color="primary" /> Operator: {selected.operator_name ?? '—'}
                  </Typography>
                  {selected.rejection_reason && (
                    <Alert severity="warning" sx={{ mt: 2, borderRadius: 1.5 }}>
                      <strong>Rejection reason:</strong> {selected.rejection_reason}
                    </Alert>
                  )}
                  {selected.operator_confirmed_at && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Operator confirmed: {formatDate(selected.operator_confirmed_at)}
                    </Typography>
                  )}
                </Paper>
              </Stack>
            )}

            {/* Tab 3: Audit */}
            {reviewTab === 3 && (
              <Stack spacing={2}>
                <Typography variant="subtitle2" fontWeight={700}>Audit Trail</Typography>
                {[
                  { label: 'Submitted',         val: selected.created_at ? formatDate(selected.created_at) : null },
                  { label: 'Last updated',       val: selected.updated_at ? formatDate(selected.updated_at) : null },
                  { label: 'Reviewed at',        val: selected.reviewed_at ? formatDate(selected.reviewed_at) : null },
                  { label: 'Operator confirmed', val: selected.operator_confirmed_at ? formatDate(selected.operator_confirmed_at) : null },
                  { label: 'Expires',            val: selected.expires_at ? formatDate(selected.expires_at, false) : null },
                ].filter((e) => e.val).map((e) => (
                  <Paper key={e.label} sx={{ p: 2, borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="subtitle2" fontWeight={700}>{e.label}</Typography>
                      <Typography variant="caption" color="text.secondary">{e.val}</Typography>
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            )}
          </DialogContent>

          <DialogActions sx={{ p: 2.5, px: 3, justifyContent: 'space-between', bgcolor: alpha(theme.palette.background.default, 0.5) }}>
            <Stack direction="row" spacing={1}>
              <Button
                startIcon={<ReplayIcon />}
                variant="outlined"
                color="warning"
                onClick={handleRequestInfo}
                disabled={actionBusy}
                sx={{ borderRadius: 1.5, textTransform: 'none', fontWeight: 600 }}
              >
                Request Resubmission
              </Button>
            </Stack>
            <Stack direction="row" spacing={1}>
              <Button
                startIcon={<CancelIcon />}
                variant="outlined"
                color="error"
                onClick={() => { setRejectOpen(true); setActionErr(''); }}
                disabled={actionBusy}
                sx={{ borderRadius: 1.5, textTransform: 'none', fontWeight: 600 }}
              >
                Reject
              </Button>
              <Button
                startIcon={<CheckCircleIcon />}
                variant="contained"
                color="success"
                onClick={handleApprove}
                disabled={actionBusy}
                sx={{ borderRadius: 1.5, textTransform: 'none', fontWeight: 600 }}
              >
                {actionBusy ? <CircularProgress size={18} color="inherit" /> : 'Approve KYC'}
              </Button>
            </Stack>
          </DialogActions>
        </Dialog>
      )}

      {/* Rejection reason dialog */}
      <Dialog
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 2 } } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Rejection Reason</DialogTitle>
        <DialogContent dividers>
          {actionErr && <Alert severity="error" sx={{ mb: 2 }}>{actionErr}</Alert>}
          <Stack spacing={2} pt={1}>
            <TextField
              select
              label="Category"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              fullWidth
              size="small"
            >
              <MenuItem value="Blurred ID Photo">Blurred / Unreadable ID Photo</MenuItem>
              <MenuItem value="NIN Name Mismatch">NIN Database Name Mismatch</MenuItem>
              <MenuItem value="Expired ID Document">Expired Identity Document</MenuItem>
              <MenuItem value="Invalid SIM ICCID">Invalid SIM Card Serial / ICCID</MenuItem>
              <MenuItem value="Biometric Liveness Failure">Facial Liveness Check Failed</MenuItem>
              <MenuItem value="OTHER">Custom reason…</MenuItem>
            </TextField>
            {rejectReason === 'OTHER' && (
              <TextField
                label="Specify reason"
                value={rejectCustom}
                onChange={(e) => setRejectCustom(e.target.value)}
                fullWidth
                multiline
                rows={3}
                size="small"
              />
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setRejectOpen(false)} sx={{ borderRadius: 1.5, textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleConfirmReject}
            disabled={actionBusy}
            sx={{ borderRadius: 1.5, textTransform: 'none', fontWeight: 600 }}
          >
            {actionBusy ? <CircularProgress size={18} color="inherit" /> : 'Confirm Rejection'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
