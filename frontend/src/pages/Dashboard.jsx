// Página Dashboard - Visão geral da aplicação - Design Moderno
import { useState } from 'react';
import { Link } from 'react-router-dom';
import StatsRadarChart from '../components/charts/StatsRadarChart';
import StatsBarChart from '../components/charts/StatsBarChart';
import StatsLineChart from '../components/charts/StatsLineChart';

export default function Dashboard() {
  const [selectedAthlete] = useState({
    name: 'João Silva',
    cardio: 85,
  });

  // Dados exemplo para o radar do atleta
  const athleteRadarData = [
    { name: 'Condicionamento', value: 85 },
    { name: 'Técnica', value: 75 },
    { name: 'Agressividade', value: 70 },
    { name: 'Defesa', value: 80 },
    { name: 'Movimentação', value: 75 },
  ];

  // Dados exemplo para o gráfico de ataques
  const attacksData = [
    { name: 'Raspagem', value: 28 },
    { name: 'Armlock', value: 22 },
    { name: 'Estrangulação', value: 18 },
    { name: 'Queda', value: 15 },
    { name: 'Passagem', value: 12 },
  ];

  // Dados exemplo para evolução
  const evolutionData = [
    { date: 'Jan', value: 45 },
    { date: 'Fev', value: 52 },
    { date: 'Mar', value: 48 },
    { date: 'Abr', value: 65 },
    { date: 'Mai', value: 72 },
    { date: 'Jun', value: 78 },
  ];

  return (
    <div className="space-y-8 animate-fadeIn max-w-7xl mx-auto px-6">
      {/* Hero Section */}
      <div className="card-modern overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 px-6 py-8 md:px-10 md:py-12 text-white relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-24 -mb-24"></div>
          <div className="relative z-10 text-center">
            <h1 className="text-3xl md:text-4xl font-extrabold mb-2 flex items-center justify-center gap-3">
              <span className="text-3xl md:text-4xl">🥋</span>
              Análise Tática de Jiu-Jitsu
            </h1>
            <p className="text-base md:text-lg text-white/90 max-w-2xl mx-auto">
              Gerencie atletas, analise adversários e desenvolva estratégias personalizadas com IA
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards Modernos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Atletas */}
        <div className="stat-card border-l-4 border-indigo-500 group hover:shadow-2xl transition-all">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">Total de Atletas</p>
              <p className="text-5xl font-black text-gray-900 mb-1">12</p>
              <Link to="/athletes" className="text-sm text-indigo-600 font-semibold hover:underline">Ver todos →</Link>
            </div>
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg className="w-8 h-8 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Adversários */}
        <div className="stat-card border-l-4 border-orange-500 group hover:shadow-2xl transition-all">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">Total de Adversários</p>
              <p className="text-5xl font-black text-gray-900 mb-1">8</p>
              <Link to="/opponents" className="text-sm text-orange-600 font-semibold hover:underline">Ver todos →</Link>
            </div>
            <div className="w-16 h-16 bg-gradient-to-br from-orange-100 to-red-100 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg className="w-8 h-8 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v2h8v-2zM2 8a2 2 0 11-4 0 2 2 0 014 0zM8 15a4 4 0 00-8 0v2h8v-2z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Lutas */}
        <div className="stat-card border-l-4 border-blue-500 group hover:shadow-2xl transition-all">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">Lutas Analisadas</p>
              <p className="text-5xl font-black text-gray-900 mb-1">24</p>
              <Link to="/analyze-video" className="text-sm text-blue-600 font-semibold hover:underline">Analisar nova →</Link>
            </div>
            <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Gráficos Modernos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card-modern p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
            Perfil de {selectedAthlete.name}
          </h3>
          <StatsRadarChart data={athleteRadarData} />
        </div>
        <div className="card-modern p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
            Ataques Mais Utilizados
          </h3>
          <StatsBarChart data={attacksData} />
        </div>
      </div>

      {/* Evolução */}
      <div className="card-modern p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
          Evolução de Desempenho (últimos 6 meses)
        </h3>
        <StatsLineChart data={evolutionData} />
      </div>

      {/* Próximos Passos - CTA Moderno */}
      <div className="card-modern overflow-hidden">
        <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 p-8 text-white">
          <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Comece Agora
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              to="/athletes"
              className="bg-white/20 backdrop-blur-sm hover:bg-white/30 p-6 rounded-2xl transition-all hover:scale-105 hover:shadow-2xl group"
            >
              <div className="text-3xl mb-3">🥋</div>
              <p className="font-bold text-lg mb-2">Gerenciar Atletas</p>
              <p className="text-sm text-white/90">Cadastre e acompanhe seus atletas</p>
              <div className="mt-4 text-sm font-semibold flex items-center gap-2 group-hover:gap-3 transition-all">
                Acessar <span>→</span>
              </div>
            </Link>
            <Link
              to="/compare"
              className="bg-white/20 backdrop-blur-sm hover:bg-white/30 p-6 rounded-2xl transition-all hover:scale-105 hover:shadow-2xl group"
            >
              <div className="text-3xl mb-3">📊</div>
              <p className="font-bold text-lg mb-2">Comparar Lutadores</p>
              <p className="text-sm text-white/90">Analise diferenças táticas</p>
              <div className="mt-4 text-sm font-semibold flex items-center gap-2 group-hover:gap-3 transition-all">
                Acessar <span>→</span>
              </div>
            </Link>
            <Link
              to="/strategy"
              className="bg-white/20 backdrop-blur-sm hover:bg-white/30 p-6 rounded-2xl transition-all hover:scale-105 hover:shadow-2xl group"
            >
              <div className="text-3xl mb-3">🎯</div>
              <p className="font-bold text-lg mb-2">Estratégia com IA</p>
              <p className="text-sm text-white/90">Crie planos de luta inteligentes</p>
              <div className="mt-4 text-sm font-semibold flex items-center gap-2 group-hover:gap-3 transition-all">
                Acessar <span>→</span>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
