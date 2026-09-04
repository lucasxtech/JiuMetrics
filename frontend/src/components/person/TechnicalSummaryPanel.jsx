// Painel ÚNICO do resumo técnico (spec 012).
//
// A página anterior tinha dois painéis com o mesmo texto ("Perfil Técnico
// Completo" lia `aiSummary`, "Resumo técnico" lia `athlete.technicalSummary`
// — a mesma string), mais o modal. Agora é um painel, recolhido por padrão.
import { useState } from 'react';

const formatDate = (iso) =>
  iso
    ? new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : null;

export default function TechnicalSummaryPanel({
  summary,
  isFallback = false,
  updatedAt,
  analysesCount,
  generating,
  onGenerate,
  onOpenDetails,
}) {
  const [expanded, setExpanded] = useState(false);
  const canGenerate = analysesCount > 0;

  const meta = summary
    ? isFallback
      ? 'Resumo da última análise de vídeo — a consolidação ainda não foi gerada'
      : `Consolidação de ${analysesCount} análise${analysesCount === 1 ? '' : 's'}`
    : canGenerate
      ? 'Gere um perfil consolidado a partir das análises'
      : 'Analise um vídeo para gerar o resumo técnico com IA';

  return (
    <section className="panel">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Perfil técnico</p>
          <h3 className="panel__title">Resumo técnico</h3>
          <p className="mt-1 text-sm text-slate-600">{meta}</p>
        </div>
        <div className="flex items-center gap-2">
          {summary && (
            <button
              type="button"
              onClick={onOpenDetails}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Editar / histórico
            </button>
          )}
          {canGenerate && (
            <button
              type="button"
              onClick={onGenerate}
              disabled={generating}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition-all hover:from-indigo-600 hover:to-purple-700 disabled:cursor-wait disabled:opacity-70"
            >
              {generating ? 'Gerando…' : summary && !isFallback ? 'Regenerar com IA' : 'Gerar com IA'}
            </button>
          )}
        </div>
      </div>

      {summary ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
          <p className={`whitespace-pre-wrap text-[15px] leading-relaxed text-slate-700 ${expanded ? '' : 'line-clamp-4'}`}>
            {summary}
          </p>
          <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-3 text-xs text-slate-500">
            <span>{updatedAt ? `Atualizado em ${formatDate(updatedAt)}` : ''}</span>
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="font-medium text-indigo-600 hover:text-indigo-700"
            >
              {expanded ? 'Ver menos' : 'Ver tudo'}
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
          <p className="text-sm font-medium text-amber-900">Nenhum resumo disponível</p>
        </div>
      )}
    </section>
  );
}
