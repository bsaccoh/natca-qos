import { Box, Skeleton, Stack } from '@mui/material';

export default function PageSkeleton() {
  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      <Stack spacing={2.5}>
        <Skeleton variant="rectangular" height={50} sx={{ borderRadius: 1 }} />
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2 }}>
          <Skeleton variant="rectangular" height={100} sx={{ borderRadius: 1 }} />
          <Skeleton variant="rectangular" height={100} sx={{ borderRadius: 1 }} />
          <Skeleton variant="rectangular" height={100} sx={{ borderRadius: 1 }} />
          <Skeleton variant="rectangular" height={100} sx={{ borderRadius: 1 }} />
        </Box>
        <Skeleton variant="rectangular" height={340} sx={{ borderRadius: 1 }} />
      </Stack>
    </Box>
  );
}
