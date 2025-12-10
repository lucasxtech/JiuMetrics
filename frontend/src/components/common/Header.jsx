// Header/Navegação da aplicação - Design Moderno
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function Header() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  
  const isActive = (path) => location.pathname === path;

  const navLinks = [
    { label: 'Overview', to: '/' },
    { label: 'Atletas', to: '/athletes' },
    { label: 'Adversários', to: '/opponents' },
    { label: 'Comparar', to: '/compare' },
    { label: 'Estratégia', to: '/strategy' },
  ];

  // Fechar menu mobile quando mudar de rota
  useEffect(() => {
    if (mobileOpen) {
      setMobileOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-[#0c1524]/90 backdrop-blur-xl shadow-lg" style={{ width: '100vw' }}>
      <div className="mx-auto max-w-[95vw] sm:px-10 lg:px-14 xl:px-16 2xl:px-20">
        <div className="flex justify-between items-center h-[76px]">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform" style={{ marginLeft: '1vw' }}>
              <span className="text-white font-black text-lg">JJ</span>
            </div>
            <span className="hidden md:block text-xl font-bold text-white">Análise Tática</span>
          </Link>

          {/* Menu Desktop */}
          <div className="hidden md:flex items-center gap-3 xl:gap-4 py-4">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`inline-flex h-12 w-auto min-w-[120px] items-center justify-center rounded-xl px-6 text-sm font-medium tracking-tight transition-all duration-200 ${
                  isActive(link.to)
                    ? 'bg-white text-slate-900 shadow-[0_8px_24px_rgba(15,23,42,0.25)] ring-1 ring-white/80'
                    : 'text-white/70 hover:text-white hover:bg-white/10 hover:shadow-[0_12px_30px_rgba(15,23,42,0.32)]'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <Link
              to="/analyze-video"
              className={`inline-flex h-12 w-auto min-w-[120px] items-center justify-center gap-2 rounded-xl px-6 text-sm font-medium tracking-tight transition-all duration-200 ${
                isActive('/analyze-video')
                  ? 'bg-white text-slate-900 shadow-[0_8px_24px_rgba(15,23,42,0.25)] ring-1 ring-white/80'
                  : 'text-white/70 hover:text-white hover:bg-white/10 hover:shadow-[0_12px_30px_rgba(15,23,42,0.32)]'
              }`}
            >
              <span aria-hidden="true">🤖</span>
              IA
            </Link>
            <Link
              to="/settings"
              className={`inline-flex h-12 w-12 items-center justify-center rounded-xl text-sm font-medium tracking-tight transition-all duration-200 ${
                isActive('/settings')
                  ? 'bg-white text-slate-900 shadow-[0_8px_24px_rgba(15,23,42,0.25)] ring-1 ring-white/80'
                  : 'text-white/70 hover:text-white hover:bg-white/10 hover:shadow-[0_12px_30px_rgba(15,23,42,0.32)]'
              }`}
              title="Configurações"
            >
              <svg width="1.25rem" height="1.25rem" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </Link>
          </div>

          {/* Menu Mobile (Hambúrguer) */}
          <div className="md:hidden">
            <button
              onClick={() => setMobileOpen((prev) => !prev)}
              aria-expanded={mobileOpen}
              aria-label="Abrir menu"
              className="text-white/80 p-2 rounded-lg transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Menu Mobile Expandido */}
        {mobileOpen && (
          <div className="md:hidden mt-3 flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/5 p-3 shadow-xl">
            {navLinks.map((link) => (
              <Link
                key={`mobile-${link.to}`}
                to={link.to}
                className={`rounded-full px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive(link.to)
                    ? 'bg-white text-slate-900 shadow'
                    : 'text-white/75 hover:text-white hover:bg-white/10'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <Link
              to="/analyze-video"
              className="inline-flex items-center gap-2 rounded-full px-3 py-2.5 text-sm font-semibold text-white/80 transition-colors hover:text-white hover:bg-white/10"
            >
              <span aria-hidden="true">🤖</span>
              IA
            </Link>
            <Link
              to="/settings"
              className={`inline-flex items-center gap-2 rounded-full px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive('/settings')
                  ? 'bg-white text-slate-900 shadow'
                  : 'text-white/75 hover:text-white hover:bg-white/10'
              }`}
            >
              <svg width="1rem" height="1rem" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Configurações
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
