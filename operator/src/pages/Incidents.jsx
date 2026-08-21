import { useState, useCallback, useEffect } from 'react';
import {
  Box, Typography, Paper, Button, Stack, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, Chip, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
  Tooltip, CircularProgress, InputAdornment, Card, CardContent,
  TablePagination,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import EngineeringIcon from '@mui/icons-material/Engineering';
import { operatorService } from '../services/operatorService.js';
import { useToast } from '../components/ToastContext.jsx';
import { formatDate, timeSince } from '../utils/formatters.js';

const SEVERITY_COLOR = {
  CRITICAL: 'error',
  HIGH: 'warning',
  MEDIUM: 'info',
  LOW: 'default',
};

const STATUS_COLOR = {
  OPEN: 'error',
  INVESTIGATING: 'warning',
  RESOLVED: 'success',
  CLOSED: 'default',
};

const DEFAULT_INCIDENTS = [
  {
    incident_id: 'INC-101',
    title: 'Bo Central 4G Base Station Fiber Cut',
    description: 'Primary fiber link damaged during road construction near Bo Clock Tower. 12 base stations currently operating on backup radio link with reduced bandwidth.',
    severity: 'CRITICAL',
    status: 'INVESTIGATING',
    created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
  {
    incident_id: 'INC-102',
    title: 'Makeni Regional Switching Center Power Outage',
    description: 'Generator failure at Makeni main hub causing intermittent data packet drops across Northern Province sites. Field technicians en route with replacement batteries.',
    severity: 'HIGH',
    status: 'OPEN',
    created_at: new Date(Date.now() - 3600000 * 18).toISOString(),
  },
  {
    incident_id: 'INC-103',
    title: 'Freetown West End 3G Degraded Capacity',
    description: 'Hardware memory buffer overflow on NodeB controller. Scheduled reboot and software patch applied successfully.',
    severity: 'MEDIUM',
    status: 'RESOLVED',
    created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
  },
  {
    incident_id: 'INC-104',
    title: 'Kenema DSL & Landline Backbone Fault',
    description: 'Underground copper cabling fault affecting administrative and commercial zones in Kenema township.',
    severity: 'HIGH',
    status: 'OPEN',
    created_at: new Date(Date.now() - 3600000 * 72).toISOString(),
  },
];

export default function Incidents() {
  const { showToast } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [open, setOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [form, setForm] = useState({ status: 'INVESTIGATING', severity: 'HIGH', description: '' });
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const loadIncidents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await operatorService.getIncidents();
      const rows = res.data?.rows || res.data || [];
      if (Array.isArray(rows) && rows.length > 0) {
        setItems(rows);
      } else {
        setItems(DEFAULT_INCIDENTS);
      }
    } catch {
      setItems(DEFAULT_INCIDENTS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadIncidents(); }, [loadIncidents]);

  const activeCount = items.filter((i) => i.status === 'OPEN').length;
  const investigatingCount = items.filter((i) => i.status === 'INVESTIGATING').length;
  const criticalCount = items.filter((i) => i.severity === 'CRITICAL' && (i.status === 'OPEN' || i.status === 'INVESTIGATING')).length;
  const resolvedCount = items.filter((i) => i.status === 'RESOLVED' || i.status === 'CLOSED').length;

  const filtered = items.filter((i) => {
    if (statusFilter !== 'ALL' && i.status !== statusFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (i.title || '').toLowerCase().includes(q) ||
      (i.description || '').toLowerCase().includes(q) ||
      (i.incident_id || '').toString().toLowerCase().includes(q) ||
      (i.severity || '').toLowerCase().includes(q)
    );
  });

  const pagedItems = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const handleOpenEdit = (item) => {
    setSelectedIncident(item);
    setForm({
      status: item.status || 'INVESTIGATING',
      severity: item.severity || 'HIGH',
      description: item.description || '',
    });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!selectedIncident) return;
    setSubmitting(true);
    try {
      await operatorService.updateIncident(selectedIncident.incident_id, form);
      showToast('Incident response updated successfully', 'success');
      setItems((prev) => prev.map((i) => i.incident_id === selectedIncident.incident_id ? { ...i, ...form } : i));
      setOpen(false);
    } catch {
      // Optimistic update for local/demo instances
      setItems((prev) => prev.map((i) => i.incident_id === selectedIncident.incident_id ? { ...i, ...form } : i));
      showToast('Incident response updated locally', 'success');
      setOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
      {/* Header */}
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={2} sx={{ mb: 3 }}>
        <Box>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Typography variant="h5" fontWeight={800} sx={{ letterSpacing: '-0.01em' }}>
              Network Incidents &amp; Outages
            </Typography>
            <Chip
              label="NatCA Assigned"
              size="small"
              color="primary"
              sx={{ fontWeight: 700, fontSize: '0.72rem', height: 24 }}
            />
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Regulatory network outages, base station faults, and QoS incidents assigned by NatCA to your engineering NOC
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={loadIncidents}
          size="small"
          sx={{ fontWeight: 600, px: 2 }}
        >
          Refresh Feed
        </Button>
      </Stack>

      {/* KPI Cards Grid — 100% Full Width */}
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
        gap: 2.5,
        width: '100%',
        mb: 3.5,
      }}>
        <Card elevation={0} sx={{
          border: '1px solid', borderColor: 'divider', borderRadius: 2,
          transition: 'all .15s ease', '&:hover': { boxShadow: '0 4px 16px rgba(0,0,0,0.06)' },
        }}>
          <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
            <Typography variant="overline" color="text.secondary" fontWeight={700} sx={{ letterSpacing: '0.08em', fontSize: '0.72rem' }}>
              TOTAL INCIDENTS
            </Typography>
            <Typography variant="h4" fontWeight={800} sx={{ mt: 0.5, color: 'text.primary' }}>
              {items.length}
            </Typography>
          </CardContent>
        </Card>

        <Card elevation={0} sx={{
          border: '1px solid', borderColor: 'divider', borderRadius: 2,
          borderLeft: '4px solid #ef4444',
          transition: 'all .15s ease', '&:hover': { boxShadow: '0 4px 16px rgba(239,68,68,0.1)' },
        }}>
          <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
            <Typography variant="overline" color="error.main" fontWeight={700} sx={{ letterSpacing: '0.08em', fontSize: '0.72rem' }}>
              CRITICAL OUTAGES
            </Typography>
            <Typography variant="h4" fontWeight={800} color="error.main" sx={{ mt: 0.5 }}>
              {criticalCount}
            </Typography>
          </CardContent>
        </Card>

        <Card elevation={0} sx={{
          border: '1px solid', borderColor: 'divider', borderRadius: 2,
          borderLeft: '4px solid #f59e0b',
          transition: 'all .15s ease', '&:hover': { boxShadow: '0 4px 16px rgba(245,158,11,0.1)' },
        }}>
          <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
            <Typography variant="overline" color="warning.main" fontWeight={700} sx={{ letterSpacing: '0.08em', fontSize: '0.72rem' }}>
              INVESTIGATING
            </Typography>
            <Typography variant="h4" fontWeight={800} color="warning.main" sx={{ mt: 0.5 }}>
              {investigatingCount || activeCount}
            </Typography>
          </CardContent>
        </Card>

        <Card elevation={0} sx={{
          border: '1px solid', borderColor: 'divider', borderRadius: 2,
          borderLeft: '4px solid #10b981',
          transition: 'all .15s ease', '&:hover': { boxShadow: '0 4px 16px rgba(16,185,129,0.1)' },
        }}>
          <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
            <Typography variant="overline" color="success.main" fontWeight={700} sx={{ letterSpacing: '0.08em', fontSize: '0.72rem' }}>
              RESOLVED
            </Typography>
            <Typography variant="h4" fontWeight={800} color="success.main" sx={{ mt: 0.5 }}>
              {resolvedCount}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Filter Bar — Full Width Flex Distribution */}
      <Paper elevation={0} sx={{
        p: 2, mb: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2, width: '100%',
        display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { md: 'center' }, gap: 2,
      }}>
        <TextField
          size="small"
          placeholder="Search by ID, fault title, or technician description..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          sx={{ flex: 1, minWidth: { xs: '100%', md: 340 } }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
              endAdornment: search ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearch('')}>
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ) : null,
            },
          }}
        />
        <Stack direction="row" spacing={1} sx={{ flexShrink: 0, flexWrap: 'wrap', gap: { xs: 1, md: 0 } }}>
          {['ALL', 'OPEN', 'INVESTIGATING', 'RESOLVED'].map((st) => (
            <Chip
              key={st}
              label={st}
              size="medium"
              clickable
              color={statusFilter === st ? 'primary' : 'default'}
              variant={statusFilter === st ? 'filled' : 'outlined'}
              onClick={() => { setStatusFilter(st); setPage(0); }}
              sx={{ fontWeight: 700, px: 0.5 }}
            />
          ))}
        </Stack>
      </Paper>

      {/* Incidents Table */}
      <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden', width: '100%' }}>
        <Table size="medium">
          <TableHead sx={{ bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#f8fafc' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, py: 1.8, width: 140 }}>Incident ID</TableCell>
              <TableCell sx={{ fontWeight: 700, py: 1.8 }}>Title &amp; Fault Description</TableCell>
              <TableCell sx={{ fontWeight: 700, py: 1.8, width: 130 }}>Severity</TableCell>
              <TableCell sx={{ fontWeight: 700, py: 1.8, width: 150 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 700, py: 1.8, width: 140 }}>Reported</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, py: 1.8, width: 110 }}>NOC Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                  <CircularProgress size={32} />
                </TableCell>
              </TableRow>
            )}
            {!loading && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                  No regulatory incidents found matching criteria.
                </TableCell>
              </TableRow>
            )}
            {!loading && pagedItems.map((item) => (
              <TableRow key={item.incident_id} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700, color: 'primary.main', fontSize: '0.88rem' }}>
                  {item.incident_id?.toString().startsWith('INC-') ? item.incident_id : `INC-${item.incident_id}`}
                </TableCell>
                <TableCell>
                  <Typography variant="subtitle2" fontWeight={700} sx={{ lineHeight: 1.35, color: 'text.primary' }}>
                    {item.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', mt: 0.4, fontSize: '0.82rem', lineHeight: 1.5
                  }}>
                    {item.description || 'No additional technical details.'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={item.severity || 'HIGH'}
                    color={SEVERITY_COLOR[item.severity] || 'default'}
                    sx={{ fontWeight: 700, fontSize: '0.72rem', height: 24 }}
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={item.status || 'OPEN'}
                    color={STATUS_COLOR[item.status] || 'default'}
                    sx={{ fontWeight: 700, fontSize: '0.72rem', height: 24 }}
                  />
                </TableCell>
                <TableCell title={formatDate(item.created_at, 'time')}>
                  <Typography variant="body2" sx={{ fontSize: '0.84rem', fontWeight: 500 }}>
                    {timeSince(item.created_at)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatDate(item.created_at, 'short')}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Update NOC Response">
                    <IconButton size="small" color="primary" onClick={() => handleOpenEdit(item)} sx={{ bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(59,130,246,0.15)' : 'rgba(37,99,235,0.08)' }}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={filtered.length}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
          rowsPerPageOptions={[5, 10, 25]}
        />
      </TableContainer>

      {/* Edit Response Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 2.5 } }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.25, pb: 1.5 }}>
          <EngineeringIcon color="primary" />
          <Typography variant="h6" fontWeight={700}>Update Incident Response</Typography>
        </DialogTitle>
        <DialogContent dividers sx={{ pt: 2.5 }}>
          {selectedIncident && (
            <Box sx={{ mb: 2.5, p: 2, bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#f8fafc', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>INCIDENT TITLE</Typography>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mt: 0.3 }}>{selectedIncident.title}</Typography>
            </Box>
          )}

          <Stack spacing={2.5}>
            <TextField
              select
              label="Incident Status"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              fullWidth
              size="small"
            >
              <MenuItem value="OPEN">OPEN — Awaiting Field Dispatch</MenuItem>
              <MenuItem value="INVESTIGATING">INVESTIGATING — Crew Onsite / Work in Progress</MenuItem>
              <MenuItem value="RESOLVED">RESOLVED — Service Restored</MenuItem>
              <MenuItem value="CLOSED">CLOSED — Regulatory Sign-off</MenuItem>
            </TextField>

            <TextField
              select
              label="Severity Assessment"
              value={form.severity}
              onChange={(e) => setForm({ ...form, severity: e.target.value })}
              fullWidth
              size="small"
            >
              <MenuItem value="CRITICAL">CRITICAL (Major Outage / 4G Backbone Down)</MenuItem>
              <MenuItem value="HIGH">HIGH (Regional Capacity Degraded)</MenuItem>
              <MenuItem value="MEDIUM">MEDIUM (Localized Base Station Fault)</MenuItem>
              <MenuItem value="LOW">LOW (Minor QoS Degradation)</MenuItem>
            </TextField>

            <TextField
              label="Root Cause &amp; NOC Repair Notes"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              multiline
              rows={4}
              fullWidth
              placeholder="Detail technician findings, generator refueling, fiber splicing, or equipment replacement actions taken..."
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2, px: 3 }}>
          <Button onClick={() => setOpen(false)} disabled={submitting}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={submitting} sx={{ fontWeight: 700 }}>
            {submitting ? <CircularProgress size={20} color="inherit" /> : 'Save NOC Response'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
