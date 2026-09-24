import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import PageLoader from '../common/PageLoader';

export default function ProtectedRoute({ children, requireAdmin = false, allowPasswordChangePending = false }) {
  const { user, isAdmin, loading } = useAuth();
  const location = useLocation();

  // Aguardar hidratação do contexto para evitar flash de redirect
  if (loading) return <PageLoader />;

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Senha temporária pendente de troca (spec 014, R10): bloqueia toda rota
  // protegida até o usuário trocar a senha, exceto a própria /trocar-senha
  // — que se identifica passando `allowPasswordChangePending`.
  if (user.mustChangePassword && location.pathname !== '/trocar-senha' && !allowPasswordChangePending) {
    return <Navigate to="/trocar-senha" replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
}

