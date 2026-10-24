import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Grid, Card, CardContent, Button, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Stack, Tab, Tabs, Alert, CircularProgress,
  LinearProgress, alpha, useTheme
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CellTowerIcon from '@mui/icons-material/CellTower';
import MapIcon from '@mui/icons-material/Map';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LayersIcon from '@mui/icons-material/Layers';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { get, post } from '../api/client.js';
import PageHeader from '../components/PageHeader.jsx';
import { OPERATOR_COLORS } from '../theme/theme.js';

export default function DriveTest() {
  const theme = useTheme();
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Data
  const [tests, setTests] = useState([]);
  const [heatmapTiles, setHeatmapTiles] = useState([]);
  const [blackspots, setBlackspots] = useState([]);
  const [thresholds, setThresholds] = useState({});
  const [operators, setOperators] = useState([]);

  // Upload Dialog
  const [openUpload, setOpenUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadForm, setUploadForm] = useState({
    testName: '',
    operatorId: '',
    technology: '4G',
    notes: '',
  });

  // Selected Test Detail Dialog
  const [selectedTest, setSelectedTest] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [testsRes, mapRes, spotsRes, threshRes, opsRes] = await Promise.all([
        get('/drivetest?limit=100'),
        get('/drivetest/heatmap'),
        get('/drivetest/blackspots?limit=50'),
        get('/drivetest/thresholds?technology=4G'),
        get('/operators'),
      ]);

      setTests(testsRes.data?.rows || []);
      setHeatmapTiles(mapRes.data || []);
      setBlackspots(spotsRes.data || []);
      setThresholds(threshRes.data || {});
      setOperators(opsRes.data || []);
    } catch {
      setError('Failed to load drive test analytics.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Upload
  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setError('Please select a CSV or log file to upload.');
      return;
    }
    if (!uploadForm.testName) {
      setError('Please enter a test session name.');
      return;
    }

    setUploading(true);
    setError('');
    setSuccess('');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('testName', uploadForm.testName);
      formData.append('technology', uploadForm.technology);
      if (uploadForm.operatorId) formData.append('operatorId', uploadForm.operatorId);
      if (uploadForm.notes) formData.append('notes', uploadForm.notes);

      await post('/drivetest/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setSuccess('Drive test log successfully ingested and aggregated into spatial grid.');
      setOpenUpload(false);
      setSelectedFile(null);
      setUploadForm({ testName: '', operatorId: '', technology: '4G', notes: '' });
      await loadData();
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to ingest drive test file.');
    } finally {
      setUploading(false);
    }
  };

  // View Details
  const handleViewDetails = async (testId) => {
    setDetailLoading(true);
    try {
      const res = await get(`/drivetest/${testId}`);
      setSelectedTest(res.data);
    } catch {
      setError('Failed to load drive test session details.');
    } finally {
      setDetailLoading(false);
    }
  };

  // Stats calculation
  const totalKm = tests.reduce((acc, t) => acc + Number(t.distance_km || 0), 0);
  const avgPassRate = tests.length > 0
    ? (tests.reduce((acc, t) => acc + Number(t.pass_rate_pct || 0), 0) / tests.length).toFixed(1)
    : '0.0';

  return (
    <Box sx={{ width: '100%', pb: 5 }}>
      <PageHeader
        icon={<CellTowerIcon />}
        title="Drive Test & RF Regulatory QoS Audits"
        subtitle="Ingestion of field drive test logs, automated ITU/NatCA RF threshold validation, and nationwide dead-zone spatial heatmaps"
        actions={
          <Stack direction="row" spacing={1.5}>
            <IconButton onClick={loadData} disabled={loading} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}>
              <RefreshIcon fontSize="small" />
            </IconButton>
            <Button
              variant="contained"
              startIcon={<UploadFileIcon />}
              onClick={() => setOpenUpload(true)}
              sx={{ borderRadius: 1.5, textTransform: 'none', fontWeight: 600 }}
            >
              Upload Drive Test Log
            </Button>
          </Stack>
        }
      />

      {error && <Alert severity="error" sx={{ mb: 2.5, borderRadius: 1.5 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2.5, borderRadius: 1.5 }} onClose={() => setSuccess('')}>{success}</Alert>}

      {/* KPI Cards */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <CardContent>
              <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">Audited Sessions</Typography>
              <Typography variant="h4" fontWeight={800} sx={{ mt: 0.5 }}>{tests.length}</Typography>
              <Typography variant="caption" color="text.secondary">Total regulatory drive logs</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <CardContent>
              <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">Total Distance Audited</Typography>
              <Typography variant="h4" fontWeight={800} color="primary.main" sx={{ mt: 0.5 }}>{totalKm.toFixed(1)} <Typography component="span" variant="h6">km</Typography></Typography>
              <Typography variant="caption" color="text.secondary">Highways and road corridors</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <CardContent>
              <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">QoS Compliance Index</Typography>
              <Typography variant="h4" fontWeight={800} color={Number(avgPassRate) >= 80 ? 'success.main' : 'warning.main'} sx={{ mt: 0.5 }}>
                {avgPassRate}%
              </Typography>
              <Typography variant="caption" color="text.secondary">Average samples meeting NatCA standards</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <CardContent>
              <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">Identified Blackspots</Typography>
              <Typography variant="h4" fontWeight={800} color="error.main" sx={{ mt: 0.5 }}>{blackspots.length}</Typography>
              <Typography variant="caption" color="text.secondary">Signal dead zones (&lt; -110 dBm RSRP)</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Navigation Tabs */}
      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
        <Tabs
          value={tab}
          onChange={(_, val) => setTab(val)}
          sx={{
            px: 2,
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: (t) => alpha(t.palette.primary.main, 0.02),
          }}
        >
          <Tab icon={<CellTowerIcon fontSize="small" />} iconPosition="start" label="Audit Sessions" />
          <Tab icon={<MapIcon fontSize="small" />} iconPosition="start" label="National RF Heatmap" />
          <Tab icon={<WarningAmberIcon fontSize="small" />} iconPosition="start" label="Coverage Blackspots" />
          <Tab icon={<LayersIcon fontSize="small" />} iconPosition="start" label="Regulatory Thresholds" />
        </Tabs>

        {/* Tab 0: Audit Sessions */}
        {tab === 0 && (
          <Box sx={{ p: 2.5 }}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
            ) : tests.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <CellTowerIcon sx={{ fontSize: 48, color: 'text.secondary', opacity: 0.5, mb: 1 }} />
                <Typography variant="subtitle1" fontWeight={700}>No drive test audits uploaded</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Upload field audit CSV or log files to calculate RF metrics</Typography>
                <Button variant="outlined" startIcon={<UploadFileIcon />} onClick={() => setOpenUpload(true)}>Upload Test</Button>
              </Box>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead sx={{ bgcolor: (t) => alpha(t.palette.primary.main, 0.04) }}>
                    <TableRow sx={{ '& th': { fontWeight: 700 } }}>
                      <TableCell>Test Name</TableCell>
                      <TableCell>Operator</TableCell>
                      <TableCell>Tech</TableCell>
                      <TableCell align="right">Samples</TableCell>
                      <TableCell align="right">Distance</TableCell>
                      <TableCell align="right">Pass Rate</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell align="right">Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {tests.map((t) => (
                      <TableRow key={t.drive_test_id} hover>
                        <TableCell sx={{ fontWeight: 600 }}>{t.test_name}</TableCell>
                        <TableCell>
                          <Chip
                            label={t.operator_name || 'Multi-Operator'}
                            size="small"
                            sx={{
                              bgcolor: alpha(OPERATOR_COLORS[t.operator_name] || '#64748b', 0.1),
                              color: OPERATOR_COLORS[t.operator_name] || '#64748b',
                              fontWeight: 700,
                              fontSize: 11
                            }}
                          />
                        </TableCell>
                        <TableCell><Chip label={t.technology} size="small" variant="outlined" sx={{ fontWeight: 700, fontSize: 10 }} /></TableCell>
                        <TableCell align="right">{Number(t.valid_samples).toLocaleString()}</TableCell>
                        <TableCell align="right">{Number(t.distance_km).toFixed(1)} km</TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end">
                            <Typography variant="body2" fontWeight={700} color={Number(t.pass_rate_pct) >= 80 ? 'success.main' : 'warning.main'}>
                              {t.pass_rate_pct}%
                            </Typography>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Chip
                            icon={<CheckCircleIcon />}
                            label={t.status}
                            size="small"
                            color="success"
                            variant="outlined"
                            sx={{ fontSize: 11 }}
                          />
                        </TableCell>
                        <TableCell>{new Date(t.created_at).toLocaleDateString('en-GB')}</TableCell>
                        <TableCell align="right">
                          <Button size="small" onClick={() => handleViewDetails(t.drive_test_id)}>Inspect</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        )}

        {/* Tab 1: National RF Heatmap */}
        {tab === 1 && (
          <Box sx={{ p: 2.5 }}>
            <Box sx={{ height: 560, borderRadius: 2, overflow: 'hidden', position: 'relative', border: '1px solid', borderColor: 'divider' }}>
              <MapContainer center={[8.460555, -11.779889]} zoom={8} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution="&copy; OpenStreetMap contributors"
                />
                {heatmapTiles.map((tile) => {
                  const isDead = tile.is_dead_zone;
                  const color = isDead ? '#ef4444' : (tile.avg_rsrp >= -95 ? '#10b981' : '#f59e0b');
                  return (
                    <CircleMarker
                      key={tile.grid_id}
                      center={[tile.grid_lat, tile.grid_lon]}
                      radius={isDead ? 8 : 6}
                      pathOptions={{
                        color,
                        fillColor: color,
                        fillOpacity: isDead ? 0.8 : 0.6,
                        weight: 1,
                      }}
                    >
                      <Popup>
                        <strong>{tile.technology} Grid Tile (~100m)</strong><br />
                        Operator ID: {tile.operator_id}<br />
                        Avg RSRP: {tile.avg_rsrp ? `${tile.avg_rsrp} dBm` : 'N/A'}<br />
                        Avg SINR: {tile.avg_sinr ? `${tile.avg_sinr} dB` : 'N/A'}<br />
                        Avg DL: {tile.avg_dl_kbps ? `${(tile.avg_dl_kbps / 1000).toFixed(2)} Mbps` : 'N/A'}<br />
                        Samples: {tile.sample_count}<br />
                        {isDead && <strong style={{ color: '#ef4444' }}>⚠️ Coverage Dead Zone</strong>}
                      </Popup>
                    </CircleMarker>
                  );
                })}
              </MapContainer>
              {heatmapTiles.length === 0 && (
                <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(255,255,255,0.8)', zIndex: 1000 }}>
                  <Typography variant="body1" fontWeight={600} color="text.secondary">No spatial drive test tiles available. Upload a test log to render heatmap.</Typography>
                </Box>
              )}
            </Box>
          </Box>
        )}

        {/* Tab 2: Coverage Blackspots */}
        {tab === 2 && (
          <Box sx={{ p: 2.5 }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
              Locations where average signal strength falls below the statutory threshold (&lt; -110 dBm for 4G). These areas are flagged for regulatory tower expansion mandates.
            </Typography>
            {blackspots.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <CheckCircleOutlineIcon sx={{ fontSize: 48, color: 'success.main', mb: 1 }} />
                <Typography variant="subtitle1" fontWeight={700}>No severe blackspots detected in audited paths</Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead sx={{ bgcolor: (t) => alpha(t.palette.error.main, 0.04) }}>
                    <TableRow sx={{ '& th': { fontWeight: 700 } }}>
                      <TableCell>Operator</TableCell>
                      <TableCell>Technology</TableCell>
                      <TableCell>Coordinates (Lat, Lon)</TableCell>
                      <TableCell align="right">Avg RSRP</TableCell>
                      <TableCell align="right">Avg SINR</TableCell>
                      <TableCell align="right">Samples</TableCell>
                      <TableCell>Severity</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {blackspots.map((b) => (
                      <TableRow key={b.grid_id} hover>
                        <TableCell sx={{ fontWeight: 600 }}>{b.operator_name}</TableCell>
                        <TableCell><Chip label={b.technology} size="small" /></TableCell>
                        <TableCell sx={{ fontFamily: 'monospace' }}>{Number(b.grid_lat).toFixed(4)}, {Number(b.grid_lon).toFixed(4)}</TableCell>
                        <TableCell align="right" sx={{ color: 'error.main', fontWeight: 700 }}>{b.avg_rsrp} dBm</TableCell>
                        <TableCell align="right">{b.avg_sinr ? `${b.avg_sinr} dB` : 'N/A'}</TableCell>
                        <TableCell align="right">{b.sample_count}</TableCell>
                        <TableCell><Chip label="CRITICAL DEAD ZONE" color="error" size="small" sx={{ fontSize: 10, fontWeight: 700 }} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        )}

        {/* Tab 3: Regulatory Thresholds */}
        {tab === 3 && (
          <Box sx={{ p: 3 }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>Sierra Leone Regulatory QoS Standards</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Statutory thresholds enforced by NatCA for mobile network operators. Failure to meet minimum pass values across audited corridors triggers SLA penalties.
            </Typography>
            <Grid container spacing={2}>
              {Object.entries(thresholds).map(([metric, th]) => (
                <Grid item xs={12} sm={6} md={3} key={metric}>
                  <Paper sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={700} textTransform="uppercase">{th.label || metric}</Typography>
                    <Typography variant="h5" fontWeight={800} color="primary.main" sx={{ my: 0.5 }}>
                      {th.pass_direction === 'lte' ? '≤ ' : '≥ '}{th.pass_value} {th.unit}
                    </Typography>
                    <Stack spacing={0.5} sx={{ mt: 1, fontSize: 12 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#10b981' }}>Excellent:</span>
                        <strong>{th.good_min !== null ? `${th.good_min} ${th.unit}` : 'N/A'}</strong>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#f59e0b' }}>Poor threshold:</span>
                        <strong>{th.poor_min !== null ? `${th.poor_min} ${th.unit}` : 'N/A'}</strong>
                      </Box>
                    </Stack>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}
      </Paper>

      {/* Upload Dialog */}
      <Dialog open={openUpload} onClose={() => setOpenUpload(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Upload Drive Test Log</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5}>
            <TextField
              label="Audit Session Name"
              placeholder="e.g. Freetown_CBD_4G_Audit_Q3"
              fullWidth
              size="small"
              value={uploadForm.testName}
              onChange={(e) => setUploadForm({ ...uploadForm, testName: e.target.value })}
              required
            />
            <TextField
              select
              label="Operator"
              fullWidth
              size="small"
              value={uploadForm.operatorId}
              onChange={(e) => setUploadForm({ ...uploadForm, operatorId: e.target.value })}
            >
              <MenuItem value="">Multi-Operator / General</MenuItem>
              {operators.map((op) => (
                <MenuItem key={op.operator_id} value={op.operator_id}>{op.operator_name}</MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Network Technology"
              fullWidth
              size="small"
              value={uploadForm.technology}
              onChange={(e) => setUploadForm({ ...uploadForm, technology: e.target.value })}
            >
              <MenuItem value="4G">4G / LTE</MenuItem>
              <MenuItem value="3G">3G / UMTS</MenuItem>
              <MenuItem value="2G">2G / GSM</MenuItem>
            </TextField>
            <Box
              sx={{
                border: '2px dashed',
                borderColor: 'divider',
                borderRadius: 2,
                p: 3,
                textAlign: 'center',
                bgcolor: (t) => alpha(t.palette.primary.main, 0.02),
              }}
            >
              <input
                type="file"
                accept=".csv,.txt,.tsv"
                style={{ display: 'none' }}
                id="drive-test-file-input"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              />
              <label htmlFor="drive-test-file-input">
                <Button variant="outlined" component="span" startIcon={<UploadFileIcon />}>
                  Choose CSV File
                </Button>
              </label>
              {selectedFile && (
                <Typography variant="body2" sx={{ mt: 1.5, fontWeight: 600 }}>
                  Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                </Typography>
              )}
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                Supports standard TEMS, Nemo, or mobile GPS log formats containing Latitude, Longitude, and RSRP/SINR columns.
              </Typography>
            </Box>
            <TextField
              label="Inspector Notes"
              placeholder="e.g. Route taken from Lumley to Wilberforce; rainy conditions"
              fullWidth
              multiline
              rows={2}
              size="small"
              value={uploadForm.notes}
              onChange={(e) => setUploadForm({ ...uploadForm, notes: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenUpload(false)} disabled={uploading}>Cancel</Button>
          <Button variant="contained" onClick={handleUploadSubmit} disabled={uploading}>
            {uploading ? <CircularProgress size={22} color="inherit" /> : 'Start Ingestion'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Session Details Dialog */}
      <Dialog open={!!selectedTest} onClose={() => setSelectedTest(null)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {selectedTest?.test_name} — RF Metrics
        </DialogTitle>
        <DialogContent dividers>
          {selectedTest && (
            <Stack spacing={3}>
              <Grid container spacing={2}>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary">Total Samples</Typography>
                  <Typography variant="h6" fontWeight={700}>{selectedTest.stats?.sample_count || selectedTest.valid_samples}</Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary">Avg RSRP</Typography>
                  <Typography variant="h6" fontWeight={700}>{selectedTest.stats?.avg_rsrp || 'N/A'} dBm</Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary">Avg SINR</Typography>
                  <Typography variant="h6" fontWeight={700}>{selectedTest.stats?.avg_sinr || 'N/A'} dB</Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary">Pass Rate</Typography>
                  <Typography variant="h6" fontWeight={700} color="success.main">{selectedTest.pass_rate_pct}%</Typography>
                </Grid>
              </Grid>

              <Typography variant="subtitle2" fontWeight={700}>Sample Log Excerpt (First 50 points):</Typography>
              <TableContainer sx={{ maxHeight: 300, border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Time</TableCell>
                      <TableCell>Coordinates</TableCell>
                      <TableCell align="right">RSRP</TableCell>
                      <TableCell align="right">SINR</TableCell>
                      <TableCell align="right">DL (Mbps)</TableCell>
                      <TableCell>PCI</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(selectedTest.samples || []).slice(0, 50).map((s) => (
                      <TableRow key={s.sample_id}>
                        <TableCell>{s.ts ? new Date(s.ts).toLocaleTimeString() : 'N/A'}</TableCell>
                        <TableCell sx={{ fontFamily: 'monospace' }}>{Number(s.latitude).toFixed(4)}, {Number(s.longitude).toFixed(4)}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600, color: s.rsrp < -100 ? 'error.main' : 'inherit' }}>{s.rsrp} dBm</TableCell>
                        <TableCell align="right">{s.sinr !== null ? `${s.sinr} dB` : 'N/A'}</TableCell>
                        <TableCell align="right">{s.dl_throughput ? (s.dl_throughput / 1000).toFixed(2) : 'N/A'}</TableCell>
                        <TableCell>{s.pci || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setSelectedTest(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
