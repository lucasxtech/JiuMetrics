// Configuração de rotas da aplicação
import './index.css';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect, lazy, Suspense } from 'react';
import ProtectedRoute from './components/routing/ProtectedRoute';
import Header from './components/common/Header';
import PageLoader from './components/common/PageLoader';
import initializeAuth from './utils/initAuth';

// ✅ Páginas de autenticação: Carregamento NORMAL (precisam ser rápidas)
import ModernLogin from './pages/ModernLogin';
import Register from './pages/Register';

// ✅ Páginas protegidas: LAZY LOADING (só carrega quando acessar)
// Isso reduz o bundle inicial em ~70% e acelera o primeiro carregamento
const Overview = lazy(() => import('./pages/Overview'));
const Athletes = lazy(() => import('./pages/Athletes'));
const AthleteDetail = lazy(() => import('./pages/AthleteDetail'));
const Opponents = lazy(() => import('./pages/Opponents'));
const Strategy = lazy(() => import('./pages/Strategy'));
const VideoAnalysis = lazy(() => import('./pages/VideoAnalysis'));
const Analyses = lazy(() => import('./pages/Analyses'));
const Settings = lazy(() => import('./pages/Settings'));

// ✅ Preload agressivo das páginas mais usadas (após login)
// Carrega em background sem bloquear navegação
if (typeof window !== 'undefined') {
  // Esperar um pouco após login para precarregar
  setTimeout(() => {
    import('./pages/Athletes');
    import('./pages/Opponents');
    import('./pages/Analyses');
  }, 2000);
}

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
          {/* ✅ Suspense: Mostra PageLoader enquanto carrega componentes lazy */}
          <Suspense fallback={<PageLoader />}>
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
          </Suspense>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  // GitHub Pages usa /JiuMetrics como base
  // Vercel e desenvolvimento local usam / (raiz)
  const isGitHubPages = window.location.hostname.includes('github.io');
  const basename = isGitHubPages ? '/JiuMetrics' : '';
  
  return (
    <BrowserRouter basename={basename} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AppContent />
    </BrowserRouter>
  );
}
