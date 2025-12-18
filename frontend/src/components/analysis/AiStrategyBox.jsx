// Componente de caixa de estratégia IA - Estrutura Black Belt Level
import { useState } from 'react';

// Componente de ícone chevron reutilizável
const ChevronIcon = ({ isExpanded }) => (
  <svg 
    className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
    fill="currentColor" 
    viewBox="0 0 20 20"
  >
    <path 
      fillRule="evenodd" 
      d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" 
      clipRule="evenodd" 
    />
  </svg>
);

// Badge componente para tags visuais
const Badge = ({ children, variant = 'default' }) => {
  const variants = {
    default: 'bg-slate-100 text-slate-700',
    success: 'bg-green-100 text-green-700',
    danger: 'bg-red-100 text-red-700',
    warning: 'bg-orange-100 text-orange-700',
    info: 'bg-blue-100 text-blue-700',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]}`}>
      {children}
    </span>
  );
};

export default function AiStrategyBox({ strategy, isLoading = false }) {
  const [expandedSection, setExpandedSection] = useState('tese');

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
      <section className="panel flex flex-col items-center justify-center text-center min-h-[300px]">
        <div className="mb-4 h-12 w-12 animate-spin rounded-full border-2 border-slate-200 border-b-slate-900"></div>
        <p className="text-slate-600">Gerando estratégia de luta com IA...</p>
        <p className="text-sm text-slate-500 mt-2">Analisando perfis consolidados e gerando recomendações táticas...</p>
      </section>
    );
  }

  const strategyData = strategy?.strategy || strategy;

  return (
    <div className="space-y-4">
      {/* 🎯 Tese da Vitória */}
      <section className="panel bg-gradient-to-br from-slate-50 to-slate-100 border-2 border-slate-200">
        <div className="px-6 py-6">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-6 h-6 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Tese da Vitória</h3>
          </div>
          <p className="text-lg font-medium text-slate-900 leading-relaxed">
            {strategyData?.tese_da_vitoria || 'Aguardando estratégia...'}
          </p>
        </div>
      </section>

      {/* 📊 Análise de Matchup */}
      <section className="panel overflow-hidden">
        <button
          onClick={() => setExpandedSection(expandedSection === 'matchup' ? null : 'matchup')}
          className="flex w-full items-center justify-between px-6 py-4 text-left hover:bg-slate-50 transition-colors"
        >
          <div>
            <p className="eyebrow text-xs">Análise Comparativa</p>
            <h4 className="text-lg font-semibold text-slate-900">Matchup & Assimetrias</h4>
          </div>
          <ChevronIcon isExpanded={expandedSection === 'matchup'} />
        </button>
        {expandedSection === 'matchup' && strategyData?.analise_de_matchup && (
          <div className="border-t border-slate-100 px-6 py-5 space-y-4 bg-slate-50/50">
            <div className="bg-white rounded-lg p-4 border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <p className="font-semibold text-green-800">Vantagem Crítica</p>
              </div>
              <p className="text-slate-700 text-sm leading-relaxed">{strategyData.analise_de_matchup.vantagem_critica}</p>
            </div>

            <div className="bg-white rounded-lg p-4 border border-orange-200">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <p className="font-semibold text-orange-800">Risco Oculto</p>
              </div>
              <p className="text-slate-700 text-sm leading-relaxed">{strategyData.analise_de_matchup.risco_oculto}</p>
            </div>

            <div className="bg-white rounded-lg p-4 border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                </svg>
                <p className="font-semibold text-blue-800">Fator Chave</p>
              </div>
              <p className="text-slate-700 text-sm leading-relaxed">{strategyData.analise_de_matchup.fator_chave}</p>
            </div>
          </div>
        )}
      </section>

      {/* 🥋 Plano Tático Faseado */}
      <section className="panel overflow-hidden">
        <button
          onClick={() => setExpandedSection(expandedSection === 'tatico' ? null : 'tatico')}
          className="flex w-full items-center justify-between px-6 py-4 text-left hover:bg-slate-50 transition-colors"
        >
          <div>
            <p className="eyebrow text-xs">Técnicas por Posição</p>
            <h4 className="text-lg font-semibold text-slate-900">Plano Tático Faseado</h4>
          </div>
          <ChevronIcon isExpanded={expandedSection === 'tatico'} />
        </button>
        {expandedSection === 'tatico' && strategyData?.plano_tatico_faseado && (
          <div className="border-t border-slate-100 px-6 py-5 space-y-5 bg-slate-50/50">
            {/* Em Pé / Stand-up */}
            <div className="bg-white rounded-lg p-4 border border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <h5 className="font-semibold text-slate-900 flex items-center gap-2">
                  <span className="text-xl">🥋</span> Em Pé (Stand-up)
                </h5>
              </div>
              <div className="space-y-2">
                <div>
                  <Badge variant="info">Ação Recomendada</Badge>
                  <p className="text-slate-700 text-sm mt-1.5 leading-relaxed">
                    {strategyData.plano_tatico_faseado.em_pe_standup?.acao_recomendada}
                  </p>
                </div>
                <div className="pt-2 border-t border-slate-100">
                  <Badge variant="default">Detalhe Técnico</Badge>
                  <p className="text-slate-600 text-sm mt-1.5 leading-relaxed">
                    {strategyData.plano_tatico_faseado.em_pe_standup?.detalhe_tecnico}
                  </p>
                </div>
              </div>
            </div>

            {/* Jogo de Passagem */}
            <div className="bg-white rounded-lg p-4 border border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <h5 className="font-semibold text-slate-900 flex items-center gap-2">
                  <span className="text-xl">⬇️</span> Jogo de Passagem (Top)
                </h5>
              </div>
              <div className="space-y-2">
                <div>
                  <Badge variant="success">Caminho das Pedras</Badge>
                  <p className="text-slate-700 text-sm mt-1.5 leading-relaxed">
                    {strategyData.plano_tatico_faseado.jogo_de_passagem_top?.caminho_das_pedras}
                  </p>
                </div>
                <div className="pt-2 border-t border-slate-100">
                  <Badge variant="warning">Alerta de Reversão</Badge>
                  <p className="text-slate-600 text-sm mt-1.5 leading-relaxed">
                    {strategyData.plano_tatico_faseado.jogo_de_passagem_top?.alerta_de_reversao}
                  </p>
                </div>
              </div>
            </div>

            {/* Jogo de Guarda */}
            <div className="bg-white rounded-lg p-4 border border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <h5 className="font-semibold text-slate-900 flex items-center gap-2">
                  <span className="text-xl">⬆️</span> Jogo de Guarda (Bottom)
                </h5>
              </div>
              <div className="space-y-2">
                <div>
                  <Badge variant="success">Melhor Posição</Badge>
                  <p className="text-slate-700 text-sm mt-1.5 leading-relaxed">
                    {strategyData.plano_tatico_faseado.jogo_de_guarda_bottom?.melhor_posicao}
                  </p>
                </div>
                <div className="pt-2 border-t border-slate-100">
                  <Badge variant="info">Gatilho de Ataque</Badge>
                  <p className="text-slate-600 text-sm mt-1.5 leading-relaxed">
                    {strategyData.plano_tatico_faseado.jogo_de_guarda_bottom?.gatilho_de_ataque}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ⏱️ Cronologia Inteligente */}
      <section className="panel overflow-hidden">
        <button
          onClick={() => setExpandedSection(expandedSection === 'cronologia' ? null : 'cronologia')}
          className="flex w-full items-center justify-between px-6 py-4 text-left hover:bg-slate-50 transition-colors"
        >
          <div>
            <p className="eyebrow text-xs">Timeline da Luta</p>
            <h4 className="text-lg font-semibold text-slate-900">Cronologia Inteligente</h4>
          </div>
          <ChevronIcon isExpanded={expandedSection === 'cronologia'} />
        </button>
        {expandedSection === 'cronologia' && strategyData?.cronologia_inteligente && (
          <div className="border-t border-slate-100 px-6 py-5 space-y-4 bg-slate-50/50">
            <div className="bg-white rounded-lg p-4 border-l-4 border-green-500">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">🟢</span>
                <p className="font-semibold text-slate-900">Início (0:00 - 1:00)</p>
              </div>
              <p className="text-slate-700 text-sm leading-relaxed ml-9">
                {strategyData.cronologia_inteligente.inicio}
              </p>
            </div>

            <div className="bg-white rounded-lg p-4 border-l-4 border-yellow-500">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">🟡</span>
                <p className="font-semibold text-slate-900">Meio (2:00 - 4:00)</p>
              </div>
              <p className="text-slate-700 text-sm leading-relaxed ml-9">
                {strategyData.cronologia_inteligente.meio}
              </p>
            </div>

            <div className="bg-white rounded-lg p-4 border-l-4 border-red-500">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">🔴</span>
                <p className="font-semibold text-slate-900">Final (5:00+)</p>
              </div>
              <p className="text-slate-700 text-sm leading-relaxed ml-9">
                {strategyData.cronologia_inteligente.final}
              </p>
            </div>
          </div>
        )}
      </section>

      {/* ✅ Checklist Tático */}
      <section className="panel overflow-hidden">
        <button
          onClick={() => setExpandedSection(expandedSection === 'checklist' ? null : 'checklist')}
          className="flex w-full items-center justify-between px-6 py-4 text-left hover:bg-slate-50 transition-colors"
        >
          <div>
            <p className="eyebrow text-xs">Resumo Executivo</p>
            <h4 className="text-lg font-semibold text-slate-900">Checklist Tático</h4>
          </div>
          <ChevronIcon isExpanded={expandedSection === 'checklist'} />
        </button>
        {expandedSection === 'checklist' && strategyData?.checklist_tatico && (
          <div className="border-t border-slate-100 px-6 py-5 space-y-5 bg-slate-50/50">
            {/* Oportunidades de Pontos */}
            <div className="bg-white rounded-lg p-4 border border-green-200">
              <p className="font-semibold text-green-800 flex items-center gap-2 mb-3">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Oportunidades de Pontos
              </p>
              <ul className="space-y-3">
                {strategyData.checklist_tatico.oportunidades_de_pontos?.map((item, idx) => (
                  <li key={idx} className="text-sm text-slate-700 flex items-start gap-2">
                    <span className="text-green-600 font-bold mt-0.5">+</span>
                    <div className="leading-relaxed flex-1">
                      {typeof item === 'string' ? (
                        <span>{item}</span>
                      ) : (
                        <>
                          <div className="font-semibold text-slate-800 mb-1">
                            {item.tecnica} ({item.pontos} pontos)
                            <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                              item.probabilidade === 'alta' ? 'bg-green-100 text-green-700' :
                              item.probabilidade === 'media' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {item.probabilidade}
                            </span>
                          </div>
                          <div className="text-slate-600">{item.quando}</div>
                        </>
                      )}
                    </div>
                  </li>
                )) || <li className="text-sm text-slate-500 italic">Nenhuma oportunidade identificada</li>}
              </ul>
            </div>

            {/* Armadilhas Dele */}
            <div className="bg-white rounded-lg p-4 border border-red-200">
              <p className="font-semibold text-red-800 flex items-center gap-2 mb-3">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Armadilhas Dele
              </p>
              <ul className="space-y-3">
                {strategyData.checklist_tatico.armadilhas_dele?.map((item, idx) => (
                  <li key={idx} className="text-sm text-slate-700 flex items-start gap-2">
                    <span className="text-red-600 font-bold mt-0.5">!</span>
                    <div className="leading-relaxed flex-1">
                      {typeof item === 'string' ? (
                        <span>{item}</span>
                      ) : (
                        <>
                          <div className="font-semibold text-red-800 mb-1">{item.tecnica_perigosa}</div>
                          <div className="text-slate-600 mb-1"><span className="font-medium">Quando:</span> {item.situacao}</div>
                          <div className="text-slate-600"><span className="font-medium">Como evitar:</span> {item.como_evitar}</div>
                        </>
                      )}
                    </div>
                  </li>
                )) || <li className="text-sm text-slate-500 italic">Nenhuma armadilha conhecida</li>}
              </ul>
            </div>

            {/* Protocolo de Segurança */}
            <div className="bg-white rounded-lg p-4 border border-orange-200">
              <p className="font-semibold text-orange-800 flex items-center gap-2 mb-3">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944zM11 14a1 1 0 11-2 0 1 1 0 012 0zm0-7a1 1 0 10-2 0v3a1 1 0 102 0V7z" clipRule="evenodd" />
                </svg>
                Protocolo de Segurança
              </p>
              <div className="space-y-3">
                <div>
                  <Badge variant="danger">Jamais Fazer</Badge>
                  <p className="text-slate-700 text-sm mt-1.5 leading-relaxed">
                    {strategyData.checklist_tatico.protocolo_de_seguranca?.jamais_fazer || 'Nenhuma restrição crítica'}
                  </p>
                </div>
                <div className="pt-2 border-t border-orange-100">
                  <Badge variant="warning">Saída de Emergência</Badge>
                  <p className="text-slate-700 text-sm mt-1.5 leading-relaxed">
                    {strategyData.checklist_tatico.protocolo_de_seguranca?.saida_de_emergencia || 'Nenhuma rota de fuga específica'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
