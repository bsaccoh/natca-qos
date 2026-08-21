import { Box, Skeleton, Container, Stack } from '@mui/material';

export default function PageSkeleton() {
  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      <Stack spacing={3}>
        <Skeleton variant="rectangular" height={160} sx={{ borderRadius: 2 }} />
        <Skeleton variant="text" width="60%" height={40} />
        <Skeleton variant="text" width="40%" height={24} />
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 3, mt: 2 }}>
          <Skeleton variant="rectangular" height={220} sx={{ borderRadius: 2 }} />
          <Skeleton variant="rectangular" height={220} sx={{ borderRadius: 2 }} />
          <Skeleton variant="rectangular" height={220} sx={{ borderRadius: 2 }} />
        </Box>
      </Stack>
    </Container>
  );
}
