import { describe, it, expect, beforeEach, vi } from 'vitest';
import api from '../api';

/**
 * Interceptor de resposta de `api.js` (spec 014, revisão T12, achado 1).
 *
 * Bug real: `POST /auth/change-password` devolve 401 quando a senha ATUAL
 * está errada, sem que a sessão tenha ficado inválida — mas o interceptor
 * tratava QUALQUER 401 como sessão inválida, limpando `localStorage` e
 * redirecionando para /login antes de `ChangePassword.jsx` conseguir
 * mostrar "Senha atual incorreta." inline. A correção: um 401 cuja
 * `config.skipAuthLogout === true` não derruba a sessão.
 *
 * O interceptor é testado diretamente (via `api.interceptors.response`,
 * que o axios expõe como `{ handlers: [{ rejected, fulfilled }] }`) em vez
 * de disparar uma request de verdade — mais rápido e não depende de mock
 * de adapter.
 */
function getRejectedHandler() {
  const handler = api.interceptors.response.handlers.find((h) => h && typeof h.rejected === 'function');
  if (!handler) throw new Error('Nenhum interceptor de resposta registrado em api.js');
  return handler.rejected;
}

describe('api — interceptor de resposta em 401', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('jiumetrics_token', 'token-valido');
    localStorage.setItem('jiumetrics_user', JSON.stringify({ id: 'u1', name: 'Teste' }));
    vi.spyOn(window, 'dispatchEvent');
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('401 sem skipAuthLogout limpa a sessão e dispara auth:logout', async () => {
    const error = { message: 'Unauthorized', response: { status: 401, data: { error: 'Token inválido' } }, config: {} };

    await expect(getRejectedHandler()(error)).rejects.toBe(error);

    expect(localStorage.getItem('jiumetrics_token')).toBeNull();
    expect(localStorage.getItem('jiumetrics_user')).toBeNull();
    expect(window.dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'auth:logout' }));
  });

  it('401 com skipAuthLogout mantém a sessão intacta e não dispara logout', async () => {
    const error = {
      message: 'Unauthorized',
      response: { status: 401, data: { error: 'Senha atual incorreta.' } },
      config: { skipAuthLogout: true },
    };

    await expect(getRejectedHandler()(error)).rejects.toBe(error);

    expect(localStorage.getItem('jiumetrics_token')).toBe('token-valido');
    expect(localStorage.getItem('jiumetrics_user')).not.toBeNull();
    expect(window.dispatchEvent).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'auth:logout' }));
  });

  it('erro sem status 401 não mexe na sessão', async () => {
    const error = { message: 'Server error', response: { status: 500, data: {} }, config: {} };

    await expect(getRejectedHandler()(error)).rejects.toBe(error);

    expect(localStorage.getItem('jiumetrics_token')).toBe('token-valido');
    expect(window.dispatchEvent).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'auth:logout' }));
  });
});
