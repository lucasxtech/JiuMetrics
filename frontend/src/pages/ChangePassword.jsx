import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { changePassword } from '../services/authService';
import { useAuth } from '../contexts/AuthContext';

/**
 * Troca de senha (spec 014, R10). É a única rota que um usuário com
 * `mustChangePassword: true` consegue acessar (ver `ProtectedRoute`) —
 * mas também pode ser usada voluntariamente, por isso o texto não presume
 * senha temporária.
 */
export default function ChangePassword() {
  const navigate = useNavigate();
  const { markPasswordChanged, mustChangePassword } = useAuth();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { currentPassword, newPassword, confirmPassword } = form;

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Preencha todos os campos.');
      return;
    }
    if (newPassword.length < 6) {
      setError('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await changePassword({ currentPassword, newPassword });
      markPasswordChanged(res.data.token);
      navigate('/');
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Senha atual incorreta.');
      } else {
        setError(err.response?.data?.error || 'Erro ao trocar a senha.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-wrapper animate-fadeIn">
      <section className="panel panel--hero">
        <p className="eyebrow">Segurança</p>
        <h1 className="hero-title">Trocar senha</h1>
        <p className="hero-description">
          {mustChangePassword
            ? 'Defina uma nova senha para continuar usando o JiuMetrics.'
            : 'Atualize a senha da sua conta.'}
        </p>
      </section>

      <section className="panel max-w-md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="currentPassword" className="block text-sm font-medium text-slate-700 mb-1.5">
              Senha atual
            </label>
            <input
              id="currentPassword"
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              value={form.currentPassword}
              onChange={handleChange}
              disabled={loading}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-slate-700 mb-1.5">
              Nova senha
            </label>
            <input
              id="newPassword"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              minLength={6}
              placeholder="Mínimo 6 caracteres"
              value={form.newPassword}
              onChange={handleChange}
              disabled={loading}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-1.5">
              Confirmar nova senha
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              minLength={6}
              placeholder="Repita a nova senha"
              value={form.confirmPassword}
              onChange={handleChange}
              disabled={loading}
              className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:outline-none transition-colors ${
                form.confirmPassword && form.newPassword !== form.confirmPassword
                  ? 'border-red-400 focus:ring-red-400'
                  : 'border-slate-200 focus:ring-indigo-500 focus:border-indigo-500'
              }`}
            />
            {form.confirmPassword && form.newPassword !== form.confirmPassword && (
              <p className="text-xs text-red-500 mt-1">As senhas não coincidem.</p>
            )}
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 transition-colors"
          >
            {loading ? 'Salvando...' : 'Salvar nova senha'}
          </button>
        </form>
      </section>
    </div>
  );
}
