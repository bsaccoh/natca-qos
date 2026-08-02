import { Box, Typography, Paper } from '@mui/material';

export default function Placeholder({ title }) {
  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 6, textAlign: 'center' }}>
        <Typography variant="h5" fontWeight={700} color="primary.main" sx={{ mb: 1 }}>{title}</Typography>
        <Typography color="text.secondary">Coming in next phase</Typography>
      </Paper>
    </Box>
  );
}
