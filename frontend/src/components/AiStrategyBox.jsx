// Componente de caixa de estratégia IA
import { useState } from 'react';

export default function AiStrategyBox({ strategy, isLoading = false }) {
  const [expandedSection, setExpandedSection] = useState('overview');

  if (!strategy && !isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center border-l-4 border-secondary">
        <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        <p className="text-gray-500">Selecione um atleta e um adversário para gerar estratégia</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-secondary mx-auto mb-4"></div>
        <p className="text-gray-500">Gerando estratégia de luta...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Análise Geral */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <button
          onClick={() => setExpandedSection(expandedSection === 'overview' ? null : 'overview')}
          className="w-full px-6 py-4 flex justify-between items-center hover:bg-gray-50 transition-colors border-l-4 border-secondary"
        >
          <h4 className="text-lg font-bold text-primary">Análise Geral de Estilos</h4>
          <svg className={`w-5 h-5 transition-transform ${expandedSection === 'overview' ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
        {expandedSection === 'overview' && (
          <div className="px-6 py-4 border-t border-gray-200">
            <p className="text-gray-700">{strategy?.styleAnalysis || 'Análise de estilos de luta entre os competidores'}</p>
          </div>
        )}
      </div>

      {/* Pontos de Exploração */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <button
          onClick={() => setExpandedSection(expandedSection === 'strengths' ? null : 'strengths')}
          className="w-full px-6 py-4 flex justify-between items-center hover:bg-gray-50 transition-colors border-l-4 border-accent"
        >
          <h4 className="text-lg font-bold text-primary">Pontos Onde Você Pode Explorar</h4>
          <svg className={`w-5 h-5 transition-transform ${expandedSection === 'strengths' ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
        {expandedSection === 'strengths' && (
          <div className="px-6 py-4 border-t border-gray-200">
            <ul className="space-y-2">
              {strategy?.strengths?.map((strength, idx) => (
                <li key={idx} className="flex items-start">
                  <span className="text-accent mr-2">✓</span>
                  <span className="text-gray-700">{strength}</span>
                </li>
              )) || <li className="text-gray-500">Nenhum ponto de exploração identificado</li>}
            </ul>
          </div>
        )}
      </div>

      {/* Áreas para Evitar */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <button
          onClick={() => setExpandedSection(expandedSection === 'weaknesses' ? null : 'weaknesses')}
          className="w-full px-6 py-4 flex justify-between items-center hover:bg-gray-50 transition-colors border-l-4 border-red-500"
        >
          <h4 className="text-lg font-bold text-primary">Onde Você Deve Evitar</h4>
          <svg className={`w-5 h-5 transition-transform ${expandedSection === 'weaknesses' ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
        {expandedSection === 'weaknesses' && (
          <div className="px-6 py-4 border-t border-gray-200">
            <ul className="space-y-2">
              {strategy?.weaknesses?.map((weakness, idx) => (
                <li key={idx} className="flex items-start">
                  <span className="text-red-500 mr-2">✕</span>
                  <span className="text-gray-700">{weakness}</span>
                </li>
              )) || <li className="text-gray-500">Nenhuma área crítica identificada</li>}
            </ul>
          </div>
        )}
      </div>

      {/* Padrão do Adversário */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <button
          onClick={() => setExpandedSection(expandedSection === 'patterns' ? null : 'patterns')}
          className="w-full px-6 py-4 flex justify-between items-center hover:bg-gray-50 transition-colors border-l-4 border-blue-500"
        >
          <h4 className="text-lg font-bold text-primary">Padrões do Adversário</h4>
          <svg className={`w-5 h-5 transition-transform ${expandedSection === 'patterns' ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
        {expandedSection === 'patterns' && (
          <div className="px-6 py-4 border-t border-gray-200">
            <p className="text-gray-700">{strategy?.opponentPatterns || 'Análise de padrões e comportamentos típicos do adversário'}</p>
          </div>
        )}
      </div>

      {/* Plano de Luta Sugerido */}
      <div className="bg-gradient-to-r from-secondary to-blue-600 rounded-lg shadow-md overflow-hidden">
        <button
          onClick={() => setExpandedSection(expandedSection === 'plan' ? null : 'plan')}
          className="w-full px-6 py-4 flex justify-between items-center hover:opacity-90 transition-opacity text-white"
        >
          <h4 className="text-lg font-bold">Plano de Luta Sugerido</h4>
          <svg className={`w-5 h-5 transition-transform ${expandedSection === 'plan' ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
        {expandedSection === 'plan' && (
          <div className="px-6 py-4 border-t border-blue-500 bg-blue-50">
            <ol className="space-y-3">
              {strategy?.fightPlan?.map((step, idx) => (
                <li key={idx} className="flex items-start text-gray-800">
                  <span className="font-bold text-secondary mr-3 bg-white px-2 py-1 rounded">
                    {idx + 1}
                  </span>
                  <span>{step}</span>
                </li>
              )) || (
                <li className="text-gray-500">Nenhum plano detalhado disponível</li>
              )}
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
