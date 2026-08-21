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
    console.error('Uncaught error in Operator NOC Portal:', error, errorInfo);
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
          minHeight: '70vh', p: 3,
        }}>
          <Paper sx={{
            p: { xs: 3, md: 5 }, maxWidth: 520, width: '100%',
            textAlign: 'center', borderRadius: 2, border: '1px solid',
            borderColor: 'divider',
          }}>
            <Box sx={{
              width: 60, height: 60, borderRadius: '50%',
              bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(239, 68, 68, 0.16)' : 'rgba(239, 68, 68, 0.1)',
              color: 'error.main',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              mx: 'auto', mb: 2.5,
            }}>
              <ErrorIcon sx={{ fontSize: 32 }} />
            </Box>

            <Typography variant="h5" fontWeight={700} gutterBottom>
              Something went wrong
            </Typography>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 3.5, lineHeight: 1.6 }}>
              An unexpected error occurred in the operator console. You can refresh or return to the dashboard.
            </Typography>

            <Stack direction="row" spacing={2} justifyContent="center">
              <Button variant="outlined" startIcon={<RefreshIcon />} onClick={this.handleReload}>
                Refresh View
              </Button>
              <Button variant="contained" startIcon={<HomeIcon />} onClick={this.handleGoHome}>
                Dashboard
              </Button>
            </Stack>
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}
