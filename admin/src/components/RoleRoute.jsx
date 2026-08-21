import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { useToast } from './ToastContext.jsx';
import { useEffect } from 'react';

export default function RoleRoute({ allowedRoles, children }) {
  const { user } = useAuth();
  const { showToast } = useToast();

  const isAllowed = !allowedRoles || allowedRoles.length === 0 || (user && allowedRoles.includes(user.role));

  useEffect(() => {
    if (!isAllowed) {
      showToast('You do not have permission to access that resource.', 'warning');
    }
  }, [isAllowed, showToast]);

  if (!isAllowed) {
    return <Navigate to="/" replace />;
  }

  return children;
}
