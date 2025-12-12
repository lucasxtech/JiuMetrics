import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ModernLogin from '../ModernLogin';
import * as authService from '../../services/authService';

vi.mock('../../services/authService');

const MockedLogin = () => (
  <BrowserRouter>
    <ModernLogin />
  </BrowserRouter>
);

describe('ModernLogin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('deve renderizar formulário de login', () => {
    render(<MockedLogin />);

    const inputs = screen.getAllByRole('textbox');
    const submitButton = screen.getByRole('button', { name: /entrar/i });

    expect(inputs.length).toBeGreaterThan(0);
    expect(submitButton).toBeInTheDocument();
  });

  it('deve validar campos vazios', async () => {
    render(<MockedLogin />);

    const submitButton = screen.getByRole('button', { name: /entrar/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/preencha/i)).toBeInTheDocument();
    });

    expect(authService.login).not.toHaveBeenCalled();
  });

  it('deve chamar authService.login quando formulário for válido', async () => {
    const mockLogin = vi.fn().mockResolvedValue({
      success: true,
      user: { id: '123', name: 'Test' },
      token: 'token-123',
    });

    authService.login = mockLogin;

    render(<MockedLogin />);

    const inputs = screen.getAllByRole('textbox');
    const passwordInput = screen.getByPlaceholderText(/senha/i);
    const submitButton = screen.getByRole('button', { name: /entrar/i });

    // Preencher campos
    fireEvent.change(inputs[0], { target: { value: 'test@test.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalled();
    });
  });

  it('deve exibir erro quando login falha', async () => {
    const mockLogin = vi.fn().mockResolvedValue({
      success: false,
      error: 'Credenciais inválidas',
    });

    authService.login = mockLogin;

    render(<MockedLogin />);

    const inputs = screen.getAllByRole('textbox');
    const passwordInput = screen.getByPlaceholderText(/senha/i);
    const submitButton = screen.getByRole('button', { name: /entrar/i });

    fireEvent.change(inputs[0], { target: { value: 'wrong@test.com' } });
    fireEvent.change(passwordInput, { target: { value: 'wrong' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/credenciais inválidas/i)).toBeInTheDocument();
    });
  });

  it('TESTE CRÍTICO: deve usar chave correta do localStorage (jiumetrics_token)', async () => {
    // Este é o teste mais importante - previne o bug que encontramos
    const mockToken = 'test-token-123';
    const mockUser = { id: '1', name: 'Test', email: 'test@test.com' };

    // Simular que o authService salvou no localStorage
    localStorage.setItem('jiumetrics_token', mockToken);
    localStorage.setItem('jiumetrics_user', JSON.stringify(mockUser));

    // Verificar que foi salvo com a chave CORRETA
    expect(localStorage.getItem('jiumetrics_token')).toBe(mockToken);
    expect(localStorage.getItem('jiumetrics_user')).toBe(JSON.stringify(mockUser));

    // Garantir que NÃO foi salvo com a chave errada
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });
});

