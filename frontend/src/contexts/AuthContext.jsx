import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getCurrentUser, isAuthenticated, logout as authLogout } from '../services/authService';
import { queryClient } from '../lib/queryClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load user from localStorage on mount
  // DÍVIDA CONHECIDA: `setState` sincronamente dentro de effect pode causar
  // render em cascata. A correção toca a HIDRATAÇÃO DA SESSÃO — mexer nisso
  // numa spec de portões de CI seria exatamente o escopo crescente que o
  // processo proíbe. Tratar em spec própria de auth/frontend.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (isAuthenticated()) {
      const stored = getCurrentUser();
      if (stored) setUser(stored);
    }
    setLoading(false);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Ouvir evento de logout forçado por token inválido (ex: 401 no interceptor da API)
  useEffect(() => {
    const handleForcedLogout = () => {
      setUser(null);
      queryClient.clear();
    };
    window.addEventListener('auth:logout', handleForcedLogout);
    return () => window.removeEventListener('auth:logout', handleForcedLogout);
  }, []);

  // Called after a successful login — clear stale cache from previous user, then set new user
  const setUserFromLoginResponse = useCallback((userData) => {
    queryClient.clear();
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    authLogout();
    setUser(null);
    // Limpar todo o cache do React Query ao trocar de conta,
    // evitando que dados da conta anterior apareçam para o próximo usuário.
    queryClient.clear();
  }, []);

  // Chamado após `POST /auth/change-password` (spec 014, R10): grava o token
  // novo (o antigo foi invalidado no servidor) e zera `mustChangePassword`
  // tanto no estado quanto no `localStorage`, para o `ProtectedRoute` parar
  // de redirecionar para /trocar-senha na próxima navegação.
  const markPasswordChanged = useCallback((token) => {
    if (token) localStorage.setItem('jiumetrics_token', token);
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, mustChangePassword: false };
      localStorage.setItem('jiumetrics_user', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const isAdmin = user?.role === 'admin';
  const profile = user?.profile || 'atleta';
  const mustChangePassword = Boolean(user?.mustChangePassword);

  return (
    <AuthContext.Provider
      value={{ user, isAdmin, profile, mustChangePassword, loading, setUserFromLoginResponse, markPasswordChanged, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
