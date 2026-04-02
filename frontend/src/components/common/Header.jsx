// Header/Navegação da aplicação - Design Moderno
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import PrefetchLink from './PrefetchLink';
import { useAuth } from '../../contexts/AuthContext';

// ✅ Importar componentes lazy para prefetch
const OverviewPage = () => import('../../pages/Overview');
const AthletesPage = () => import('../../pages/Athletes');
const OpponentsPage = () => import('../../pages/Opponents');
const StrategyPage = () => import('../../pages/Strategy');
const AnalysesPage = () => import('../../pages/Analyses');
const VideoAnalysisPage = () => import('../../pages/VideoAnalysis');
const SettingsPage = () => import('../../pages/Settings');

export default function Header() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, isAdmin } = useAuth();
  
  const isActive = (path) => location.pathname === path;

  const navLinks = [
    { label: 'Overview', to: '/', prefetch: OverviewPage },
    { label: 'Atletas', to: '/athletes', prefetch: AthletesPage },
    { label: 'Adversários', to: '/opponents', prefetch: OpponentsPage },
    { label: 'Estratégia', to: '/strategy', prefetch: StrategyPage },
    { label: 'Análises', to: '/analyses', prefetch: AnalysesPage },
  ];

  // Fechar menu mobile quando mudar de rota
  useEffect(() => {
    if (mobileOpen) {
      setMobileOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-[#0c1524]/90 backdrop-blur-xl shadow-lg">
      <div className="mx-auto w-full max-w-[1500px] px-4">
        <div className="flex justify-between items-center h-[76px]">
          {/* Logo */}
          <PrefetchLink to="/" prefetchComponent={OverviewPage} className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-slate-200 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <span className="text-slate-700 font-black text-lg">JJ</span>
            </div>
            <span className="hidden md:block text-xl font-bold text-white">Análise Tática</span>
          </PrefetchLink>

          {/* Menu Desktop */}
          <div className="hidden md:flex items-center gap-3 xl:gap-4 py-4">
            {navLinks.map((link) => (
              <PrefetchLink
                key={link.to}
                to={link.to}
                prefetchComponent={link.prefetch}
                className={`inline-flex h-12 w-auto min-w-[120px] items-center justify-center rounded-xl px-6 text-sm font-medium tracking-tight transition-all duration-200 ${
                  isActive(link.to)
                    ? 'bg-white text-slate-900 shadow-[0_8px_24px_rgba(15,23,42,0.25)] ring-1 ring-white/80'
                    : 'text-white/70 hover:text-white hover:bg-white/10 hover:shadow-[0_12px_30px_rgba(15,23,42,0.32)]'
                }`}
              >
                {link.label}
              </PrefetchLink>
            ))}
            <PrefetchLink
              to="/analyze-video"
              prefetchComponent={VideoAnalysisPage}
              className={`inline-flex h-12 w-auto min-w-[120px] items-center justify-center gap-2 rounded-xl px-6 text-sm font-medium tracking-tight transition-all duration-200 ${
                isActive('/analyze-video')
                  ? 'bg-white text-slate-900 shadow-[0_8px_24px_rgba(15,23,42,0.25)] ring-1 ring-white/80'
                  : 'text-white/70 hover:text-white hover:bg-white/10 hover:shadow-[0_12px_30px_rgba(15,23,42,0.32)]'
              }`}
            >
              <span aria-hidden="true">🤖</span>
              IA
            </PrefetchLink>
            <a
              href="/guia-usuario.html"
              target="_blank"
              rel="noopener noreferrer"
              title="Ajuda — Guia do Usuário"
              className="inline-flex h-12 w-12 items-center justify-center rounded-xl text-sm font-bold tracking-tight transition-all duration-200 text-white/70 hover:text-white hover:bg-white/10 hover:shadow-[0_12px_30px_rgba(15,23,42,0.32)] border border-white/20 hover:border-white/40"
            >
              ?
            </a>
            <PrefetchLink
              to="/settings"
              prefetchComponent={SettingsPage}
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
            </PrefetchLink>

            {/* User info pill + admin link */}
            <div className="flex items-center gap-2 pl-1 border-l border-white/10">
              {isAdmin && (
                <PrefetchLink
                  to="/admin/users"
                  className={`inline-flex h-8 items-center justify-center rounded-lg px-3 text-xs font-bold tracking-wide transition-all duration-200 ${
                    isActive('/admin/users')
                      ? 'bg-amber-400 text-amber-900'
                      : 'bg-amber-400/20 text-amber-300 hover:bg-amber-400/30'
                  }`}
                  title="Gerenciar Usuários"
                >
                  ADMIN
                </PrefetchLink>
              )}
              {user && (
                <PrefetchLink
                  to="/settings"
                  prefetchComponent={SettingsPage}
                  className="flex items-center gap-2 h-8 rounded-lg px-2 text-white/70 hover:text-white hover:bg-white/10 transition-all"
                  title={user.email}
                >
                  <div className="w-6 h-6 rounded-full bg-slate-600 flex items-center justify-center text-xs font-bold text-white">
                    {user.name?.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs font-medium max-w-20 truncate hidden xl:block">{user.name}</span>
                </PrefetchLink>
              )}
            </div>
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
              <PrefetchLink
                key={`mobile-${link.to}`}
                to={link.to}
                prefetchComponent={link.prefetch}
                className={`rounded-full px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive(link.to)
                    ? 'bg-white text-slate-900 shadow'
                    : 'text-white/75 hover:text-white hover:bg-white/10'
                }`}
              >
                {link.label}
              </PrefetchLink>
            ))}
            <PrefetchLink
              to="/analyze-video"
              prefetchComponent={VideoAnalysisPage}
              className="inline-flex items-center gap-2 rounded-full px-3 py-2.5 text-sm font-semibold text-white/80 transition-colors hover:text-white hover:bg-white/10"
            >
              <span aria-hidden="true">🤖</span>
              IA
            </PrefetchLink>
            <a
              href="/guia-usuario.html"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full px-3 py-2.5 text-sm font-bold text-white/75 transition-colors hover:text-white hover:bg-white/10 border border-white/20"
            >
              ? Ajuda
            </a>
            <PrefetchLink
              to="/settings"
              prefetchComponent={SettingsPage}
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
            </PrefetchLink>
            {isAdmin && (
              <PrefetchLink
                to="/admin/users"
                className={`inline-flex items-center gap-2 rounded-full px-3 py-2.5 text-sm font-bold transition-colors ${
                  isActive('/admin/users')
                    ? 'bg-amber-400 text-amber-900'
                    : 'text-amber-300 hover:text-amber-100 hover:bg-amber-400/20'
                }`}
              >
                👑 Gerenciar Usuários
              </PrefetchLink>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
