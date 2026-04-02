import { useState, useEffect } from 'react';
import { adminService } from '../services/adminService';
import { useAuth } from '../contexts/AuthContext';

const BELT_COLORS = {
  admin: 'bg-black text-white',
  user: 'bg-blue-100 text-blue-800',
};

function CreateUserModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await adminService.createUser(form);
      onCreated(res.data.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao criar usuário');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
        <h2 className="text-lg font-bold mb-4 text-gray-800">Novo Usuário</h2>
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="Nome completo"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="email@exemplo.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
            <input
              type="password"
              required
              minLength={6}
              value={form.password}
              onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="Mínimo 6 caracteres"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? 'Criando...' : 'Criar Usuário'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const { user: currentUser } = useAuth();

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await adminService.listUsers();
      setUsers(res.data.data);
    } catch {
      setError('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleDeactivate = async (id) => {
    if (!window.confirm('Desativar este usuário? Os dados dele serão preservados.')) return;
    setActionLoading(id);
    try {
      await adminService.deactivateUser(id);
      setUsers(u => u.map(usr => usr.id === id ? { ...usr, is_active: false } : usr));
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao desativar');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReactivate = async (id) => {
    setActionLoading(id);
    try {
      await adminService.reactivateUser(id);
      setUsers(u => u.map(usr => usr.id === id ? { ...usr, is_active: true } : usr));
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao reativar');
    } finally {
      setActionLoading(null);
    }
  };

  const handleChangeRole = async (id, newRole) => {
    const label = newRole === 'admin' ? 'promover para Admin' : 'rebaixar para Usuário';
    if (!window.confirm(`Deseja ${label} este usuário?`)) return;
    setActionLoading(id + '-role');
    try {
      const res = await adminService.changeRole(id, newRole);
      setUsers(u => u.map(usr => usr.id === id ? { ...usr, role: res.data.data.role } : usr));
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao alterar perfil');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gerenciar Usuários</h1>
          <p className="text-sm text-gray-500 mt-1">
            Crie e gerencie os usuários da plataforma. Os dados de cada usuário são isolados.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2"
        >
          + Novo Usuário
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400">Carregando...</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Usuário</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Perfil</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Criado em</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Último login</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((user) => (
                <tr key={user.id} className={!user.is_active ? 'opacity-50' : ''}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold text-sm">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-gray-800">{user.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{user.email}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${BELT_COLORS[user.role] || BELT_COLORS.user}`}>
                      {user.role === 'admin' ? 'Admin' : 'Usuário'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${user.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {user.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {user.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR') : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {user.last_login ? new Date(user.last_login).toLocaleDateString('pt-BR') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {user.id !== currentUser?.id && (
                      <div className="flex items-center gap-3">
                        {/* Promote / Demote */}
                        {user.role === 'user' ? (
                          <button
                            onClick={() => handleChangeRole(user.id, 'admin')}
                            disabled={actionLoading === user.id + '-role'}
                            className="text-amber-600 hover:text-amber-800 text-xs font-medium disabled:opacity-50"
                            title="Promover para Admin"
                          >
                            ↑ Admin
                          </button>
                        ) : (
                          <button
                            onClick={() => handleChangeRole(user.id, 'user')}
                            disabled={actionLoading === user.id + '-role'}
                            className="text-gray-500 hover:text-gray-700 text-xs font-medium disabled:opacity-50"
                            title="Rebaixar para Usuário"
                          >
                            ↓ Usuário
                          </button>
                        )}

                        {/* Activate / Deactivate */}
                        {user.is_active ? (
                          <button
                            onClick={() => handleDeactivate(user.id)}
                            disabled={actionLoading === user.id}
                            className="text-red-600 hover:text-red-800 text-xs font-medium disabled:opacity-50"
                          >
                            Desativar
                          </button>
                        ) : (
                          <button
                            onClick={() => handleReactivate(user.id)}
                            disabled={actionLoading === user.id}
                            className="text-green-600 hover:text-green-800 text-xs font-medium disabled:opacity-50"
                          >
                            Reativar
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              Nenhum usuário cadastrado ainda.
            </div>
          )}
        </div>
      )}

      {showModal && (
        <CreateUserModal
          onClose={() => setShowModal(false)}
          onCreated={(newUser) => setUsers(u => [newUser, ...u])}
        />
      )}
    </div>
  );
}
