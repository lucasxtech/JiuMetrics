// Configuração de rotas da aplicação
import './index.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import MainLayout from './layouts/MainLayout';
import { Toaster } from './components/ui/sonner';
import Login from './pages/Login';
import Overview from './pages/Overview';
import Athletes from './pages/Athletes';
import AthleteDetail from './pages/AthleteDetail';
import Opponents from './pages/Opponents';
import Compare from './pages/Compare';
import Strategy from './pages/Strategy';
import VideoAnalysis from './pages/VideoAnalysis';

function AuthRedirect({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <Toaster position="top-right" />
        <Routes>
          {/* Rotas públicas */}
          <Route path="/login" element={<AuthRedirect><Login /></AuthRedirect>} />
          
          {/* Rotas protegidas */}
          <Route
            path="/*"
            element={
              <PrivateRoute>
                <MainLayout>
                  <Routes>
                    <Route path="/" element={<Overview />} />
                    <Route path="/athletes" element={<Athletes />} />
                    <Route path="/athletes/:id" element={<AthleteDetail />} />
                    <Route path="/opponents" element={<Opponents />} />
                    <Route path="/opponents/:id" element={<AthleteDetail isOpponent />} />
                    <Route path="/compare" element={<Compare />} />
                    <Route path="/strategy" element={<Strategy />} />
                    <Route path="/video-analysis" element={<VideoAnalysis />} />
                  </Routes>
                </MainLayout>
              </PrivateRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
