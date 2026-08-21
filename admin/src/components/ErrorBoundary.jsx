import { Component } from 'react';
import { Box, Paper, Typography, Button, Stack, Alert } from '@mui/material';
import ErrorIcon from '@mui/icons-material/Error';
import RefreshIcon from '@mui/icons-material/Refresh';
import HomeIcon from '@mui/icons-material/Home';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Uncaught error in component tree:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Box sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '60vh',
          p: 3,
        }}>
          <Paper sx={{
            p: { xs: 3, md: 5 },
            maxWidth: 560,
            width: '100%',
            textAlign: 'center',
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: (theme) => theme.palette.mode === 'dark'
              ? '0 8px 32px rgba(0,0,0,0.5)'
              : '0 8px 32px rgba(0,0,0,0.08)',
          }}>
            <Box sx={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(239, 68, 68, 0.16)' : 'rgba(239, 68, 68, 0.1)',
              color: 'error.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 2.5,
            }}>
              <ErrorIcon sx={{ fontSize: 36 }} />
            </Box>

            <Typography variant="h5" fontWeight={700} gutterBottom>
              Something went wrong
            </Typography>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 440, mx: 'auto' }}>
              An unexpected error occurred while rendering this view. Our team has been notified. You can try refreshing the page or navigating back to the dashboard.
            </Typography>

            {this.state.error?.message && (
              <Alert severity="error" sx={{ mb: 3, textAlign: 'left', borderRadius: 1.5, wordBreak: 'break-word' }}>
                <Typography variant="caption" fontFamily="monospace" fontWeight={600}>
                  {this.state.error.message}
                </Typography>
              </Alert>
            )}

            <Stack direction="row" spacing={2} justifyContent="center">
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={this.handleReload}
                sx={{ borderRadius: 1.5, textTransform: 'none', fontWeight: 600 }}
              >
                Reload Page
              </Button>
              <Button
                variant="contained"
                startIcon={<HomeIcon />}
                onClick={this.handleGoHome}
                sx={{ borderRadius: 1.5, textTransform: 'none', fontWeight: 600 }}
              >
                Go to Dashboard
              </Button>
            </Stack>
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}
