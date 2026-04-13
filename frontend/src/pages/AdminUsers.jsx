import { useState, useEffect, useCallback, useRef } from 'react';
import { adminService } from '../services/adminService';
import { useAuth } from '../contexts/AuthContext';

// ─── Toast ────────────────────────────────────────────────────────────────────
function useToast() {
  const [toasts, setToasts] = useState([]);
  const add = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts(t => [...t, { id, message, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000);
  }, []);
  return { toasts, toast: add };
}

function ToastContainer({ toasts }) {
  if (!toasts.length) return null;
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-sm font-medium animate-fadeIn
            ${t.type === 'error' ? 'bg-red-600 text-white' : t.type === 'warning' ? 'bg-amber-500 text-white' : 'bg-green-600 text-white'}`}
        >
          <span>{t.type === 'error' ? '✕' : t.type === 'warning' ? '⚠' : '✓'}</span>
          {t.message}
        </div>
      ))}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function TableSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            {['Usuário', 'Email', 'Perfil', 'Status', 'Criado em', 'Último login', ''].map(h => (
              <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {Array.from({ length: 4 }).map((_, i) => (
            <tr key={i}>
              <td className="px-4 py-3"><div className="flex items-center gap-2"><div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" /><div className="h-4 w-28 rounded bg-gray-200 animate-pulse" /></div></td>
              <td className="px-4 py-3"><div className="h-4 w-36 rounded bg-gray-200 animate-pulse" /></td>
              <td className="px-4 py-3"><div className="h-5 w-16 rounded-full bg-gray-200 animate-pulse" /></td>
              <td className="px-4 py-3"><div className="h-5 w-14 rounded-full bg-gray-200 animate-pulse" /></td>
              <td className="px-4 py-3"><div className="h-4 w-20 rounded bg-gray-200 animate-pulse" /></td>
              <td className="px-4 py-3"><div className="h-4 w-20 rounded bg-gray-200 animate-pulse" /></td>
              <td className="px-4 py-3"><div className="h-4 w-24 rounded bg-gray-200 animate-pulse" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Modal de confirmação genérico ────────────────────────────────────────────
function ConfirmActionModal({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirmar', variant = 'warning' }) {
  if (!open) return null;
  const colors = {
    warning: { icon: '⚠', bg: 'bg-amber-100', text: 'text-amber-600', btn: 'bg-amber-500 hover:bg-amber-600' },
    danger:  { icon: '✕', bg: 'bg-red-100',    text: 'text-red-600',    btn: 'bg-red-600 hover:bg-red-700' },
    success: { icon: '✓', bg: 'bg-green-100',  text: 'text-green-600',  btn: 'bg-green-600 hover:bg-green-700' },
  };
  const c = colors[variant] || colors.warning;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-5">
        <div className="flex justify-center">
          <div className={`w-14 h-14 rounded-full ${c.bg} flex items-center justify-center text-2xl ${c.text} font-bold`}>{c.icon}</div>
        </div>
        <div className="text-center">
          <h3 className="text-lg font-bold text-slate-900 mb-1">{title}</h3>
          <p className="text-slate-600 text-sm">{message}</p>
        </div>
        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200 text-sm transition-all">Cancelar</button>
          <button onClick={() => { onConfirm(); onClose(); }} className={`flex-1 px-4 py-2.5 rounded-xl text-white font-semibold text-sm transition-all ${c.btn}`}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal de criar usuário ────────────────────────────────────────────────────
function CreateUserModal({ onClose, onCreated, toast }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await adminService.createUser({ name: form.name, email: form.email, password: form.password });
      onCreated(res.data.data);
      toast('Usuário criado com sucesso!');
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao criar usuário');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
        <h2 className="text-lg font-bold mb-4 text-gray-800">Novo Usuário</h2>
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">{error}</div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
            <input type="text" required value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="Nome completo" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" required value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="email@exemplo.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
            <input type="password" required minLength={6} value={form.password} onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="Mínimo 6 caracteres" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Senha</label>
            <input type="password" required minLength={6} value={form.confirmPassword} onChange={(e) => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:outline-none ${form.confirmPassword && form.password !== form.confirmPassword ? 'border-red-400 focus:ring-red-400' : 'border-gray-300 focus:ring-blue-500'}`}
              placeholder="Repita a senha" />
            {form.confirmPassword && form.password !== form.confirmPassword && (
              <p className="text-xs text-red-500 mt-1">As senhas não coincidem.</p>
            )}
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm hover:bg-gray-50">Cancelar</button>
            <button type="submit" disabled={loading} className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm hover:bg-blue-700 disabled:opacity-60">
              {loading ? 'Criando...' : 'Criar Usuário'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function UserAvatar({ user }) {
  const initial = user.name?.charAt(0).toUpperCase() ?? '?';
  if (user.role === 'admin') {
    return (
      <div className="relative w-8 h-8">
        <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-semibold text-sm ring-2 ring-amber-400">
          {initial}
        </div>
        <span className="absolute -top-1 -right-1 text-[10px] leading-none" title="Administrador">🛡️</span>
      </div>
    );
  }
  return (
    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold text-sm">
      {initial}
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [confirmModal, setConfirmModal] = useState(null); // { type, userId, label }
  const { user: currentUser } = useAuth();
  const { toasts, toast } = useToast();

  // Mapa id → nome para tooltip de "criado por"
  const userNameMap = useRef({});

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await adminService.listUsers();
      const list = res.data.data;
      setUsers(list);
      // Construir mapa de nomes
      const map = {};
      list.forEach(u => { map[u.id] = u.name; });
      userNameMap.current = map;
    } catch {
      setError('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleDeactivate = (id, name) => {
    setConfirmModal({
      type: 'deactivate', userId: id,
      title: 'Desativar usuário',
      message: `Deseja desativar a conta de "${name}"? Os dados serão preservados.`,
      confirmLabel: 'Desativar',
      variant: 'danger',
    });
  };

  const handleReactivate = (id, name) => {
    setConfirmModal({
      type: 'reactivate', userId: id,
      title: 'Reativar usuário',
      message: `Deseja reativar a conta de "${name}"?`,
      confirmLabel: 'Reativar',
      variant: 'success',
    });
  };

  const handleChangeRole = (id, newRole, name) => {
    const label = newRole === 'admin' ? 'promover para Admin' : 'rebaixar para Usuário';
    setConfirmModal({
      type: 'role', userId: id, newRole,
      title: `${newRole === 'admin' ? 'Promover' : 'Rebaixar'} usuário`,
      message: `Deseja ${label} a conta de "${name}"? O usuário será desconectado imediatamente.`,
      confirmLabel: newRole === 'admin' ? '↑ Promover' : '↓ Rebaixar',
      variant: newRole === 'admin' ? 'warning' : 'warning',
    });
  };

  const executeConfirm = async () => {
    if (!confirmModal) return;
    const { type, userId, newRole } = confirmModal;
    setActionLoading(userId + (type === 'role' ? '-role' : ''));
    try {
      if (type === 'deactivate') {
        await adminService.deactivateUser(userId);
        setUsers(u => u.map(usr => usr.id === userId ? { ...usr, is_active: false } : usr));
        toast('Usuário desativado.');
      } else if (type === 'reactivate') {
        await adminService.reactivateUser(userId);
        setUsers(u => u.map(usr => usr.id === userId ? { ...usr, is_active: true } : usr));
        toast('Usuário reativado.');
      } else if (type === 'role') {
        const res = await adminService.changeRole(userId, newRole);
        setUsers(u => u.map(usr => usr.id === userId ? { ...usr, role: res.data.data.role } : usr));
        toast(`Perfil alterado para ${newRole === 'admin' ? 'Admin' : 'Usuário'}.`);
      }
    } catch (err) {
      toast(err.response?.data?.error || 'Erro ao executar ação.', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // Filtro + busca
  const filtered = users.filter(u => {
    const matchSearch = !search ||
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === 'all' || u.role === filterRole;
    const matchStatus = filterStatus === 'all' || (filterStatus === 'active' ? u.is_active : !u.is_active);
    return matchSearch && matchRole && matchStatus;
  });

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      {/* Header */}
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

      {/* Busca + Filtros */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nome ou email..."
          className="flex-1 min-w-[200px] border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
        <select
          value={filterRole}
          onChange={e => setFilterRole(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
        >
          <option value="all">Todos os perfis</option>
          <option value="admin">Admin</option>
          <option value="user">Usuário</option>
        </select>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
        >
          <option value="all">Todos os status</option>
          <option value="active">Ativos</option>
          <option value="inactive">Inativos</option>
        </select>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">{error}</div>
      )}

      {loading ? (
        <TableSkeleton />
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
              {filtered.map((user) => {
                const isMe = user.id === currentUser?.id;
                const createdByName = user.created_by ? (userNameMap.current[user.created_by] || user.created_by) : null;
                return (
                  <tr key={user.id} className={!user.is_active ? 'opacity-50' : ''}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <UserAvatar user={user} />
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-gray-800">{user.name}</span>
                          {isMe && (
                            <span className="text-[10px] font-semibold bg-blue-100 text-blue-600 rounded px-1.5 py-0.5 leading-none">Você</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{user.email}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${user.role === 'admin' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}`}>
                        {user.role === 'admin' ? '🛡️ Admin' : 'Usuário'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${user.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {user.is_active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      <span title={createdByName ? `Criado por: ${createdByName}` : undefined} className={createdByName ? 'cursor-help underline decoration-dotted' : ''}>
                        {user.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR') : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {user.last_login ? new Date(user.last_login).toLocaleDateString('pt-BR') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {!isMe && (
                        <div className="flex items-center gap-3">
                          {user.role === 'user' ? (
                            <button
                              onClick={() => handleChangeRole(user.id, 'admin', user.name)}
                              disabled={actionLoading === user.id + '-role'}
                              className="text-amber-600 hover:text-amber-800 text-xs font-medium disabled:opacity-50"
                              title="Promover para Admin"
                            >
                              ↑ Admin
                            </button>
                          ) : (
                            <button
                              onClick={() => handleChangeRole(user.id, 'user', user.name)}
                              disabled={actionLoading === user.id + '-role'}
                              className="text-gray-500 hover:text-gray-700 text-xs font-medium disabled:opacity-50"
                              title="Rebaixar para Usuário"
                            >
                              ↓ Usuário
                            </button>
                          )}
                          {user.is_active ? (
                            <button
                              onClick={() => handleDeactivate(user.id, user.name)}
                              disabled={actionLoading === user.id}
                              className="text-red-600 hover:text-red-800 text-xs font-medium disabled:opacity-50"
                            >
                              Desativar
                            </button>
                          ) : (
                            <button
                              onClick={() => handleReactivate(user.id, user.name)}
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
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              {users.length === 0 ? 'Nenhum usuário cadastrado ainda.' : 'Nenhum usuário encontrado para os filtros aplicados.'}
            </div>
          )}
        </div>
      )}

      {/* Contador */}
      {!loading && users.length > 0 && (
        <p className="text-xs text-gray-400 mt-3">
          Mostrando {filtered.length} de {users.length} usuário{users.length !== 1 ? 's' : ''}
        </p>
      )}

      {/* Modais */}
      {showModal && (
        <CreateUserModal
          onClose={() => setShowModal(false)}
          onCreated={(newUser) => {
            setUsers(u => [newUser, ...u]);
            userNameMap.current[newUser.id] = newUser.name;
          }}
          toast={toast}
        />
      )}

      <ConfirmActionModal
        open={!!confirmModal}
        onClose={() => setConfirmModal(null)}
        onConfirm={executeConfirm}
        title={confirmModal?.title}
        message={confirmModal?.message}
        confirmLabel={confirmModal?.confirmLabel}
        variant={confirmModal?.variant}
      />

      <ToastContainer toasts={toasts} />
    </div>
  );
}
