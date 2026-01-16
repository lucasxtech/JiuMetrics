// Configuração de rotas da aplicação
import './index.css';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import ProtectedRoute from './components/routing/ProtectedRoute';
import Header from './components/common/Header';
import Overview from './pages/Overview';
import Athletes from './pages/Athletes';
import AthleteDetail from './pages/AthleteDetail';
import Opponents from './pages/Opponents';
import Strategy from './pages/Strategy';
import VideoAnalysis from './pages/VideoAnalysis';
import Analyses from './pages/Analyses';
import ModernLogin from './pages/ModernLogin';
import Register from './pages/Register';
import Settings from './pages/Settings';
import initializeAuth from './utils/initAuth';

function AppContent() {
  const location = useLocation();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';
  
  // Inicializar autenticação quando o app carrega
  useEffect(() => {
    initializeAuth();
  }, []);

  return (
    <div className={isAuthPage ? '' : 'min-h-screen bg-gray-100'}>
      {!isAuthPage && <Header />}
      <main className={isAuthPage ? '' : 'pt-6 pb-8'}>
        <div className={isAuthPage ? '' : 'mx-auto w-full max-w-[1500px] px-4'}>
          <Routes>
            <Route path="/login" element={<ModernLogin />} />
            <Route path="/register" element={<Register />} />
            <Route path="/" element={<ProtectedRoute><Overview /></ProtectedRoute>} />
            <Route path="/athletes" element={<ProtectedRoute><Athletes /></ProtectedRoute>} />
            <Route path="/athletes/:id" element={<ProtectedRoute><AthleteDetail /></ProtectedRoute>} />
            <Route path="/opponents" element={<ProtectedRoute><Opponents /></ProtectedRoute>} />
            <Route path="/opponents/:id" element={<ProtectedRoute><AthleteDetail isOpponent /></ProtectedRoute>} />
            <Route path="/strategy" element={<ProtectedRoute><Strategy /></ProtectedRoute>} />
            <Route path="/analyze-video" element={<ProtectedRoute><VideoAnalysis /></ProtectedRoute>} />
            <Route path="/analyses" element={<ProtectedRoute><Analyses /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="*" element={<ProtectedRoute><Overview /></ProtectedRoute>} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  // Usa /JiuMetrics em produção (GitHub Pages) e / em desenvolvimento
  const basename = import.meta.env.MODE === 'production' ? '/JiuMetrics' : '';
  
  return (
    <BrowserRouter basename={basename} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AppContent />
    </BrowserRouter>
  );
}
