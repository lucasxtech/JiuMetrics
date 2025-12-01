// Card para exibir informações de atleta/adversário - Design Moderno
export default function AthleteCard({ 
  name, 
  belt, 
  weight, 
  age, 
  style, 
  cardio = 0,
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
      className={`card-modern group cursor-pointer border-l-4 ${config.border} overflow-hidden hover:scale-[1.02] animate-scaleIn`}
    >
      {/* Header com Avatar */}
      <div className="p-6 pb-4 relative">
        {/* Background decorativo */}
        <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${config.accent} opacity-5 rounded-full blur-3xl`}></div>
        
        <div className="relative">
          {/* Avatar e Nome */}
          <div className="flex items-start gap-4 mb-4">
            <div className={`w-16 h-16 rounded-2xl ${config.icon} flex items-center justify-center text-2xl font-bold shadow-sm`}>
              {name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors leading-tight">
                {name}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex items-center gap-1 text-sm text-slate-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-medium">{age} anos</span>
                </div>
                <span className="text-slate-300">•</span>
                <span className="text-sm text-slate-500 font-medium">{weight} kg</span>
              </div>
            </div>
            <span className={`badge-modern ${beltStyles[belt] || 'bg-slate-50 text-slate-700'} border-2`}>
              {belt}
            </span>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-1 gap-3">
            {/* Estilo de Jogo */}
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg ${config.icon} flex items-center justify-center`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Estilo</p>
                  <p className="text-sm font-bold text-slate-900">{style}</p>
                </div>
              </div>
            </div>

            {/* Status de Análise IA */}
            {hasAIProfile ? (
              <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-emerald-900">Perfil Analisado</p>
                  <p className="text-xs text-emerald-600">IA processou os dados</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl border border-amber-200">
                <div className="w-8 h-8 rounded-lg bg-amber-400 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-amber-900">Aguardando Análise</p>
                  <p className="text-xs text-amber-600">Envie um vídeo para IA</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer - Botão de ação */}
      <div className="px-6 pb-6">
        <button className={`w-full px-4 py-3.5 ${config.button} text-white rounded-xl font-semibold shadow-lg transition-all duration-200 flex items-center justify-center gap-2`}>
          <span>Ver Perfil Completo</span>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
