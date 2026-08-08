import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth }        from './auth/AuthContext.jsx';
import Layout             from './components/Layout.jsx';
import Login              from './pages/Login.jsx';
import ChangePassword     from './pages/ChangePassword.jsx';
import Dashboard          from './pages/Dashboard.jsx';
import Complaints         from './pages/Complaints.jsx';
import ComplaintDetail     from './pages/ComplaintDetail.jsx';
import Kyc                from './pages/Kyc.jsx';
import Profile            from './pages/Profile.jsx';
import { ToastProvider }  from './components/ToastContext.jsx';
import { Box, CircularProgress } from '@mui/material';

function Protected({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', pt: 12 }}><CircularProgress /></Box>;
  if (!user)   return <Navigate to="/login" replace />;
  if (user.must_change_password && location.pathname !== '/change-password')
    return <Navigate to="/change-password" replace />;
  return children;
}

export default function App() {
  return (
    <ToastProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/change-password" element={<Protected><ChangePassword /></Protected>} />
        <Route path="/" element={<Protected><Layout /></Protected>}>
          <Route index                    element={<Dashboard />} />
          <Route path="complaints"        element={<Complaints />} />
          <Route path="complaints/:id"    element={<ComplaintDetail />} />
          <Route path="kyc"               element={<Kyc />} />
          <Route path="profile"           element={<Profile />} />
          <Route path="*"                 element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
    </ToastProvider>
  );
}
