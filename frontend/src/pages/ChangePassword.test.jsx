import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext';
import ChangePassword from './ChangePassword';
import { changePassword } from '../services/authService';

/**
 * Revisão final da spec 014 (M3): `changePassword` usa `skipAuthLogout`, então
 * o interceptor de `api.js` não derruba a sessão em 401 — quem decide é a
 * tela. Só o 401 com a mensagem exata de senha errada fica na tela; qualquer
 * outro 401 (sessão expirada, conta excluída) desloga e vai para /login.
 *
 * `AuthProvider` real lendo `localStorage`, como em
 * `ProtectedRoute.mustChange.test.jsx`; só a chamada HTTP é mockada.
 */
vi.mock('../services/authService', async (importOriginal) => ({
  ...(await importOriginal()),
  changePassword: vi.fn(),
}));

function renderPage() {
  localStorage.setItem('jiumetrics_token', 'valid-token');
  localStorage.setItem('jiumetrics_user', JSON.stringify({ id: 'u1', name: 'Teste', role: 'user', mustChangePassword: true }));
  render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/trocar-senha']}>
        <Routes>
          <Route path="/trocar-senha" element={<ChangePassword />} />
          <Route path="/login" element={<div>tela-de-login</div>} />
          <Route path="/" element={<div>home</div>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  );
}

function fill({ current = 'provisoria1', next = 'novaSenha1', confirm = next } = {}) {
  fireEvent.change(screen.getByLabelText('Senha atual'), { target: { value: current } });
  fireEvent.change(screen.getByLabelText('Nova senha'), { target: { value: next } });
  fireEvent.change(screen.getByLabelText('Confirmar nova senha'), { target: { value: confirm } });
  fireEvent.click(screen.getByRole('button', { name: 'Salvar nova senha' }));
}

const reject401 = (error) => Promise.reject({ response: { status: 401, data: { error } } });

describe('ChangePassword — 401 (M3) e senha igual (M2)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(changePassword).mockReset();
  });

  it('401 "Senha atual incorreta." mostra o erro na tela e mantém a sessão', async () => {
    vi.mocked(changePassword).mockImplementation(() => reject401('Senha atual incorreta.'));
    renderPage();
    fill();

    expect(await screen.findByText('Senha atual incorreta.')).toBeInTheDocument();
    expect(localStorage.getItem('jiumetrics_token')).toBe('valid-token');
    expect(screen.queryByText('tela-de-login')).not.toBeInTheDocument();
  });

  it('outro 401 (sessão expirada) limpa a sessão e vai para /login, sem dizer "senha incorreta"', async () => {
    vi.mocked(changePassword).mockImplementation(() => reject401('Sessão expirada. Faça login novamente.'));
    renderPage();
    fill();

    expect(await screen.findByText('tela-de-login')).toBeInTheDocument();
    expect(localStorage.getItem('jiumetrics_token')).toBeNull();
    expect(localStorage.getItem('jiumetrics_user')).toBeNull();
    expect(screen.queryByText('Senha atual incorreta.')).not.toBeInTheDocument();
  });

  it('nova senha igual à atual é recusada antes de chamar a API', async () => {
    renderPage();
    fill({ current: 'mesmaSenha1', next: 'mesmaSenha1' });

    expect(await screen.findByText('A nova senha precisa ser diferente da atual.')).toBeInTheDocument();
    await waitFor(() => expect(changePassword).not.toHaveBeenCalled());
  });
});
