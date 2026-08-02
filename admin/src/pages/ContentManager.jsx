import { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Button, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Switch, FormControlLabel, Select, MenuItem, InputLabel, FormControl
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { get, post, put, del } from '../api/client.js';

export default function ContentManager() {
  const [contents, setContents] = useState([]);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({});
  const [isEditing, setIsEditing] = useState(false);

  const fetchContents = async () => {
    try {
      const res = await get('/content');
      setContents(res.data?.rows || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { fetchContents(); }, []);

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
        await put(`/content/${formData.content_id}`, payload);
      } else {
        await post('/content', payload);
      }
      setOpen(false);
      fetchContents();
    } catch (err) {
      console.error(err);
      alert('Error saving content: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this content?')) return;
    try {
      await del(`/content/${id}`);
      fetchContents();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>Content Manager</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()}>
          Add Content
        </Button>
      </Box>

      <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'action.hover' }}>
              <TableCell>Title</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Date Created</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {contents.map((c) => (
              <TableRow key={c.content_id}>
                <TableCell>{c.title}</TableCell>
                <TableCell><Chip label={c.content_type.replace('_', ' ')} size="small" /></TableCell>
                <TableCell>
                  <Chip 
                    label={c.is_published ? 'Published' : 'Draft'} 
                    color={c.is_published ? 'success' : 'default'} 
                    size="small" 
                  />
                </TableCell>
                <TableCell>{new Date(c.created_at).toLocaleDateString()}</TableCell>
                <TableCell align="right">
                  <IconButton onClick={() => handleOpen(c)} color="primary"><EditIcon /></IconButton>
                  <IconButton onClick={() => handleDelete(c.content_id)} color="error"><DeleteIcon /></IconButton>
                </TableCell>
              </TableRow>
            ))}
            {contents.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center">No content found</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{isEditing ? 'Edit Content' : 'Add Content'}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            <FormControl fullWidth sx={{ mt: 1 }}>
              <InputLabel>Type</InputLabel>
              <Select
                value={formData.content_type || 'FRAUD_ALERT'}
                label="Type"
                onChange={(e) => setFormData({ ...formData, content_type: e.target.value })}
              >
                <MenuItem value="FRAUD_ALERT">Fraud Alert</MenuItem>
                <MenuItem value="NEWS">News</MenuItem>
                <MenuItem value="FAQ">FAQ</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Title"
              fullWidth
              sx={{ mt: 1 }}
              value={formData.title || ''}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />

            <FormControl fullWidth>
              <InputLabel>Media Type (Optional)</InputLabel>
              <Select
                value={formData.media_type || ''}
                label="Media Type (Optional)"
                onChange={(e) => setFormData({ ...formData, media_type: e.target.value })}
              >
                <MenuItem value=""><em>None</em></MenuItem>
                <MenuItem value="IMAGE">Image</MenuItem>
                <MenuItem value="VIDEO">Video</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Media URL (Optional)"
              fullWidth
              placeholder="https://example.com/image.jpg"
              value={formData.media_url || ''}
              onChange={(e) => setFormData({ ...formData, media_url: e.target.value })}
            />

            <Box sx={{ gridColumn: '1 / -1' }}>
              <TextField
                label="Body"
                fullWidth
                multiline
                rows={5}
                value={formData.body || ''}
                onChange={(e) => setFormData({ ...formData, body: e.target.value })}
              />
            </Box>

            <Box sx={{ gridColumn: '1 / -1' }}>
              <FormControlLabel
                control={
                  <Switch 
                    checked={formData.is_published || false} 
                    onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })} 
                  />
                }
                label="Published (Visible to Citizens)"
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} variant="contained" disabled={!formData.title || !formData.body}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
