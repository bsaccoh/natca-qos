import { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Stack, Grid, CircularProgress, useTheme
} from '@mui/material';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { get } from '../api/client.js';

export default function SpeedAnalytics() {
  const [historical, setHistorical] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [peak, setPeak] = useState([]);
  const [mapData, setMapData] = useState([]);
  const [loading, setLoading] = useState(true);
  const theme = useTheme();

  useEffect(() => {
    async function load() {
      try {
        const [histRes, distRes, peakRes, mapRes] = await Promise.all([
          get('/speed/analytics/historical?days=30'),
          get('/speed/analytics/districts'),
          get('/speed/analytics/peak'),
          get('/speed/analytics/map')
        ]);
        
        // Group historical data by date for Recharts (merge operators)
        const dateMap = {};
        (histRes.data || []).forEach(row => {
          if (!dateMap[row.date]) dateMap[row.date] = { date: row.date };
          dateMap[row.date][`${row.operator}_dl`] = Number(row.avg_download).toFixed(2);
        });
        setHistorical(Object.values(dateMap));
        
        setDistricts(distRes.data || []);
        
        // Format peak
        const formattedPeak = (peakRes.data || []).map(r => ({
          hour: `${String(r.hour_of_day).padStart(2, '0')}:00`,
          dl: Number(r.avg_download).toFixed(2),
          ping: Number(r.avg_ping).toFixed(0)
        }));
        setPeak(formattedPeak);
        
        setMapData(mapRes.data || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', pt: 10 }}><CircularProgress /></Box>;
  }

  return (
    <Box sx={{ width: '100%', pb: 4 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight={700} color="text.primary">
            Speed Test & Network Analytics
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Geospatial tracking, district benchmarking, and historical QoS trends.
          </Typography>
        </Box>
      </Stack>

      <Grid container spacing={3} wrap="wrap">
        {/* Row 1: Map & District comparison */}
        <Grid item xs={12} md={12} lg={8}>
          <Paper sx={{ p: 2, height: 450, borderRadius: 2, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
            <Typography variant="subtitle1" fontWeight={700} mb={1}>Poor-Speed Hotspot Detection Map</Typography>
            <Box sx={{ height: 'calc(100% - 32px)', borderRadius: 1, overflow: 'hidden', position: 'relative' }}>
              <MapContainer center={[8.460555, -11.779889]} zoom={7} style={{ height: '100%', width: '100%', zIndex: 1 }}>
                <TileLayer
                  url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                  attribution="&copy; OpenStreetMap contributors"
                />
                {mapData.map((marker) => (
                  <CircleMarker
                    key={marker.test_id}
                    center={[marker.latitude, marker.longitude]}
                    radius={6}
                    pathOptions={{
                      color: marker.download_mbps < 5 ? '#ef4444' : '#10b981',
                      fillOpacity: 0.6,
                      weight: 1
                    }}
                  >
                    <Popup>
                      <strong>{marker.operator_name}</strong><br />
                      DL: {marker.download_mbps} Mbps<br />
                      UL: {marker.upload_mbps} Mbps<br />
                      Ping: {marker.ping_ms} ms
                    </Popup>
                  </CircleMarker>
                ))}
              </MapContainer>
              {mapData.length === 0 && (
                <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(255,255,255,0.7)', zIndex: 2 }}>
                  <Typography variant="body1" color="text.secondary" fontWeight={600}>No geolocated speed tests yet</Typography>
                </Box>
              )}
            </Box>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={12} lg={4}>
          <Paper sx={{ p: 2, height: 450, borderRadius: 2, border: '1px solid', borderColor: 'divider', position: 'relative' }}>
            <Typography variant="subtitle1" fontWeight={700} mb={2}>District Avg Download (Mbps)</Typography>
            {districts.length === 0 ? (
              <Box sx={{ height: '90%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography variant="body1" color="text.secondary" fontWeight={600}>No district data</Typography>
              </Box>
            ) : (
              <ResponsiveContainer width="100%" height="90%">
                <BarChart data={districts} layout="vertical" margin={{ top: 0, right: 20, left: 20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" />
                  <YAxis dataKey="district" type="category" width={90} tick={{ fontSize: 11 }} />
                  <Tooltip cursor={{fill: 'rgba(0,0,0,0.05)'}} />
                  <Bar dataKey="avg_download" fill={theme.palette.primary.main} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>

        {/* Row 2: Peak Analysis & Historical */}
        <Grid item xs={12} md={6} lg={6}>
          <Paper sx={{ p: 2, height: 350, borderRadius: 2, border: '1px solid', borderColor: 'divider', position: 'relative' }}>
            <Typography variant="subtitle1" fontWeight={700} mb={2}>Peak vs Off-Peak Speed Analysis</Typography>
            {peak.length === 0 ? (
              <Box sx={{ height: '90%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography variant="body1" color="text.secondary" fontWeight={600}>No peak data available</Typography>
              </Box>
            ) : (
              <ResponsiveContainer width="100%" height="90%">
                <AreaChart data={peak} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorDl" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="dl" name="Avg Download (Mbps)" stroke="#10b981" fillOpacity={1} fill="url(#colorDl)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={6} lg={6}>
          <Paper sx={{ p: 2, height: 350, borderRadius: 2, border: '1px solid', borderColor: 'divider', position: 'relative' }}>
            <Typography variant="subtitle1" fontWeight={700} mb={2}>30-Day Historical Trend</Typography>
            {historical.length === 0 ? (
              <Box sx={{ height: '90%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography variant="body1" color="text.secondary" fontWeight={600}>No historical tests recorded</Typography>
              </Box>
            ) : (
              <ResponsiveContainer width="100%" height="90%">
                <LineChart data={historical} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="Orange SL_dl" name="Orange SL" stroke="#ff7900" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Africell_dl" name="Africell" stroke="#8e24aa" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Qcell_dl" name="Qcell" stroke="#5b2d8e" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="SierraTel_dl" name="SierraTel" stroke="#00a3e0" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
