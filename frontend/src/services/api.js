// Configuração central da API
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5050/api';

// Criar instância axios com base URL
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Configurar token inicial se existir
const token = localStorage.getItem('jiumetrics_token');
if (token) {
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

// Interceptor para adicionar token se existir
api.interceptors.request.use(
  (config) => {
    console.log('🌐 API Request:', config.method?.toUpperCase(), config.baseURL + config.url);
    const token = localStorage.getItem('jiumetrics_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor para tratamento de erros e renovação de autenticação
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('❌ API Error:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    
    // Se receber 401, limpar token inválido e redirecionar para login
    if (error.response?.status === 401) {
      console.warn('⚠️ Token inválido ou expirado - limpando autenticação');
      localStorage.removeItem('jiumetrics_token');
      localStorage.removeItem('jiumetrics_user');
      delete api.defaults.headers.common['Authorization'];
      
      // Redirecionar para login se não estiver já lá
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;
