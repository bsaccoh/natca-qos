import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './auth/AuthContext.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import PageSkeleton from './components/PageSkeleton.jsx';
import PortalLayout from './components/PortalLayout.jsx';

const LandingPage     = lazy(() => import('./pages/LandingPage.jsx'));
const Login           = lazy(() => import('./pages/Login.jsx'));
const Register        = lazy(() => import('./pages/Register.jsx'));
const SubmitComplaint = lazy(() => import('./pages/SubmitComplaint.jsx'));
const TrackComplaint  = lazy(() => import('./pages/TrackComplaint.jsx'));
const MyComplaints    = lazy(() => import('./pages/MyComplaints.jsx'));
const KycSubmit       = lazy(() => import('./pages/KycSubmit.jsx'));
const KycStatus       = lazy(() => import('./pages/KycStatus.jsx'));
const SpeedTest       = lazy(() => import('./pages/SpeedTest.jsx'));
const News            = lazy(() => import('./pages/News.jsx'));
const UssdDirectory   = lazy(() => import('./pages/UssdDirectory.jsx'));

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <PageSkeleton />;
  if (!user) return <Navigate to="/login" replace state={{ from: window.location.pathname }} />;
  return children;
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Suspense fallback={<PageSkeleton />}>
          <Routes>
            {/* Public landing page */}
            <Route path="/" element={<LandingPage />} />

            {/* Auth pages */}
            <Route path="/login"    element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Public portal pages */}
            <Route path="/track" element={<PortalLayout><TrackComplaint /></PortalLayout>} />
            <Route path="/news"  element={<PortalLayout><News /></PortalLayout>} />
            <Route path="/ussd"  element={<PortalLayout><UssdDirectory /></PortalLayout>} />

            {/* Intake & KYC pages */}
            <Route path="/submit"     element={<PortalLayout><SubmitComplaint /></PortalLayout>} />
            <Route path="/kyc"        element={<PortalLayout><KycSubmit /></PortalLayout>} />
            <Route path="/kyc/status" element={<PortalLayout><KycStatus /></PortalLayout>} />

            {/* Protected authenticated pages */}
            <Route path="/my-complaints" element={
              <Protected><PortalLayout><MyComplaints /></PortalLayout></Protected>
            } />
            <Route path="/speed-test" element={
              <Protected><PortalLayout><SpeedTest /></PortalLayout></Protected>
            } />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
