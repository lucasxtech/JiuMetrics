import { Video, Sparkles, ArrowRight } from 'lucide-react';

/**
 * Estado vazio elegante para quando não há análises
 */
export default function VideoAnalysisEmptyState({ onAnalyzeClick }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border-2 border-dashed border-slate-300 bg-gradient-to-br from-slate-50 to-slate-100/50 p-12 text-center">
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-0 w-40 h-40 bg-purple-500/5 rounded-full blur-3xl" />
      
      <div className="relative">
        {/* Icon */}
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/30 mb-6">
          <Video className="w-10 h-10 text-white" />
        </div>

        {/* Title */}
        <h3 className="text-2xl font-bold text-slate-900 mb-3">
          Nenhuma análise de vídeo ainda
        </h3>

        {/* Description */}
        <p className="text-slate-600 max-w-md mx-auto mb-8 leading-relaxed">
          Envie vídeos de lutas para nossa IA analisar e gerar insights detalhados sobre 
          técnicas, estratégias e desempenho do atleta.
        </p>

        {/* Features */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto mb-8">
          <div className="p-4 rounded-xl bg-white/60 backdrop-blur-sm border border-slate-200">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center mx-auto mb-3">
              <Sparkles className="w-5 h-5 text-emerald-600" />
            </div>
            <p className="text-sm font-semibold text-slate-900 mb-1">Análise IA</p>
            <p className="text-xs text-slate-600">Tecnologia Gemini avançada</p>
          </div>

          <div className="p-4 rounded-xl bg-white/60 backdrop-blur-sm border border-slate-200">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center mx-auto mb-3">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-slate-900 mb-1">Gráficos</p>
            <p className="text-xs text-slate-600">Visualizações detalhadas</p>
          </div>

          <div className="p-4 rounded-xl bg-white/60 backdrop-blur-sm border border-slate-200">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center mx-auto mb-3">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-slate-900 mb-1">Insights</p>
            <p className="text-xs text-slate-600">Estatísticas técnicas</p>
          </div>
        </div>

        {/* CTA Button */}
        <button
          onClick={onAnalyzeClick}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 hover:scale-105 transition-all duration-200"
        >
          <Sparkles className="w-5 h-5" />
          Enviar vídeo para análise
          <ArrowRight className="w-5 h-5" />
        </button>

        {/* Help text */}
        <p className="mt-6 text-xs text-slate-500">
          💡 Dica: Vídeos com boa iluminação e ângulo lateral geram melhores resultados
        </p>
      </div>
    </div>
  );
}
