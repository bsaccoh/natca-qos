import { Box, Paper, Typography, Chip, Stack, useTheme, alpha } from '@mui/material';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const SPATIAL_LOCATIONS = [
  { id: 1, name: 'Freetown Central', lat: 8.484, lng: -13.2299, operator: 'Orange SL', status: 'CRITICAL', issues: 14, type: 'Fiber Cut Outage' },
  { id: 2, name: 'Bo City Hub', lat: 7.9647, lng: -11.7383, operator: 'Africell', status: 'HIGH', issues: 8, type: 'Congestion / Slow Data' },
  { id: 3, name: 'Kenema Main', lat: 7.8767, lng: -11.19, operator: 'QCell', status: 'MEDIUM', issues: 5, type: 'Tower Power Failure' },
  { id: 4, name: 'Makeni Center', lat: 8.8856, lng: -12.0439, operator: 'SierraTel', status: 'LOW', issues: 2, type: 'Maintenance' },
  { id: 5, name: 'Port Loko Station', lat: 8.7667, lng: -12.7833, operator: 'Orange SL', status: 'HIGH', issues: 9, type: 'Signal Blackspot' },
];

const STATUS_COLORS = {
  CRITICAL: '#ef4444',
  HIGH: '#f59e0b',
  MEDIUM: '#3b82f6',
  LOW: '#10b981'
};

export default function MapOverview() {
  const center = [8.4606, -11.7799];

  return (
    <Paper sx={{ p: 3, borderRadius: 1.5, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ letterSpacing: '0.08em' }}>
            GIS SPATIAL INCIDENT MAP
          </Typography>
          <Typography variant="h6" fontWeight={700}>
            Sierra Leone Regional Network Health & Blackspots
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Chip label="Orange SL: 2 Incidents" size="small" sx={{ bgcolor: alpha('#ff7900', 0.12), color: '#ff7900', fontWeight: 600, borderRadius: 1 }} />
          <Chip label="Africell: 1 Incident" size="small" sx={{ bgcolor: alpha('#8e24aa', 0.12), color: '#8e24aa', fontWeight: 600, borderRadius: 1 }} />
        </Stack>
      </Box>

      <Box sx={{ height: 340, width: '100%', borderRadius: 1.5, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
        <MapContainer center={center} zoom={8} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {SPATIAL_LOCATIONS.map((loc) => {
            const color = STATUS_COLORS[loc.status] || '#2563eb';
            return (
              <Box key={loc.id}>
                <Circle 
                  center={[loc.lat, loc.lng]} 
                  radius={loc.issues * 2000} 
                  pathOptions={{ color, fillColor: color, fillOpacity: 0.25, weight: 2 }} 
                />
                <Marker position={[loc.lat, loc.lng]}>
                  <Popup>
                    <Box sx={{ p: 0.5 }}>
                      <Typography variant="subtitle2" fontWeight={700}>{loc.name}</Typography>
                      <Typography variant="caption" display="block" color="text.secondary">
                        Operator: <strong>{loc.operator}</strong>
                      </Typography>
                      <Typography variant="caption" display="block" color="text.secondary">
                        Issue Type: {loc.type}
                      </Typography>
                      <Chip 
                        label={`${loc.status} — ${loc.issues} cases`} 
                        size="small" 
                        sx={{ mt: 1, bgcolor: color, color: '#fff', fontWeight: 700, height: 20, fontSize: 10, borderRadius: 1 }} 
                      />
                    </Box>
                  </Popup>
                </Marker>
              </Box>
            );
          })}
        </MapContainer>
      </Box>
    </Paper>
  );
}
