import { useState, useMemo, useEffect } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, IconButton, Button, TextField, InputAdornment,
  MenuItem, Select, FormControl, InputLabel, Dialog, DialogTitle, DialogContent,
  DialogActions, Stack, Tooltip, Alert, useTheme, alpha
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import DownloadIcon from '@mui/icons-material/Download';
import QrCodeIcon from '@mui/icons-material/QrCode';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BlockIcon from '@mui/icons-material/Block';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import PhoneInTalkIcon from '@mui/icons-material/PhoneInTalk';
import { exportToCSV } from '../utils/exportUtils.js';
import { get, post, patch, del } from '../api/client.js';

const OPERATOR_COLORS = {
  'Orange Sierra Leone': '#ff7900',
  'Orange SL': '#ff7900',
  'Africell': '#8e24aa',
  'Qcell': '#5b2d8e',
  'Sierra Tel': '#00a3e0',
  'SierraTel': '#00a3e0',
  'National': '#2563eb',
};

const CATEGORIES = ['SUPPORT', 'EMERGENCY', 'BALANCE', 'DATA', 'FINANCIAL', 'SELF-CARE', 'VAS'];

export default function Ussd() {
  const [codes, setCodes] = useState([]);
  const [operators, setOperators] = useState([]);
  const [search, setSearch] = useState('');
  const [operatorFilter, setOperatorFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Modal State
  const [openModal, setOpenModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [formData, setFormData] = useState({
    code: '', description: '', service_category: 'EMERGENCY', operator_id: '', is_active: true
  });

  const theme = useTheme();

  const loadData = async () => {
    try {
      const [ussdRes, opsRes] = await Promise.all([
        get('/ussd'),
        get('/operators')
      ]);
      setCodes(ussdRes.data || []);
      setOperators(opsRes.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { loadData(); }, []);

  // Metrics
  const totalCount = codes.length;
  const activeCount = codes.filter(c => c.is_active).length;
  const emergencyCount = codes.filter(c => c.service_category === 'EMERGENCY' || c.operator_name === 'National').length;
  const pendingCount = codes.filter(c => !c.is_active).length;

  const filteredCodes = useMemo(() => {
    return codes.filter(c => {
      const matchSearch = c.code.toLowerCase().includes(search.toLowerCase()) || (c.description || '').toLowerCase().includes(search.toLowerCase());
      const matchOp = operatorFilter === 'ALL' || c.operator_name === operatorFilter;
      const matchStatus = statusFilter === 'ALL' || (statusFilter === 'ACTIVE' ? c.is_active : !c.is_active);
      const matchCat = categoryFilter === 'ALL' || c.service_category === categoryFilter;
      return matchSearch && matchOp && matchStatus && matchCat;
    });
  }, [codes, search, operatorFilter, statusFilter, categoryFilter]);

  const handleOpenAdd = () => {
    setEditItem(null);
    const defaultOp = operators.find(o => o.operator_name === 'National') || operators[0];
    setFormData({ code: '', description: '', service_category: 'EMERGENCY', operator_id: defaultOp ? defaultOp.operator_id : '', is_active: true });
    setOpenModal(true);
  };

  const handleOpenEdit = (item) => {
    setEditItem(item);
    setFormData({ code: item.code, description: item.description, service_category: item.service_category, operator_id: item.operator_id, is_active: item.is_active });
    setOpenModal(true);
  };

  const handleSave = async () => {
    if (!formData.code || !formData.description) return;
    try {
      if (editItem) {
        await patch(`/ussd/${editItem.ussd_id}`, formData);
      } else {
        await post('/ussd', formData);
      }
      loadData();
      setOpenModal(false);
    } catch (err) {
      console.error(err);
      alert('Error saving USSD code');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this USSD shortcode allocation?')) {
      try {
        await del(`/ussd/${id}`);
        loadData();
      } catch (err) {
        console.error(err);
        alert('Error deleting USSD code');
      }
    }
  };

  const handleExport = () => {
    exportToCSV('NatCA_USSD_Shortcodes', filteredCodes.map(c => ({
      Shortcode: c.code,
      ServiceTitle: c.description,
      Category: c.service_category,
      Operator: c.operator_name,
      Status: c.is_active ? 'ACTIVE' : 'SUSPENDED/PENDING'
    })));
  };

  return (
    <Box sx={{ width: '100%', minHeight: '100%', pb: 4 }}>
      {/* Header Bar - Clean Flex Wrap Spacing */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box sx={{ 
            width: 40, height: 40, borderRadius: 1.5, flexShrink: 0,
            bgcolor: alpha(theme.palette.primary.main, 0.12), 
            color: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center' 
          }}>
            <QrCodeIcon fontSize="medium" />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700} sx={{ letterSpacing: '-0.02em', color: 'text.primary' }}>
              USSD & Emergency Shortcodes
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Regulatory Shortcode Registry — Toll-Free Lines & Operator Services
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" spacing={1.5} sx={{ flexShrink: 0 }}>
          <Button startIcon={<DownloadIcon />} variant="outlined" onClick={handleExport} sx={{ borderRadius: 1.5, textTransform: 'none', fontWeight: 600 }}>
            Export CSV
          </Button>
          <Button startIcon={<AddIcon />} variant="contained" onClick={handleOpenAdd} sx={{ borderRadius: 1.5, textTransform: 'none', fontWeight: 600 }}>
            Allocate Shortcode
          </Button>
        </Stack>
      </Box>

      {/* KPI Metrics */}
      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' }, 
        gap: 2, 
        mb: 3, 
        width: '100%' 
      }}>
        <Paper sx={{ p: 2.5, borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
            <Typography variant="caption" fontWeight={700} color="text.secondary">TOTAL SHORTCODES</Typography>
            <QrCodeIcon sx={{ color: '#2563eb', fontSize: 22 }} />
          </Box>
          <Typography variant="h3" fontWeight={800} color="#2563eb" sx={{ mt: 1 }}>{totalCount}</Typography>
          <Typography variant="caption" color="text.secondary">Registered in Sierra Leone</Typography>
        </Paper>

        <Paper sx={{ p: 2.5, borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
            <Typography variant="caption" fontWeight={700} color="text.secondary">ACTIVE SERVICES</Typography>
            <CheckCircleIcon sx={{ color: '#10b981', fontSize: 22 }} />
          </Box>
          <Typography variant="h3" fontWeight={800} color="#10b981" sx={{ mt: 1 }}>{activeCount}</Typography>
          <Typography variant="caption" color="text.secondary">Compliant & Operational</Typography>
        </Paper>

        <Paper sx={{ p: 2.5, borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
            <Typography variant="caption" fontWeight={700} color="text.secondary">EMERGENCY LINES</Typography>
            <PhoneInTalkIcon sx={{ color: '#a855f7', fontSize: 22 }} />
          </Box>
          <Typography variant="h3" fontWeight={800} color="#a855f7" sx={{ mt: 1 }}>{emergencyCount}</Typography>
          <Typography variant="caption" color="text.secondary">Toll-free essential lines</Typography>
        </Paper>

        <Paper sx={{ p: 2.5, borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
            <Typography variant="caption" fontWeight={700} color="text.secondary">PENDING / SUSPENDED</Typography>
            <HourglassEmptyIcon sx={{ color: '#ef4444', fontSize: 22 }} />
          </Box>
          <Typography variant="h3" fontWeight={800} color="#ef4444" sx={{ mt: 1 }}>{pendingCount}</Typography>
          <Typography variant="caption" color="text.secondary">Under regulatory review</Typography>
        </Paper>
      </Box>

      {/* Search and Filters */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
          <TextField
            placeholder="Search shortcode (e.g. 117, 111, 119) or service..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            size="small"
            fullWidth
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
            }}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
          />

          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Operator</InputLabel>
            <Select value={operatorFilter} label="Operator" onChange={(e) => setOperatorFilter(e.target.value)} sx={{ borderRadius: 1.5 }}>
              <MenuItem value="ALL">All Operators</MenuItem>
              <MenuItem value="National">National (All Networks)</MenuItem>
              <MenuItem value="Orange SL">Orange SL</MenuItem>
              <MenuItem value="Africell">Africell</MenuItem>
              <MenuItem value="Qcell">Qcell</MenuItem>
              <MenuItem value="SierraTel">SierraTel</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Category</InputLabel>
            <Select value={categoryFilter} label="Category" onChange={(e) => setCategoryFilter(e.target.value)} sx={{ borderRadius: 1.5 }}>
              <MenuItem value="ALL">All Categories</MenuItem>
              {CATEGORIES.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Status</InputLabel>
            <Select value={statusFilter} label="Status" onChange={(e) => setStatusFilter(e.target.value)} sx={{ borderRadius: 1.5 }}>
              <MenuItem value="ALL">All Statuses</MenuItem>
              <MenuItem value="ACTIVE">Active</MenuItem>
              <MenuItem value="UNDER_REVIEW">Under Review</MenuItem>
              <MenuItem value="SUSPENDED">Suspended</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </Paper>

      {/* Shortcode Table */}
      <Paper sx={{ borderRadius: 1.5, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead sx={{ bgcolor: (t) => alpha(t.palette.primary.main, 0.04) }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>SHORTCODE</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>SERVICE TITLE & DEPARTMENT</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>CATEGORY</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>OPERATOR NETWORK</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>TARIFF RATE</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>STATUS</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>LAST UPDATED</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>ACTIONS</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredCodes.map((row) => (
                <TableRow key={row.ussd_id} hover>
                  <TableCell>
                    <Typography variant="subtitle2" fontWeight={800} color="primary.main" sx={{ fontFamily: 'monospace', fontSize: '1.05rem' }}>
                      {row.code}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={700}>{row.description}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={row.service_category} size="small" variant="outlined" sx={{ borderRadius: 1, fontSize: 11 }} />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={row.operator_name}
                      size="small"
                      sx={{
                        fontWeight: 700,
                        fontSize: 11,
                        borderRadius: 1,
                        bgcolor: alpha(OPERATOR_COLORS[row.operator_name] || '#2563eb', 0.12),
                        color: OPERATOR_COLORS[row.operator_name] || '#2563eb',
                        border: `1px solid ${alpha(OPERATOR_COLORS[row.operator_name] || '#2563eb', 0.3)}`
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" fontWeight={700} color="text.primary">
                      -
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {row.is_active ? <Chip label="ACTIVE" size="small" sx={{ bgcolor: alpha('#10b981', 0.12), color: '#10b981', fontWeight: 700, borderRadius: 1 }} />
                                  : <Chip label="SUSPENDED" size="small" sx={{ bgcolor: alpha('#ef4444', 0.12), color: '#ef4444', fontWeight: 700, borderRadius: 1 }} />}
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">-</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Edit Shortcode">
                      <IconButton size="small" onClick={() => handleOpenEdit(row)} color="primary">
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete Allocation">
                      <IconButton size="small" onClick={() => handleDelete(row.ussd_id)} color="error">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {filteredCodes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" color="text.secondary">No USSD shortcodes match your criteria</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Modal Dialog for Add / Edit */}
      <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: 1.5 } } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {editItem ? 'Edit Shortcode Allocation' : 'Allocate New Shortcode'}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            <TextField
              label="Shortcode Number"
              placeholder="e.g. 117 or *111#"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              fullWidth
              size="small"
              required
            />
            <TextField
              label="Service Title & Department"
              placeholder="e.g. Health Emergency"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              fullWidth
              size="small"
              required
            />
            <FormControl fullWidth size="small">
              <InputLabel>Category</InputLabel>
              <Select value={formData.service_category} label="Category" onChange={(e) => setFormData({ ...formData, service_category: e.target.value })}>
                {CATEGORIES.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </Select>
            </FormControl>

            <FormControl fullWidth size="small">
              <InputLabel>Operator Network</InputLabel>
              <Select value={formData.operator_id} label="Operator Network" onChange={(e) => setFormData({ ...formData, operator_id: e.target.value })}>
                {operators.map(o => <MenuItem key={o.operator_id} value={o.operator_id}>{o.operator_name}</MenuItem>)}
              </Select>
            </FormControl>

            <FormControl fullWidth size="small">
              <InputLabel>Regulatory Status</InputLabel>
              <Select value={formData.is_active} label="Regulatory Status" onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'true' })}>
                <MenuItem value="true">ACTIVE</MenuItem>
                <MenuItem value="false">SUSPENDED</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenModal(false)} sx={{ borderRadius: 1.5, textTransform: 'none' }}>Cancel</Button>
          <Button onClick={handleSave} variant="contained" sx={{ borderRadius: 1.5, textTransform: 'none', fontWeight: 600 }}>Save Shortcode</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
