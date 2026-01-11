// Componente de Card de Análise Tática
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function AnalysisCard({ analysis, onView }) {
  const formattedDate = formatDistanceToNow(new Date(analysis.created_at), {
    addSuffix: true,
    locale: ptBR
  });

  return (
    <div className="panel hover:shadow-md transition-shadow">
      <div className="px-6 py-5">
        {/* Header com vs */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-slate-900">
            {analysis.athlete_name} 
            <span className="text-slate-500 font-normal mx-2">vs</span>
            {analysis.opponent_name}
          </h3>
          
          {/* Badge com metadata se disponível */}
          {analysis.metadata?.athlete?.analysesCount > 1 && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {analysis.metadata.athlete.analysesCount} lutas consolidadas
            </span>
          )}
        </div>

        {/* Data */}
        <p className="text-sm text-slate-500 mb-4">
          <svg className="w-4 h-4 inline-block mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Criado {formattedDate}
        </p>

        {/* Preview da tese (se disponível) */}
        {analysis.strategy_data?.tese_da_vitoria && (
          <p className="text-sm text-slate-600 mb-4 line-clamp-2 italic">
            "{analysis.strategy_data.tese_da_vitoria}"
          </p>
        )}

        {/* Ações */}
        <div className="flex items-center gap-2 pt-3 border-t border-slate-100" style={{ marginTop: "3vh" }}>
          <button
            onClick={() => onView(analysis)}
            className="btn-secondary flex-1 flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Ver análise completa
          </button>
        </div>
      </div>
    </div>
  );
}
