import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Button, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Switch, FormControlLabel, Select, MenuItem, InputLabel, FormControl, Stack, alpha,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ArticleIcon from '@mui/icons-material/Article';
import { contentService } from '../services/contentService.js';
import PageHeader from '../components/PageHeader.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { useToast } from '../components/ToastContext.jsx';
import { formatDate } from '../utils/formatters.js';
import { getErrorMessage } from '../api/client.js';

export default function ContentManager() {
  const { showToast } = useToast();
  const [contents, setContents] = useState([]);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, id: null, title: '' });

  const fetchContents = useCallback(async () => {
    try {
      const res = await contentService.getContent();
      setContents(res.data?.rows || []);
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to load content list'), 'error');
    }
  }, [showToast]);

  useEffect(() => { fetchContents(); }, [fetchContents]);

  const handleOpen = (item = null) => {
    if (item) {
      setFormData(item);
      setIsEditing(true);
    } else {
      setFormData({ content_type: 'FRAUD_ALERT', title: '', body: '', is_published: true });
      setIsEditing(false);
    }
    setOpen(true);
  };

  const handleSave = async () => {
    try {
      const payload = {
        contentType: formData.content_type,
        title: formData.title,
        body: formData.body,
        isPublished: formData.is_published,
        category: formData.category,
        mediaType: formData.media_type || null,
        mediaUrl: formData.media_url || null,
      };

      if (isEditing) {
        await contentService.updateContent(formData.content_id, payload);
        showToast('Article updated successfully', 'success');
      } else {
        await contentService.createContent(payload);
        showToast('Article created successfully', 'success');
      }
      setOpen(false);
      fetchContents();
    } catch (err) {
      showToast(getErrorMessage(err, 'Error saving content'), 'error');
    }
  };

  const executeDelete = async () => {
    if (!deleteConfirm.id) return;
    try {
      await contentService.deleteContent(deleteConfirm.id);
      showToast('Article deleted successfully', 'success');
      fetchContents();
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to delete content'), 'error');
    } finally {
      setDeleteConfirm({ open: false, id: null, title: '' });
    }
  };

  return (
    <Box sx={{ width: '100%', pb: 4 }}>
      <PageHeader
        icon={<ArticleIcon />}
        title="Public Content & Fraud Advisories"
        subtitle="Manage public consumer education articles, telecom fraud alerts, and FAQ items"
        actions={
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpen()}
            sx={{ borderRadius: 1.5, textTransform: 'none', fontWeight: 600 }}
          >
            Create Advisory
          </Button>
        }
      />

      <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
        <Table size="small">
          <TableHead sx={{ bgcolor: (t) => alpha(t.palette.primary.main, 0.04) }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Title & Subject</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Content Category</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Publication Status</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Created Date</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {contents.map((c) => (
              <TableRow key={c.content_id} hover>
                <TableCell>
                  <Typography variant="subtitle2" fontWeight={700}>{c.title}</Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={c.content_type?.replace('_', ' ')}
                    size="small"
                    sx={{
                      fontWeight: 700,
                      fontSize: 11,
                      borderRadius: 1,
                      bgcolor: c.content_type === 'FRAUD_ALERT' ? alpha('#ef4444', 0.12) : alpha('#2563eb', 0.12),
                      color: c.content_type === 'FRAUD_ALERT' ? '#ef4444' : '#2563eb',
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={c.is_published ? 'Published' : 'Draft'}
                    color={c.is_published ? 'success' : 'default'}
                    size="small"
                    sx={{ fontWeight: 700, borderRadius: 1 }}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="caption" color="text.secondary">
                    {formatDate(c.created_at)}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                    <IconButton size="small" onClick={() => handleOpen(c)} color="primary">
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => setDeleteConfirm({ open: true, id: c.content_id, title: c.title })} color="error">
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
            {contents.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                  <Typography color="text.secondary">No articles or fraud advisories found</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth slotProps={{ paper: { sx: { borderRadius: 2 } } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>{isEditing ? 'Edit Advisory Article' : 'Publish Advisory Article'}</DialogTitle>
        <DialogContent dividers sx={{ pt: 2 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2.5 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Content Type *</InputLabel>
              <Select
                value={formData.content_type || 'FRAUD_ALERT'}
                label="Content Type *"
                onChange={(e) => setFormData({ ...formData, content_type: e.target.value })}
              >
                <MenuItem value="FRAUD_ALERT">Fraud Alert</MenuItem>
                <MenuItem value="NEWS">Regulatory News</MenuItem>
                <MenuItem value="FAQ">FAQ & Consumer Rights</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Article Title *"
              fullWidth
              size="small"
              value={formData.title || ''}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />

            <FormControl fullWidth size="small">
              <InputLabel>Media Attachment (Optional)</InputLabel>
              <Select
                value={formData.media_type || ''}
                label="Media Attachment (Optional)"
                onChange={(e) => setFormData({ ...formData, media_type: e.target.value })}
              >
                <MenuItem value=""><em>None</em></MenuItem>
                <MenuItem value="IMAGE">Image</MenuItem>
                <MenuItem value="VIDEO">Video Link</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Media URL (Optional)"
              fullWidth
              size="small"
              placeholder="https://natca.gov.sl/media/image.jpg"
              value={formData.media_url || ''}
              onChange={(e) => setFormData({ ...formData, media_url: e.target.value })}
            />

            <Box sx={{ gridColumn: '1 / -1' }}>
              <TextField
                label="Article Body Content *"
                fullWidth
                multiline
                rows={5}
                size="small"
                value={formData.body || ''}
                onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                required
              />
            </Box>

            <Box sx={{ gridColumn: '1 / -1' }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.is_published || false}
                    onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                    color="primary"
                  />
                }
                label="Publish Live (Visible immediately on citizen portal)"
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpen(false)} sx={{ borderRadius: 1.5, textTransform: 'none' }}>Cancel</Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={!formData.title || !formData.body}
            sx={{ borderRadius: 1.5, textTransform: 'none', fontWeight: 600 }}
          >
            Save Content
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={deleteConfirm.open}
        title="Delete Content Advisory"
        message={`Are you sure you want to permanently delete "${deleteConfirm.title}"?`}
        confirmLabel="Delete"
        color="error"
        onConfirm={executeDelete}
        onClose={() => setDeleteConfirm({ open: false, id: null, title: '' })}
      />
    </Box>
  );
}
