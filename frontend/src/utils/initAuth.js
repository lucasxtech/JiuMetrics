// Utilitário para inicializar autenticação ao carregar a aplicação
import api from '../services/api';

/**
 * Inicializa a autenticação verificando o token salvo
 * Deve ser chamado ao iniciar a aplicação
 */
export const initializeAuth = () => {
  const token = localStorage.getItem('jiumetrics_token');
  const user = localStorage.getItem('jiumetrics_user');
  
  if (token) {
    // Configurar token no header da API
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    
    // Validar token fazendo uma requisição simples
    return validateToken();
  } else {
    return Promise.resolve({ valid: false });
  }
};

/**
 * Valida se o token atual é válido
 */
const validateToken = async () => {
  try {
    // Fazer uma requisição simples para validar o token
    // Você pode usar qualquer endpoint que retorne rapidamente
    await api.get('/auth/validate');
    return { valid: true };
  } catch (error) {
    console.error('❌ Token inválido:', error.response?.status);
    
    // Se o token for inválido, limpar tudo
    if (error.response?.status === 401) {
      localStorage.removeItem('jiumetrics_token');
      localStorage.removeItem('jiumetrics_user');
      delete api.defaults.headers.common['Authorization'];
    }
    
    return { valid: false };
  }
};

export default initializeAuth;
