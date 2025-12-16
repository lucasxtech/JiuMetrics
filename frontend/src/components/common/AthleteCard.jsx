// Card para exibir informações de atleta/adversário - Design Moderno
export default function AthleteCard({ 
  name, 
  belt, 
  weight, 
  age, 
  style, 
  technicalProfile,
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

  // Verificar se tem perfil técnico da IA
  const hasAIProfile = technicalProfile && Object.keys(technicalProfile).length > 0;

  return (
    <div
      onClick={onClick}
      className="group cursor-pointer rounded-3xl border border-white/60 bg-white/90 shadow-[0_12px_30px_rgba(15,23,42,0.12)] backdrop-blur hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(15,23,42,0.18)] transition-all duration-200 animate-scaleIn"
      style={{ padding: "1vw" }}
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

          {/* Info Grid */}
          <div className="grid grid-cols-1 gap-3">
            {/* Status de Análise IA */}
            {hasAIProfile ? (
              <div className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/80 px-3 py-2">
                <div className="w-7 h-7 rounded-xl bg-emerald-500 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-emerald-900">Perfil analisado</p>
                  <p className="text-xs text-emerald-600">IA processou os dados</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-2xl border border-amber-100 bg-amber-50/80 px-3 py-2" style={{ marginBottom: "0.5vw" }}>
                <div className="w-7 h-7 rounded-xl bg-amber-400 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1" style={{ margin: "0.2vw" }}>
                  <p className="text-xs font-semibold text-amber-900">Aguardando análise</p>
                  <p className="text-xs text-amber-600">Envie um vídeo para IA</p>
                </div>
              </div>
            )}
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
