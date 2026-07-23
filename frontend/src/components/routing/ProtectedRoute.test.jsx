import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../../contexts/AuthContext';
import ProtectedRoute from './ProtectedRoute';

/**
 * ProtectedRoute deriva o estado de autenticação do AuthProvider, que na
 * montagem lê 'jiumetrics_token' (presença) e 'jiumetrics_user' (dados do
 * usuário) do localStorage. Os testes de chave existem porque houve um bug
 * real em que o token era salvo como 'jiumetrics_token' mas lido como
 * 'token' — o usuário logava e era imediatamente redirecionado pro login.
 */

function renderProtected() {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route path="/login" element={<div>Login Page</div>} />
          <Route
            path="/protected"
            element={
              <ProtectedRoute>
                <div>Protected Content</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  );
}

function loginAs(user = { id: 'u1', name: 'Teste', role: 'user' }) {
  localStorage.setItem('jiumetrics_token', 'valid-token');
  localStorage.setItem('jiumetrics_user', JSON.stringify(user));
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('deve redirecionar para /login quando não há sessão', () => {
    renderProtected();

    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('deve mostrar conteúdo protegido quando há sessão válida', () => {
    loginAs();

    renderProtected();

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
  });

  it('CRÍTICO: deve usar a chave "jiumetrics_token" e não "token"', () => {
    // Sessão salva com as chaves corretas; uma chave 'token' espúria não
    // deve interferir na leitura.
    loginAs();
    localStorage.setItem('token', 'lixo');

    renderProtected();

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('PREVENIR BUG: token com chave errada não deve permitir acesso', () => {
    // Salvar token APENAS com a chave errada — sem 'jiumetrics_token',
    // o AuthProvider não hidrata o usuário e o acesso é negado.
    localStorage.setItem('token', 'valid-token');
    localStorage.setItem('jiumetrics_user', JSON.stringify({ id: 'u1', name: 'Teste' }));

    renderProtected();

    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('bloqueia rota admin para usuário comum (requireAdmin)', () => {
    loginAs({ id: 'u1', name: 'Teste', role: 'user' });

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/admin']}>
          <Routes>
            <Route path="/" element={<div>Home Page</div>} />
            <Route path="/login" element={<div>Login Page</div>} />
            <Route
              path="/admin"
              element={
                <ProtectedRoute requireAdmin>
                  <div>Admin Content</div>
                </ProtectedRoute>
              }
            />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );

    expect(screen.getByText('Home Page')).toBeInTheDocument();
    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
  });
});
