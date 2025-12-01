// Header/Navegação da aplicação - Design Moderno
import { Link, useLocation } from 'react-router-dom';

export default function Header() {
  const location = useLocation();
  
  const isActive = (path) => location.pathname === path;

  return (
    <header className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 shadow-2xl sticky top-0 z-50 backdrop-blur-sm">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <span className="text-white font-black text-lg">JJ</span>
            </div>
            <span className="hidden md:block text-xl font-bold text-white">Análise Tática</span>
          </Link>

          {/* Menu Desktop */}
          <div className="hidden md:flex items-center gap-2">
            <Link
              to="/"
              className={`px-4 py-2 rounded-xl font-semibold transition-all ${
                isActive('/')
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              Dashboard
            </Link>
            <Link
              to="/athletes"
              className={`px-4 py-2 rounded-xl font-semibold transition-all ${
                isActive('/athletes')
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              Atletas
            </Link>
            <Link
              to="/opponents"
              className={`px-4 py-2 rounded-xl font-semibold transition-all ${
                isActive('/opponents')
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              Adversários
            </Link>
            <Link
              to="/compare"
              className={`px-4 py-2 rounded-xl font-semibold transition-all ${
                isActive('/compare')
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              Comparar
            </Link>
            <Link
              to="/strategy"
              className={`px-4 py-2 rounded-xl font-semibold transition-all ${
                isActive('/strategy')
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              Estratégia
            </Link>
            <Link
              to="/analyze-video"
              className="ml-2 px-5 py-2 rounded-xl font-bold bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center gap-2"
            >
              <span>📽️</span>
              IA
            </Link>
          </div>

          {/* Menu Mobile (Hamburguer) */}
          <div className="md:hidden">
            <button className="text-white p-2 hover:bg-gray-700 rounded-lg transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </nav>
    </header>
  );
}
