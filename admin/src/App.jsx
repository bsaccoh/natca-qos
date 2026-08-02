import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth }        from './auth/AuthContext.jsx';
import Layout             from './components/Layout.jsx';
import Login              from './pages/Login.jsx';
import Dashboard          from './pages/Dashboard.jsx';
import Complaints         from './pages/Complaints.jsx';
import Operators          from './pages/Operators.jsx';
import Users              from './pages/Users.jsx';
import Kyc                from './pages/Kyc.jsx';
import Analytics          from './pages/Analytics.jsx';
import SpeedAnalytics     from './pages/SpeedAnalytics.jsx';
import ContentManager     from './pages/ContentManager.jsx';
import Incidents          from './pages/Incidents.jsx';
import UssdManager        from './pages/UssdManager.jsx';
import SecurityCenter     from './pages/SecurityCenter.jsx';
import { Box, CircularProgress } from '@mui/material';

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', pt: 12 }}><CircularProgress /></Box>;
  if (!user)   return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Protected><Layout /></Protected>}>
          <Route index                element={<Dashboard />} />
          <Route path="complaints"    element={<Complaints />} />
          <Route path="kyc"           element={<Kyc />} />
          <Route path="analytics"     element={<Analytics />} />
          <Route path="speed"         element={<SpeedAnalytics />} />
          <Route path="incidents"     element={<Incidents />} />
          <Route path="content"       element={<ContentManager />} />
          <Route path="operators"     element={<Operators />} />
          <Route path="users"         element={<Users />} />
          <Route path="ussd"          element={<UssdManager />} />
          <Route path="security"     element={<SecurityCenter />} />
          <Route path="*"             element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
