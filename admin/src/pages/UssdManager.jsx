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

export default function UssdManager() {
  const [ussdCodes, setUssdCodes] = useState([]);
  const [operators, setOperators] = useState([]);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({});
  const [isEditing, setIsEditing] = useState(false);

  const fetchData = async () => {
    try {
      const [uRes, oRes] = await Promise.all([
        get('/ussd'),
        get('/operators')
      ]);
      setUssdCodes(uRes.data?.rows || []);
      setOperators(oRes.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleOpen = (item = null) => {
    if (item) {
      setFormData({
        ...item,
        operator_id: item.operator_id || ''
      });
      setIsEditing(true);
    } else {
      setFormData({ service_category: 'GENERAL', code: '', description: '', is_active: true, operator_id: '' });
      setIsEditing(false);
    }
    setOpen(true);
  };

  const handleSave = async () => {
    try {
      const payload = {
        operatorId: formData.operator_id ? Number(formData.operator_id) : null,
        serviceCategory: formData.service_category,
        code: formData.code,
        description: formData.description,
        isActive: formData.is_active,
      };

      if (isEditing) {
        await put(`/ussd/${formData.ussd_id}`, payload);
      } else {
        await post('/ussd', payload);
      }
      setOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Error saving USSD code: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this USSD code?')) return;
    try {
      await del(`/ussd/${id}`);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>USSD Codes Management</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()}>
          Add Code
        </Button>
      </Box>

      <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'action.hover' }}>
              <TableCell>Code</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Operator</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {ussdCodes.map((u) => (
              <TableRow key={u.ussd_id}>
                <TableCell sx={{ fontWeight: 'bold' }}>{u.code}</TableCell>
                <TableCell><Chip label={u.service_category} size="small" variant="outlined" /></TableCell>
                <TableCell>{u.operator_name || 'All Operators'}</TableCell>
                <TableCell>{u.description}</TableCell>
                <TableCell>
                  <Chip 
                    label={u.is_active ? 'Active' : 'Inactive'} 
                    color={u.is_active ? 'success' : 'default'} 
                    size="small" 
                  />
                </TableCell>
                <TableCell align="right">
                  <IconButton onClick={() => handleOpen(u)} color="primary"><EditIcon /></IconButton>
                  <IconButton onClick={() => handleDelete(u.ussd_id)} color="error"><DeleteIcon /></IconButton>
                </TableCell>
              </TableRow>
            ))}
            {ussdCodes.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center">No USSD codes found</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{isEditing ? 'Edit USSD Code' : 'Add USSD Code'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField
            label="USSD Code (e.g. *5050#)"
            fullWidth
            sx={{ mt: 1 }}
            value={formData.code || ''}
            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
          />
          <FormControl fullWidth>
            <InputLabel>Operator (Optional)</InputLabel>
            <Select
              value={formData.operator_id}
              label="Operator (Optional)"
              onChange={(e) => setFormData({ ...formData, operator_id: e.target.value })}
            >
              <MenuItem value=""><em>All Operators (National)</em></MenuItem>
              {operators.map(o => (
                <MenuItem key={o.operator_id} value={o.operator_id}>{o.operator_name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Service Category"
            fullWidth
            value={formData.service_category || ''}
            onChange={(e) => setFormData({ ...formData, service_category: e.target.value })}
          />
          <TextField
            label="Description"
            fullWidth
            value={formData.description || ''}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
          <FormControlLabel
            control={
              <Switch 
                checked={formData.is_active || false} 
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} 
              />
            }
            label="Active"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} variant="contained" disabled={!formData.code}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
