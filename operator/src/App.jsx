import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './auth/AuthContext.jsx';
import Layout from './components/Layout.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import PageSkeleton from './components/PageSkeleton.jsx';
import { ToastProvider } from './components/ToastContext.jsx';
import { Box, CircularProgress } from '@mui/material';

const Login          = lazy(() => import('./pages/Login.jsx'));
const ChangePassword = lazy(() => import('./pages/ChangePassword.jsx'));
const Dashboard      = lazy(() => import('./pages/Dashboard.jsx'));
const Complaints     = lazy(() => import('./pages/Complaints.jsx'));
const ComplaintDetail = lazy(() => import('./pages/ComplaintDetail.jsx'));
const Incidents      = lazy(() => import('./pages/Incidents.jsx'));
const Kyc            = lazy(() => import('./pages/Kyc.jsx'));
const Profile        = lazy(() => import('./pages/Profile.jsx'));

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
    <ErrorBoundary>
      <ToastProvider>
        <BrowserRouter>
          <Suspense fallback={<PageSkeleton />}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/change-password" element={<Protected><ChangePassword /></Protected>} />
              <Route path="/" element={<Protected><Layout /></Protected>}>
                <Route index                    element={<Dashboard />} />
                <Route path="complaints"        element={<Complaints />} />
                <Route path="complaints/:id"    element={<ComplaintDetail />} />
                <Route path="incidents"         element={<Incidents />} />
                <Route path="kyc"               element={<Kyc />} />
                <Route path="profile"           element={<Profile />} />
                <Route path="*"                 element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </Suspense>
        </BrowserRouter>
      </ToastProvider>
    </ErrorBoundary>
  );
}
