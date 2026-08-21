import { useState, useCallback, useEffect } from 'react';
import {
  Box, Typography, Paper, CircularProgress, Chip, Stack,
  Grid, Card, CardContent, Divider, Dialog, DialogTitle, DialogContent, DialogActions, Button, IconButton, alpha
} from '@mui/material';
import ArticleIcon from '@mui/icons-material/Article';
import InfoIcon from '@mui/icons-material/Info';
import CloseIcon from '@mui/icons-material/Close';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { citizenService } from '../services/citizenService.js';
import { BRAND } from '../theme/theme.js';

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

const DEFAULT_FAQS = [
  { content_id: 'f1', title: 'How do I file a complaint with NatCA?', body: 'Register on this portal, navigate to "File a Complaint" and complete the form. You will receive a unique tracking reference number to follow your case in real time.' },
  { content_id: 'f2', title: 'How long does resolution take?', body: 'NatCA acknowledges all complaints within 7 working days and targets full resolution within 30 days. Complex billing disputes may take longer.' },
  { content_id: 'f3', title: 'Do I need to contact my operator first?', body: 'Yes — first report the issue to your operator. If they fail to resolve the problem within 7 working days, you can escalate formally to NatCA.' },
  { content_id: 'f4', title: 'What is KYC / SIM registration?', body: 'Know Your Customer (KYC) is a mandatory government process linking every SIM card to a verified national identity to prevent fraud.' },
  { content_id: 'f5', title: 'Is filing a complaint free?', body: 'Yes. Registering, filing complaints, and checking status is 100% free of charge for all citizens of Sierra Leone.' },
];

export default function News() {
  const [news, setNews] = useState([]);
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeArticle, setActiveArticle] = useState(null);

  const loadContent = useCallback(async () => {
    setLoading(true);
    try {
      const [nRes, fRes] = await Promise.allSettled([
        citizenService.getNews(),
        citizenService.getFaqs(),
      ]);

      if (nRes.status === 'fulfilled' && Array.isArray(nRes.value.data) && nRes.value.data.length > 0) {
        setNews(nRes.value.data);
      } else {
        setNews(DEFAULT_NEWS);
      }

      if (fRes.status === 'fulfilled' && Array.isArray(fRes.value.data) && fRes.value.data.length > 0) {
        setFaqs(fRes.value.data);
      } else {
        setFaqs(DEFAULT_FAQS);
      }
    } catch {
      setNews(DEFAULT_NEWS);
      setFaqs(DEFAULT_FAQS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadContent(); }, [loadContent]);

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', pt: 12 }}><CircularProgress /></Box>;
  }

  const displayNews = news.length > 0 ? news : DEFAULT_NEWS;
  const displayFaqs = faqs.length > 0 ? faqs : DEFAULT_FAQS;

  return (
    <Box sx={{ maxWidth: 1060, mx: 'auto', px: 2, py: 5 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={800} sx={{ color: BRAND.navy, mb: 1 }}>
          Newsroom &amp; Information
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Stay updated with official regulatory notices, consumer alerts, and frequently asked questions from NatCA.
        </Typography>
      </Box>

      <Grid container spacing={4}>
        {/* Latest News Column */}
        <Grid item xs={12} md={7}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2.5, gap: 1 }}>
            <ArticleIcon color="primary" />
            <Typography variant="h5" fontWeight={700} sx={{ color: BRAND.navy }}>Latest Announcements</Typography>
          </Box>
          <Stack spacing={2.5}>
            {displayNews.map((item) => (
              <Card
                key={item.content_id}
                onClick={() => setActiveArticle(item)}
                sx={{
                  border: `1px solid ${BRAND.border}`,
                  borderRadius: 2,
                  cursor: 'pointer',
                  transition: 'all .18s ease',
                  '&:hover': {
                    borderColor: alpha(BRAND.primary, 0.4),
                    boxShadow: '0 8px 24px rgba(13,44,84,0.08)',
                    transform: 'translateY(-2px)',
                  },
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
                    <Chip
                      size="small"
                      label={item.category || 'Announcement'}
                      sx={{
                        fontWeight: 700,
                        bgcolor: alpha(BRAND.primary, 0.1),
                        color: BRAND.primary,
                        border: `1px solid ${alpha(BRAND.primary, 0.25)}`,
                      }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      {item.published_at
                        ? new Date(item.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                        : 'Recent'}
                    </Typography>
                  </Stack>
                  <Typography variant="h6" fontWeight={700} sx={{ mb: 1.2, color: BRAND.navy, lineHeight: 1.35 }}>
                    {item.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    lineHeight: 1.6,
                  }}>
                    {item.body}
                  </Typography>
                  <Button
                    endIcon={<ArrowForwardIcon />}
                    onClick={(e) => { e.stopPropagation(); setActiveArticle(item); }}
                    sx={{ mt: 2, p: 0, fontWeight: 700, color: 'primary.main' }}
                  >
                    Read full notice
                  </Button>
                </CardContent>
              </Card>
            ))}
          </Stack>
        </Grid>

        {/* FAQs Column */}
        <Grid item xs={12} md={5}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2.5, gap: 1 }}>
            <InfoIcon sx={{ color: BRAND.gold }} />
            <Typography variant="h5" fontWeight={700} sx={{ color: BRAND.navy }}>Frequently Asked Questions</Typography>
          </Box>
          <Paper elevation={0} sx={{ border: `1px solid ${BRAND.border}`, borderRadius: 2, overflow: 'hidden' }}>
            <Stack divider={<Divider />}>
              {displayFaqs.map((item) => (
                <Box key={item.content_id} sx={{ p: 2.5 }}>
                  <Typography variant="subtitle2" fontWeight={700} sx={{ color: BRAND.navy, mb: 0.75 }}>
                    {item.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65 }}>
                    {item.body}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      {/* Article Detail Modal */}
      <Dialog
        open={Boolean(activeArticle)}
        onClose={() => setActiveArticle(null)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', pb: 1 }}>
          <Stack spacing={1} sx={{ pr: 3 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Chip
                size="small"
                label={activeArticle?.category || 'Announcement'}
                sx={{
                  fontWeight: 700,
                  bgcolor: alpha(BRAND.primary, 0.12),
                  color: BRAND.primary,
                  border: `1px solid ${alpha(BRAND.primary, 0.25)}`,
                }}
              />
              <Typography variant="caption" color="text.secondary">
                {activeArticle?.published_at
                  ? new Date(activeArticle.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
                  : 'Official Release'}
              </Typography>
            </Stack>
            <Typography variant="h5" fontWeight={700} sx={{ color: BRAND.navy, lineHeight: 1.3 }}>
              {activeArticle?.title}
            </Typography>
          </Stack>
          <IconButton onClick={() => setActiveArticle(null)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: { xs: 2.5, sm: 4 } }}>
          <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.8, color: 'text.primary', fontSize: '1.02rem' }}>
            {activeArticle?.body}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, px: 3 }}>
          <Button variant="contained" onClick={() => setActiveArticle(null)} sx={{ px: 3, bgcolor: BRAND.primary }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
