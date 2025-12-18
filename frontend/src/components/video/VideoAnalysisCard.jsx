import { useState } from 'react';
import { Trash2, ChevronDown, ChevronUp, Play, BarChart3, TrendingUp, Target } from 'lucide-react';

/**
 * Card interativo para exibir uma análise de vídeo
 * Com expand/collapse, hover effects e quick stats
 */
export default function VideoAnalysisCard({ analysis, onDelete, onViewDetails }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  // Extrair estatísticas rápidas
  const quickStats = {
    sweeps: analysis.technical_stats?.sweeps?.quantidade || 0,
    submissions: analysis.technical_stats?.submissions?.tentativas || 0,
    backTakes: analysis.technical_stats?.back_takes?.quantidade || 0,
    frames: analysis.framesAnalyzed || 0
  };

  const hasCharts = analysis.charts && analysis.charts.length > 0;
  const hasTechnicalStats = analysis.technical_stats && Object.keys(analysis.technical_stats).length > 0;

  return (
    <div className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white transition-all duration-300 hover:shadow-lg hover:border-blue-300">
      {/* Gradient decoration */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/30">
                <Play className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-slate-900 text-sm">
                  Análise de vídeo
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  {formatDate(analysis.createdAt)}
                </p>
              </div>
            </div>

            {/* Quick Stats Pills */}
            <div className="flex flex-wrap gap-2 mt-3">
              {quickStats.frames > 0 && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-100">
                  <BarChart3 className="w-3.5 h-3.5 text-blue-600" />
                  <span className="text-xs font-medium text-blue-700">{quickStats.frames} frames</span>
                </div>
              )}
              {quickStats.sweeps > 0 && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-100">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-xs font-medium text-emerald-700">{quickStats.sweeps} raspagens</span>
                </div>
              )}
              {quickStats.submissions > 0 && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-50 border border-purple-100">
                  <Target className="w-3.5 h-3.5 text-purple-600" />
                  <span className="text-xs font-medium text-purple-700">{quickStats.submissions} finalizações</span>
                </div>
              )}
              {hasCharts && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-100">
                  <BarChart3 className="w-3.5 h-3.5 text-amber-600" />
                  <span className="text-xs font-medium text-amber-700">{analysis.charts.length} gráficos</span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(analysis.id);
              }}
              className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all duration-200"
              title="Remover análise"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Summary Preview */}
        {analysis.summary && (
          <div className="mb-4">
            <p className={`text-sm text-slate-600 leading-relaxed ${!isExpanded ? 'line-clamp-2' : ''}`}>
              {analysis.summary}
            </p>
          </div>
        )}

        {/* Video URL */}
        {analysis.videoUrl && (
          <div className="mb-4 p-3 rounded-lg bg-slate-50 border border-slate-100">
            <p className="text-xs font-medium text-slate-500 mb-1">Vídeo analisado:</p>
            <a
              href={analysis.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:text-blue-700 hover:underline truncate block"
              onClick={(e) => e.stopPropagation()}
            >
              {analysis.videoUrl}
            </a>
          </div>
        )}

        {/* Expandable Content */}
        {isExpanded && (
          <div className="space-y-4 animate-fadeIn">
            {/* Technical Stats Preview */}
            {hasTechnicalStats && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {analysis.technical_stats.sweeps && (
                  <div className="p-3 rounded-lg bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-200">
                    <p className="text-xs font-semibold text-emerald-600 mb-1">Raspagens</p>
                    <p className="text-2xl font-bold text-emerald-900">
                      {analysis.technical_stats.sweeps.quantidade}
                    </p>
                    <p className="text-xs text-emerald-600 mt-1">
                      {analysis.technical_stats.sweeps.concluidas} concluídas
                    </p>
                  </div>
                )}

                {analysis.technical_stats.submissions && (
                  <div className="p-3 rounded-lg bg-gradient-to-br from-purple-50 to-purple-100/50 border border-purple-200">
                    <p className="text-xs font-semibold text-purple-600 mb-1">Finalizações</p>
                    <p className="text-2xl font-bold text-purple-900">
                      {analysis.technical_stats.submissions.tentativas}
                    </p>
                    <p className="text-xs text-purple-600 mt-1">
                      {analysis.technical_stats.submissions.concluidas} finalizadas
                    </p>
                  </div>
                )}

                {analysis.technical_stats.back_takes && (
                  <div className="p-3 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-200">
                    <p className="text-xs font-semibold text-blue-600 mb-1">Pegadas de Costas</p>
                    <p className="text-2xl font-bold text-blue-900">
                      {analysis.technical_stats.back_takes.quantidade}
                    </p>
                    {analysis.technical_stats.back_takes.tempo_medio_segundos && (
                      <p className="text-xs text-blue-600 mt-1">
                        {analysis.technical_stats.back_takes.tempo_medio_segundos}s médio
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Charts Preview */}
            {hasCharts && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-700">Gráficos disponíveis:</p>
                <div className="flex flex-wrap gap-2">
                  {analysis.charts.map((chart, idx) => (
                    <span 
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-700 font-medium"
                    >
                      <BarChart3 className="w-3 h-3 text-slate-400" />
                      {chart.title || `Gráfico ${idx + 1}`}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Actions Footer */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all duration-200"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-4 h-4" />
                Ver menos
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                Ver mais
              </>
            )}
          </button>

          <button
            onClick={() => onViewDetails(analysis)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 text-white text-xs font-semibold hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all duration-200"
          >
            <BarChart3 className="w-4 h-4" />
            Ver análise completa
          </button>
        </div>
      </div>
    </div>
  );
}
