// Componente de Card de Análise Tática - Design Moderno
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function AnalysisCard({ analysis, onView, onDelete }) {
  const formattedDate = formatDistanceToNow(new Date(analysis.created_at), {
    addSuffix: true,
    locale: ptBR
  });

  return (
    <div className="group cursor-pointer rounded-3xl border border-white/60 bg-white/90 shadow-[0_12px_30px_rgba(15,23,42,0.12)] backdrop-blur hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(15,23,42,0.18)] transition-all duration-200 animate-scaleIn">
      {/* Header */}
      <div className="p-6 pb-4 relative">
        {/* Background decorativo */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500 to-indigo-500 opacity-5 rounded-full blur-3xl"></div>
        
        <div className="relative">
          {/* Avatar e Nomes */}
          <div className="flex items-start gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-lg font-bold shadow-lg">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors leading-tight">
                {analysis.athlete_name}
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-slate-400 font-medium">vs</span>
                <span className="text-sm text-slate-600 font-medium">{analysis.opponent_name}</span>
              </div>
            </div>
          </div>

          {/* Data */}
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center gap-2 rounded-xl px-3 py-1.5 bg-slate-50 border border-slate-200">
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xs font-medium text-slate-500">Criado {formattedDate}</span>
            </div>
          </div>

          {/* Preview da tese (se disponível) */}
          {analysis.strategy_data?.tese_da_vitoria && (
            <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed bg-gradient-to-r from-slate-50 to-transparent p-3 rounded-xl border-l-4 border-indigo-300">
              {analysis.strategy_data.tese_da_vitoria}
            </p>
          )}
        </div>
      </div>

      {/* Footer - Botões de ação */}
      <div className="px-5 pb-5 flex items-center gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onView(analysis);
          }}
          className="flex-1 rounded-2xl px-4 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-semibold shadow-lg transition-all duration-200 flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          <span>Ver análise</span>
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(analysis.id);
          }}
          className="w-12 h-12 rounded-2xl bg-red-50 hover:bg-red-100 text-red-500 hover:text-red-600 flex items-center justify-center transition-all duration-200"
          title="Deletar análise"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}
