import { useNavigate } from 'react-router-dom';
import {
  Box, Button, Container, Grid, Paper, Stack, Typography, useTheme, alpha
} from '@mui/material';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import SearchIcon        from '@mui/icons-material/Search';
import ListAltIcon       from '@mui/icons-material/ListAlt';
import CellTowerIcon     from '@mui/icons-material/CellTower';
import SpeedIcon         from '@mui/icons-material/Speed';
import ArticleIcon       from '@mui/icons-material/Article';
import { useAuth } from '../auth/AuthContext.jsx';

function ActionCard({ icon, title, desc, btn, onClick, primary }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  
  return (
    <Paper sx={{ 
      p: 4, 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column', 
      gap: 2.5,
      position: 'relative',
      overflow: 'hidden',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      cursor: 'pointer',
      '&:hover': {
        transform: 'translateY(-6px)',
        boxShadow: primary 
          ? `0 20px 40px ${alpha(theme.palette.primary.main, 0.3)}`
          : (isDark ? '0 20px 40px rgba(0,0,0,0.4)' : '0 20px 40px rgba(0,0,0,0.08)'),
        borderColor: alpha(theme.palette.primary.main, 0.4),
        '& .icon-wrapper': {
          transform: 'scale(1.1)',
          background: primary 
            ? `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`
            : alpha(theme.palette.primary.main, 0.15),
          color: primary ? '#fff' : theme.palette.primary.main,
        }
      }
    }} onClick={onClick}>
      <Box className="icon-wrapper" sx={{
        width: 64, height: 64, borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: isDark ? alpha(theme.palette.primary.main, 0.1) : alpha(theme.palette.primary.main, 0.05),
        color: 'primary.main', '& svg': { fontSize: 32 },
        transition: 'all 0.3s ease',
      }}>
        {icon}
      </Box>
      <Box sx={{ flex: 1 }}>
        <Typography variant="h5" sx={{ mb: 1, fontWeight: 700 }}>{title}</Typography>
        <Typography variant="body1" color="text.secondary">{desc}</Typography>
      </Box>
      <Button variant={primary ? 'contained' : 'outlined'} size="large" fullWidth sx={{ mt: 'auto', pointerEvents: 'none' }}>
        {btn}
      </Button>
    </Paper>
  );
}

export default function Home() {
  const navigate  = useNavigate();
  const { user }  = useAuth();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', position: 'relative', overflow: 'hidden' }}>
      
      {/* Animated Background Spheres */}
      <Box sx={{ 
        position: 'absolute', top: '-10%', left: '-10%', width: '40vw', height: '40vw', 
        background: `radial-gradient(circle, ${alpha(theme.palette.primary.main, 0.15)} 0%, transparent 70%)`,
        filter: 'blur(60px)', zIndex: 0, pointerEvents: 'none',
        animation: 'float 10s ease-in-out infinite'
      }} />
      <Box sx={{ 
        position: 'absolute', top: '20%', right: '-5%', width: '35vw', height: '35vw', 
        background: `radial-gradient(circle, ${alpha(theme.palette.secondary.main, 0.1)} 0%, transparent 70%)`,
        filter: 'blur(60px)', zIndex: 0, pointerEvents: 'none',
        animation: 'float 12s ease-in-out infinite reverse'
      }} />

      <style>
        {`
          @keyframes float {
            0% { transform: translate(0px, 0px) scale(1); }
            33% { transform: translate(30px, -50px) scale(1.1); }
            66% { transform: translate(-20px, 20px) scale(0.9); }
            100% { transform: translate(0px, 0px) scale(1); }
          }
        `}
      </style>

      {/* Hero */}
      <Box sx={{ position: 'relative', zIndex: 1, pt: { xs: 8, md: 12 }, pb: { xs: 8, md: 10 } }}>
        <Container maxWidth="md" sx={{ textAlign: 'center' }}>
          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, px: 2, py: 1, borderRadius: '30px', 
                     bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', 
                     border: '1px solid', borderColor: 'divider', mb: 4 }}>
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'success.main', boxShadow: `0 0 10px ${theme.palette.success.main}` }} />
            <Typography variant="caption" fontWeight={600} letterSpacing="0.05em" textTransform="uppercase">
              National Communication Authority
            </Typography>
          </Box>
          
          <Typography variant="h1" sx={{ mb: 2, background: isDark ? 'linear-gradient(180deg, #fff 0%, #a1a1aa 100%)' : 'linear-gradient(180deg, #09090b 0%, #52525b 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Empowering Citizens with Better Telecom Services
          </Typography>
          
          <Typography variant="body1" color="text.secondary" sx={{ mb: 5, fontSize: '1.25rem', maxWidth: 600, mx: 'auto', lineHeight: 1.6 }}>
            Submit, track, and manage your telecom service complaints directly with NatCA. We ensure your voice is heard and issues are resolved.
          </Typography>
          
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
            <Button variant="contained" size="large" onClick={() => navigate('/submit')}
                    sx={{ px: 4, py: 1.5, fontSize: '1.1rem', borderRadius: 8, boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.4)}` }}>
              Submit a Complaint
            </Button>
            <Button variant="outlined" size="large" onClick={() => navigate('/track')}
                    sx={{ px: 4, py: 1.5, fontSize: '1.1rem', borderRadius: 8, bgcolor: 'background.paper', backdropFilter: 'blur(10px)' }}>
              Track a Complaint
            </Button>
          </Stack>
        </Container>
      </Box>

      {/* Action cards */}
      <Container maxWidth="lg" sx={{ py: 6, position: 'relative', zIndex: 1 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={4}>
            <ActionCard
              icon={<ReportProblemIcon />}
              title="File a Complaint"
              desc="Report network issues, billing problems, or service quality concerns with your telecom operator."
              btn="Submit Now"
              onClick={() => navigate('/submit')}
              primary
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <ActionCard
              icon={<SearchIcon />}
              title="Track Status"
              desc="Enter your complaint reference number to see the current status and updates from NatCA."
              btn="Track Case"
              onClick={() => navigate('/track')}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <ActionCard
              icon={<CellTowerIcon />}
              title="SIM Registration"
              desc="Register your SIM card with NatCA and verify your identity to comply with national regulations."
              btn="Verify KYC"
              onClick={() => navigate('/kyc')}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <ActionCard
              icon={<SpeedIcon />}
              title="Run Speed Test"
              desc="Test your current network speed and submit the results to help NatCA monitor operator QoS."
              btn="Start Test"
              onClick={() => navigate('/speed')}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <ActionCard
              icon={<ArticleIcon />}
              title="News & Updates"
              desc="Stay informed with the latest announcements, FAQs, and USSD codes from your operators."
              btn="Read News"
              onClick={() => navigate('/news')}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <ActionCard
              icon={<ListAltIcon />}
              title={user ? 'My Dashboard' : 'Citizen Account'}
              desc={user
                ? 'Access your unified dashboard to manage all your submitted complaints and KYC records.'
                : 'Register an account to securely manage all your telecom complaints in one place.'}
              btn={user ? 'Go to Dashboard' : 'Sign Up'}
              onClick={() => navigate(user ? '/my-complaints' : '/register')}
            />
          </Grid>
        </Grid>

        {/* Info strip */}
        <Paper sx={{ mt: 8, p: { xs: 4, md: 6 }, borderRadius: 6, background: isDark ? 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)' : 'linear-gradient(135deg, rgba(0,0,0,0.02) 0%, transparent 100%)', border: '1px solid', borderColor: 'divider' }}>
          <Grid container spacing={4} alignItems="center">
            {[
              { label: 'Initial Response', value: '7 Days', unit: 'SLA Guarantee' },
              { label: 'Resolution Target', value: '30 Days', unit: 'Maximum processing time' },
              { label: 'Service Cost', value: 'Free', unit: 'No fees to file a complaint' },
            ].map((s) => (
              <Grid item xs={12} sm={4} key={s.label} sx={{ textAlign: 'center' }}>
                <Typography variant="h3" color="primary.main" fontWeight={800} sx={{ mb: 1 }}>{s.value}</Typography>
                <Typography variant="subtitle1" fontWeight={700} color="text.primary">{s.label}</Typography>
                <Typography variant="body2" color="text.secondary">{s.unit}</Typography>
              </Grid>
            ))}
          </Grid>
        </Paper>
      </Container>
    </Box>
  );
}
