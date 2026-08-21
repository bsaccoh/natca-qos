import { useState, useEffect, useCallback } from 'react';
import {
  Box, Button, Chip, Container, Grid,
  Paper, Stack, Tab, Tabs, TextField, Typography, alpha, InputAdornment, IconButton,
} from '@mui/material';
import SearchIcon       from '@mui/icons-material/Search';
import ClearIcon        from '@mui/icons-material/Clear';
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroidOutlined';
import { BRAND, getOperatorColor } from '../theme/theme.js';
import { citizenService } from '../services/citizenService.js';

const NATIONAL_CODES = [
  { ussd_id: 'nat-1', code: '*112#', description: 'NatCA Consumer Complaints & Helpline', operator_name: 'National Codes', category: 'Emergency' },
  { ussd_id: 'nat-2', code: '*999#', description: 'National Police Emergency Services', operator_name: 'National Codes', category: 'Emergency' },
  { ussd_id: 'nat-3', code: '*117#', description: 'National Health & Medical Emergency', operator_name: 'National Codes', category: 'Emergency' },
  { ussd_id: 'nat-4', code: '*119#', description: 'Sierra Leone National Fire Force', operator_name: 'National Codes', category: 'Emergency' },
  { ussd_id: 'nat-5', code: '*789#', description: 'NCRA National ID & NIN Verification', operator_name: 'National Codes', category: 'Verification' },
  { ussd_id: 'nat-6', code: '*456#', description: 'National Utilities & Outage Support', operator_name: 'National Codes', category: 'Utilities' },
];

function CodeCard({ code, description, category, operatorName }) {
  const isNational = operatorName === 'National Codes';
  const color = getOperatorColor(operatorName, isNational ? BRAND.primary : '#2563eb');

  return (
    <Paper elevation={0} sx={{
      p: 2.5, height: '100%', borderRadius: 2,
      border: `1px solid ${BRAND.border}`,
      borderLeft: `3px solid ${color}`,
      display: 'flex', flexDirection: 'column', gap: 1.5,
      transition: 'box-shadow .15s ease, border-color .15s ease, transform .15s ease',
      '&:hover': {
        boxShadow: '0 6px 20px rgba(13,44,84,0.08)',
        borderColor: alpha(color, 0.4),
        transform: 'translateY(-2px)',
      },
    }}>
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Box sx={{
          px: 1.5, py: 0.5, borderRadius: 1,
          bgcolor: isNational ? alpha(BRAND.primary, 0.1) : BRAND.primaryLt,
          color: isNational ? BRAND.primary : 'primary.main',
          fontFamily: '"Roboto Mono","Courier New",monospace',
          fontWeight: 700, fontSize: '0.95rem', flexShrink: 0,
          border: `1px solid ${alpha(color, 0.2)}`,
        }}>
          {code}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Chip label={operatorName} size="small" sx={{
            height: 22, fontSize: '0.7rem', fontWeight: 700,
            bgcolor: alpha(color, 0.1), color: color,
            border: `1px solid ${alpha(color, 0.25)}`,
          }} />
        </Box>
      </Stack>
      <Typography variant="body2" color="text.primary" sx={{ fontWeight: 500, lineHeight: 1.45 }}>
        {description}
      </Typography>
      {category && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 'auto', pt: 0.5, fontWeight: 600 }}>
          {category}
        </Typography>
      )}
    </Paper>
  );
}

export default function UssdDirectory() {
  const [codes,      setCodes]      = useState(NATIONAL_CODES);
  const [search,     setSearch]     = useState('');
  const [activeOp,   setActiveOp]   = useState('All');
  const [activesCat, setActivesCat] = useState('All');

  const loadCodes = useCallback(async () => {
    try {
      const res = await citizenService.getUssdCodes();
      const rows = res.data?.rows || res.data || [];
      // Combine fetched codes with national codes
      const combined = [...NATIONAL_CODES, ...rows];
      // Deduplicate by code + operator
      const seen = new Set();
      const deduped = combined.filter((c) => {
        const key = `${c.code}_${c.operator_name}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      setCodes(deduped);
    } catch {
      setCodes(NATIONAL_CODES);
    }
  }, []);

  useEffect(() => { loadCodes(); }, [loadCodes]);

  const operators   = ['All', 'National Codes', ...new Set(codes.map((c) => c.operator_name).filter((o) => o && o !== 'National Codes'))];
  const categories  = ['All', ...new Set(codes.map((c) => c.category).filter(Boolean))];

  const filtered = codes.filter((c) => {
    const q = search.toLowerCase().trim();
    if (activeOp  !== 'All' && c.operator_name !== activeOp)  return false;
    if (activesCat !== 'All' && c.category      !== activesCat) return false;
    if (!q) return true;
    return (
      c.code.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q) ||
      (c.category || '').toLowerCase().includes(q) ||
      (c.operator_name || '').toLowerCase().includes(q)
    );
  });

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', pb: 8 }}>
      {/* Header */}
      <Box sx={{ bgcolor: BRAND.navy, color: '#fff', py: { xs: 5, md: 6 }, borderBottom: `3px solid ${BRAND.gold}` }}>
        <Container>
          <Stack spacing={1.5} sx={{ maxWidth: 640 }}>
            <Typography variant="overline" sx={{ color: BRAND.gold, fontWeight: 700, letterSpacing: '0.1em' }}>
              REGULATORY DIRECTORY
            </Typography>
            <Typography variant="h3" fontWeight={700} sx={{ color: '#fff', fontSize: { xs: '1.8rem', md: '2.4rem' } }}>
              USSD &amp; Short Code Directory
            </Typography>
            <Typography variant="body1" sx={{ color: alpha('#fff', 0.8) }}>
              Complete reference of official USSD dial codes, national emergency hotlines, and operator shortcuts in Sierra Leone.
            </Typography>
          </Stack>
        </Container>
      </Box>

      {/* Filter and Content */}
      <Container sx={{ mt: 4 }}>
        {/* Search bar */}
        <Paper elevation={0} sx={{ p: 2, mb: 3, borderRadius: 2, border: `1px solid ${BRAND.border}` }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search by code (e.g. *112#, *111#) or service..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon color="action" />
                      </InputAdornment>
                    ),
                    endAdornment: search ? (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={() => setSearch('')}>
                          <ClearIcon fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    ) : null,
                  },
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Tabs
                value={activeOp}
                onChange={(_, v) => setActiveOp(v)}
                variant="scrollable"
                scrollButtons="auto"
                sx={{ '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, minHeight: 40 } }}
              >
                {operators.map((op) => (
                  <Tab key={op} value={op} label={op} />
                ))}
              </Tabs>
            </Grid>
          </Grid>
        </Paper>

        {/* Categories Chips */}
        {categories.length > 2 && (
          <Stack direction="row" spacing={1} sx={{ mb: 3, flexWrap: 'wrap' }}>
            {categories.map((cat) => (
              <Chip
                key={cat}
                label={cat}
                clickable
                color={activesCat === cat ? 'primary' : 'default'}
                variant={activesCat === cat ? 'filled' : 'outlined'}
                onClick={() => setActivesCat(cat)}
                sx={{ mb: 1, fontWeight: 600 }}
              />
            ))}
          </Stack>
        )}

        {/* Results grid */}
        <Grid container spacing={2.5}>
          {filtered.map((item) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={`${item.code}_${item.operator_name}`}>
              <CodeCard
                code={item.code}
                description={item.description}
                category={item.category}
                operatorName={item.operator_name}
              />
            </Grid>
          ))}
        </Grid>

        {filtered.length === 0 && (
          <Paper elevation={0} sx={{ p: 6, textAlign: 'center', borderRadius: 2, border: `1px solid ${BRAND.border}`, mt: 2 }}>
            <PhoneAndroidIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1.5 }} />
            <Typography variant="h6" color="text.secondary">No USSD codes found</Typography>
            <Typography variant="body2" color="text.disabled" sx={{ mt: 0.5 }}>
              Try clearing your search or switching operator filters.
            </Typography>
            <Button variant="outlined" onClick={() => { setSearch(''); setActiveOp('All'); setActivesCat('All'); }} sx={{ mt: 2 }}>
              Reset Filters
            </Button>
          </Paper>
        )}
      </Container>
    </Box>
  );
}
