import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth }        from './auth/AuthContext.jsx';
import Layout             from './components/Layout.jsx';
import Login              from './pages/Login.jsx';
import Dashboard          from './pages/Dashboard.jsx';
import Complaints         from './pages/Complaints.jsx';
import ComplaintDetail     from './pages/ComplaintDetail.jsx';
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
          <Route index                    element={<Dashboard />} />
          <Route path="complaints"        element={<Complaints />} />
          <Route path="complaints/:id"    element={<ComplaintDetail />} />
          <Route path="*"                 element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
