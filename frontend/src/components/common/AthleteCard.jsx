// Card para exibir informações de atleta/adversário - Design Moderno
export default function AthleteCard({ 
  name, 
  belt, 
  weight, 
  age, 
  style, 
  technicalProfile,
  analysesCount = 0,
  onClick,
  type = 'athlete' // 'athlete' ou 'opponent'
}) {
  // Cores por faixa - Modernas e suaves
  const beltStyles = {
    'Branca': 'bg-slate-50 text-slate-700 border-slate-200',
    'Azul': 'bg-indigo-50 text-indigo-700 border-indigo-200',
    'Roxa': 'bg-purple-50 text-purple-700 border-purple-200',
    'Marrom': 'bg-amber-50 text-amber-700 border-amber-200',
    'Preta': 'bg-slate-900 text-white border-slate-800',
  };

  // Configurações por tipo
  const config = type === 'athlete' 
    ? {
        accent: 'from-indigo-500 to-purple-500',
        border: 'border-l-indigo-500',
        badge: 'bg-indigo-500',
        button: 'bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800',
        icon: 'bg-indigo-100 text-indigo-600'
      }
    : {
        accent: 'from-orange-500 to-red-500',
        border: 'border-l-orange-500',
        badge: 'bg-orange-500',
        button: 'bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800',
        icon: 'bg-orange-100 text-orange-600'
      };

  return (
    <div
      onClick={onClick}
      className="group cursor-pointer rounded-3xl border border-white/60 bg-white/90 shadow-[0_12px_30px_rgba(15,23,42,0.12)] backdrop-blur hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(15,23,42,0.18)] transition-all duration-200 animate-scaleIn"
      
    >
      {/* Header com Avatar */}
      <div className="p-6 pb-4 relative">
        {/* Background decorativo */}
        <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${config.accent} opacity-5 rounded-full blur-3xl`}></div>
        
        <div className="relative">
          {/* Avatar e Nome */}
          <div className="flex items-start gap-3 mb-4">
            <div className={`w-12 h-12 rounded-2xl ${config.icon} flex items-center justify-center text-lg font-bold shadow-sm`}>
              {name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors leading-tight truncate">
                {name}
              </h3>
            </div>
            <span
              className={`badge-modern ${beltStyles[belt] || 'bg-slate-50 text-slate-700'} border-2 text-xs px-3 py-1`}
              aria-label={`Faixa ${belt}`}
            >
              {belt}
            </span>
          </div>

          {/* Info de Análises */}
          <div className="flex items-center gap-2 mt-1">
            <div className={`flex items-center gap-2 rounded-xl px-3 py-1.5 ${analysesCount > 0 ? 'bg-emerald-50 border border-emerald-200' : 'bg-slate-50 border border-slate-200'}`}>
              <svg className={`w-4 h-4 ${analysesCount > 0 ? 'text-emerald-600' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span className={`text-xs font-medium ${analysesCount > 0 ? 'text-emerald-700' : 'text-slate-500'}`}>
                {analysesCount > 0 
                  ? `${analysesCount} luta${analysesCount > 1 ? 's' : ''} analisada${analysesCount > 1 ? 's' : ''}`
                  : 'Nenhuma análise'
                }
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer - Botão de ação */}
      <div className="px-5 pb-5">
        <button
          className={`w-full rounded-2xl px-4 py-3 ${config.button} text-white font-semibold shadow-lg transition-all duration-200 flex items-center justify-center gap-2`}
          aria-label={`Ver perfil completo de ${name}`}
        >
          <span>Ver perfil completo</span>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
