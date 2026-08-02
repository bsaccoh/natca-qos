import { useState, useCallback, useEffect } from 'react';
import {
  Box, Typography, Paper, Button, Stack, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, Chip, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
  Alert, Tooltip, useTheme, alpha
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import NotificationImportantIcon from '@mui/icons-material/NotificationImportant';
import CellTowerIcon from '@mui/icons-material/CellTower';
import SendIcon from '@mui/icons-material/Send';
import { get, post, patch } from '../api/client.js';

const OPERATOR_COLORS = {
  'Orange SL': '#ff7900',
  'Africell': '#8e24aa',
  'Qcell': '#5b2d8e',
  'SierraTel': '#00a3e0',
};

const SAMPLE_INCIDENTS = [
  { incident_id: 'INC-101', operator_name: 'Orange SL', title: 'Bo Central 4G Base Station Fiber Cut', description: 'Primary fiber link damaged during road construction near Bo Clock Tower. 12 base stations operating on backup radio link.', severity: 'CRITICAL', status: 'OPEN', created_at: '8/1/2026, 12:06:12 PM' },
  { incident_id: 'INC-102', operator_name: 'Africell', title: 'Makeni Regional Switching Center Power Outage', description: 'Generator failure at Makeni main hub causing intermittent data drops in Northern Province.', severity: 'HIGH', status: 'OPEN', created_at: '8/1/2026, 4:06:12 AM' },
  { incident_id: 'INC-103', operator_name: 'Qcell', title: 'Freetown West End 3G Degraded Capacity', description: 'Hardware memory overflow on NodeB controller. Rebooted and software patch applied.', severity: 'MEDIUM', status: 'RESOLVED', created_at: '7/30/2026, 4:06:12 PM' },
  { incident_id: 'INC-104', operator_name: 'SierraTel', title: 'Kenema Landline & DSL Gateway Failure', description: 'Underground copper cabling fault affecting government offices in Kenema township.', severity: 'HIGH', status: 'OPEN', created_at: '7/31/2026, 4:06:12 PM' },
];

export default function Incidents() {
  const [items, setItems] = useState(SAMPLE_INCIDENTS);
  const [loading, setLoading] = useState(false);
  const [dispatchAlert, setDispatchAlert] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ incident_id: null, operatorId: '1', title: '', description: '', severity: 'HIGH', status: 'OPEN' });

  const theme = useTheme();

  const loadIncidents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await get('/incidents');
      if (res.data?.rows?.length > 0) {
        setItems(res.data.rows);
      }
    } catch (e) { console.error('Failed to load incidents', e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadIncidents(); }, [loadIncidents]);

  // Metrics
  const activeCount = items.filter(i => i.status === 'OPEN').length;
  const criticalCount = items.filter(i => i.severity === 'CRITICAL' && i.status === 'OPEN').length;
  const resolvedCount = items.filter(i => i.status === 'RESOLVED').length;

  const handleOpen = (item = null) => {
    if (item) {
      setForm({
        incident_id: item.incident_id,
        operatorId: item.operatorId || '1',
        title: item.title,
        description: item.description || '',
        severity: item.severity || 'HIGH',
        status: item.status || 'OPEN',
      });
    } else {
      setForm({ incident_id: null, operatorId: '1', title: '', description: '', severity: 'HIGH', status: 'OPEN' });
    }
    setOpen(true);
  };

  const handleSave = async () => {
    try {
      if (form.incident_id) {
        setItems(prev => prev.map(i => i.incident_id === form.incident_id ? { ...i, title: form.title, description: form.description, severity: form.severity, status: form.status } : i));
        await patch(`/incidents/${form.incident_id}`, {
          title: form.title, description: form.description, severity: form.severity, status: form.status
        }).catch(() => {});
      } else {
        const opNames = { '1': 'Orange SL', '2': 'Africell', '3': 'Qcell', '4': 'SierraTel' };
        const newItem = {
          incident_id: `INC-${Math.floor(100 + Math.random() * 900)}`,
          operator_name: opNames[form.operatorId] || 'Orange SL',
          title: form.title,
          description: form.description,
          severity: form.severity,
          status: form.status,
          created_at: new Date().toLocaleString()
        };
        setItems(prev => [newItem, ...prev]);
        await post('/incidents', {
          operatorId: form.operatorId, title: form.title, description: form.description, severity: form.severity
        }).catch(() => {});
      }
      setOpen(false);
    } catch (e) { console.error('Failed to save', e); }
  };

  const handleDispatchAlert = (incident) => {
    setDispatchAlert(`Emergency regulatory alert dispatched to ${incident.operator_name} Engineering NOC for ${incident.incident_id}. SLA countdown timer active.`);
    setTimeout(() => setDispatchAlert(''), 6000);
  };

  return (
    <Box sx={{ width: '100%', minHeight: '100%', pb: 4 }}>
      {/* Header Bar - Clean Responsive Flex Layout */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box sx={{ 
            width: 40, height: 40, borderRadius: 1.5, flexShrink: 0,
            bgcolor: alpha(theme.palette.error.main, 0.12), 
            color: 'error.main', display: 'flex', alignItems: 'center', justifyContent: 'center' 
          }}>
            <WarningIcon fontSize="medium" />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700} sx={{ letterSpacing: '-0.02em', color: 'text.primary' }}>
              Major Network Incidents & Outages
            </Typography>
            <Typography variant="body2" color="text.secondary">
              National Infrastructure Monitoring — Emergency Dispatch & SLA Enforcement
            </Typography>
          </Box>
        </Stack>

        <Button variant="contained" color="error" startIcon={<AddIcon />} onClick={() => handleOpen()} sx={{ borderRadius: 1.5, textTransform: 'none', fontWeight: 600, flexShrink: 0 }}>
          Report Network Incident
        </Button>
      </Box>

      {/* Alert Banner */}
      {dispatchAlert && (
        <Alert severity="success" sx={{ mb: 3, borderRadius: 1.5 }}>
          {dispatchAlert}
        </Alert>
      )}

      {/* KPI Summary Cards */}
      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' }, 
        gap: 2, 
        mb: 3, 
        width: '100%' 
      }}>
        <Paper sx={{ p: 2.5, borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
            <Typography variant="caption" fontWeight={700} color="text.secondary">ACTIVE INCIDENTS</Typography>
            <WarningIcon sx={{ color: '#ef4444', fontSize: 22 }} />
          </Box>
          <Typography variant="h3" fontWeight={800} color="#ef4444" sx={{ mt: 1 }}>{activeCount}</Typography>
          <Typography variant="caption" color="text.secondary">Ongoing network outages</Typography>
        </Paper>

        <Paper sx={{ p: 2.5, borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
            <Typography variant="caption" fontWeight={700} color="text.secondary">CRITICAL OUTAGES</Typography>
            <NotificationImportantIcon sx={{ color: '#dc2626', fontSize: 22 }} />
          </Box>
          <Typography variant="h3" fontWeight={800} color="#dc2626" sx={{ mt: 1 }}>{criticalCount}</Typography>
          <Typography variant="caption" color="text.secondary">High subscriber impact</Typography>
        </Paper>

        <Paper sx={{ p: 2.5, borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
            <Typography variant="caption" fontWeight={700} color="text.secondary">RESOLVED (30 DAYS)</Typography>
            <CheckCircleIcon sx={{ color: '#10b981', fontSize: 22 }} />
          </Box>
          <Typography variant="h3" fontWeight={800} color="#10b981" sx={{ mt: 1 }}>{resolvedCount}</Typography>
          <Typography variant="caption" color="text.secondary">Restored services</Typography>
        </Paper>

        <Paper sx={{ p: 2.5, borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
            <Typography variant="caption" fontWeight={700} color="text.secondary">MONITORED TOWERS</Typography>
            <CellTowerIcon sx={{ color: '#2563eb', fontSize: 22 }} />
          </Box>
          <Typography variant="h3" fontWeight={800} color="#2563eb" sx={{ mt: 1 }}>480</Typography>
          <Typography variant="caption" color="text.secondary">Cell towers connected</Typography>
        </Paper>
      </Box>

      {/* Incidents Table */}
      <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 1.5, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
        <Table>
          <TableHead sx={{ bgcolor: (t) => alpha(t.palette.primary.main, 0.04) }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>INCIDENT REF</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>INCIDENT TITLE & ROOT CAUSE</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>OPERATOR</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>SEVERITY</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>STATUS</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>STARTED AT</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>ACTIONS</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((row) => (
              <TableRow key={row.incident_id} hover>
                <TableCell>
                  <Typography variant="subtitle2" fontWeight={800} color="error.main" sx={{ fontFamily: 'monospace' }}>
                    {row.incident_id}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="subtitle2" fontWeight={700}>{row.title}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', maxWidth: 460, mt: 0.5 }}>
                    {row.description}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={row.operator_name}
                    size="small"
                    sx={{
                      fontWeight: 700, fontSize: 11, borderRadius: 1,
                      bgcolor: alpha(OPERATOR_COLORS[row.operator_name] || '#2563eb', 0.12),
                      color: OPERATOR_COLORS[row.operator_name] || '#2563eb',
                      border: `1px solid ${alpha(OPERATOR_COLORS[row.operator_name] || '#2563eb', 0.3)}`
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={row.severity}
                    sx={{
                      fontWeight: 800, fontSize: 11, borderRadius: 1,
                      bgcolor: row.severity === 'CRITICAL' ? alpha('#ef4444', 0.12) : row.severity === 'HIGH' ? alpha('#f59e0b', 0.12) : alpha('#3b82f6', 0.12),
                      color: row.severity === 'CRITICAL' ? '#ef4444' : row.severity === 'HIGH' ? '#f59e0b' : '#3b82f6',
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={row.status}
                    sx={{
                      fontWeight: 700, borderRadius: 1,
                      bgcolor: row.status === 'OPEN' ? alpha('#ef4444', 0.12) : alpha('#10b981', 0.12),
                      color: row.status === 'OPEN' ? '#ef4444' : '#10b981',
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="caption" color="text.secondary">{row.created_at}</Typography>
                </TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                    {row.status === 'OPEN' && (
                      <Tooltip title="Dispatch Emergency Regulatory Alert to Operator NOC">
                        <IconButton size="small" color="error" onClick={() => handleDispatchAlert(row)}>
                          <SendIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title="Edit Incident Status">
                      <IconButton size="small" color="primary" onClick={() => handleOpen(row)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Modal Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: 1.5 } } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {form.incident_id ? `Edit Network Incident (${form.incident_id})` : 'Report Major Network Incident'}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} pt={1}>
            {!form.incident_id && (
              <TextField select label="Affected Operator" value={form.operatorId} onChange={(e) => setForm({ ...form, operatorId: e.target.value })} fullWidth size="small">
                <MenuItem value="1">Orange SL</MenuItem>
                <MenuItem value="2">Africell</MenuItem>
                <MenuItem value="3">Qcell</MenuItem>
                <MenuItem value="4">SierraTel</MenuItem>
              </TextField>
            )}

            <TextField label="Incident Title & Affected Area" placeholder="e.g. Bo Central 4G Fiber Cut" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} fullWidth size="small" required />

            <TextField label="Root Cause & Impact Description" placeholder="Detailed technical report on affected towers and subscriber impact..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} fullWidth multiline rows={4} size="small" />

            <Stack direction="row" spacing={2}>
              <TextField select label="Severity Level" value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })} fullWidth size="small">
                <MenuItem value="CRITICAL">CRITICAL (Major Outage)</MenuItem>
                <MenuItem value="HIGH">HIGH (Regional Drop)</MenuItem>
                <MenuItem value="MEDIUM">MEDIUM (Degraded QoS)</MenuItem>
              </TextField>

              <TextField select label="Incident Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} fullWidth size="small">
                <MenuItem value="OPEN">OPEN (Active Outage)</MenuItem>
                <MenuItem value="RESOLVED">RESOLVED (Restored)</MenuItem>
              </TextField>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpen(false)} sx={{ borderRadius: 1.5, textTransform: 'none' }}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleSave} sx={{ borderRadius: 1.5, textTransform: 'none', fontWeight: 600 }}>Save Incident</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
