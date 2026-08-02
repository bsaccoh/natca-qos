import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth }         from './auth/AuthContext.jsx';
import { Box, CircularProgress } from '@mui/material';
import LandingPage         from './pages/LandingPage.jsx';
import Login               from './pages/Login.jsx';
import Register            from './pages/Register.jsx';
import PortalLayout        from './components/PortalLayout.jsx';
import SubmitComplaint     from './pages/SubmitComplaint.jsx';
import TrackComplaint      from './pages/TrackComplaint.jsx';
import MyComplaints        from './pages/MyComplaints.jsx';
import KycSubmit           from './pages/KycSubmit.jsx';
import SpeedTest           from './pages/SpeedTest.jsx';
import News               from './pages/News.jsx';
import UssdDirectory      from './pages/UssdDirectory.jsx';

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <CircularProgress />
    </Box>
  );
  if (!user) return <Navigate to="/login" replace state={{ from: window.location.pathname }} />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public landing page */}
        <Route path="/" element={<LandingPage />} />

        {/* Auth pages — standalone, no portal layout */}
        <Route path="/login"    element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Track and news are public */}
        <Route path="/track" element={<PortalLayout><TrackComplaint /></PortalLayout>} />
        <Route path="/news"  element={<PortalLayout><News /></PortalLayout>} />
        <Route path="/ussd"  element={<PortalLayout><UssdDirectory /></PortalLayout>} />

        {/* Protected portal pages */}
        <Route path="/submit" element={
          <Protected><PortalLayout><SubmitComplaint /></PortalLayout></Protected>
        } />
        <Route path="/my-complaints" element={
          <Protected><PortalLayout><MyComplaints /></PortalLayout></Protected>
        } />
        <Route path="/kyc" element={
          <Protected><PortalLayout><KycSubmit /></PortalLayout></Protected>
        } />
        <Route path="/speed-test" element={
          <Protected><PortalLayout><SpeedTest /></PortalLayout></Protected>
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
