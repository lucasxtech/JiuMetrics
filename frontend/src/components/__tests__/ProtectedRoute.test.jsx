import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from '../ProtectedRoute';

describe('ProtectedRoute', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('deve redirecionar para /login quando não há token', () => {
    render(
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
    );

    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('deve mostrar conteúdo protegido quando há token válido', () => {
    // CRÍTICO: Usar a chave correta 'jiumetrics_token'
    localStorage.setItem('jiumetrics_token', 'valid-token');

    render(
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
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
  });

  it('CRÍTICO: deve usar a chave "jiumetrics_token" e não "token"', () => {
    // Simular o bug antigo: token salvo como 'jiumetrics_token'
    localStorage.setItem('jiumetrics_token', 'valid-token');
    
    // Mas se ProtectedRoute buscar como 'token', vai falhar
    localStorage.setItem('token', null);

    render(
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
    );

    // Deve mostrar conteúdo protegido porque a chave correta está sendo usada
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('PREVENIR BUG: token com chave errada não deve permitir acesso', () => {
    // Salvar token com a chave ERRADA
    localStorage.setItem('token', 'valid-token'); // Chave errada!
    
    // Não salvar com a chave correta
    // localStorage.setItem('jiumetrics_token', 'valid-token'); // Comentado propositalmente

    render(
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
    );

    // Deve redirecionar para login porque a chave correta não existe
    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });
});
