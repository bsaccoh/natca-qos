import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Accordion, AccordionDetails, AccordionSummary,
  AppBar, Box, Button, Container, Divider, Drawer, Grid, IconButton,
  List, ListItemButton, ListItemText, Paper, Stack, Tab, Tabs,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Toolbar, Typography, useMediaQuery, alpha, Dialog, DialogTitle, DialogContent, DialogActions, Chip,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FacebookIcon from '@mui/icons-material/Facebook';
import YouTubeIcon from '@mui/icons-material/YouTube';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import InstagramIcon from '@mui/icons-material/Instagram';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import ReportProblemIcon from '@mui/icons-material/ReportProblemOutlined';
import SearchIcon from '@mui/icons-material/SearchOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircleOutline';
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroidOutlined';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUserOutlined';
import EmailIcon from '@mui/icons-material/EmailOutlined';
import LocationOnIcon from '@mui/icons-material/LocationOnOutlined';
import PhoneIcon from '@mui/icons-material/PhoneInTalkOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonthOutlined';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import GavelIcon from '@mui/icons-material/GavelOutlined';
import BarChartIcon from '@mui/icons-material/BarChart';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import ArticleIcon from '@mui/icons-material/ArticleOutlined';
import { BRAND, getOperatorColor } from '../theme/theme.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { get } from '../api/client.js';

/* ── Navigation ──────────────────────────────────────────────────────── */
const NAV_ITEMS = [
  { label: 'About', id: 'about' },
  { label: 'Rights', id: 'rights' },
  { label: 'News', id: 'news' },
  { label: 'Rates', id: 'rates' },
  { label: 'Complain', id: 'complain' },
  { label: 'KYC', id: 'kyc' },
  { label: 'Contact', id: 'contact' },
];

function scrollTo(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ── Fallback content ────────────────────────────────────────────────── */
const DEFAULT_RIGHTS = [
  { _id: 1, title: 'Transparent pricing', body: 'Operators must display all tariffs and fees clearly before you subscribe. Hidden charges are prohibited under NatCA Regulation.' },
  { _id: 2, title: 'Free complaint lodging', body: 'Filing a complaint with NatCA costs nothing. Any operator that charges for the process is in breach of regulation.' },
  { _id: 3, title: 'Response within 7 days', body: 'NatCA must acknowledge your complaint within 7 working days and provide a full resolution within 30 days.' },
  { _id: 4, title: 'Minimum quality of service', body: 'Operators must meet NatCA\'s minimum QoS benchmarks for voice clarity, call success rates, and data speeds.' },
  { _id: 5, title: 'Right to dispute billing', body: 'You may formally dispute any incorrect charge. Your operator must respond within 5 working days before NatCA can intervene.' },
  { _id: 6, title: 'Data privacy protection', body: 'Operators may not share your personal or usage data with third parties without your explicit consent.' },
  { _id: 7, title: 'Number portability', body: 'You can transfer your mobile number to any network operator without losing it (Mobile Number Portability, MNP).' },
  { _id: 8, title: 'Outage notification', body: 'Operators must notify you at least 48 hours before any planned maintenance or service interruption.' },
];

const DEFAULT_FAQS = [
  { _id: 1, title: 'How do I file a complaint with NatCA?', body: 'Register on this portal, go to "File a Complaint" and complete the form. You will receive a unique reference number to track your case.' },
  { _id: 2, title: 'How long does resolution take?', body: 'NatCA acknowledges all complaints within 7 working days and targets full resolution within 30 days. Complex billing disputes may take longer.' },
  { _id: 3, title: 'Do I need to contact my operator first?', body: 'Yes — first raise the issue with your operator. If they fail to respond within 7 working days you may formally escalate to NatCA.' },
  { _id: 4, title: 'What evidence should I include?', body: 'Screenshots, transaction receipts, call logs, or any documentation showing the problem. The more detail you provide, the faster NatCA can investigate.' },
  { _id: 5, title: 'What is KYC / SIM registration?', body: 'Know Your Customer (KYC) is a mandatory government process linking every SIM card to a verified national identity to prevent fraud.' },
  { _id: 6, title: 'My data balance disappeared unexpectedly. What now?', body: 'Contact your operator\'s customer care first (e.g. *111# or their hotline). If unresolved within 24 hours, file under "Slow or Missing Data" on this portal.' },
  { _id: 7, title: 'Is using this portal free?', body: 'Yes. Registering, filing complaints, and checking status is completely free for all Sierra Leone citizens.' },
  { _id: 8, title: 'Can I use the portal on my phone?', body: 'Yes — the portal is fully mobile-responsive. You can also download the NatCA Citizen App from the Google Play Store and Apple App Store.' },
];

const DEFAULT_NEWS = [
  {
    content_id: 'd1',
    title: 'NatCA Issues Quality of Service Directives to Mobile Operators',
    category: 'Enforcement',
    published_at: '2026-07-28',
    body: 'Following nationwide drive-test assessments across all 16 districts, NatCA has issued mandatory service benchmarks and corrective action directives to licensed operators in Sierra Leone. Operators must maintain minimum 4G throughput and call completion rates or face statutory financial penalties.',
  },
  {
    content_id: 'd2',
    title: 'Mandatory SIM Registration & KYC Verification Deadline Notice',
    category: 'Announcement',
    published_at: '2026-07-15',
    body: 'All telecommunications subscribers in Sierra Leone are reminded to verify their SIM registrations using their National Identification Number (NIN). Subscribers can complete self-service biometric verification through this portal or visit any licensed operator customer care center.',
  },
  {
    content_id: 'd3',
    title: 'NatCA Publishes Q2 2026 Consumer QoE & Tariff Comparison Report',
    category: 'QoS Report',
    published_at: '2026-07-02',
    body: 'The comprehensive Quality of Experience quarterly report is now available for public review. It outlines comparative data bundle pricing, dropped-call rates, average resolution times for consumer complaints, and nationwide coverage metrics across all operators.',
  }
];

const NATIONAL_CODES = [
  { ussd_id: 'nat-1', code: '*112#', description: 'NatCA Consumer Complaints & Helpline', operator_name: 'National Codes' },
  { ussd_id: 'nat-2', code: '*999#', description: 'National Police Emergency Services', operator_name: 'National Codes' },
  { ussd_id: 'nat-3', code: '*117#', description: 'National Health & Medical Emergency', operator_name: 'National Codes' },
  { ussd_id: 'nat-4', code: '*119#', description: 'Sierra Leone National Fire Force', operator_name: 'National Codes' },
  { ussd_id: 'nat-5', code: '*789#', description: 'NCRA National ID / NIN Verification', operator_name: 'National Codes' },
  { ussd_id: 'nat-6', code: '*456#', description: 'National Utilities & Outage Support', operator_name: 'National Codes' },
];

const TAG_COLORS = {
  Enforcement: '#c23934',
  Announcement: '#b26a00',
  'QoS Report': '#0b57a4',
};

/* ── USSD landing-page panel ─────────────────────────────────────────── */
function UssdPanel({ codes, onViewAll }) {
  const byOp = {
    'National Codes': [...NATIONAL_CODES],
  };

  codes.forEach(c => {
    const name = c.operator_name || 'Other';
    if (!byOp[name]) byOp[name] = [];
    byOp[name].push(c);
  });

  return (
    <Grid container spacing={2.5}>
      {Object.entries(byOp).map(([opName, items]) => {
        const isNational = opName === 'National Codes';
        const color = getOperatorColor(opName, isNational ? BRAND.primary : '#2563eb');

        return (
          <Grid item xs={12} sm={6} md={3} key={opName}>
            <Paper elevation={0} sx={{
              height: '100%', borderRadius: 2,
              border: `1px solid ${BRAND.border}`,
              borderTop: `3px solid ${color}`,
              overflow: 'hidden',
            }}>
              <Box sx={{
                px: 2, py: 1.5,
                bgcolor: isNational ? alpha(BRAND.primary, 0.08) : BRAND.primaryLt,
                borderBottom: `1px solid ${BRAND.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <Typography variant="subtitle2" fontWeight={700} sx={{ color: isNational ? BRAND.primary : 'text.primary' }}>
                  {opName}
                </Typography>
                {isNational && (
                  <Chip label="All Networks" size="small" sx={{ height: 18, fontSize: '0.62rem', fontWeight: 700, bgcolor: BRAND.primary, color: '#fff' }} />
                )}
              </Box>
              <Stack sx={{ p: 1.75 }} spacing={1.25}>
                {items.slice(0, 6).map(c => (
                  <Stack key={c.ussd_id} direction="row" spacing={1.25} alignItems="center">
                    <Box sx={{
                      px: 1, py: 0.25, borderRadius: 1,
                      bgcolor: isNational ? alpha(BRAND.primary, 0.1) : BRAND.primaryLt,
                      color: isNational ? BRAND.primary : 'primary.main',
                      fontFamily: '"Roboto Mono","Courier New",monospace',
                      fontWeight: 700, fontSize: '0.78rem', flexShrink: 0,
                    }}>
                      {c.code}
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.25, fontSize: '0.75rem' }}>
                      {c.description.replace(/^(Orange Sierra Leone|Africell|Qcell|Sierra Tel)\s[—–]\s/i, '')}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </Paper>
          </Grid>
        );
      })}
      <Grid item xs={12}>
        <Button variant="outlined" endIcon={<ArrowForwardIcon />} onClick={onViewAll} sx={{ mt: 1 }}>
          Browse full USSD directory
        </Button>
      </Grid>
    </Grid>
  );
}

/* ── Tariffs panel ───────────────────────────────────────────────────── */
function TariffsPanel({ tariffs }) {
  if (tariffs.length === 0) {
    return (
      <Paper elevation={0} sx={{ p: { xs: 4, md: 6 }, textAlign: 'center', borderRadius: 2, border: `1px solid ${BRAND.border}` }}>
        <BarChartIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
        <Typography variant="subtitle1" fontWeight={600} color="text.secondary">Tariff comparison data pending</Typography>
        <Typography variant="body2" color="text.disabled" sx={{ mt: 1, maxWidth: 440, mx: 'auto' }}>
          NatCA regularly publishes and updates operator tariff comparisons. This information will be available soon.
        </Typography>
      </Paper>
    );
  }

  const typeMap = {};
  const typeNameMap = {};
  const operators = [];

  tariffs.forEach(t => {
    const key = `${t.tariff_type}||${t.name}`;
    if (!typeMap[key]) typeMap[key] = {};
    typeMap[key][t.operator_name] = { rate: t.rate, unit: t.unit };
    typeNameMap[key] = t.name;
    if (!operators.includes(t.operator_name)) operators.push(t.operator_name);
  });

  return (
    <Box sx={{ overflowX: 'auto' }}>
      <TableContainer component={Paper} elevation={0} sx={{ border: `1px solid ${BRAND.border}`, borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: BRAND.navy }}>
              <TableCell sx={{ color: '#fff', fontWeight: 700, minWidth: 180 }}>Service</TableCell>
              {operators.map(op => (
                <TableCell key={op} align="center" sx={{ color: '#fff', fontWeight: 700, minWidth: 130 }}>{op}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {Object.entries(typeMap).map(([key, opData], i) => (
              <TableRow key={key} sx={{ bgcolor: i % 2 === 0 ? BRAND.alt : BRAND.paper }}>
                <TableCell sx={{ fontWeight: 600 }}>{typeNameMap[key]}</TableCell>
                {operators.map(op => (
                  <TableCell key={op} align="center">
                    {opData[op]
                      ? <Stack direction="row" spacing={0.5} justifyContent="center" alignItems="baseline">
                        <Typography variant="body2" fontWeight={700} color="primary.main">
                          {Number(opData[op].rate).toFixed(2)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">{opData[op].unit}</Typography>
                      </Stack>
                      : <Typography variant="body2" color="text.disabled">—</Typography>
                    }
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 2 }}>
        * Rates are indicative and subject to change. Always verify current pricing directly with your operator.
      </Typography>
    </Box>
  );
}

/* ── Government utility bar ──────────────────────────────────────────── */
function TopBar() {
  return (
    <Box sx={{ bgcolor: BRAND.navy, color: alpha('#fff', 0.85), display: { xs: 'none', md: 'block' } }}>
      <Container>
        <Stack direction="row" alignItems="center" spacing={2} sx={{ height: 38 }}>
          <AccountBalanceIcon sx={{ fontSize: 16 }} />
          <Typography variant="caption" sx={{ fontWeight: 500 }}>
            An official platform of the Government of Sierra Leone
          </Typography>
          <Box sx={{ flex: 1 }} />
          <Stack direction="row" alignItems="center" spacing={0.75}>
            <PhoneIcon sx={{ fontSize: 15 }} />
            <Typography variant="caption">Hotline +232 79 000 004</Typography>
          </Stack>
          <Divider orientation="vertical" flexItem sx={{ borderColor: alpha('#fff', 0.2), my: 1 }} />
          <Stack direction="row" alignItems="center" spacing={0.75}>
            <EmailIcon sx={{ fontSize: 15 }} />
            <Typography variant="caption">complaints@natca.gov.sl</Typography>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}

/* ── Brand lockup ────────────────────────────────────────────────────── */
function Logo({ onClick }) {
  return (
    <Stack direction="row" alignItems="center" spacing={1.5} sx={{ cursor: 'pointer' }} onClick={onClick}>
      <Box component="img" src="/natca_logo.png" alt="NatCA" sx={{ width: 42, height: 42, objectFit: 'contain' }} />
      <Box>
        <Typography sx={{ fontWeight: 800, lineHeight: 1.05, fontSize: '1.15rem', letterSpacing: '-0.01em' }}>
          NatCA
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1, fontSize: '0.7rem', letterSpacing: '0.02em' }}>
          Communication Authority
        </Typography>
      </Box>
    </Stack>
  );
}

/* ── Sticky header ───────────────────────────────────────────────────── */
function Navbar() {
  const { user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [drawer, setDrawer] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <AppBar position="sticky" sx={{
      bgcolor: BRAND.paper,
      borderBottom: `1px solid ${scrolled ? BRAND.border : 'transparent'}`,
      boxShadow: scrolled ? '0 4px 20px rgba(13,44,84,0.06)' : 'none',
      transition: 'box-shadow .2s ease, border-color .2s ease',
    }}>
      <Container>
        <Toolbar disableGutters sx={{ height: { xs: 64, md: 74 } }}>
          <Logo onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} />

          {!isMobile && (
            <Stack direction="row" spacing={0.5} sx={{ ml: 4 }}>
              {NAV_ITEMS.map((item) => (
                <Button key={item.id} onClick={() => scrollTo(item.id)}
                  sx={{ color: BRAND.text, fontWeight: 500, px: 1.5, py: 0.75, '&:hover': { bgcolor: BRAND.primaryLt, color: 'primary.main' } }}>
                  {item.label}
                </Button>
              ))}
            </Stack>
          )}

          <Box sx={{ flex: 1 }} />

          {!isMobile && (
            <Stack direction="row" spacing={1.5} alignItems="center">
              {user ? (
                <Button variant="contained" component={RouterLink} to="/submit"
                  sx={{ bgcolor: BRAND.primary, '&:hover': { bgcolor: BRAND.primaryDk } }}>
                  Portal Dashboard
                </Button>
              ) : (
                <>
                  <Button variant="text" component={RouterLink} to="/login"
                    sx={{ color: BRAND.text, fontWeight: 600 }}>
                    Sign in
                  </Button>
                  <Button variant="contained" component={RouterLink} to="/register"
                    sx={{ bgcolor: BRAND.primary, '&:hover': { bgcolor: BRAND.primaryDk } }}>
                    Create Account
                  </Button>
                </>
              )}
            </Stack>
          )}

          {isMobile && (
            <IconButton onClick={() => setDrawer(true)} aria-label="Open navigation menu">
              <MenuIcon />
            </IconButton>
          )}
        </Toolbar>
      </Container>

      <Drawer anchor="right" open={drawer} onClose={() => setDrawer(false)}
        PaperProps={{ sx: { width: 280, p: 2.5 } }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
          <Logo onClick={() => { setDrawer(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
          <IconButton onClick={() => setDrawer(false)} aria-label="Close navigation menu" size="small">
            <CloseIcon />
          </IconButton>
        </Stack>
        <Divider sx={{ mb: 2 }} />
        <List disablePadding>
          {NAV_ITEMS.map((item) => (
            <ListItemButton key={item.id} onClick={() => { setDrawer(false); scrollTo(item.id); }} sx={{ borderRadius: 1.5, py: 1.25 }}>
              <ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: 600 }} />
            </ListItemButton>
          ))}
        </List>
        <Box sx={{ mt: 'auto', pt: 3 }}>
          {user ? (
            <Button fullWidth variant="contained" component={RouterLink} to="/submit" onClick={() => setDrawer(false)}>
              Portal Dashboard
            </Button>
          ) : (
            <Stack spacing={1.5}>
              <Button fullWidth variant="outlined" component={RouterLink} to="/login" onClick={() => setDrawer(false)}>
                Sign in
              </Button>
              <Button fullWidth variant="contained" component={RouterLink} to="/register" onClick={() => setDrawer(false)}>
                Create Account
              </Button>
            </Stack>
          )}
        </Box>
      </Drawer>
    </AppBar>
  );
}

/* ── Section wrapper ─────────────────────────────────────────────────── */
function Section({ id, children, alt, sx = {} }) {
  return (
    <Box id={id} component="section" sx={{
      py: { xs: 7, md: 10 },
      bgcolor: alt ? BRAND.alt : BRAND.paper,
      ...sx,
    }}>
      <Container>{children}</Container>
    </Box>
  );
}

function Eyebrow({ children }) {
  return (
    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
      <Box sx={{ width: 20, height: 2, bgcolor: BRAND.gold }} />
      <Typography variant="overline" sx={{ color: BRAND.navy, fontWeight: 700 }}>
        {children}
      </Typography>
    </Stack>
  );
}

/* ── Main Landing Page Component ─────────────────────────────────────── */
export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const theme = useTheme();

  const [newsItems, setNewsItems] = useState([]);
  const [rightsItems, setRightsItems] = useState([]);
  const [faqs, setFaqs] = useState([]);
  const [ussdCodes, setUssdCodes] = useState([]);
  const [tariffData, setTariffData] = useState([]);
  const [ratesTab, setRatesTab] = useState('ussd');
  const [fraudAlert, setFraudAlert] = useState(null);
  const [openFraudAlert, setOpenFraudAlert] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState(null);

  const loadData = useCallback(async () => {
    const results = await Promise.allSettled([
      get('/content/public/NEWS'),
      get('/content/public/RIGHTS'),
      get('/content/public/FAQ'),
      get('/ussd/public'),
      get('/tariffs'),
      get('/content/public/FRAUD_ALERT'),
    ]);
    const [newsR, rightsR, faqR, ussdR, tarR, alertR] = results;
    if (newsR.status === 'fulfilled' && Array.isArray(newsR.value.data) && newsR.value.data.length > 0) {
      setNewsItems(newsR.value.data.slice(0, 3));
    }
    if (rightsR.status === 'fulfilled' && Array.isArray(rightsR.value.data) && rightsR.value.data.length > 0) {
      setRightsItems(rightsR.value.data);
    }
    if (faqR.status === 'fulfilled' && Array.isArray(faqR.value.data) && faqR.value.data.length > 0) {
      setFaqs(faqR.value.data);
    }
    if (ussdR.status === 'fulfilled') {
      const rows = ussdR.value.data?.rows || ussdR.value.data || [];
      setUssdCodes(rows);
    }
    if (tarR.status === 'fulfilled') {
      setTariffData(tarR.value.data || []);
    }

    if (alertR && alertR.status === 'fulfilled' && alertR.value.data?.length > 0) {
      const activeAlert = alertR.value.data[0];
      const alertId = `fraud_alert_seen_${activeAlert.content_id}`;

      if (!sessionStorage.getItem(alertId)) {
        setFraudAlert(activeAlert);
        setOpenFraudAlert(true);
        sessionStorage.setItem(alertId, 'true');
      }
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const services = [
    { icon: <ReportProblemIcon />, title: 'File a Complaint', desc: 'Report network, billing or QoS issues', to: '/submit' },
    { icon: <SearchIcon />, title: 'Track Status', desc: 'Follow your case with a reference number', to: '/track' },
    { icon: <VerifiedUserIcon />, title: 'KYC / SIM Registration', desc: 'Verify your identity and register your SIM', to: '/kyc' },
    { icon: <PhoneAndroidIcon />, title: 'Mobile Access', desc: 'Available on the NatCA citizen mobile app', to: '/submit' },
  ];

  const displayNews = newsItems.length > 0 ? newsItems : DEFAULT_NEWS;
  const displayRights = rightsItems.length > 0 ? rightsItems : DEFAULT_RIGHTS;
  const displayFaqs = faqs.length > 0 ? faqs : DEFAULT_FAQS;

  return (
    <Box sx={{ bgcolor: 'background.default', overflowX: 'hidden' }}>
      <TopBar />
      <Navbar />

      {/* ── HERO with Background & Compact Services Card ─────────── */}
      <Box sx={{
        position: 'relative',
        py: { xs: 6, md: 9 },
        overflow: 'hidden',
      }}>
        {/* Background Image */}
        <Box sx={{
          position: 'absolute', inset: 0, zIndex: 0,
          backgroundImage: 'url(/natca-building.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center top',
          backgroundRepeat: 'no-repeat',
        }} />
        {/* Dark Gradient Overlay */}
        <Box sx={{
          position: 'absolute', inset: 0, zIndex: 1,
          background: 'linear-gradient(135deg, rgba(4,20,50,0.88) 0%, rgba(13,44,84,0.82) 40%, rgba(4,20,50,0.75) 100%)',
        }} />

        <Container sx={{ position: 'relative', zIndex: 2 }}>
          <Grid container spacing={{ xs: 4, md: 6 }} alignItems="center">
            <Grid item xs={12} md={7.5}>
              <Stack direction="row" alignItems="center" spacing={1.25} sx={{
                display: 'inline-flex', px: 1.5, py: 0.5, borderRadius: 1,
                bgcolor: alpha('#fff', 0.12), border: `1px solid ${alpha('#fff', 0.2)}`, mb: 2.5,
                backdropFilter: 'blur(8px)',
              }}>
                <GavelIcon sx={{ fontSize: 15, color: BRAND.gold }} />
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#fff', letterSpacing: '0.02em', fontSize: '0.75rem' }}>
                  NATIONAL COMMUNICATION AUTHORITY
                </Typography>
              </Stack>

              <Typography variant="h1" sx={{ color: '#fff', mb: 2, fontSize: { xs: '2rem', sm: '2.5rem', md: '3.1rem' }, textWrap: 'balance', textShadow: '0 2px 16px rgba(0,0,0,0.3)' }}>
                Quality Of Experience, Guaranteed for Every Citizen
              </Typography>

              <Typography variant="body1" sx={{ color: alpha('#fff', 0.85), mb: 3.5, maxWidth: 540, fontSize: '0.98rem' }}>
                NatCA is the independent regulator safeguarding your right to reliable, fairly
                priced telecommunications. Submit complaints, register your SIM, and hold operators
                accountable — backed by law.
              </Typography>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.75}>
                <Button variant="contained" size="large" endIcon={<ArrowForwardIcon />}
                  onClick={() => navigate('/submit')}
                  sx={{ boxShadow: `0 8px 24px ${alpha(BRAND.primary, 0.5)}`, px: 3, py: 1.25 }}>
                  Submit a Complaint
                </Button>
                <Button variant="outlined" size="large" onClick={() => scrollTo('about')}
                  sx={{ color: '#fff', borderColor: alpha('#fff', 0.4), '&:hover': { borderColor: '#fff', bgcolor: alpha('#fff', 0.08) }, px: 2.5 }}>
                  Learn About NatCA
                </Button>
              </Stack>

              <Stack direction="row" spacing={{ xs: 2, sm: 4, md: 5 }} sx={{ mt: { xs: 3.5, md: 4 } }} divider={<Divider orientation="vertical" flexItem sx={{ borderColor: alpha('#fff', 0.25) }} />}>
                {[
                  { val: '7 Days', desc: 'Initial response' },
                  { val: '30 Days', desc: 'Resolution SLA' },
                  { val: 'Free', desc: 'No cost to file' },
                ].map((s) => (
                  <Box key={s.desc}>
                    <Typography sx={{ fontFamily: '"Source Serif 4", serif', fontWeight: 700, fontSize: { xs: '1.3rem', sm: '1.55rem' }, color: '#fff', lineHeight: 1.1, whiteSpace: 'nowrap' }}>
                      {s.val}
                    </Typography>
                    <Typography variant="caption" sx={{ color: alpha('#fff', 0.65), fontSize: '0.72rem' }}>{s.desc}</Typography>
                  </Box>
                ))}
              </Stack>
            </Grid>

            {/* Compact Tall Citizen Services Card */}
            <Grid item xs={12} md={4.5}>
              <Paper elevation={0} sx={{
                maxWidth: { xs: '100%', sm: 335, md: 340 },
                mx: { xs: 'auto', md: '0 0 0 auto' },
                borderRadius: 2.5, overflow: 'hidden',
                boxShadow: '0 18px 44px rgba(0,0,0,0.32)',
                border: `1px solid ${alpha('#fff', 0.15)}`,
                backdropFilter: 'blur(12px)',
              }}>
                <Box sx={{ bgcolor: BRAND.navy, px: 2.5, py: 1.8, color: '#fff' }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography sx={{ fontWeight: 700, fontSize: '0.98rem' }}>Citizen Services</Typography>
                      <Typography variant="caption" sx={{ color: alpha('#fff', 0.7), fontSize: '0.72rem' }}>Choose a service to begin</Typography>
                    </Box>
                    <Stack direction="row" alignItems="center" spacing={0.6} sx={{ px: 1.1, py: 0.35, borderRadius: 99, bgcolor: alpha('#fff', 0.12) }}>
                      <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#4ade80' }} />
                      <Typography variant="caption" sx={{ color: '#fff', fontWeight: 600, fontSize: '0.7rem' }}>Online</Typography>
                    </Stack>
                  </Stack>
                </Box>
                <Stack divider={<Divider />}>
                  {services.map((s) => (
                    <Stack key={s.title} direction="row" alignItems="center" spacing={1.75}
                      onClick={() => navigate(s.to)}
                      sx={{
                        px: 2.5, py: 1.6, cursor: 'pointer', transition: 'background-color .15s ease',
                        bgcolor: 'background.paper',
                        '&:hover': { bgcolor: BRAND.alt },
                        '&:hover .svc-arrow': { transform: 'translateX(3px)', color: 'primary.main' },
                      }}>
                      <Box sx={{
                        width: 38, height: 38, borderRadius: 1.5, flexShrink: 0,
                        bgcolor: BRAND.primaryLt, color: 'primary.main',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        '& svg': { fontSize: 20 },
                      }}>
                        {s.icon}
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 600, fontSize: '0.88rem', color: 'text.primary', lineHeight: 1.25 }}>{s.title}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem', display: 'block', mt: 0.2 }}>{s.desc}</Typography>
                      </Box>
                      <ChevronRightIcon className="svc-arrow" sx={{ fontSize: 18, color: 'text.disabled', transition: 'all .15s ease' }} />
                    </Stack>
                  ))}
                </Stack>
                <Box sx={{ px: 2.5, py: 1.4, bgcolor: BRAND.alt, borderTop: `1px solid ${BRAND.border}` }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', display: 'block', textAlign: 'center' }}>
                    Secure &amp; confidential · Registration required to file
                  </Typography>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* ── TRUST STRIP ───────────────────────────────────────────── */}
      <Box sx={{ bgcolor: BRAND.paper, borderBottom: `1px solid ${BRAND.border}` }}>
        <Container>
          <Grid container>
            {[
              { val: '4', label: 'Licensed operators regulated' },
              { val: '16', label: 'Districts monitored nationwide' },
              { val: '100%', label: 'Free service for all citizens' },
              { val: '24/7', label: 'Complaint intake, online' },
            ].map((s, i) => (
              <Grid item xs={6} md={3} key={s.label} sx={{
                py: 3, px: 3, textAlign: { xs: 'center', md: 'left' },
                borderLeft: { md: i === 0 ? 'none' : `1px solid ${BRAND.border}` },
                borderTop: { xs: i > 1 ? `1px solid ${BRAND.border}` : 'none', md: 'none' },
              }}>
                <Typography sx={{ fontFamily: '"Source Serif 4", serif', fontWeight: 700, fontSize: '1.85rem', color: 'primary.main', lineHeight: 1 }}>
                  {s.val}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontSize: '0.88rem' }}>{s.label}</Typography>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* ── ABOUT ─────────────────────────────────────────────────── */}
      <Section id="about" alt>
        <Grid container spacing={{ xs: 5, md: 8 }} alignItems="center">
          <Grid item xs={12} md={6}>
            <Eyebrow>About the Commission</Eyebrow>
            <Typography variant="h2" sx={{ color: BRAND.navy, mb: 2 }}>
              Regulating telecom for a better Sierra Leone
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              The National Communication Authority (NatCA) is the government body responsible
              for licensing, monitoring, and regulating all telecommunications services in Sierra Leone.
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Our mandate is to protect consumers, promote fair competition, and ensure operators
              deliver the quality of service they promise.
            </Typography>
            <Stack spacing={1.5}>
              {[
                'License and supervise all telecom operators and service providers',
                'Enforce Quality of Service (QoS) standards across the network',
                'Resolve consumer complaints within mandated service levels',
                'Oversee SIM card registration and KYC compliance',
                'Conduct drive tests and network audits in all 16 districts',
              ].map((item) => (
                <Stack key={item} direction="row" spacing={1.5} alignItems="flex-start">
                  <CheckCircleIcon sx={{ color: 'primary.main', mt: 0.2, fontSize: 19, flexShrink: 0 }} />
                  <Typography variant="body2" color="text.primary">{item}</Typography>
                </Stack>
              ))}
            </Stack>
          </Grid>
          <Grid item xs={12} md={6}>
            <Grid container spacing={2}>
              {[
                { val: '4', unit: 'Licensed Operators', desc: 'Regulated nationwide' },
                { val: '16', unit: 'Districts', desc: 'Covered across the country' },
                { val: '30', unit: 'Days Maximum SLA', desc: 'For complaint resolution' },
                { val: '100%', unit: 'Free of Charge', desc: 'No fees to citizens' },
              ].map((s) => (
                <Grid item xs={6} key={s.unit}>
                  <Paper sx={{ p: { xs: 2.25, md: 2.75 }, height: '100%', borderRadius: 2 }}>
                    <Typography sx={{ fontFamily: '"Source Serif 4", serif', fontWeight: 700, fontSize: '2.4rem', color: 'primary.main', lineHeight: 1 }}>
                      {s.val}
                    </Typography>
                    <Typography variant="subtitle2" sx={{ mt: 1, color: 'text.primary', fontWeight: 700 }}>{s.unit}</Typography>
                    <Typography variant="caption" color="text.secondary">{s.desc}</Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Grid>
        </Grid>
      </Section>

      {/* ── CONSUMER RIGHTS ───────────────────────────────────────── */}
      <Section id="rights">
        <Eyebrow>Consumer Rights</Eyebrow>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'flex-end' }} spacing={2} sx={{ mb: 4 }}>
          <Box>
            <Typography variant="h2" sx={{ color: BRAND.navy }}>Know your rights as a subscriber</Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mt: 1, maxWidth: 580 }}>
              NatCA regulations guarantee every citizen these rights. If your operator fails to honour them,
              you can file a formal complaint at no cost.
            </Typography>
          </Box>
        </Stack>
        <Grid container spacing={2.5}>
          {displayRights.map((r, i) => (
            <Grid item xs={12} sm={6} md={3} key={r.content_id || r._id || i}>
              <Paper elevation={0} sx={{
                p: 2.75, height: '100%', borderRadius: 2,
                border: `1px solid ${BRAND.border}`,
                borderTop: `3px solid ${BRAND.gold}`,
              }}>
                <Box sx={{
                  width: 36, height: 36, borderRadius: 1.5, bgcolor: BRAND.primaryLt,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'primary.main', mb: 1.75,
                }}>
                  <ShieldOutlinedIcon sx={{ fontSize: 19 }} />
                </Box>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.75, color: BRAND.navy }}>{r.title}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.88rem', lineHeight: 1.55 }}>{r.body}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Section>

      {/* ── NEWS & UPDATES (Clickable with interactive modal) ──────── */}
      <Section id="news" alt>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'flex-end' }} spacing={2} sx={{ mb: 4 }}>
          <Box>
            <Eyebrow>Newsroom</Eyebrow>
            <Typography variant="h2" sx={{ color: BRAND.navy }}>Latest updates</Typography>
          </Box>
          <Button variant="outlined" endIcon={<ArrowForwardIcon />} onClick={() => navigate('/news')} sx={{ alignSelf: { xs: 'flex-start', sm: 'auto' } }}>
            View all notices
          </Button>
        </Stack>

        <Grid container spacing={3}>
          {displayNews.map((n) => {
            const color = TAG_COLORS[n.category] ?? BRAND.primary;
            const dateStr = n.published_at
              ? new Date(n.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
              : 'Official Notice';
            return (
              <Grid item xs={12} md={4} key={n.content_id}>
                <Paper
                  onClick={() => setSelectedArticle(n)}
                  sx={{
                    height: '100%', display: 'flex', flexDirection: 'column',
                    borderRadius: 2, overflow: 'hidden', cursor: 'pointer',
                    transition: 'transform .18s ease, box-shadow .18s ease, border-color .18s ease',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: '0 12px 28px rgba(13,44,84,0.1)',
                      borderColor: alpha(BRAND.primary, 0.4),
                    },
                  }}>
                  <Box sx={{ height: 4, bgcolor: color }} />
                  <Box sx={{ p: 2.75, display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.75 }}>
                      <Box sx={{ px: 1.2, py: 0.3, borderRadius: 1, bgcolor: alpha(color, 0.1), border: `1px solid ${alpha(color, 0.25)}` }}>
                        <Typography variant="caption" sx={{ color, fontWeight: 700 }}>{n.category || 'Announcement'}</Typography>
                      </Box>
                      <Box sx={{ flex: 1 }} />
                      <CalendarMonthIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                      <Typography variant="caption" color="text.disabled">{dateStr}</Typography>
                    </Stack>
                    <Typography variant="h6" sx={{ mb: 1.25, lineHeight: 1.35, fontSize: '1.05rem', fontWeight: 700, color: BRAND.navy }}>
                      {n.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{
                      flex: 1, display: '-webkit-box', WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.6,
                    }}>
                      {n.body}
                    </Typography>
                    <Button
                      endIcon={<ArrowForwardIcon />}
                      onClick={(e) => { e.stopPropagation(); setSelectedArticle(n); }}
                      sx={{ mt: 2, alignSelf: 'flex-start', p: 0, fontWeight: 700, color: 'primary.main', '&:hover': { bgcolor: 'transparent' } }}>
                      Read full article
                    </Button>
                  </Box>
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      </Section>

      {/* ── FAQ ───────────────────────────────────────────────────── */}
      <Section id="faq">
        <Eyebrow>Help Centre</Eyebrow>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'flex-end' }} spacing={2} sx={{ mb: 4 }}>
          <Typography variant="h2" sx={{ color: BRAND.navy }}>Frequently asked questions</Typography>
          <Button variant="outlined" endIcon={<ArrowForwardIcon />} onClick={() => navigate('/news')} sx={{ alignSelf: { xs: 'flex-start', sm: 'auto' } }}>
            View all FAQs
          </Button>
        </Stack>
        <Grid container spacing={{ xs: 0, md: 6 }}>
          <Grid item xs={12} md={8}>
            {displayFaqs.map((f, i) => (
              <Accordion key={f.content_id || f._id || i} elevation={0} disableGutters sx={{
                border: `1px solid ${BRAND.border}`, mb: 1.25, borderRadius: '10px !important',
                '&:before': { display: 'none' },
                '&.Mui-expanded': { boxShadow: '0 4px 16px rgba(13,44,84,0.07)' },
              }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: 'primary.main' }} />} sx={{ px: 2.75, py: 1 }}>
                  <Typography variant="subtitle1" fontWeight={600}>{f.title}</Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ px: 2.75, pt: 0, pb: 2.25 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.75 }}>{f.body}</Typography>
                </AccordionDetails>
              </Accordion>
            ))}
          </Grid>
          <Grid item xs={12} md={4} sx={{ display: { xs: 'none', md: 'block' } }}>
            <Paper elevation={0} sx={{ p: 3.5, borderRadius: 2, border: `1px solid ${BRAND.border}`, bgcolor: BRAND.primaryLt }}>
              <Box sx={{ width: 44, height: 44, borderRadius: 1.5, bgcolor: BRAND.primary, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
                <PhoneIcon sx={{ fontSize: 20 }} />
              </Box>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 1, color: BRAND.navy }}>Still have questions?</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Our team is available Monday–Friday, 8:00–17:00 WAT to help with any enquiry.
              </Typography>
              <Stack spacing={1.5}>
                <Button variant="contained" fullWidth onClick={() => scrollTo('contact')}>Contact Us</Button>
                <Button variant="outlined" fullWidth component="a" href="tel:+23279000004">
                  Call +232 79 000 004
                </Button>
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      </Section>

      {/* ── USSD CODES & TARIFFS (With National Codes Column) ──────── */}
      <Section id="rates" alt>
        <Eyebrow>Rates &amp; Services</Eyebrow>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'flex-end' }} spacing={2} sx={{ mb: 2 }}>
          <Box>
            <Typography variant="h2" sx={{ color: BRAND.navy }}>USSD codes &amp; tariffs</Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
              Quick reference for all licensed operators — dial codes, emergency hotlines, and service shortcuts.
            </Typography>
          </Box>
          <Button variant="outlined" endIcon={<ArrowForwardIcon />} onClick={() => navigate('/ussd')} sx={{ flexShrink: 0, alignSelf: { xs: 'flex-start', sm: 'auto' } }}>
            Full USSD directory
          </Button>
        </Stack>

        <Tabs value={ratesTab} onChange={(_, v) => setRatesTab(v)} sx={{ mb: 4, borderBottom: `1px solid ${BRAND.border}` }}>
          <Tab value="ussd" label="USSD & Short Codes" sx={{ fontWeight: 600, textTransform: 'none' }} />
          <Tab value="tariffs" label="Tariff Comparison" sx={{ fontWeight: 600, textTransform: 'none' }} />
        </Tabs>

        {ratesTab === 'ussd' && <UssdPanel codes={ussdCodes} onViewAll={() => navigate('/ussd')} />}
        {ratesTab === 'tariffs' && <TariffsPanel tariffs={tariffData} />}
      </Section>

      {/* ── COMPLAIN ──────────────────────────────────────────────── */}
      <Section id="complain">
        <Grid container spacing={{ xs: 5, md: 8 }} alignItems="center">
          <Grid item xs={12} md={5}>
            <Eyebrow>File a Complaint</Eyebrow>
            <Typography variant="h2" sx={{ color: BRAND.navy, mb: 2.5 }}>
              Not getting the service you pay for?
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3.5 }}>
              Slow data, dropped calls, billing errors, or no coverage — if your operator is failing
              you, NatCA will formally investigate and enforce corrective action on your behalf.
            </Typography>
            <Button variant="contained" size="large" endIcon={<ArrowForwardIcon />}
              onClick={() => navigate(user ? '/submit' : '/register')} sx={{ px: 3.5, py: 1.25 }}>
              {user ? 'Submit My Complaint' : 'Register to File a Complaint'}
            </Button>
            {!user && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Already registered?{' '}
                <Box component={RouterLink} to="/login" sx={{ color: 'primary.main', fontWeight: 600, textDecoration: 'none' }}>
                  Sign in to your account
                </Box>
              </Typography>
            )}
          </Grid>
          <Grid item xs={12} md={7}>
            <Stack spacing={1.75}>
              {[
                { step: '01', title: 'Create an account', desc: 'Register with your name and phone number, then verify with the one-time code sent to you.', icon: <VerifiedUserIcon /> },
                { step: '02', title: 'Choose issue category', desc: 'Select the type of problem: slow data, call drops, billing dispute, poor coverage, or outage.', icon: <ReportProblemIcon /> },
                { step: '03', title: 'Provide the details', desc: 'Describe the problem, select your operator, and specify your district and exact location.', icon: <PhoneAndroidIcon /> },
                { step: '04', title: 'Track until resolved', desc: 'Receive a reference number. NatCA investigates and keeps you updated through to resolution.', icon: <CheckCircleIcon /> },
              ].map((s) => (
                <Paper key={s.step} sx={{ p: 2.5, borderRadius: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
                  <Box sx={{
                    width: 42, height: 42, borderRadius: 1.5, flexShrink: 0,
                    bgcolor: BRAND.primaryLt, color: 'primary.main',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', '& svg': { fontSize: 20 },
                  }}>
                    {s.icon}
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Stack direction="row" spacing={1.25} alignItems="baseline">
                      <Typography sx={{ fontFamily: '"Source Serif 4", serif', fontWeight: 700, color: BRAND.gold, fontSize: '0.9rem' }}>{s.step}</Typography>
                      <Typography variant="subtitle2" sx={{ color: 'text.primary', fontWeight: 700 }}>{s.title}</Typography>
                    </Stack>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25, fontSize: '0.85rem' }}>{s.desc}</Typography>
                  </Box>
                </Paper>
              ))}
            </Stack>
          </Grid>
        </Grid>
      </Section>

      {/* ── KYC ───────────────────────────────────────────────────── */}
      <Section id="kyc" alt>
        <Eyebrow>KYC &amp; SIM Registration</Eyebrow>
        <Grid container spacing={{ xs: 4, md: 8 }} alignItems="center">
          <Grid item xs={12} md={7} order={{ xs: 2, md: 1 }}>
            <Grid container spacing={2}>
              {[
                { title: 'Why registration is required', desc: 'The Government of Sierra Leone requires every SIM to be registered under a verified identity to combat fraud and enhance national security.' },
                { title: 'What you will need', desc: 'A valid national ID, voter card, or passport, together with a clear photo captured during verification.' },
                { title: 'How long it takes', desc: 'Verification takes 3–5 business days. You are notified by SMS as soon as your identity is confirmed.' },
                { title: 'Applies to all operators', desc: 'Registration is mandatory for Orange SL, Africell, Qcell, and Sierra Tel. Each SIM is registered individually.' },
              ].map((c) => (
                <Grid item xs={12} sm={6} key={c.title}>
                  <Paper sx={{ p: 2.75, height: '100%', borderRadius: 2, borderLeft: `3px solid ${BRAND.primary}` }}>
                    <Typography variant="subtitle2" sx={{ mb: 0.75, color: 'text.primary', fontWeight: 700 }}>{c.title}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>{c.desc}</Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Grid>
          <Grid item xs={12} md={5} order={{ xs: 1, md: 2 }}>
            <Typography variant="h3" sx={{ color: BRAND.navy, mb: 2 }}>
              Register your SIM — it&apos;s mandatory
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3.5 }}>
              All SIM cards in Sierra Leone must be registered under a verified national identity.
              Unregistered SIMs will be deactivated. Complete your KYC here in minutes.
            </Typography>
            <Stack spacing={1.5} direction={{ xs: 'column', sm: 'row' }}>
              <Button variant="contained" size="large" onClick={() => navigate(user ? '/kyc' : '/register')}>
                {user ? 'Start KYC Now' : 'Register to Verify KYC'}
              </Button>
              <Button variant="outlined" size="large" onClick={() => navigate('/track')}>
                Check KYC Status
              </Button>
            </Stack>
            <Paper sx={{ mt: 3.5, p: 2.5, borderRadius: 2, bgcolor: alpha('#b26a00', 0.06), borderLeft: `4px solid #b26a00` }}>
              <Stack direction="row" spacing={1.5} alignItems="flex-start">
                <CalendarMonthIcon sx={{ color: '#b26a00', fontSize: 22, mt: 0.25 }} />
                <Box>
                  <Typography variant="subtitle2" sx={{ color: '#8a5200', mb: 0.25, fontWeight: 700 }}>
                    Deadline: 30 September 2026
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    All SIMs must be registered by this date to avoid service deactivation.
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      </Section>

      {/* ── CONTACT ───────────────────────────────────────────────── */}
      <Section id="contact">
        <Grid container spacing={{ xs: 5, md: 8 }}>
          <Grid item xs={12} md={5}>
            <Eyebrow>Contact NatCA</Eyebrow>
            <Typography variant="h2" sx={{ color: BRAND.navy, mb: 2.5 }}>Get in touch</Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
              For complaints, inquiries, or general information about telecom services in Sierra Leone,
              reach out through any channel below. Our team is available Monday–Friday, 8:00–17:00 WAT.
            </Typography>
            <Stack spacing={2.5}>
              {[
                { icon: <LocationOnIcon />, label: 'Head Office', value: 'NatCA Tower, Southridge, IMATT, Freetown, Sierra Leone' },
                { icon: <PhoneIcon />, label: 'Hotline', value: '+232 79 000 004' },
                { icon: <EmailIcon />, label: 'Email', value: 'complaints@natca.gov.sl' },
              ].map((c) => (
                <Stack key={c.label} direction="row" spacing={2} alignItems="flex-start">
                  <Box sx={{
                    width: 44, height: 44, borderRadius: 1.5, flexShrink: 0, bgcolor: BRAND.paper,
                    border: `1px solid ${BRAND.border}`, color: 'primary.main',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', '& svg': { fontSize: 20 },
                  }}>
                    {c.icon}
                  </Box>
                  <Box>
                    <Typography variant="overline" color="text.disabled" display="block" sx={{ lineHeight: 1.4 }}>{c.label}</Typography>
                    <Typography variant="body1" sx={{ color: 'text.primary', fontWeight: 600 }}>{c.value}</Typography>
                  </Box>
                </Stack>
              ))}
            </Stack>
          </Grid>
          <Grid item xs={12} md={7}>
            <Paper sx={{ p: { xs: 3, md: 4 }, borderRadius: 2 }}>
              <Typography variant="h5" sx={{ mb: 0.5, color: BRAND.navy }}>Send a message</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                We typically respond within two business days.
              </Typography>
              <Grid container spacing={2}>
                {[
                  { label: 'Full name', xs: 12, sm: 6 },
                  { label: 'Phone number', xs: 12, sm: 6 },
                  { label: 'Email address', xs: 12 },
                  { label: 'Subject', xs: 12 },
                ].map((f) => (
                  <Grid item xs={f.xs} sm={f.sm} key={f.label}>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', display: 'block', mb: 0.75 }}>{f.label}</Typography>
                    <Box component="input" placeholder={f.label} sx={inputSx(theme)} />
                  </Grid>
                ))}
                <Grid item xs={12}>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', display: 'block', mb: 0.75 }}>Message</Typography>
                  <Box component="textarea" rows={4} placeholder="How can we help?" sx={{ ...inputSx(theme), resize: 'vertical' }} />
                </Grid>
                <Grid item xs={12}>
                  <Button variant="contained" size="large" endIcon={<ArrowForwardIcon />}>Send Message</Button>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        </Grid>
      </Section>

      {/* ── FOOTER ────────────────────────────────────────────────── */}
      <Box component="footer" sx={{ bgcolor: BRAND.navy, color: alpha('#fff', 0.75), borderTop: `3px solid ${BRAND.gold}` }}>
        <Container sx={{ py: { xs: 5, md: 7 } }}>
          <Grid container spacing={4}>
            {/* Brand + social */}
            <Grid item xs={12} md={4}>
              <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
                <Box component="img" src="/natca_logo.png" alt="NatCA"
                  sx={{ width: 42, height: 42, objectFit: 'contain' }} />
                <Box>
                  <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: '1.1rem', lineHeight: 1.1 }}>NatCA</Typography>
                  <Typography variant="caption" sx={{ color: alpha('#fff', 0.6) }}>Communication Authority</Typography>
                </Box>
              </Stack>
              <Typography variant="body2" sx={{ color: alpha('#fff', 0.7), maxWidth: 300, mb: 2.5 }}>
                The National Communication Authority of Sierra Leone — regulating telecom
                services for a connected, well-served nation.
              </Typography>
              <Stack direction="row" spacing={0.5}>
                {[
                  { icon: <FacebookIcon fontSize="small" />, label: 'Facebook' },
                  { icon: <InstagramIcon fontSize="small" />, label: 'Instagram' },
                  { icon: <YouTubeIcon fontSize="small" />, label: 'YouTube' },
                  { icon: <LinkedInIcon fontSize="small" />, label: 'LinkedIn' },
                ].map(({ icon, label }) => (
                  <IconButton key={label} component="a" href="#" aria-label={label} size="small"
                    sx={{ color: alpha('#fff', 0.55), '&:hover': { color: '#fff', bgcolor: alpha('#fff', 0.1) } }}>
                    {icon}
                  </IconButton>
                ))}
              </Stack>
            </Grid>

            {/* Explore */}
            <Grid item xs={6} md={2}>
              <Typography variant="overline" sx={{ color: alpha('#fff', 0.5), display: 'block', mb: 1.5 }}>Explore</Typography>
              {NAV_ITEMS.map((l) => (
                <Typography key={l.id} variant="body2" onClick={() => scrollTo(l.id)}
                  sx={{ mb: 1, cursor: 'pointer', color: alpha('#fff', 0.75), '&:hover': { color: '#fff' } }}>
                  {l.label}
                </Typography>
              ))}
            </Grid>

            {/* Portal links */}
            <Grid item xs={6} md={2}>
              <Typography variant="overline" sx={{ color: alpha('#fff', 0.5), display: 'block', mb: 1.5 }}>Portal</Typography>
              {[
                { label: 'Login', to: '/login' },
                { label: 'Sign Up', to: '/register' },
                { label: 'Track Complaint', to: '/track' },
                { label: 'News & Notices', to: '/news' },
                { label: 'USSD Directory', to: '/ussd' },
              ].map((l) => (
                <Typography key={l.label} variant="body2" component={RouterLink} to={l.to}
                  sx={{ mb: 1, display: 'block', textDecoration: 'none', color: alpha('#fff', 0.75), '&:hover': { color: '#fff' } }}>
                  {l.label}
                </Typography>
              ))}
            </Grid>

            {/* Emergency contacts */}
            <Grid item xs={12} md={4}>
              <Typography variant="overline" sx={{ color: alpha('#fff', 0.5), display: 'block', mb: 1.5 }}>Emergency Contacts</Typography>
              <Stack spacing={1}>
                <Typography variant="body2" sx={{ color: alpha('#fff', 0.75) }}>Hotline: <Box component="span" sx={{ color: '#fff', fontWeight: 600 }}>+232 79 000 004</Box></Typography>
                <Typography variant="body2" sx={{ color: alpha('#fff', 0.75) }}>WhatsApp: <Box component="span" sx={{ color: '#fff', fontWeight: 600 }}>+232 79 000 004</Box></Typography>
                <Typography variant="body2" sx={{ color: alpha('#fff', 0.75) }}>Email: <Box component="span" sx={{ color: '#fff', fontWeight: 600 }}>complaints@natca.gov.sl</Box></Typography>
              </Stack>

              {/* App Download Badges */}
              <Typography variant="overline" sx={{ color: alpha('#fff', 0.5), display: 'block', mt: 3, mb: 1.5 }}>Download the App</Typography>
              <Stack direction="row" spacing={1.5} flexWrap="wrap">
                <Box component="a" href="#" sx={{
                  display: 'flex', alignItems: 'center', gap: 1.25,
                  px: 2, py: 1, borderRadius: 1.5, bgcolor: '#1a73e8', color: '#fff',
                  textDecoration: 'none', border: `1px solid ${alpha('#fff', 0.15)}`,
                  transition: 'opacity .15s ease', '&:hover': { opacity: 0.85 },
                }}>
                  <Box component="svg" viewBox="0 0 24 24" sx={{ width: 20, height: 20, fill: '#fff' }}>
                    <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-1.773l2.834 1.642a1 1 0 0 1 0 1.734l-2.834 1.642L14.9 12l2.798-3.066zM5.864 2.658L16.8 8.99l-2.302 2.302-8.634-8.634z" />
                  </Box>
                  <Box>
                    <Typography sx={{ fontSize: '0.55rem', lineHeight: 1, color: 'rgba(255,255,255,0.75)' }}>Get it on</Typography>
                    <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, lineHeight: 1.3 }}>Google Play</Typography>
                  </Box>
                </Box>
                <Box component="a" href="#" sx={{
                  display: 'flex', alignItems: 'center', gap: 1.25,
                  px: 2, py: 1, borderRadius: 1.5, bgcolor: alpha('#fff', 0.1), color: '#fff',
                  textDecoration: 'none', border: `1px solid ${alpha('#fff', 0.2)}`,
                  transition: 'opacity .15s ease', '&:hover': { opacity: 0.85 },
                }}>
                  <Box component="svg" viewBox="0 0 24 24" sx={{ width: 20, height: 20, fill: '#fff' }}>
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                  </Box>
                  <Box>
                    <Typography sx={{ fontSize: '0.55rem', lineHeight: 1, color: 'rgba(255,255,255,0.75)' }}>Download on</Typography>
                    <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, lineHeight: 1.3 }}>App Store</Typography>
                  </Box>
                </Box>
              </Stack>
            </Grid>
          </Grid>

          <Divider sx={{ my: 4, borderColor: alpha('#fff', 0.12) }} />

          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={2}>
            <Typography variant="caption" sx={{ color: alpha('#fff', 0.55) }}>
              © {new Date().getFullYear()} National Communication Authority (NatCA). All rights reserved.
            </Typography>
            <Stack direction="row" spacing={2.5} flexWrap="wrap">
              {['Privacy Policy', 'Accessibility', 'Terms of Use', 'Sitemap'].map((l) => (
                <Typography key={l} variant="caption" component="a" href="#"
                  sx={{ color: alpha('#fff', 0.45), textDecoration: 'none', '&:hover': { color: alpha('#fff', 0.8) } }}>
                  {l}
                </Typography>
              ))}
            </Stack>
          </Stack>
        </Container>
      </Box>

      {/* Interactive Article Reading Dialog */}
      <Dialog
        open={Boolean(selectedArticle)}
        onClose={() => setSelectedArticle(null)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', pb: 1 }}>
          <Stack spacing={1} sx={{ pr: 3 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Chip
                size="small"
                label={selectedArticle?.category || 'Announcement'}
                sx={{
                  fontWeight: 700,
                  bgcolor: alpha(TAG_COLORS[selectedArticle?.category] || BRAND.primary, 0.12),
                  color: TAG_COLORS[selectedArticle?.category] || BRAND.primary,
                  border: `1px solid ${alpha(TAG_COLORS[selectedArticle?.category] || BRAND.primary, 0.25)}`,
                }}
              />
              <Typography variant="caption" color="text.secondary">
                {selectedArticle?.published_at
                  ? new Date(selectedArticle.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
                  : 'Official NatCA Release'}
              </Typography>
            </Stack>
            <Typography variant="h5" fontWeight={700} sx={{ color: BRAND.navy, lineHeight: 1.3 }}>
              {selectedArticle?.title}
            </Typography>
          </Stack>
          <IconButton onClick={() => setSelectedArticle(null)} aria-label="Close article" size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: { xs: 2.5, sm: 4 } }}>
          <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.8, color: 'text.primary', fontSize: '1.02rem' }}>
            {selectedArticle?.body}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, px: 3, justifyContent: 'space-between' }}>
          <Button onClick={() => { setSelectedArticle(null); navigate('/news'); }} color="primary" startIcon={<ArticleIcon />}>
            View All News &amp; Notices
          </Button>
          <Button variant="contained" onClick={() => setSelectedArticle(null)} sx={{ px: 3, bgcolor: BRAND.primary }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Fraud Alert Popup */}
      <Dialog open={openFraudAlert} onClose={() => setOpenFraudAlert(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3, borderTop: `6px solid ${theme.palette.error.main}` } }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
          <ReportProblemIcon color="error" sx={{ fontSize: 32 }} />
          <Box>
            <Typography variant="h6" fontWeight={800} color="error.main">
              {fraudAlert?.title || 'FRAUD ALERT'}
            </Typography>
            <Typography variant="caption" color="text.secondary" fontWeight={700} textTransform="uppercase">
              {fraudAlert?.category || 'Public Awareness'}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 3 }}>
          {fraudAlert?.media_url && (
            <Box mb={3} sx={{ borderRadius: 2, overflow: 'hidden' }}>
              {fraudAlert.media_type === 'VIDEO' ? (
                <video src={fraudAlert.media_url} controls style={{ width: '100%', maxHeight: '300px', objectFit: 'cover' }} />
              ) : (
                <img src={fraudAlert.media_url} alt="Fraud Alert Media" style={{ width: '100%', maxHeight: '300px', objectFit: 'cover' }} />
              )}
            </Box>
          )}
          <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
            {fraudAlert?.body}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, px: 3, bgcolor: alpha(theme.palette.error.main, 0.04) }}>
          <Button variant="contained" color="error" onClick={() => setOpenFraudAlert(false)} sx={{ borderRadius: 2, px: 4, fontWeight: 700 }}>
            I Understand
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

/* ── Shared input style ──────────────────────────────────────────────── */
function inputSx(theme) {
  return {
    width: '100%', boxSizing: 'border-box', p: 1.5, borderRadius: 1.5, fontSize: '0.95rem',
    border: `1px solid ${BRAND.border}`, bgcolor: BRAND.paper, color: 'text.primary',
    fontFamily: 'inherit', outline: 'none', transition: 'border-color .18s ease, box-shadow .18s ease',
    '&::placeholder': { color: theme.palette.text.disabled },
    '&:focus': { borderColor: 'primary.main', boxShadow: `0 0 0 3px ${alpha(BRAND.primary, 0.12)}` },
  };
}
