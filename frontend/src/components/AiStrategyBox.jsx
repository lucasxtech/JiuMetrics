// Componente de caixa de estratégia IA
import { useState } from 'react';

export default function AiStrategyBox({ strategy, isLoading = false }) {
  const [expandedSection, setExpandedSection] = useState('overview');

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
        <p className="text-slate-600">Gerando estratégia de luta...</p>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      {/* Análise Geral */}
      <section className="panel overflow-hidden">
        <button
          onClick={() => setExpandedSection(expandedSection === 'overview' ? null : 'overview')}
          className="flex w-full items-center justify-between px-6 py-4 text-left hover:bg-slate-50"
        >
          <h4 className="text-lg font-semibold text-slate-900">Análise geral de estilos</h4>
          <svg className={`w-5 h-5 transition-transform ${expandedSection === 'overview' ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
        {expandedSection === 'overview' && (
          <div className="border-t border-slate-100 px-6 py-4">
            <p className="text-slate-700">{strategy?.styleAnalysis || 'Análise de estilos de luta entre os competidores'}</p>
          </div>
        )}
      </section>

      {/* Pontos de Exploração */}
      <section className="panel overflow-hidden">
        <button
          onClick={() => setExpandedSection(expandedSection === 'strengths' ? null : 'strengths')}
          className="flex w-full items-center justify-between px-6 py-4 text-left hover:bg-slate-50"
        >
          <h4 className="text-lg font-semibold text-slate-900">Pontos para explorar</h4>
          <svg className={`w-5 h-5 transition-transform ${expandedSection === 'strengths' ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
        {expandedSection === 'strengths' && (
          <div className="border-t border-slate-100 px-6 py-4">
            <ul className="space-y-2">
              {strategy?.strengths?.map((strength, idx) => (
                <li key={idx} className="flex items-start">
                  <span className="mr-2 text-slate-900">✓</span>
                  <span className="text-slate-700">{strength}</span>
                </li>
              )) || <li className="text-slate-500">Nenhum ponto de exploração identificado</li>}
            </ul>
          </div>
        )}
      </section>

      {/* Áreas para Evitar */}
      <section className="panel overflow-hidden">
        <button
          onClick={() => setExpandedSection(expandedSection === 'weaknesses' ? null : 'weaknesses')}
          className="flex w-full items-center justify-between px-6 py-4 text-left hover:bg-slate-50"
        >
          <h4 className="text-lg font-semibold text-slate-900">Onde deve evitar</h4>
          <svg className={`w-5 h-5 transition-transform ${expandedSection === 'weaknesses' ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
        {expandedSection === 'weaknesses' && (
          <div className="border-t border-slate-100 px-6 py-4">
            <ul className="space-y-2">
              {strategy?.weaknesses?.map((weakness, idx) => (
                <li key={idx} className="flex items-start">
                  <span className="mr-2 text-red-500">✕</span>
                  <span className="text-slate-700">{weakness}</span>
                </li>
              )) || <li className="text-slate-500">Nenhuma área crítica identificada</li>}
            </ul>
          </div>
        )}
      </section>

      {/* Padrão do Adversário */}
      <section className="panel overflow-hidden">
        <button
          onClick={() => setExpandedSection(expandedSection === 'patterns' ? null : 'patterns')}
          className="flex w-full items-center justify-between px-6 py-4 text-left hover:bg-slate-50"
        >
          <h4 className="text-lg font-semibold text-slate-900">Padrões do adversário</h4>
          <svg className={`w-5 h-5 transition-transform ${expandedSection === 'patterns' ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
        {expandedSection === 'patterns' && (
          <div className="border-t border-slate-100 px-6 py-4">
            <p className="text-slate-700">{strategy?.opponentPatterns || 'Análise de padrões e comportamentos típicos do adversário'}</p>
          </div>
        )}
      </section>

      {/* Plano de Luta Sugerido */}
      <section className="panel overflow-hidden">
        <button
          onClick={() => setExpandedSection(expandedSection === 'plan' ? null : 'plan')}
          className="flex w-full items-center justify-between px-6 py-4 text-left hover:bg-slate-50"
        >
          <h4 className="text-lg font-semibold text-slate-900">Plano de luta sugerido</h4>
          <svg className={`w-5 h-5 transition-transform ${expandedSection === 'plan' ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
        {expandedSection === 'plan' && (
          <div className="border-t border-slate-100 px-6 py-4">
            <ol className="space-y-3">
              {strategy?.fightPlan?.map((step, idx) => (
                <li key={idx} className="flex items-start text-slate-800">
                  <span className="mr-3 rounded bg-slate-100 px-2 py-1 font-semibold text-slate-900">
                    {idx + 1}
                  </span>
                  <span>{step}</span>
                </li>
              )) || (
                <li className="text-slate-500">Nenhum plano detalhado disponível</li>
              )}
            </ol>
          </div>
        )}
      </section>
    </div>
  );
}
