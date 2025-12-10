// Configuração de rotas da aplicação
import './index.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Header from './components/common/Header';
import Login from './pages/Login';
import Register from './pages/Register';
import Overview from './pages/Overview';
import Athletes from './pages/Athletes';
import AthleteDetail from './pages/AthleteDetail';
import Opponents from './pages/Opponents';
import Compare from './pages/Compare';
import Strategy from './pages/Strategy';
import VideoAnalysis from './pages/VideoAnalysis';

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <Routes>
          {/* Rotas públicas */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* Rotas protegidas */}
          <Route
            path="/*"
            element={
              <PrivateRoute>
                <div className="min-h-screen bg-gray-100 px-4 sm:px-8 lg:px-12 xl:px-16 2xl:px-20">
                  <div className="mx-auto w-full max-w-[1500px]">
                    <Header />
                    <main className="pt-20 pb-12 sm:pt-24 sm:pb-14">
                      <Routes>
                        <Route path="/" element={<Overview />} />
                        <Route path="/athletes" element={<Athletes />} />
                        <Route path="/athletes/:id" element={<AthleteDetail />} />
                        <Route path="/opponents" element={<Opponents />} />
                        <Route path="/opponents/:id" element={<AthleteDetail isOpponent />} />
                        <Route path="/compare" element={<Compare />} />
                        <Route path="/strategy" element={<Strategy />} />
                        <Route path="/analyze-video" element={<VideoAnalysis />} />
                      </Routes>
                    </main>
                  </div>
                </div>
              </PrivateRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
