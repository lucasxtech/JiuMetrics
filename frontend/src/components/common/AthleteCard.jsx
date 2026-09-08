// Card de atleta/adversário nas listas.
// `weight`, `age`, `style` e `technicalProfile` eram recebidos e nunca
// renderizados (F7 da SPEC-FRONTEND) — removidos na spec 013.
import CreatorBadge from './CreatorBadge';
import { BELT_BADGE_CLASSES } from '../../constants/persons';

const ACCENT = {
  athlete: {
    button: 'bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800',
    icon: 'bg-indigo-100 text-indigo-600',
    glow: 'from-indigo-500 to-purple-500',
  },
  opponent: {
    button: 'bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800',
    icon: 'bg-orange-100 text-orange-600',
    glow: 'from-orange-500 to-red-500',
  },
};

export default function AthleteCard({
  name,
  belt,
  analysesCount = 0,
  creatorName = null,
  onClick,
  type = 'athlete',
}) {
  const accent = ACCENT[type] || ACCENT.athlete;
  const analysesLabel =
    analysesCount > 0
      ? `${analysesCount} luta${analysesCount > 1 ? 's' : ''} analisada${analysesCount > 1 ? 's' : ''}`
      : 'Nenhuma análise';

  return (
    <div
      onClick={onClick}
      className="group cursor-pointer rounded-3xl border border-white/60 bg-white/90 shadow-[0_12px_30px_rgba(15,23,42,0.12)] backdrop-blur transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(15,23,42,0.18)] animate-scaleIn"
    >
      <div className="relative p-6 pb-4">
        <div className={`absolute right-0 top-0 h-32 w-32 rounded-full bg-gradient-to-br ${accent.glow} opacity-5 blur-3xl`} />

        <div className="relative">
          <div className="mb-4 flex items-start gap-3">
            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl text-lg font-bold shadow-sm ${accent.icon}`}>
              {name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-lg font-semibold leading-tight text-slate-900 transition-colors group-hover:text-indigo-600">
                {name}
              </h3>
            </div>
            {creatorName && <CreatorBadge creatorName={creatorName} />}
            {belt && (
              <span
                className={`badge-modern border-2 px-3 py-1 text-xs ${BELT_BADGE_CLASSES[belt] || 'bg-slate-50 text-slate-700'}`}
                aria-label={`Faixa ${belt}`}
              >
                {belt}
              </span>
            )}
          </div>

          <div className="mt-1 flex items-center gap-2">
            <div
              className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 ${
                analysesCount > 0 ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50'
              }`}
            >
              <svg className={`h-4 w-4 ${analysesCount > 0 ? 'text-emerald-600' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span className={`text-xs font-medium ${analysesCount > 0 ? 'text-emerald-700' : 'text-slate-500'}`}>
                {analysesLabel}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 pb-5">
        <button
          type="button"
          className={`flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 font-semibold text-white shadow-lg transition-all duration-200 ${accent.button}`}
          aria-label={`Ver perfil completo de ${name}`}
        >
          <span>Ver perfil completo</span>
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
