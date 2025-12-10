// Componente de caixa de estratégia IA - Atualizado para nova estrutura
import { useState } from 'react';

export default function AiStrategyBox({ strategy, isLoading = false }) {
  const [expandedSection, setExpandedSection] = useState('analise');

  if (!strategy && !isLoading) {
    return (
      <section className="panel text-center">
        <svg className="mx-auto mb-4 h-12 w-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        <p className="text-slate-600">Selecione um atleta e um adversário para gerar estratégia.</p>
      </section>
    );
  }

  if (isLoading) {
    return (
      <section className="panel text-center">
        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-2 border-slate-200 border-b-slate-900"></div>
        <p className="text-slate-600">Gerando estratégia de luta com IA...</p>
        <p className="text-sm text-slate-500 mt-2">Analisando perfis e gerando recomendações táticas...</p>
      </section>
    );
  }

  const strategyData = strategy?.strategy || strategy;

  return (
    <div className="space-y-4">
      {/* Análise Direta */}
      <section className="panel overflow-hidden">
        <button
          onClick={() => setExpandedSection(expandedSection === 'analise' ? null : 'analise')}
          className="flex w-full items-center justify-between px-6 py-4 text-left hover:bg-slate-50"
        >
          <div>
            <p className="eyebrow text-xs">Estilo vs Estilo</p>
            <h4 className="text-lg font-semibold text-slate-900">Análise Direta</h4>
          </div>
          <svg className={`w-5 h-5 transition-transform ${expandedSection === 'analise' ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
        {expandedSection === 'analise' && (
          <div className="border-t border-slate-100 px-6 py-4">
            <p className="text-slate-700 whitespace-pre-line">{strategyData?.analise || 'Análise comparativa entre os perfis.'}</p>
          </div>
        )}
      </section>

      {/* Estratégia para Vencer */}
      <section className="panel overflow-hidden">
        <button
          onClick={() => setExpandedSection(expandedSection === 'vencer' ? null : 'vencer')}
          className="flex w-full items-center justify-between px-6 py-4 text-left hover:bg-slate-50"
        >
          <div>
            <p className="eyebrow text-xs">Plano de Vitória</p>
            <h4 className="text-lg font-semibold text-slate-900">Como Vencer</h4>
          </div>
          <svg className={`w-5 h-5 transition-transform ${expandedSection === 'vencer' ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
        {expandedSection === 'vencer' && (
          <div className="border-t border-slate-100 px-6 py-4">
            <p className="text-slate-700 whitespace-pre-line">{strategyData?.estrategia_para_vencer || 'Estratégias ofensivas e defensivas.'}</p>
          </div>
        )}
      </section>

      {/* Táticas Específicas */}
      <section className="panel overflow-hidden">
        <button
          onClick={() => setExpandedSection(expandedSection === 'taticas' ? null : 'taticas')}
          className="flex w-full items-center justify-between px-6 py-4 text-left hover:bg-slate-50"
        >
          <div>
            <p className="eyebrow text-xs">Técnicas e Movimentos</p>
            <h4 className="text-lg font-semibold text-slate-900">Táticas Específicas</h4>
          </div>
          <svg className={`w-5 h-5 transition-transform ${expandedSection === 'taticas' ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
        {expandedSection === 'taticas' && (
          <div className="border-t border-slate-100 px-6 py-4">
            <p className="text-slate-700 whitespace-pre-line">{strategyData?.taticas_especificas || 'Táticas específicas para este confronto.'}</p>
          </div>
        )}
      </section>

      {/* Plano por Fases */}
      <section className="panel overflow-hidden">
        <button
          onClick={() => setExpandedSection(expandedSection === 'fases' ? null : 'fases')}
          className="flex w-full items-center justify-between px-6 py-4 text-left hover:bg-slate-50"
        >
          <div>
            <p className="eyebrow text-xs">Cronograma de Luta</p>
            <h4 className="text-lg font-semibold text-slate-900">Plano por Fases</h4>
          </div>
          <svg className={`w-5 h-5 transition-transform ${expandedSection === 'fases' ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
        {expandedSection === 'fases' && strategyData?.plano_por_fases && (
          <div className="border-t border-slate-100 px-6 py-4 space-y-4">
            <div>
              <p className="font-semibold text-slate-900 mb-2">🟢 Início (0:00 - 1:00)</p>
              <p className="text-slate-700 whitespace-pre-line">{strategyData.plano_por_fases.inicio}</p>
            </div>
            <div className="border-t border-slate-100 pt-4">
              <p className="font-semibold text-slate-900 mb-2">🟡 Meio da Luta</p>
              <p className="text-slate-700 whitespace-pre-line">{strategyData.plano_por_fases.meio}</p>
            </div>
            <div className="border-t border-slate-100 pt-4">
              <p className="font-semibold text-slate-900 mb-2">🔴 Fim da Luta</p>
              <p className="text-slate-700 whitespace-pre-line">{strategyData.plano_por_fases.fim}</p>
            </div>
          </div>
        )}
      </section>

      {/* Checklist Final */}
      <section className="panel overflow-hidden">
        <button
          onClick={() => setExpandedSection(expandedSection === 'checklist' ? null : 'checklist')}
          className="flex w-full items-center justify-between px-6 py-4 text-left hover:bg-slate-50"
        >
          <div>
            <p className="eyebrow text-xs">Resumo Executivo</p>
            <h4 className="text-lg font-semibold text-slate-900">Checklist Final</h4>
          </div>
          <svg className={`w-5 h-5 transition-transform ${expandedSection === 'checklist' ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
        {expandedSection === 'checklist' && strategyData?.checklist && (
          <div className="border-t border-slate-100 px-6 py-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Faça isso */}
              <div className="space-y-2">
                <p className="font-semibold text-green-700 flex items-center gap-2">
                  <span>✓</span> Faça Isso
                </p>
                <ul className="space-y-1">
                  {strategyData.checklist.fazer?.map((item, idx) => (
                    <li key={idx} className="text-sm text-slate-700 flex items-start">
                      <span className="mr-2 text-green-600">•</span>
                      <span>{item}</span>
                    </li>
                  )) || <li className="text-sm text-slate-500">Nenhuma ação prioritária</li>}
                </ul>
              </div>

              {/* Evite isso */}
              <div className="space-y-2">
                <p className="font-semibold text-red-700 flex items-center gap-2">
                  <span>✕</span> Evite Isso
                </p>
                <ul className="space-y-1">
                  {strategyData.checklist.evitar?.map((item, idx) => (
                    <li key={idx} className="text-sm text-slate-700 flex items-start">
                      <span className="mr-2 text-red-600">•</span>
                      <span>{item}</span>
                    </li>
                  )) || <li className="text-sm text-slate-500">Nenhum erro crítico</li>}
                </ul>
              </div>

              {/* Busque isso */}
              <div className="space-y-2">
                <p className="font-semibold text-blue-700 flex items-center gap-2">
                  <span>→</span> Busque Isso
                </p>
                <ul className="space-y-1">
                  {strategyData.checklist.buscar?.map((item, idx) => (
                    <li key={idx} className="text-sm text-slate-700 flex items-start">
                      <span className="mr-2 text-blue-600">•</span>
                      <span>{item}</span>
                    </li>
                  )) || <li className="text-sm text-slate-500">Nenhuma posição ideal</li>}
                </ul>
              </div>

              {/* Nunca permita */}
              <div className="space-y-2">
                <p className="font-semibold text-orange-700 flex items-center gap-2">
                  <span>⚠</span> Nunca Permita
                </p>
                <ul className="space-y-1">
                  {strategyData.checklist.nunca_permitir?.map((item, idx) => (
                    <li key={idx} className="text-sm text-slate-700 flex items-start">
                      <span className="mr-2 text-orange-600">•</span>
                      <span>{item}</span>
                    </li>
                  )) || <li className="text-sm text-slate-500">Nenhuma situação de alto risco</li>}
                </ul>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
