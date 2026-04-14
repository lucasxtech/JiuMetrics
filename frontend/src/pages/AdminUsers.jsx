import { useState, useEffect, useCallback, useRef } from 'react';
import { adminService } from '../services/adminService';
import { useAuth } from '../contexts/AuthContext';
import CustomSelect from '../components/common/CustomSelect';

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
        <div key={t.id} className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-sm font-medium animate-fadeIn ${t.type === 'error' ? 'bg-red-600 text-white' : t.type === 'warning' ? 'bg-amber-500 text-white' : 'bg-green-600 text-white'}`}>
          {t.type === 'error'
            ? <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            : <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          }
          {t.message}
        </div>
      ))}
    </div>
  );
}

// ─── Modal de confirmação ─────────────────────────────────────────────────────
function ConfirmActionModal({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirmar', variant = 'warning' }) {
  if (!open) return null;
  const styles = {
    warning: { iconBg: 'bg-amber-100', iconColor: 'text-amber-600', btn: 'bg-amber-500 hover:bg-amber-600' },
    danger:  { iconBg: 'bg-red-100',   iconColor: 'text-red-600',   btn: 'bg-red-600 hover:bg-red-700' },
    success: { iconBg: 'bg-green-100', iconColor: 'text-green-600', btn: 'bg-green-600 hover:bg-green-700' },
  };
  const s = styles[variant] || styles.warning;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-5">
        <div className="flex justify-center">
          <div className={`w-14 h-14 rounded-full ${s.iconBg} ${s.iconColor} flex items-center justify-center`}>
            {variant === 'danger'
              ? <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
              : variant === 'success'
              ? <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              : <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            }
          </div>
        </div>
        <div className="text-center">
          <h3 className="text-lg font-bold text-slate-900 mb-1">{title}</h3>
          <p className="text-slate-600 text-sm">{message}</p>
        </div>
        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200 text-sm transition-all">Cancelar</button>
          <button onClick={() => { onConfirm(); onClose(); }} className={`flex-1 px-4 py-2.5 rounded-xl text-white font-semibold text-sm transition-all ${s.btn}`}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal excluir usuário ────────────────────────────────────────────────────
function DeleteUserModal({ user, otherUsers, onClose, onDeleted, toast }) {
  const [confirmText, setConfirmText] = useState('');
  const [transferData, setTransferData] = useState(false);
  const [transferToUserId, setTransferToUserId] = useState('');
  const [loading, setLoading] = useState(false);

  const canConfirm = confirmText === 'excluir' && (!transferData || transferToUserId);

  const handleSubmit = async () => {
    if (!canConfirm) return;
    setLoading(true);
    try {
      await adminService.deleteUser(user.id, transferData ? transferToUserId : null);
      toast(`Usuário "${user.name}" excluído${transferData ? ' e dados transferidos' : ''}.`);
      onDeleted(user.id);
      onClose();
    } catch (err) {
      toast(err.response?.data?.error || 'Erro ao excluir usuário.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={loading ? undefined : onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-5">

        {/* Ícone de aviso */}
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M4 7h16M10 3h4a1 1 0 011 1v3H9V4a1 1 0 011-1z" />
            </svg>
          </div>
        </div>

        {/* Título */}
        <div className="text-center">
          <h3 className="text-lg font-bold text-slate-900 mb-1">Excluir usuário</h3>
          <p className="text-slate-500 text-sm">
            Você está prestes a excluir <span className="font-semibold text-slate-800">"{user.name}"</span>.
          </p>
        </div>

        {/* Aviso de irreversibilidade */}
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 flex gap-2">
          <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <span>Esta ação é <strong>irreversível</strong>. O usuário e todos os dados não transferidos serão removidos permanentemente.</span>
        </div>

        {/* Transferência de dados */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-slate-700">Deseja guardar os dados deste usuário?</p>
          <div className="flex gap-3">
            <button
              onClick={() => setTransferData(false)}
              className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${!transferData ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}
            >
              Não, descartar
            </button>
            {otherUsers.length > 0 && (
              <button
                onClick={() => { setTransferData(true); setTransferToUserId(''); }}
                className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${transferData ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}
              >
                Sim, transferir
              </button>
            )}
          </div>

          {transferData && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600">Transferir dados para:</label>
              <select
                value={transferToUserId}
                onChange={e => setTransferToUserId(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none"
              >
                <option value="">Selecione um usuário...</option>
                {otherUsers.map(u => (
                  <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                ))}
              </select>
              <p className="text-xs text-slate-400">Atletas, adversários e análises serão transferidos para o usuário selecionado.</p>
            </div>
          )}
        </div>

        {/* Campo de confirmação */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-600">
            Para confirmar, digite <span className="font-bold text-red-600">excluir</span>:
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={e => setConfirmText(e.target.value)}
            placeholder="excluir"
            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-red-400 focus:border-red-400 focus:outline-none transition-colors"
          />
        </div>

        {/* Botões */}
        <div className="flex gap-3 pt-1">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200 text-sm transition-all disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canConfirm || loading}
            className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading && <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />}
            Excluir definitivamente
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal criar usuário ──────────────────────────────────────────────────────
function CreateUserModal({ onClose, onCreated, toast }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) { setError('As senhas não coincidem.'); return; }
    setLoading(true); setError('');
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-slate-900">Novo Usuário</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        {error && <div className="mb-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { id: 'name', label: 'Nome', type: 'text', placeholder: 'Nome completo', key: 'name' },
            { id: 'email', label: 'Email', type: 'email', placeholder: 'email@exemplo.com', key: 'email' },
            { id: 'password', label: 'Senha', type: 'password', placeholder: 'Mínimo 6 caracteres', key: 'password', min: 6 },
            { id: 'confirmPassword', label: 'Confirmar Senha', type: 'password', placeholder: 'Repita a senha', key: 'confirmPassword', min: 6 },
          ].map(f => (
            <div key={f.id}>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">{f.label}</label>
              <input
                type={f.type} required minLength={f.min} value={form[f.key]}
                onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:outline-none transition-colors ${
                  f.key === 'confirmPassword' && form.confirmPassword && form.password !== form.confirmPassword
                    ? 'border-red-400 focus:ring-red-400'
                    : 'border-slate-200 focus:ring-indigo-500 focus:border-indigo-500'
                }`}
              />
              {f.key === 'confirmPassword' && form.confirmPassword && form.password !== form.confirmPassword && (
                <p className="text-xs text-red-500 mt-1">As senhas não coincidem.</p>
              )}
            </div>
          ))}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-slate-200 text-slate-700 rounded-xl py-2.5 text-sm font-medium hover:bg-slate-50 transition-colors">Cancelar</button>
            <button type="submit" disabled={loading} className="flex-1 bg-indigo-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 transition-colors">
              {loading ? 'Criando...' : 'Criar Usuário'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function UserAvatar({ user, size = 'md' }) {
  const initial = user.name?.charAt(0).toUpperCase() ?? '?';
  const sz = size === 'lg' ? 'w-10 h-10 text-base' : 'w-8 h-8 text-sm';
  if (user.role === 'admin') {
    return (
      <div className={`relative ${size === 'lg' ? 'w-10 h-10' : 'w-8 h-8'}`}>
        <div className={`${sz} rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-semibold ring-2 ring-amber-300`}>{initial}</div>
        <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-500">
          <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
        </span>
      </div>
    );
  }
  return (
    <div className={`${sz} rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-semibold`}>{initial}</div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function CardSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-4 shadow-sm">
          <div className="w-10 h-10 rounded-full bg-slate-200 animate-pulse shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-36 rounded-lg bg-slate-200 animate-pulse" />
            <div className="h-3 w-48 rounded-lg bg-slate-200 animate-pulse" />
          </div>
          <div className="hidden sm:flex gap-2">
            <div className="h-6 w-14 rounded-full bg-slate-200 animate-pulse" />
            <div className="h-6 w-12 rounded-full bg-slate-200 animate-pulse" />
          </div>
          <div className="h-7 w-24 rounded-lg bg-slate-200 animate-pulse" />
        </div>
      ))}
    </div>
  );
}

// ─── User Card ─────────────────────────────────────────────────────────────────
function UserCard({ user, isMe, onChangeRole, onDeactivate, onReactivate, onDelete, actionLoading }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const menuRef = useRef(null);
  const fmtDate = d => d ? new Date(d).toLocaleDateString('pt-BR') : '—';
  const isLoading = actionLoading === user.id || actionLoading === user.id + '-role';

  const handleToggleMenu = () => {
    if (!menuOpen && menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      // Abre para cima se tiver menos de 180px abaixo do botão
      setOpenUpward(window.innerHeight - rect.bottom < 180);
    }
    setMenuOpen(o => !o);
  };

  // Fechar ao clicar fora
  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  return (
    <div className={`bg-white rounded-2xl border shadow-sm transition-all hover:shadow-md ${!user.is_active ? 'opacity-60 border-slate-200' : 'border-slate-200'}`}>
      <div className="flex items-center gap-4 px-5 py-4">

        {/* Avatar */}
        <div className="shrink-0">
          <UserAvatar user={user} size="lg" />
        </div>

        {/* Info principal */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-900 truncate">{user.name}</span>
            {isMe && (
              <span className="shrink-0 text-[10px] font-bold bg-indigo-100 text-indigo-600 rounded-full px-2 py-0.5 leading-none">Você</span>
            )}
            {!user.is_active && (
              <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
                Inativo
              </span>
            )}
            <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${user.role === 'admin' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
              {user.role === 'admin' && (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              )}
              {user.role === 'admin' ? 'Admin' : 'Usuário'}
            </span>
          </div>
          <p className="text-sm text-slate-400 truncate mt-0.5" title={user.email}>{user.email}</p>
        </div>

        {/* Datas */}
        <div className="hidden lg:flex flex-col items-end gap-0.5 shrink-0 text-xs text-slate-400">
          <span>Criado: {fmtDate(user.created_at)}</span>
          <span>Login: {fmtDate(user.last_login)}</span>
        </div>

        {/* Menu ••• */}
        {!isMe && (
          <div className="shrink-0 relative" ref={menuRef}>
            <button
              onClick={handleToggleMenu}
              disabled={isLoading}
              className="flex items-center justify-center w-8 h-8 rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-600 hover:border-slate-300 disabled:opacity-50 transition-colors"
              title="Ações"
            >
              {isLoading
                ? <span className="w-3.5 h-3.5 rounded-full border-2 border-slate-400 border-t-transparent animate-spin" />
                : <span className="text-slate-500 text-lg font-bold leading-none select-none">⋯</span>
              }
            </button>

            {menuOpen && (
              <div className={`absolute right-0 z-50 w-48 rounded-xl border border-slate-200 bg-white shadow-xl py-1 animate-fadeIn ${openUpward ? 'bottom-10' : 'top-10'}`}>
                {user.role === 'user' ? (
                  <button
                    onClick={() => { onChangeRole(user.id, 'admin', user.name); setMenuOpen(false); }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <svg className="w-4 h-4 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                    Promover para Admin
                  </button>
                ) : (
                  <button
                    onClick={() => { onChangeRole(user.id, 'user', user.name); setMenuOpen(false); }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    Rebaixar para Usuário
                  </button>
                )}
                <div className="my-1 border-t border-slate-100" />
                {user.is_active ? (
                  <button
                    onClick={() => { onDeactivate(user.id, user.name); setMenuOpen(false); }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                    Desativar conta
                  </button>
                ) : (
                  <button
                    onClick={() => { onReactivate(user.id, user.name); setMenuOpen(false); }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-green-600 hover:bg-green-50 transition-colors"
                  >
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Reativar conta
                  </button>
                )}
                <div className="my-1 border-t border-slate-100" />
                <button
                  onClick={() => { onDelete(user.id, user.name); setMenuOpen(false); }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-700 hover:bg-red-50 transition-colors"
                >
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  Excluir
                </button>
              </div>
            )}
          </div>
        )}
      </div>
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
  const [confirmModal, setConfirmModal] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null); // { user }
  const { user: currentUser } = useAuth();
  const { toasts, toast } = useToast();
  const userNameMap = useRef({});

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await adminService.listUsers();
      const list = res.data.data;
      setUsers(list);
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

  const handleDeactivate = (id, name) => setConfirmModal({
    type: 'deactivate', userId: id,
    title: 'Desativar usuário',
    message: `Deseja desativar a conta de "${name}"? Os dados serão preservados.`,
    confirmLabel: 'Desativar', variant: 'danger',
  });

  const handleReactivate = (id, name) => setConfirmModal({
    type: 'reactivate', userId: id,
    title: 'Reativar usuário',
    message: `Deseja reativar a conta de "${name}"?`,
    confirmLabel: 'Reativar', variant: 'success',
  });

  const handleDelete = (id) => {
    const userObj = users.find(u => u.id === id);
    if (userObj) setDeleteModal({ user: userObj });
  };

  const handleChangeRole = (id, newRole, name) => setConfirmModal({
    type: 'role', userId: id, newRole,
    title: newRole === 'admin' ? 'Promover para Admin' : 'Rebaixar para Usuário',
    message: `Deseja ${newRole === 'admin' ? 'promover' : 'rebaixar'} a conta de "${name}"? O usuário será desconectado imediatamente.`,
    confirmLabel: newRole === 'admin' ? 'Promover' : 'Rebaixar', variant: 'warning',
  });

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

  const filtered = users.filter(u => {
    const matchSearch = !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === 'all' || u.role === filterRole;
    const matchStatus = filterStatus === 'all' || (filterStatus === 'active' ? u.is_active : !u.is_active);
    return matchSearch && matchRole && matchStatus;
  });

  const adminCount = users.filter(u => u.role === 'admin').length;
  const activeCount = users.filter(u => u.is_active).length;

  return (
    <div className="dashboard-wrapper animate-fadeIn">
      {/* Header */}
      <section className="panel panel--hero flex justify-between items-center">
        <div>
          <p className="eyebrow">Administração</p>
          <h1 className="hero-title">Gerenciar Usuários</h1>
          <p className="hero-description">Crie e gerencie os usuários da plataforma. Os dados de cada usuário são isolados.</p>
        </div>
        <div className="hero-meta hidden md:flex flex-col items-end gap-4">
          <div className="flex gap-4 text-sm text-slate-500">
            <span><strong className="text-slate-800">{users.length}</strong> usuários</span>
            <span><strong className="text-amber-600">{adminCount}</strong> admins</span>
            <span><strong className="text-green-600">{activeCount}</strong> ativos</span>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
            Novo Usuário
          </button>
        </div>
      </section>

      {/* Botão mobile */}
      <div className="md:hidden flex justify-end">
        <button onClick={() => setShowModal(true)} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
          Novo Usuário
        </button>
      </div>

      {/* Busca + Filtros */}
      <section className="panel py-4!">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nome ou email..."
              className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition-colors"
            />
          </div>
          <CustomSelect value={filterRole} onChange={setFilterRole} className="w-44" options={[
            { value: 'all', label: 'Todos os perfis' },
            { value: 'admin', label: 'Admin' },
            { value: 'user', label: 'Usuário' },
          ]} />
          <CustomSelect value={filterStatus} onChange={setFilterStatus} className="w-44" options={[
            { value: 'all', label: 'Todos os status' },
            { value: 'active', label: 'Ativos' },
            { value: 'inactive', label: 'Inativos' },
          ]} />
        </div>
      </section>

      {error && <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">{error}</div>}

      {/* Lista de usuários */}
      <section>
        {loading ? (
          <CardSkeleton />
        ) : filtered.length === 0 ? (
          <div className="panel text-center py-16">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </div>
            <p className="text-slate-500 text-sm">{users.length === 0 ? 'Nenhum usuário cadastrado ainda.' : 'Nenhum usuário encontrado.'}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(user => (
              <UserCard
                key={user.id}
                user={user}
                isMe={user.id === currentUser?.id}
                onChangeRole={handleChangeRole}
                onDeactivate={handleDeactivate}
                onReactivate={handleReactivate}
                onDelete={handleDelete}
                actionLoading={actionLoading}
              />
            ))}
          </div>
        )}

        {!loading && users.length > 0 && (
          <p className="text-xs text-slate-400 mt-3">
            Mostrando {filtered.length} de {users.length} usuário{users.length !== 1 ? 's' : ''}
          </p>
        )}
      </section>

      {showModal && (
        <CreateUserModal
          onClose={() => setShowModal(false)}
          onCreated={newUser => {
            setUsers(u => [newUser, ...u]);
            userNameMap.current[newUser.id] = newUser.name;
          }}
          toast={toast}
        />
      )}

      <ConfirmActionModal
        open={!!confirmModal} onClose={() => setConfirmModal(null)} onConfirm={executeConfirm}
        title={confirmModal?.title} message={confirmModal?.message}
        confirmLabel={confirmModal?.confirmLabel} variant={confirmModal?.variant}
      />

      {deleteModal && (
        <DeleteUserModal
          user={deleteModal.user}
          otherUsers={users.filter(u => u.id !== deleteModal.user.id)}
          onClose={() => setDeleteModal(null)}
          onDeleted={deletedId => setUsers(u => u.filter(usr => usr.id !== deletedId))}
          toast={toast}
        />
      )}

      <ToastContainer toasts={toasts} />
    </div>
  );
}
