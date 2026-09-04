import VideoAnalysisCard from '../video/VideoAnalysisCard';
import VideoAnalysisEmptyState from '../video/VideoAnalysisEmptyState';

export default function AnalysesSection({ analyses, loading, onNew, onDelete, onViewDetails }) {
  return (
    <section className="panel">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="eyebrow">Inteligência Artificial</p>
          <h3 className="panel__title">Análises de vídeo ({analyses.length})</h3>
        </div>
        {analyses.length > 0 && (
          <button
            type="button"
            onClick={onNew}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition-all hover:bg-blue-700"
          >
            + Nova análise
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3 animate-pulse">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl border border-slate-200 bg-slate-50" />
          ))}
        </div>
      ) : analyses.length === 0 ? (
        <VideoAnalysisEmptyState onAnalyzeClick={onNew} />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {analyses.map((analysis) => (
            <VideoAnalysisCard
              key={analysis.id}
              analysis={analysis}
              onDelete={onDelete}
              onViewDetails={onViewDetails}
            />
          ))}
        </div>
      )}
    </section>
  );
}
