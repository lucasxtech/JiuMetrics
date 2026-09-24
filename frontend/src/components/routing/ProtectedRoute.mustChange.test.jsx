import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../../contexts/AuthContext';
import ProtectedRoute from './ProtectedRoute';

/**
 * Casos de `mustChangePassword` (spec 014, Task 12): um usuário com senha
 * temporária (`mustChangePassword: true`, setada pelo admin ao criar a
 * conta — ver `userController.createUser`) não pode navegar por nenhuma
 * rota protegida até trocar a senha, exceto a própria rota de troca, que
 * usa a prop `allowPasswordChangePending` para escapar do redirecionamento.
 *
 * Segue o padrão da suíte irmã `ProtectedRoute.test.jsx`: `AuthProvider`
 * real lendo de `localStorage` (`jiumetrics_token`/`jiumetrics_user`), sem
 * mockar `useAuth`.
 */

function loginAs(user) {
  localStorage.setItem('jiumetrics_token', 'valid-token');
  localStorage.setItem('jiumetrics_user', JSON.stringify(user));
}

describe('ProtectedRoute — mustChangePassword', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('usuário com mustChangePassword é levado para /trocar-senha', () => {
    loginAs({ id: 'u1', name: 'Teste', role: 'user', mustChangePassword: true });

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route path="/" element={<ProtectedRoute><div>home</div></ProtectedRoute>} />
            <Route path="/trocar-senha" element={<div>trocar</div>} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );

    expect(screen.getByText('trocar')).toBeInTheDocument();
    expect(screen.queryByText('home')).not.toBeInTheDocument();
  });

  it('a própria rota /trocar-senha renderiza com allowPasswordChangePending, mesmo com mustChangePassword', () => {
    loginAs({ id: 'u1', name: 'Teste', role: 'user', mustChangePassword: true });

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/trocar-senha']}>
          <Routes>
            <Route
              path="/trocar-senha"
              element={<ProtectedRoute allowPasswordChangePending><div>trocar-senha-page</div></ProtectedRoute>}
            />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );

    expect(screen.getByText('trocar-senha-page')).toBeInTheDocument();
  });

  it('usuário sem mustChangePassword continua acessando normalmente', () => {
    loginAs({ id: 'u1', name: 'Teste', role: 'user', mustChangePassword: false });

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route path="/" element={<ProtectedRoute><div>home</div></ProtectedRoute>} />
            <Route path="/trocar-senha" element={<div>trocar</div>} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );

    expect(screen.getByText('home')).toBeInTheDocument();
    expect(screen.queryByText('trocar')).not.toBeInTheDocument();
  });
});
