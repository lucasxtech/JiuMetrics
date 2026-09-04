// Formulário único de atleta/adversário (spec 013) — substitui `AthleteForm`
// e o formulário embutido em `QuickAddModal`, que eram o mesmo par nome+faixa
// escrito duas vezes.
//
// Envia SÓ `{ name, belt }`. A versão anterior mandava `initialData` inteiro
// de volta (id, userId, technicalSummary…), e era isso que permitia a corrida
// em que trocar a faixa sobrescrevia um resumo regenerado em background.
import { useState } from 'react';
import { BELTS, DEFAULT_BELT, BELT_BADGE_CLASSES, personLabels } from '../../constants/persons';

function mensagemDeErro(err) {
  const issues = err?.response?.data?.issues;
  if (Array.isArray(issues) && issues.length > 0) {
    return issues.map((i) => i.mensagem).join(' ');
  }
  return err?.response?.data?.error || 'Erro ao salvar. Tente novamente.';
}

export default function PersonForm({ type, initialData, onSubmit, submitLabel }) {
  const labels = personLabels(type);
  const [name, setName] = useState(initialData?.name ?? '');
  const [belt, setBelt] = useState(initialData?.belt ?? DEFAULT_BELT);
  const [fieldError, setFieldError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setFieldError('Nome é obrigatório');
      return;
    }

    setSubmitting(true);
    setSubmitError('');
    try {
      await onSubmit({ name: trimmed, belt });
      if (!initialData?.id) {
        setName('');
        setBelt(DEFAULT_BELT);
      }
    } catch (err) {
      setSubmitError(mensagemDeErro(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {submitError && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {submitError}
        </div>
      )}

      <div>
        <label htmlFor="person-name" className="mb-1.5 block text-sm font-medium text-slate-700">
          Nome {labels.article} *
        </label>
        <input
          id="person-name"
          type="text"
          name="name"
          value={name}
          autoFocus
          onChange={(e) => {
            setName(e.target.value);
            if (fieldError) setFieldError('');
          }}
          placeholder="Ex: João Silva"
          className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all focus:ring-2 ${labels.accent.ring} ${
            fieldError ? 'border-red-500' : 'border-slate-200'
          }`}
        />
        {fieldError && <p className="mt-1 text-sm font-medium text-red-600">{fieldError}</p>}
      </div>

      <div>
        <span className="mb-1.5 block text-sm font-medium text-slate-700">Faixa</span>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Faixa">
          {BELTS.map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={belt === option}
              onClick={() => setBelt(option)}
              className={`rounded-full border px-4 py-2 text-xs font-semibold transition-all ${
                belt === option
                  ? labels.accent.pill
                  : `${BELT_BADGE_CLASSES[option]} hover:opacity-80`
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className={`w-full rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-lg transition-all disabled:cursor-not-allowed disabled:opacity-50 ${labels.accent.button}`}
      >
        {submitting ? 'Salvando...' : submitLabel || (initialData?.id ? `Salvar ${labels.singular.toLowerCase()}` : `Cadastrar ${labels.singular.toLowerCase()}`)}
      </button>
    </form>
  );
}
