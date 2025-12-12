import { describe, it, expect, beforeEach, vi } from 'vitest';
import { login, logout, isAuthenticated, getToken } from '../authService';
import api from '../api';

// Mock do axios
vi.mock('../api');

describe('authService', () => {
  beforeEach(() => {
    // Limpar localStorage antes de cada teste
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('login', () => {
    it('deve salvar o token com a chave correta (jiumetrics_token)', async () => {
      const mockResponse = {
        data: {
          success: true,
          token: 'fake-jwt-token',
          user: {
            id: '123',
            name: 'Test User',
            email: 'test@example.com'
          }
        }
      };

      api.post.mockResolvedValue(mockResponse);

      await login({
        email: 'test@example.com',
        password: 'password123'
      });

      // CRÍTICO: Verificar se a chave é 'jiumetrics_token'
      expect(localStorage.getItem('jiumetrics_token')).toBe('fake-jwt-token');
      
      // Garantir que NÃO está salvando com a chave errada
      expect(localStorage.getItem('token')).toBeNull();
    });

    it('deve salvar o usuário no localStorage', async () => {
      const mockUser = {
        id: '123',
        name: 'Test User',
        email: 'test@example.com'
      };

      const mockResponse = {
        data: {
          success: true,
          token: 'fake-jwt-token',
          user: mockUser
        }
      };

      api.post.mockResolvedValue(mockResponse);

      await login({
        email: 'test@example.com',
        password: 'password123'
      });

      const savedUser = JSON.parse(localStorage.getItem('jiumetrics_user'));
      expect(savedUser).toEqual(mockUser);
    });

    it('deve retornar erro quando login falha', async () => {
      api.post.mockRejectedValue({
        response: {
          data: {
            error: 'Email ou senha incorretos'
          }
        }
      });

      const result = await login({
        email: 'wrong@example.com',
        password: 'wrongpass'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Email ou senha incorretos');
      expect(localStorage.getItem('jiumetrics_token')).toBeNull();
    });
  });

  describe('logout', () => {
    it('deve remover token e usuário do localStorage', () => {
      localStorage.setItem('jiumetrics_token', 'fake-token');
      localStorage.setItem('jiumetrics_user', JSON.stringify({ id: '123' }));

      logout();

      expect(localStorage.getItem('jiumetrics_token')).toBeNull();
      expect(localStorage.getItem('jiumetrics_user')).toBeNull();
    });
  });

  describe('isAuthenticated', () => {
    it('deve retornar true quando token existe', () => {
      localStorage.setItem('jiumetrics_token', 'fake-token');
      expect(isAuthenticated()).toBe(true);
    });

    it('deve retornar false quando token não existe', () => {
      expect(isAuthenticated()).toBe(false);
    });
  });

  describe('getToken', () => {
    it('deve retornar o token correto do localStorage', () => {
      localStorage.setItem('jiumetrics_token', 'my-token-123');
      expect(getToken()).toBe('my-token-123');
    });

    it('deve retornar null quando não há token', () => {
      expect(getToken()).toBeNull();
    });
  });

  describe('Consistência de chaves - PREVENIR BUG', () => {
    it('CRÍTICO: authService e ProtectedRoute devem usar a mesma chave', async () => {
      const mockResponse = {
        data: {
          success: true,
          token: 'test-token',
          user: { id: '1', name: 'User', email: 'user@test.com' }
        }
      };

      api.post.mockResolvedValue(mockResponse);

      // Fazer login
      await login({ email: 'user@test.com', password: 'pass' });

      // A chave DEVE ser 'jiumetrics_token'
      const TOKEN_KEY = 'jiumetrics_token';
      const savedToken = localStorage.getItem(TOKEN_KEY);

      expect(savedToken).toBe('test-token');
      expect(savedToken).not.toBeNull();
      
      // Simular o que ProtectedRoute faz
      const protectedRouteToken = localStorage.getItem('jiumetrics_token');
      expect(protectedRouteToken).toBe(savedToken);
    });
  });
});
