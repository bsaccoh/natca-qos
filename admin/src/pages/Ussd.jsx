import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Box, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, IconButton, Button, TextField, InputAdornment,
  MenuItem, Select, FormControl, InputLabel, Dialog, DialogTitle, DialogContent,
  DialogActions, Stack, Tooltip, Alert, alpha, Typography,
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
import { exportToCSV } from '../utils/exportUtils.js';
import { contentService } from '../services/contentService.js';
import { adminService } from '../services/adminService.js';
import { getOperatorColor } from '../theme/theme.js';
import PageHeader from '../components/PageHeader.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { useToast } from '../components/ToastContext.jsx';
import { getErrorMessage } from '../api/client.js';

const CATEGORIES = ['ALL', 'SUPPORT', 'EMERGENCY', 'BALANCE', 'DATA', 'FINANCIAL', 'SELF-CARE', 'VAS', 'GENERAL'];

export default function Ussd() {
  const { showToast } = useToast();
  const [codes, setCodes] = useState([]);
  const [operators, setOperators] = useState([]);
  const [search, setSearch] = useState('');
  const [operatorFilter, setOperatorFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [loading, setLoading] = useState(false);

  // Modal State
  const [openModal, setOpenModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [modalErr, setModalErr] = useState('');
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    service_category: 'EMERGENCY',
    operator_id: '',
    is_active: true,
  });

  // Delete Confirm State
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, item: null, loading: false });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [ussdRes, opsRes] = await Promise.all([
        contentService.getUssdCodes(),
        adminService.getOperators(),
      ]);
      setCodes(ussdRes.data?.rows || ussdRes.data || []);
      setOperators(opsRes.data || []);
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to load USSD codes'), 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenModal = (item = null) => {
    setModalErr('');
    if (item) {
      setEditItem(item);
      setFormData({
        code: item.code,
        description: item.description || '',
        service_category: item.service_category || 'GENERAL',
        operator_id: item.operator_id ? String(item.operator_id) : '',
        is_active: item.is_active ?? true,
      });
    } else {
      setEditItem(null);
      setFormData({
        code: '',
        description: '',
        service_category: 'GENERAL',
        operator_id: '',
        is_active: true,
      });
    }
    setOpenModal(true);
  };

  const handleSave = async () => {
    if (!formData.code.trim()) {
      setModalErr('USSD code is required');
      return;
    }
    setSaving(true);
    setModalErr('');
    try {
      const payload = {
        code: formData.code.trim(),
        description: formData.description.trim(),
        serviceCategory: formData.service_category,
        operatorId: formData.operator_id ? Number(formData.operator_id) : null,
        isActive: Boolean(formData.is_active),
      };

      if (editItem) {
        await contentService.updateUssd(editItem.ussd_id, payload);
        showToast('USSD code updated successfully', 'success');
      } else {
        await contentService.createUssd(payload);
        showToast('USSD code created successfully', 'success');
      }
      setOpenModal(false);
      loadData();
    } catch (err) {
      setModalErr(getErrorMessage(err, 'Failed to save USSD code'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm.item) return;
    setDeleteConfirm((prev) => ({ ...prev, loading: true }));
    try {
      await contentService.deleteUssd(deleteConfirm.item.ussd_id);
      showToast('USSD code deleted successfully', 'success');
      setDeleteConfirm({ open: false, item: null, loading: false });
      loadData();
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to delete USSD code'), 'error');
      setDeleteConfirm((prev) => ({ ...prev, loading: false }));
    }
  };

  const filteredCodes = useMemo(() => {
    return codes.filter((c) => {
      const matchSearch =
        search === '' ||
        c.code?.toLowerCase().includes(search.toLowerCase()) ||
        c.description?.toLowerCase().includes(search.toLowerCase()) ||
        c.service_category?.toLowerCase().includes(search.toLowerCase());

      const matchOp =
        operatorFilter === 'ALL' ||
        (operatorFilter === 'NATIONAL' && !c.operator_id) ||
        String(c.operator_id) === operatorFilter;

      const matchStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && c.is_active) ||
        (statusFilter === 'INACTIVE' && !c.is_active);

      const matchCategory =
        categoryFilter === 'ALL' || c.service_category === categoryFilter;

      return matchSearch && matchOp && matchStatus && matchCategory;
    });
  }, [codes, search, operatorFilter, statusFilter, categoryFilter]);

  const handleExportCSV = () => {
    const data = filteredCodes.map((c) => ({
      Code: c.code,
      Description: c.description || '—',
      Category: c.service_category,
      Operator: c.operator_name || 'National (All Networks)',
      Status: c.is_active ? 'Active' : 'Inactive',
    }));
    exportToCSV('NatCA_USSD_Codes', data);
  };

  return (
    <Box sx={{ width: '100%', pb: 4 }}>
      <PageHeader
        icon={<QrCodeIcon />}
        title="USSD Directory Management"
        subtitle="Manage official telecommunication and emergency USSD shortcodes"
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
              variant="outlined"
              onClick={handleExportCSV}
              sx={{ borderRadius: 1.5, textTransform: 'none', fontWeight: 600 }}
            >
              Export CSV
            </Button>
            <Button
              startIcon={<AddIcon />}
              variant="contained"
              onClick={() => handleOpenModal()}
              sx={{ borderRadius: 1.5, textTransform: 'none', fontWeight: 600 }}
            >
              Add USSD Code
            </Button>
          </Stack>
        }
      />

      {/* Filters */}
      <Paper sx={{ p: 2.5, mb: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
          <TextField
            size="small"
            placeholder="Search USSD shortcode or purpose..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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
          />

          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Category</InputLabel>
            <Select
              value={categoryFilter}
              label="Category"
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              {CATEGORIES.map((cat) => (
                <MenuItem key={cat} value={cat}>
                  {cat === 'ALL' ? 'All Categories' : cat}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Operator</InputLabel>
            <Select
              value={operatorFilter}
              label="Operator"
              onChange={(e) => setOperatorFilter(e.target.value)}
            >
              <MenuItem value="ALL">All Operators</MenuItem>
              <MenuItem value="NATIONAL">National / Universal</MenuItem>
              {operators.map((op) => (
                <MenuItem key={op.operator_id} value={String(op.operator_id)}>
                  {op.operator_name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              label="Status"
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <MenuItem value="ALL">All Status</MenuItem>
              <MenuItem value="ACTIVE">Active</MenuItem>
              <MenuItem value="INACTIVE">Inactive</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </Paper>

      {/* Table */}
      <TableContainer component={Paper} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
        <Table>
          <TableHead sx={{ bgcolor: 'action.hover' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>USSD Shortcode</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Description</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Operator Scope</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredCodes.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                  <Typography variant="body2" color="text.secondary">
                    {loading ? 'Loading USSD codes...' : 'No USSD codes match the criteria.'}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {filteredCodes.map((row) => {
              const opColor = getOperatorColor(row.operator_name, '#2563eb');
              return (
                <TableRow key={row.ussd_id} hover>
                  <TableCell>
                    <Typography
                      variant="body2"
                      sx={{
                        fontFamily: 'monospace',
                        fontWeight: 800,
                        fontSize: '0.95rem',
                        color: 'primary.main',
                      }}
                    >
                      {row.code}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>
                      {row.description || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={row.service_category}
                      sx={{
                        fontWeight: 600,
                        bgcolor: (t) => t.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={row.operator_name || 'Universal (National)'}
                      sx={{
                        fontWeight: 700,
                        color: row.operator_name ? opColor : 'primary.main',
                        bgcolor: alpha(row.operator_name ? opColor : '#2563eb', 0.12),
                        border: `1px solid ${alpha(row.operator_name ? opColor : '#2563eb', 0.25)}`,
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      icon={row.is_active ? <CheckCircleIcon sx={{ fontSize: '14px !important' }} /> : <BlockIcon sx={{ fontSize: '14px !important' }} />}
                      label={row.is_active ? 'Active' : 'Inactive'}
                      color={row.is_active ? 'success' : 'default'}
                      variant={row.is_active ? 'filled' : 'outlined'}
                      sx={{ fontWeight: 600 }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                      <Tooltip title="Edit Code">
                        <IconButton size="small" onClick={() => handleOpenModal(row)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete Code">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => setDeleteConfirm({ open: true, item: row, loading: false })}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Edit / Create Dialog */}
      <Dialog
        open={openModal}
        onClose={saving ? undefined : () => setOpenModal(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 2 } } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          {editItem ? `Edit USSD Code: ${editItem.code}` : 'Register New USSD Shortcode'}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            {modalErr && <Alert severity="error">{modalErr}</Alert>}

            <TextField
              label="USSD Shortcode *"
              placeholder="e.g. *123# or *144#"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              fullWidth
              size="small"
              required
            />

            <TextField
              label="Service Description"
              placeholder="e.g. Balance check, Orange Money menu"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              fullWidth
              size="small"
              multiline
              rows={2}
            />

            <FormControl size="small" fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={formData.service_category}
                label="Category"
                onChange={(e) => setFormData({ ...formData, service_category: e.target.value })}
              >
                {CATEGORIES.filter((c) => c !== 'ALL').map((cat) => (
                  <MenuItem key={cat} value={cat}>
                    {cat}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" fullWidth>
              <InputLabel>Assigned Operator</InputLabel>
              <Select
                value={formData.operator_id}
                label="Assigned Operator"
                onChange={(e) => setFormData({ ...formData, operator_id: e.target.value })}
              >
                <MenuItem value="">National / All Operators</MenuItem>
                {operators.map((op) => (
                  <MenuItem key={op.operator_id} value={String(op.operator_id)}>
                    {op.operator_name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={formData.is_active ? '1' : '0'}
                label="Status"
                onChange={(e) => setFormData({ ...formData, is_active: e.target.value === '1' })}
              >
                <MenuItem value="1">Active / Operational</MenuItem>
                <MenuItem value="0">Inactive / Suspended</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setOpenModal(false)} disabled={saving} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving}
            sx={{ textTransform: 'none', fontWeight: 600, px: 3 }}
          >
            {saving ? 'Saving...' : editItem ? 'Save Changes' : 'Create Code'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirm.open}
        title="Delete USSD Code"
        message={`Are you sure you want to remove ${deleteConfirm.item?.code} from the national USSD directory? This action cannot be undone.`}
        confirmLabel="Delete"
        color="error"
        loading={deleteConfirm.loading}
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteConfirm({ open: false, item: null, loading: false })}
      />
    </Box>
  );
}
