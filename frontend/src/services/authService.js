import api from './api';

const TOKEN_KEY = 'jiumetrics_token';
const USER_KEY = 'jiumetrics_user';

/**
 * Registra um novo usuário
 */
export const register = async ({ name, email, password }) => {
  try {
    const response = await api.post('/auth/register', {
      name,
      email,
      password
    });

    if (response.data.success && response.data.token) {
      // Salvar token e usuário
      localStorage.setItem(TOKEN_KEY, response.data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(response.data.user));
      
      // Configurar token no header padrão
      api.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
    }

    return response.data;
  } catch (error) {
    console.error('Erro no registro:', error);
    return {
      success: false,
      error: error.response?.data?.error || 'Erro ao criar conta'
    };
  }
};

/**
 * Faz login do usuário
 */
export const login = async ({ email, password, rememberMe = false }) => {
  try {
    const response = await api.post('/auth/login', {
      email,
      password,
      rememberMe
    });

    if (response.data.success && response.data.token) {
      // Salvar token e usuário
      localStorage.setItem(TOKEN_KEY, response.data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(response.data.user));
      
      // Configurar token no header padrão
      api.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
    }

    return response.data;
  } catch (error) {
    console.error('Erro no login:', error);
    return {
      success: false,
      error: error.response?.data?.error || 'Email ou senha incorretos'
    };
  }
};

/**
 * Faz logout do usuário
 */
export const logout = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  delete api.defaults.headers.common['Authorization'];
};

/**
 * Verifica se o usuário está autenticado
 */
export const isAuthenticated = () => {
  const token = localStorage.getItem(TOKEN_KEY);
  return !!token;
};

/**
 * Retorna o token armazenado
 */
export const getToken = () => {
  return localStorage.getItem(TOKEN_KEY);
};

/**
 * Retorna o usuário atual
 */
export const getCurrentUser = () => {
  const userStr = localStorage.getItem(USER_KEY);
  try {
    return userStr ? JSON.parse(userStr) : null;
  } catch {
    return null;
  }
};

/**
 * Inicializa o token no API se já estiver logado
 */
export const initializeAuth = () => {
  const token = getToken();
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }
};

// Inicializar automaticamente quando o módulo é carregado
initializeAuth();
