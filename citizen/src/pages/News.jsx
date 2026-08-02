import { useState, useCallback, useEffect } from 'react';
import {
  Box, Typography, Paper, CircularProgress, Chip, Stack,
  Grid, Card, CardContent, Divider
} from '@mui/material';
import ArticleIcon from '@mui/icons-material/Article';
import InfoIcon from '@mui/icons-material/Info';
import { get } from '../api/client.js';

export default function News() {
  const [news, setNews] = useState([]);
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadContent = useCallback(async () => {
    setLoading(true);
    try {
      const [nRes, fRes] = await Promise.all([
        get('/content?type=NEWS'),
        get('/content?type=FAQ')
      ]);
      setNews(nRes.data.rows);
      setFaqs(fRes.data.rows);
    } catch (e) { console.error('Failed to load content', e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadContent(); }, [loadContent]);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', pt: 12 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto', px: 2, py: 4 }}>
      <Typography variant="h4" fontWeight={700} mb={1}>News & Information</Typography>
      <Typography variant="body1" color="text.secondary" mb={4}>
        Stay updated with the latest announcements and frequently asked questions from NatCA.
      </Typography>

      <Grid container spacing={4}>
        <Grid item xs={12} md={7}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 1 }}>
            <ArticleIcon color="primary" />
            <Typography variant="h5" fontWeight={600}>Latest News</Typography>
          </Box>
          <Stack spacing={3}>
            {news.map(item => (
              <Card key={item.content_id} elevation={0} sx={{ border: 1, borderColor: 'divider' }}>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" mb={1}>
                    <Chip size="small" label={item.category || 'Announcement'} color="primary" variant="outlined" />
                    <Typography variant="caption" color="text.secondary">
                      {new Date(item.published_at).toLocaleDateString()}
                    </Typography>
                  </Stack>
                  <Typography variant="h6" fontWeight={600} mb={2}>{item.title}</Typography>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{item.body}</Typography>
                </CardContent>
              </Card>
            ))}
            {news.length === 0 && (
              <Paper sx={{ p: 4, textAlign: 'center', bgcolor: 'transparent', border: '1px dashed grey' }}>
                <Typography color="text.secondary">No news available at this time.</Typography>
              </Paper>
            )}
          </Stack>
        </Grid>

        <Grid item xs={12} md={5}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 1 }}>
            <InfoIcon color="secondary" />
            <Typography variant="h5" fontWeight={600}>Frequently Asked Questions</Typography>
          </Box>
          <Paper elevation={0} sx={{ border: 1, borderColor: 'divider' }}>
            <Stack divider={<Divider />}>
              {faqs.map(item => (
                <Box key={item.content_id} sx={{ p: 2 }}>
                  <Typography variant="subtitle1" fontWeight={600} mb={1}>{item.title}</Typography>
                  <Typography variant="body2" color="text.secondary">{item.body}</Typography>
                </Box>
              ))}
              {faqs.length === 0 && (
                <Box sx={{ p: 4, textAlign: 'center' }}>
                  <Typography color="text.secondary">No FAQs available.</Typography>
                </Box>
              )}
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
