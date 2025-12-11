// Configuração de rotas da aplicação
import './index.css';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Header from './components/common/Header';
import Overview from './pages/Overview';
import Athletes from './pages/Athletes';
import AthleteDetail from './pages/AthleteDetail';
import Opponents from './pages/Opponents';
import Compare from './pages/Compare';
import Strategy from './pages/Strategy';
import VideoAnalysis from './pages/VideoAnalysis';
import ModernLogin from './pages/ModernLogin';
import Register from './pages/Register';
import Settings from './pages/Settings';

function AppContent() {
  const location = useLocation();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

  return (
    <div className={isAuthPage ? '' : 'min-h-screen bg-gray-100 px-4 sm:px-8 lg:px-12 xl:px-16 2xl:px-20'}>
      {!isAuthPage && (
        <div className="mx-auto w-full max-w-[1500px]">
          <Header />
        </div>
      )}
      <main className={isAuthPage ? '' : 'pt-20 pb-12 sm:pt-24 sm:pb-14'}>
        <div className={isAuthPage ? '' : 'mx-auto w-full max-w-[1500px]'}>
          <Routes>
            <Route path="/login" element={<ModernLogin />} />
            <Route path="/register" element={<Register />} />
            <Route path="/" element={<ProtectedRoute><Overview /></ProtectedRoute>} />
            <Route path="/athletes" element={<ProtectedRoute><Athletes /></ProtectedRoute>} />
            <Route path="/athletes/:id" element={<ProtectedRoute><AthleteDetail /></ProtectedRoute>} />
            <Route path="/opponents" element={<ProtectedRoute><Opponents /></ProtectedRoute>} />
            <Route path="/opponents/:id" element={<ProtectedRoute><AthleteDetail isOpponent /></ProtectedRoute>} />
            <Route path="/compare" element={<ProtectedRoute><Compare /></ProtectedRoute>} />
            <Route path="/strategy" element={<ProtectedRoute><Strategy /></ProtectedRoute>} />
            <Route path="/analyze-video" element={<ProtectedRoute><VideoAnalysis /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AppContent />
    </BrowserRouter>
  );
}
