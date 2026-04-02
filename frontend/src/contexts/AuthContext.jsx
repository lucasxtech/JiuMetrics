import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getCurrentUser, isAuthenticated, logout as authLogout } from '../services/authService';
import { queryClient } from '../lib/queryClient';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load user from localStorage on mount
  useEffect(() => {
    if (isAuthenticated()) {
      const stored = getCurrentUser();
      if (stored) setUser(stored);
    }
    setLoading(false);
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

  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, isAdmin, loading, setUserFromLoginResponse, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
