import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { useAuth } from './auth/AuthContext.jsx';
import Layout from './components/Layout.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import RoleRoute from './components/RoleRoute.jsx';
import PageSkeleton from './components/PageSkeleton.jsx';
import { ToastProvider } from './components/ToastContext.jsx';

// Route-level code splitting
const Login = lazy(() => import('./pages/Login.jsx'));
const ChangePassword = lazy(() => import('./pages/ChangePassword.jsx'));
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const Complaints = lazy(() => import('./pages/Complaints.jsx'));
const Operators = lazy(() => import('./pages/Operators.jsx'));
const Users = lazy(() => import('./pages/Users.jsx'));
const Kyc = lazy(() => import('./pages/Kyc.jsx'));
const Analytics = lazy(() => import('./pages/Analytics.jsx'));
const SpeedAnalytics = lazy(() => import('./pages/SpeedAnalytics.jsx'));
const DriveTest = lazy(() => import('./pages/DriveTest.jsx'));
const ContentManager = lazy(() => import('./pages/ContentManager.jsx'));
const Incidents = lazy(() => import('./pages/Incidents.jsx'));
const Ussd = lazy(() => import('./pages/Ussd.jsx'));
const SecurityCenter = lazy(() => import('./pages/SecurityCenter.jsx'));
const Feedback = lazy(() => import('./pages/Feedback.jsx'));
const SlaAlerts = lazy(() => import('./pages/SlaAlerts.jsx'));
const ComplianceReport = lazy(() => import('./pages/ComplianceReport.jsx'));
const MyQueue = lazy(() => import('./pages/MyQueue.jsx'));
const AlertSettings = lazy(() => import('./pages/AlertSettings.jsx'));
const AiAssistant = lazy(() => import('./pages/AiAssistant.jsx'));

function Protected({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (user.must_change_password && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  return children;
}

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <ErrorBoundary>
          <Suspense fallback={<PageSkeleton />}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route
                path="/change-password"
                element={
                  <Protected>
                    <ChangePassword />
                  </Protected>
                }
              />
              <Route
                path="/"
                element={
                  <Protected>
                    <Layout />
                  </Protected>
                }
              >
                <Route index element={<Dashboard />} />
                <Route path="complaints" element={<Complaints />} />
                <Route path="kyc" element={<Kyc />} />
                <Route path="analytics" element={<Analytics />} />
                <Route path="speed" element={<SpeedAnalytics />} />
                <Route path="drivetest" element={<DriveTest />} />
                <Route path="incidents" element={<Incidents />} />
                <Route path="content" element={<ContentManager />} />
                <Route
                  path="operators"
                  element={
                    <RoleRoute allowedRoles={['SYSTEM_ADMIN', 'NATCA_ADMIN']}>
                      <Operators />
                    </RoleRoute>
                  }
                />
                <Route
                  path="users"
                  element={
                    <RoleRoute allowedRoles={['SYSTEM_ADMIN', 'NATCA_ADMIN']}>
                      <Users />
                    </RoleRoute>
                  }
                />
                <Route path="ussd" element={<Ussd />} />
                <Route
                  path="security"
                  element={
                    <RoleRoute allowedRoles={['SYSTEM_ADMIN', 'NATCA_ADMIN']}>
                      <SecurityCenter />
                    </RoleRoute>
                  }
                />
                <Route path="feedback" element={<Feedback />} />
                <Route path="sla-alerts" element={<SlaAlerts />} />
                <Route path="compliance" element={<ComplianceReport />} />
                <Route
                  path="my-queue"
                  element={
                    <RoleRoute allowedRoles={['NATCA_ANALYST', 'INSPECTOR', 'NATCA_ADMIN', 'SYSTEM_ADMIN']}>
                      <MyQueue />
                    </RoleRoute>
                  }
                />
                <Route
                  path="alert-settings"
                  element={
                    <RoleRoute allowedRoles={['SYSTEM_ADMIN', 'NATCA_ADMIN']}>
                      <AlertSettings />
                    </RoleRoute>
                  }
                />
                <Route
                  path="assistant"
                  element={
                    <RoleRoute allowedRoles={['SYSTEM_ADMIN', 'NATCA_ADMIN', 'NATCA_ANALYST', 'INSPECTOR']}>
                      <AiAssistant />
                    </RoleRoute>
                  }
                />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </BrowserRouter>
    </ToastProvider>
  );
}
