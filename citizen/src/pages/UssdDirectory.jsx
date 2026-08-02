import { useState, useEffect, useCallback } from 'react';
import {
  Box, Button, Chip, Container, Divider, Grid, InputAdornment,
  Paper, Stack, Tab, Tabs, TextField, Typography, alpha,
} from '@mui/material';
import SearchIcon       from '@mui/icons-material/Search';
import ClearIcon        from '@mui/icons-material/Clear';
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroidOutlined';
import { BRAND }        from '../theme/theme.js';
import { get }          from '../api/client.js';

const OPERATORS = ['All'];

function CodeCard({ code, description, category, operatorName }) {
  return (
    <Paper elevation={0} sx={{
      p: 2.5, height: '100%', borderRadius: 2,
      border: `1px solid ${BRAND.border}`,
      display: 'flex', flexDirection: 'column', gap: 1.5,
      transition: 'box-shadow .15s ease, border-color .15s ease',
      '&:hover': { boxShadow: '0 4px 16px rgba(13,44,84,0.08)', borderColor: alpha(BRAND.primary, 0.35) },
    }}>
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Box sx={{
          px: 1.5, py: 0.5, borderRadius: 1,
          bgcolor: BRAND.primaryLt, color: 'primary.main',
          fontFamily: '"Roboto Mono","Courier New",monospace',
          fontWeight: 700, fontSize: '0.95rem', flexShrink: 0,
          border: `1px solid ${alpha(BRAND.primary, 0.2)}`,
        }}>
          {code}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Chip label={operatorName} size="small" sx={{
            height: 20, fontSize: '0.68rem', fontWeight: 700,
            bgcolor: alpha(BRAND.navy, 0.08), color: BRAND.navy,
            border: `1px solid ${alpha(BRAND.navy, 0.15)}`,
          }} />
        </Box>
      </Stack>
      <Typography variant="body2" color="text.primary" sx={{ fontWeight: 500, lineHeight: 1.4 }}>
        {description}
      </Typography>
      {category && (
        <Typography variant="caption" color="text.disabled" sx={{ mt: 'auto', pt: 0.5 }}>
          {category}
        </Typography>
      )}
    </Paper>
  );
}

export default function UssdDirectory() {
  const [codes,      setCodes]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [activeOp,   setActiveOp]   = useState('All');
  const [activesCat, setActivesCat] = useState('All');

  const loadCodes = useCallback(async () => {
    try {
      const res = await get('/ussd');
      setCodes(res.data || []);
    } catch {
      /* silent — show empty state */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCodes(); }, [loadCodes]);

  const operators   = ['All', ...new Set(codes.map(c => c.operator_name).filter(Boolean))];
  const categories  = ['All', ...new Set(codes.map(c => c.category).filter(Boolean))];
  const hasFilters  = operators.length > 2 || categories.length > 2;

  const filtered = codes.filter(c => {
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

  const grouped = {};
  filtered.forEach(c => {
    const cat = c.category || 'Other';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(c);
  });

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
      {/* Header */}
      <Box sx={{ bgcolor: BRAND.navy, color: '#fff', py: { xs: 5, md: 7 }, borderBottom: `3px solid ${BRAND.gold}` }}>
        <Container>
          <Stack direction="row" spacing={2} alignItems="flex-start">
            <Box sx={{
              width: 52, height: 52, borderRadius: 2, flexShrink: 0,
              bgcolor: alpha('#fff', 0.12), display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <PhoneAndroidIcon sx={{ fontSize: 28 }} />
            </Box>
            <Box>
              <Typography variant="overline" sx={{ color: alpha('#fff', 0.6), letterSpacing: '0.1em' }}>
                NatCA
              </Typography>
              <Typography variant="h3" sx={{ color: '#fff', fontWeight: 800, lineHeight: 1.1, mt: 0.5 }}>
                USSD Code Directory
              </Typography>
              <Typography variant="body1" sx={{ color: alpha('#fff', 0.75), mt: 1.5, maxWidth: 520 }}>
                All verified dial codes for licensed operators in Sierra Leone. Dial directly from
                any phone — no internet required.
              </Typography>
            </Box>
          </Stack>
        </Container>
      </Box>

      <Container sx={{ py: { xs: 4, md: 6 } }}>
        {/* Search bar */}
        <Paper elevation={0} sx={{ p: 3, mb: 4, borderRadius: 2, border: `1px solid ${BRAND.border}` }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                placeholder="Search by code, service, or description…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: 'text.disabled' }} />
                    </InputAdornment>
                  ),
                  endAdornment: search ? (
                    <InputAdornment position="end">
                      <ClearIcon sx={{ cursor: 'pointer', color: 'text.disabled', '&:hover': { color: 'text.primary' } }}
                        onClick={() => setSearch('')} />
                    </InputAdornment>
                  ) : null,
                }}
                size="medium"
                sx={{ '& fieldset': { borderColor: BRAND.border } }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="body2" color="text.secondary">
                {loading
                  ? 'Loading…'
                  : `${filtered.length} code${filtered.length !== 1 ? 's' : ''} found`
                }
              </Typography>
            </Grid>
          </Grid>
        </Paper>

        {/* Operator tabs */}
        {operators.length > 2 && (
          <Box sx={{ mb: 2, borderBottom: `1px solid ${BRAND.border}` }}>
            <Tabs
              value={activeOp}
              onChange={(_, v) => setActiveOp(v)}
              variant="scrollable"
              scrollButtons="auto"
              allowScrollButtonsMobile
            >
              {operators.map(op => (
                <Tab key={op} value={op} label={op} sx={{ fontWeight: 600, textTransform: 'none', minWidth: 80 }} />
              ))}
            </Tabs>
          </Box>
        )}

        {/* Category chips */}
        {categories.length > 2 && (
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 4 }}>
            {categories.map(cat => (
              <Chip
                key={cat}
                label={cat}
                variant={activesCat === cat ? 'filled' : 'outlined'}
                color={activesCat === cat ? 'primary' : 'default'}
                onClick={() => setActivesCat(cat)}
                sx={{ fontWeight: 600, fontSize: '0.8rem' }}
              />
            ))}
          </Stack>
        )}

        {/* Reset filters */}
        {(search || activeOp !== 'All' || activesCat !== 'All') && (
          <Button
            size="small" variant="text" color="inherit"
            startIcon={<ClearIcon />}
            onClick={() => { setSearch(''); setActiveOp('All'); setActivesCat('All'); }}
            sx={{ mb: 3, color: 'text.secondary' }}
          >
            Clear filters
          </Button>
        )}

        {/* Results */}
        {loading ? (
          <Typography color="text.secondary">Loading USSD directory…</Typography>
        ) : filtered.length === 0 ? (
          <Paper elevation={0} sx={{ p: { xs: 5, md: 8 }, textAlign: 'center', borderRadius: 2, border: `1px solid ${BRAND.border}` }}>
            <PhoneAndroidIcon sx={{ fontSize: 52, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" fontWeight={600}>No codes match your search</Typography>
            <Typography variant="body2" color="text.disabled" sx={{ mt: 1 }}>
              Try different keywords, or clear the filters to browse the full directory.
            </Typography>
            <Button variant="outlined" sx={{ mt: 3 }} onClick={() => { setSearch(''); setActiveOp('All'); setActivesCat('All'); }}>
              Show all codes
            </Button>
          </Paper>
        ) : (
          <Stack spacing={5}>
            {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([cat, items]) => (
              <Box key={cat}>
                <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2.5 }}>
                  <Typography variant="h6" fontWeight={700} color={BRAND.navy}>{cat}</Typography>
                  <Chip label={items.length} size="small" sx={{ height: 20, fontSize: '0.72rem', fontWeight: 700, bgcolor: BRAND.primaryLt, color: 'primary.main' }} />
                  <Box sx={{ flex: 1, height: 1, bgcolor: BRAND.border }} />
                </Stack>
                <Grid container spacing={2}>
                  {items.map(c => (
                    <Grid item xs={12} sm={6} md={4} lg={3} key={c.ussd_id}>
                      <CodeCard
                        code={c.code}
                        description={c.description}
                        category={undefined}
                        operatorName={c.operator_name}
                      />
                    </Grid>
                  ))}
                </Grid>
              </Box>
            ))}
          </Stack>
        )}

        {/* Footer note */}
        {!loading && filtered.length > 0 && (
          <Box sx={{ mt: 6, pt: 4, borderTop: `1px solid ${BRAND.border}` }}>
            <Typography variant="caption" color="text.disabled">
              * All USSD codes are verified with licensed operators. Standard network rates may apply.
              NatCA publishes this directory for public information purposes only.
            </Typography>
          </Box>
        )}
      </Container>
    </Box>
  );
}
