import { Component } from 'react';
import { Box, Paper, Typography, Button, Stack } from '@mui/material';
import ErrorIcon from '@mui/icons-material/Error';
import RefreshIcon from '@mui/icons-material/Refresh';
import HomeIcon from '@mui/icons-material/Home';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Uncaught error in Citizen Portal:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          minHeight: '70vh', p: 3, bgcolor: '#f8fafc',
        }}>
          <Paper elevation={0} sx={{
            p: { xs: 3, md: 5 }, maxWidth: 520, width: '100%',
            textAlign: 'center', borderRadius: 3,
            border: '1px solid #e2e8f0', boxShadow: '0 8px 30px rgba(0,0,0,0.06)',
          }}>
            <Box sx={{
              width: 60, height: 60, borderRadius: '50%',
              bgcolor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              mx: 'auto', mb: 2.5,
            }}>
              <ErrorIcon sx={{ fontSize: 32 }} />
            </Box>

            <Typography variant="h5" fontWeight={700} gutterBottom sx={{ color: '#0d2c54' }}>
              Something went wrong
            </Typography>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 3.5, lineHeight: 1.6 }}>
              An unexpected error occurred while loading this service. You can refresh the page or return to the main portal.
            </Typography>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={this.handleReload}
                sx={{ borderRadius: 2, px: 2.5, py: 1 }}
              >
                Refresh Page
              </Button>
              <Button
                variant="contained"
                startIcon={<HomeIcon />}
                onClick={this.handleGoHome}
                sx={{ borderRadius: 2, px: 2.5, py: 1, bgcolor: '#0b57a4' }}
              >
                Back to Home
              </Button>
            </Stack>
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}
