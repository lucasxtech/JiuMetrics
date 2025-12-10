import api from './api';

export const login = async ({ email, password, rememberMe }) => {
  try {
    const response = await api.post('/auth/login', { email, password, rememberMe });
    
    if (response.data.token) {
      localStorage.setItem('authToken', response.data.token);
      if (rememberMe) {
        localStorage.setItem('rememberMe', 'true');
      }
    }
    
    return {
      success: true,
      user: response.data.user,
      token: response.data.token
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.error || 'Erro ao fazer login'
    };
  }
};

export const register = async ({ name, email, password }) => {
  try {
    const response = await api.post('/auth/register', { name, email, password });
    
    if (response.data.token) {
      localStorage.setItem('authToken', response.data.token);
    }
    
    return {
      success: true,
      user: response.data.user,
      token: response.data.token
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.error || 'Erro ao criar conta'
    };
  }
};

export const logout = async () => {
  try {
    await api.post('/auth/logout');
  } catch (error) {
    console.error('Erro ao fazer logout:', error);
  } finally {
    localStorage.removeItem('authToken');
    localStorage.removeItem('rememberMe');
  }
};

export const getCurrentUser = async () => {
  try {
    const response = await api.get('/auth/me');
    return response.data.user;
  } catch (error) {
    throw new Error('Usuário não autenticado');
  }
};

export const forgotPassword = async (email) => {
  try {
    const response = await api.post('/auth/forgot-password', { email });
    return {
      success: true,
      message: response.data.message
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.error || 'Erro ao solicitar recuperação de senha'
    };
  }
};

export const resetPassword = async (token, newPassword) => {
  try {
    const response = await api.post('/auth/reset-password', { token, newPassword });
    return {
      success: true,
      message: response.data.message
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.error || 'Erro ao redefinir senha'
    };
  }
};
