import {
  Dialog, DialogTitle, DialogContent, DialogContentText,
  DialogActions, Button, CircularProgress, Stack, Box,
} from '@mui/material';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

export default function ConfirmDialog({
  open,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  color = 'error',
  loading = false,
  onConfirm,
  onClose,
}) {
  const getIcon = () => {
    switch (color) {
      case 'error':
        return <ErrorOutlineRoundedIcon sx={{ fontSize: 28, color: 'error.main' }} />;
      case 'warning':
        return <WarningAmberRoundedIcon sx={{ fontSize: 28, color: 'warning.main' }} />;
      default:
        return <InfoOutlinedIcon sx={{ fontSize: 28, color: 'primary.main' }} />;
    }
  };

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      maxWidth="xs"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: 2,
            p: 1,
            border: '1px solid',
            borderColor: 'divider',
          },
        },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box sx={{ display: 'flex', alignItems: 'center' }}>{getIcon()}</Box>
          <Box sx={{ fontWeight: 700, fontSize: '1.1rem' }}>{title}</Box>
        </Stack>
      </DialogTitle>
      <DialogContent sx={{ pb: 2 }}>
        <DialogContentText sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
          {message}
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 2, pb: 1.5, gap: 1 }}>
        <Button
          onClick={onClose}
          disabled={loading}
          sx={{ borderRadius: 1.5, textTransform: 'none', color: 'text.secondary' }}
        >
          {cancelLabel}
        </Button>
        <Button
          variant="contained"
          color={color}
          onClick={onConfirm}
          disabled={loading}
          sx={{ borderRadius: 1.5, textTransform: 'none', fontWeight: 600, px: 2.5 }}
        >
          {loading ? <CircularProgress size={18} color="inherit" /> : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
