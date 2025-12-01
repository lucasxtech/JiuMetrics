// Configuração de rotas da aplicação
import './index.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Header from './components/common/Header';
import Dashboard from './pages/Dashboard';
import Athletes from './pages/Athletes';
import AthleteDetail from './pages/AthleteDetail';
import Opponents from './pages/Opponents';
import Compare from './pages/Compare';
import Strategy from './pages/Strategy';
import VideoAnalysis from './pages/VideoAnalysis';

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-100">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/athletes" element={<Athletes />} />
            <Route path="/athletes/:id" element={<AthleteDetail />} />
            <Route path="/opponents" element={<Opponents />} />
            <Route path="/compare" element={<Compare />} />
            <Route path="/strategy" element={<Strategy />} />
            <Route path="/analyze-video" element={<VideoAnalysis />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
