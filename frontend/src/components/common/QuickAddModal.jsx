// Modal de Cadastro Rápido - Atleta/Adversário
import { useState } from 'react';

export default function QuickAddModal({ isOpen, onClose, type, onSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    belt: 'Branca'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const belts = ['Branca', 'Azul', 'Roxa', 'Marrom', 'Preta'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('Nome é obrigatório');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await onSuccess(formData);
      // Resetar form
      setFormData({ name: '', belt: 'Branca' });
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao cadastrar. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-900">
              Cadastro Rápido
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              Novo {type === 'athlete' ? 'atleta' : 'adversário'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nome */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Nome *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Digite o nome..."
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              autoFocus
            />
          </div>

          {/* Faixa */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Faixa
            </label>
            <div className="flex flex-wrap justify-center gap-2">
              {belts.map((belt) => (
                <button
                  key={belt}
                  type="button"
                  onClick={() => setFormData({ ...formData, belt })}
                  className={`rounded-full border px-4 py-2 text-xs font-semibold text-center transition-all ${
                    formData.belt === belt
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-500/20'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {belt}
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50"
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition-all hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Cadastrando...' : 'Cadastrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
