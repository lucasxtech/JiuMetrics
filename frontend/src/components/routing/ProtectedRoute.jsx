import { Navigate, useLocation } from 'react-router-dom';
import { isAdmin } from '../../services/authService';

export default function ProtectedRoute({ children, requireAdmin = false }) {
  const token = localStorage.getItem('jiumetrics_token');
  const location = useLocation();
  
  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireAdmin && !isAdmin()) {
    return <Navigate to="/" replace />;
  }
  
  return children;
}
