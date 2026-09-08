// Formulário único de atleta/adversário (spec 013) — substitui `AthleteForm`
// e o formulário embutido em `QuickAddModal`, que eram o mesmo par nome+faixa
// escrito duas vezes.
//
// Envia SÓ os campos que ele coleta. A versão anterior mandava `initialData`
// inteiro de volta (id, userId, technicalSummary…), e era isso que permitia a
// corrida em que trocar a faixa sobrescrevia um resumo regenerado em
// background. O `compact` deixa a tela de cadastro rápido pedir nome e faixa
// e nada mais.
import { useState } from 'react';
import { BELTS, DEFAULT_BELT, BELT_BADGE_CLASSES, personLabels } from '../../constants/persons';

/**
 * Campos opcionais. Até a spec 013 o backend fabricava `age: 25`, `weight: 75`
 * e `cardio: 50` quando o campo era omitido, e a tela de estratégia exibia
 * isso como fato — enquanto NENHUMA tela os coletava. Hoje campo vazio vale
 * `null` no banco, e é este formulário que dá ao usuário como informá-los.
 *
 * Os limites espelham `server/src/schemas/requests/person.js`: divergir aqui
 * produz um 400 que o usuário não consegue explicar.
 */
const OPTIONAL_FIELDS = [
  { name: 'age', label: 'Idade', type: 'number', min: 4, max: 100, suffix: 'anos' },
  { name: 'weight', label: 'Peso', type: 'number', min: 20, max: 250, step: '0.1', suffix: 'kg' },
  { name: 'height', label: 'Altura', type: 'number', min: 100, max: 250, suffix: 'cm' },
  { name: 'cardio', label: 'Condicionamento', type: 'number', min: 0, max: 100, suffix: '%' },
  { name: 'style', label: 'Estilo', type: 'text', maxLength: 100, placeholder: 'Ex: Guardeiro' },
  { name: 'strongAttacks', label: 'Pontos fortes', type: 'textarea', maxLength: 2000, placeholder: 'Ex: triângulo, raspagem de gancho' },
  { name: 'weaknesses', label: 'Pontos fracos', type: 'textarea', maxLength: 2000, placeholder: 'Ex: cansa no terceiro round' },
];

function mensagemDeErro(err) {
  const issues = err?.response?.data?.issues;
  if (Array.isArray(issues) && issues.length > 0) {
    return issues.map((i) => i.mensagem).join(' ');
  }
  return err?.response?.data?.error || 'Erro ao salvar. Tente novamente.';
}

/** Estado inicial dos opcionais como string, para o input controlado. */
function buildOptionalState(initialData) {
  return OPTIONAL_FIELDS.reduce((acc, field) => {
    const value = initialData?.[field.name];
    acc[field.name] = value === null || value === undefined ? '' : String(value);
    return acc;
  }, {});
}

export default function PersonForm({ type, initialData, onSubmit, submitLabel, compact = false }) {
  const labels = personLabels(type);
  const [name, setName] = useState(initialData?.name ?? '');
  const [belt, setBelt] = useState(initialData?.belt ?? DEFAULT_BELT);
  const [optional, setOptional] = useState(() => buildOptionalState(initialData));
  const [showOptional, setShowOptional] = useState(false);
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

    const payload = { name: trimmed, belt };

    if (!compact) {
      OPTIONAL_FIELDS.forEach(({ name: field, type: fieldType }) => {
        const raw = (optional[field] ?? '').trim();
        // Vazio vira `null` explícito: é assim que o usuário LIMPA um campo.
        // Omitir a chave faria o backend deixar o valor antigo intacto.
        if (raw === '') {
          if (initialData?.[field] !== null && initialData?.[field] !== undefined) {
            payload[field] = null;
          }
          return;
        }
        payload[field] = fieldType === 'number' ? Number(raw) : raw;
      });
    }

    setSubmitting(true);
    setSubmitError('');
    try {
      await onSubmit(payload);
      if (!initialData?.id) {
        setName('');
        setBelt(DEFAULT_BELT);
        setOptional(buildOptionalState(null));
        setShowOptional(false);
      }
    } catch (err) {
      setSubmitError(mensagemDeErro(err));
    } finally {
      setSubmitting(false);
    }
  };

  const setOptionalField = (field, value) => setOptional((prev) => ({ ...prev, [field]: value }));

  const preenchidos = OPTIONAL_FIELDS.filter((f) => (optional[f.name] ?? '') !== '').length;

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

      {!compact && (
        <div className="rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setShowOptional((v) => !v)}
            aria-expanded={showOptional}
            className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <span>
              Dados opcionais
              {preenchidos > 0 && <span className="ml-2 text-xs text-slate-500">({preenchidos} preenchido{preenchidos > 1 ? 's' : ''})</span>}
            </span>
            <svg
              className={`h-4 w-4 transition-transform ${showOptional ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <div hidden={!showOptional} className="space-y-4 border-t border-slate-200 px-4 py-4">
            <p className="text-xs text-slate-500">
              Deixe em branco o que não souber. Campo vazio fica como “não informado”, e a tela de estratégia não exibe nada no lugar.
            </p>

            <div className="grid grid-cols-2 gap-3">
              {OPTIONAL_FIELDS.filter((f) => f.type === 'number').map((field) => (
                <div key={field.name}>
                  <label htmlFor={`person-${field.name}`} className="mb-1 block text-xs font-medium text-slate-600">
                    {field.label} <span className="text-slate-400">({field.suffix})</span>
                  </label>
                  <input
                    id={`person-${field.name}`}
                    name={field.name}
                    type="number"
                    inputMode="decimal"
                    min={field.min}
                    max={field.max}
                    step={field.step}
                    value={optional[field.name]}
                    onChange={(e) => setOptionalField(field.name, e.target.value)}
                    className={`w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 ${labels.accent.ring}`}
                  />
                </div>
              ))}
            </div>

            {OPTIONAL_FIELDS.filter((f) => f.type !== 'number').map((field) => (
              <div key={field.name}>
                <label htmlFor={`person-${field.name}`} className="mb-1 block text-xs font-medium text-slate-600">
                  {field.label}
                </label>
                {field.type === 'textarea' ? (
                  <textarea
                    id={`person-${field.name}`}
                    name={field.name}
                    rows={2}
                    maxLength={field.maxLength}
                    placeholder={field.placeholder}
                    value={optional[field.name]}
                    onChange={(e) => setOptionalField(field.name, e.target.value)}
                    className={`w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 ${labels.accent.ring}`}
                  />
                ) : (
                  <input
                    id={`person-${field.name}`}
                    name={field.name}
                    type="text"
                    maxLength={field.maxLength}
                    placeholder={field.placeholder}
                    value={optional[field.name]}
                    onChange={(e) => setOptionalField(field.name, e.target.value)}
                    className={`w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 ${labels.accent.ring}`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

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
