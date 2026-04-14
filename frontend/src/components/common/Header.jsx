// Header/Navegação da aplicação - Design Moderno
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);
  const { user, isAdmin, logout } = useAuth();

  const isActive = (path) => location.pathname === path;

  const navLinks = [
    { label: 'Overview', to: '/', prefetch: OverviewPage },
    { label: 'Estratégia', to: '/strategy', prefetch: StrategyPage },
    { label: 'Análises', to: '/analyses', prefetch: AnalysesPage },
    { label: 'Atletas', to: '/athletes', prefetch: AthletesPage },
    { label: 'Adversários', to: '/opponents', prefetch: OpponentsPage },
  ];

  // Fechar menu mobile quando mudar de rota
  useEffect(() => {
    if (mobileOpen) setMobileOpen(false);
    if (userMenuOpen) setUserMenuOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    if (!userMenuOpen) return;
    function handleClick(e) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [userMenuOpen]);

  const handleLogout = () => {
    setUserMenuOpen(false);
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-[#0c1524] border-b border-white/[0.07]">
      <div className="mx-auto w-full max-w-[1500px] px-6">
        <div className="flex items-center h-[72px] gap-10">

          {/* Logo */}
          <PrefetchLink to="/" prefetchComponent={OverviewPage} className="flex items-center gap-2.5 shrink-0 group">
            <div className="w-8 h-8 rounded-lg bg-black border border-white/10 flex items-center justify-center shrink-0 group-hover:border-white/20 transition-colors">
              <span className="text-white text-xs font-black tracking-tight">JJ</span>
            </div>
            <span className="text-sm font-semibold text-white hidden sm:block">JiuMetrics</span>
          </PrefetchLink>

          {/* Nav */}
          <nav className="hidden md:flex items-center gap-1.5 flex-1">
            {/* Overview primeiro */}
            <PrefetchLink
              to="/"
              prefetchComponent={OverviewPage}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive('/') ? 'text-white bg-white/10' : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              Overview
            </PrefetchLink>
            {/* IA segundo */}
            <PrefetchLink
              to="/analyze-video"
              prefetchComponent={VideoAnalysisPage}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive('/analyze-video')
                  ? 'text-white bg-white/10'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              IA
            </PrefetchLink>
            {/* Restante: Estratégia, Análises, Atletas, Adversários */}
            {[
              { label: 'Estratégia', to: '/strategy', prefetch: StrategyPage },
              { label: 'Análises', to: '/analyses', prefetch: AnalysesPage },
              { label: 'Atletas', to: '/athletes', prefetch: AthletesPage },
              { label: 'Adversários', to: '/opponents', prefetch: OpponentsPage },
            ].map((link) => (
              <PrefetchLink
                key={link.to}
                to={link.to}
                prefetchComponent={link.prefetch}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive(link.to) ? 'text-white bg-white/10' : 'text-white/50 hover:text-white hover:bg-white/5'
                }`}
              >
                {link.label}
              </PrefetchLink>
            ))}
          </nav>

          {/* Direita */}
          <div className="hidden md:flex items-center gap-2 ml-auto">
            <a
              href="/guia-usuario.html"
              target="_blank"
              rel="noopener noreferrer"
              title="Ajuda"
              className="w-7 h-7 flex items-center justify-center rounded-md text-white/30 hover:text-white/70 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </a>

            <div className="w-px h-4 bg-white/[0.1]" />

            {user && (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(o => !o)}
                  className="flex items-center gap-2 px-2 h-8 rounded-md hover:bg-white/5 transition-colors group"
                >
                  <div className="w-6 h-6 rounded-full bg-slate-700 border border-white/10 flex items-center justify-center text-[11px] font-bold text-white/80 shrink-0">
                    {user.name?.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm text-white/60 group-hover:text-white/80 transition-colors hidden xl:block">{user.name}</span>
                  <svg className={`w-3 h-3 text-white/25 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 top-10 z-50 w-52 rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden">
                    <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
                      <p className="text-sm font-semibold text-slate-900 truncate">{user.name}</p>
                      <p className="text-xs text-slate-400 truncate mt-0.5">{user.email}</p>
                    </div>
                    <div className="py-1">
                      <PrefetchLink to="/settings" prefetchComponent={SettingsPage} onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors">
                        <svg className="w-4 h-4 shrink-0 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Configurações
                      </PrefetchLink>
                      {isAdmin && (
                        <PrefetchLink to="/admin/users" onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2 text-sm text-amber-600 hover:bg-amber-50 transition-colors">
                          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                          Gerenciar Usuários
                        </PrefetchLink>
                      )}
                    </div>
                    <div className="border-t border-slate-100 py-1">
                      <button onClick={handleLogout}
                        className="flex w-full items-center gap-3 px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors">
                        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Sair
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mobile */}
          <div className="md:hidden ml-auto">
            <button onClick={() => setMobileOpen(p => !p)} className="w-8 h-8 flex items-center justify-center text-white/60 hover:text-white rounded-md hover:bg-white/5 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="md:hidden pb-3 flex flex-col gap-0.5 border-t border-white/[0.07] pt-2">
            {navLinks.map((link) => (
              <PrefetchLink key={`m-${link.to}`} to={link.to} prefetchComponent={link.prefetch}
                className={`px-3 py-2 rounded-md text-sm transition-colors ${isActive(link.to) ? 'bg-white/10 text-white font-medium' : 'text-white/55 hover:text-white hover:bg-white/5'}`}>
                {link.label}
              </PrefetchLink>
            ))}
            <PrefetchLink to="/analyze-video" prefetchComponent={VideoAnalysisPage}
              className={`px-3 py-2 rounded-md text-sm transition-colors ${isActive('/analyze-video') ? 'bg-white/10 text-white font-medium' : 'text-white/55 hover:text-white hover:bg-white/5'}`}>
              IA
            </PrefetchLink>
            <div className="my-1 h-px bg-white/[0.07]" />
            <a href="/guia-usuario.html" target="_blank" rel="noopener noreferrer" className="px-3 py-2 rounded-md text-sm text-white/55 hover:text-white hover:bg-white/5 transition-colors">Ajuda</a>
            <PrefetchLink to="/settings" prefetchComponent={SettingsPage} className="px-3 py-2 rounded-md text-sm text-white/55 hover:text-white hover:bg-white/5 transition-colors">Configurações</PrefetchLink>
            {isAdmin && <PrefetchLink to="/admin/users" className="px-3 py-2 rounded-md text-sm text-amber-400 hover:bg-amber-400/10 transition-colors">Gerenciar Usuários</PrefetchLink>}
          </div>
        )}
      </div>
    </header>
  );
}
