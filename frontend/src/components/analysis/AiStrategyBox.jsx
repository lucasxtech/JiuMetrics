// Componente de caixa de estratégia IA - Todas as seções abertas
import InlineDiff from '../common/InlineDiff';
import { useState } from 'react';

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

/**
 * Componente de banner de alteração pendente
 * Mostra no topo do painel quando há uma sugestão da IA aguardando aprovação
 */
const PendingEditBanner = ({ pendingEdit, onAccept, onReject, isApplying }) => {
  const [expanded, setExpanded] = useState(true);
  
  if (!pendingEdit) return null;
  
  // Formatar o nome do campo para exibição
  const formatFieldName = (field) => {
    const fieldNames = {
      'strategy': 'Estratégia Completa',
      'tese_da_vitoria': 'Tese da Vitória',
      'analise_de_matchup': 'Análise de Matchup',
      'plano_tatico_faseado': 'Plano Tático',
      'cronologia_inteligente': 'Cronologia',
      'checklist_tatico': 'Checklist Tático',
      'resumo_rapido': 'Resumo Rápido'
    };
    return fieldNames[field] || field?.replace(/_/g, ' ');
  };

  return (
    <div className="mb-6 rounded-xl border-2 border-amber-400 bg-gradient-to-r from-amber-50 to-yellow-50 shadow-lg shadow-amber-500/20 overflow-hidden animate-pulse-soft">
      {/* Header do Banner */}
      <div className="px-4 py-3 bg-gradient-to-r from-amber-400 to-yellow-400 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/30 flex items-center justify-center">
            <svg className="w-5 h-5 text-amber-800" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h4 className="font-bold text-amber-900">⚡ Alteração Sugerida pela IA</h4>
            <p className="text-xs text-amber-800">Campo: <span className="font-semibold">{formatFieldName(pendingEdit.field)}</span></p>
          </div>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-2 rounded-lg hover:bg-white/30 transition-colors"
        >
          <svg className={`w-5 h-5 text-amber-800 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
      
      {/* Conteúdo Expandível */}
      {expanded && (
        <div className="p-4">
          {/* Razão da alteração */}
          {pendingEdit.reason && (
            <div className="mb-4 p-3 bg-white/60 rounded-lg border border-amber-200">
              <p className="text-xs font-semibold text-amber-700 mb-1">💡 Por que essa alteração?</p>
              <p className="text-sm text-amber-900">{pendingEdit.reason}</p>
            </div>
          )}
          
          {/* Preview das alterações */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Antes */}
            <div className="rounded-lg border-2 border-red-200 bg-red-50 overflow-hidden">
              <div className="px-3 py-2 bg-red-200 flex items-center gap-2">
                <svg className="w-4 h-4 text-red-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
                <span className="text-xs font-bold text-red-800 uppercase">Antes (Atual)</span>
              </div>
              <div className="p-3 max-h-48 overflow-y-auto">
                <p className="text-sm text-red-700 whitespace-pre-wrap line-through opacity-75">
                  {typeof pendingEdit.oldValue === 'string' 
                    ? pendingEdit.oldValue.substring(0, 500) + (pendingEdit.oldValue.length > 500 ? '...' : '')
                    : JSON.stringify(pendingEdit.oldValue, null, 2).substring(0, 500)}
                </p>
              </div>
            </div>
            
            {/* Depois */}
            <div className="rounded-lg border-2 border-green-200 bg-green-50 overflow-hidden">
              <div className="px-3 py-2 bg-green-200 flex items-center gap-2">
                <svg className="w-4 h-4 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="text-xs font-bold text-green-800 uppercase">Depois (Novo)</span>
              </div>
              <div className="p-3 max-h-48 overflow-y-auto">
                <p className="text-sm text-green-800 whitespace-pre-wrap font-medium">
                  {typeof pendingEdit.newValue === 'string' 
                    ? pendingEdit.newValue.substring(0, 500) + (pendingEdit.newValue.length > 500 ? '...' : '')
                    : JSON.stringify(pendingEdit.newValue, null, 2).substring(0, 500)}
                </p>
              </div>
            </div>
          </div>
          
          {/* Botões de Ação */}
          <div className="flex gap-3 mt-4 pt-4 border-t border-amber-200">
            <button
              onClick={onReject}
              disabled={isApplying}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold bg-white border-2 border-red-300 text-red-600 rounded-xl hover:bg-red-50 hover:border-red-400 transition-all disabled:opacity-50"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Rejeitar Alteração
            </button>
            <button
              onClick={onAccept}
              disabled={isApplying}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all shadow-lg shadow-green-500/30 disabled:opacity-50"
            >
              {isApplying ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Aplicando...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Aceitar Alteração
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Componente que renderiza texto com suporte a diff inline
 */
const EditableText = ({ value, pendingEdit, field, onAccept, onReject, isApplying, className = '' }) => {
  // Debug log
  console.log('EditableText render:', { field, pendingEdit, hasPendingEdit: pendingEdit?.field === field });
  
  // Verificar se há edição pendente para este campo
  // Normalizar o nome do campo (remover underscores, lowercase)
  const normalizeField = (f) => f?.toLowerCase().replace(/_/g, '');
  const hasPendingEdit = pendingEdit && (
    pendingEdit.field === field ||
    normalizeField(pendingEdit.field) === normalizeField(field) ||
    (pendingEdit.field?.includes('tese') && field === 'tese_da_vitoria')
  );
  
  if (hasPendingEdit) {
    console.log('Mostrando InlineDiff para campo:', field);
    return (
      <InlineDiff
        oldValue={pendingEdit.oldValue || value}
        newValue={pendingEdit.newValue}
        onAccept={onAccept}
        onReject={onReject}
        isLoading={isApplying}
      />
    );
  }
  
  return <span className={className}>{value}</span>;
};

export default function AiStrategyBox({ 
  strategy, 
  isLoading = false,
  pendingEdit = null,
  onAcceptEdit,
  onRejectEdit,
  isApplyingEdit = false
}) {
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
    <div className="space-y-6">
      {/* 🚨 Banner de Alteração Pendente */}
      <PendingEditBanner
        pendingEdit={pendingEdit}
        onAccept={onAcceptEdit}
        onReject={onRejectEdit}
        isApplying={isApplyingEdit}
      />
      
      {/* 🎯 RESUMO RÁPIDO - Novo bloco principal */}
      {strategyData?.resumo_rapido && (
        <section className="panel bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-700 text-white shadow-xl overflow-hidden">
          <div className="px-6 py-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-semibold text-indigo-200 uppercase tracking-wide">Resumo Executivo</p>
                <h3 className="text-lg font-bold">Como Vencer Esta Luta</h3>
              </div>
            </div>
            
            {/* Como Vencer - Texto principal */}
            <div className="mb-5 p-4 bg-white/10 backdrop-blur rounded-xl">
              <p className="text-white/95 leading-relaxed text-base">
                {strategyData.resumo_rapido.como_vencer}
              </p>
            </div>

            {/* 3 Prioridades */}
            {strategyData.resumo_rapido.tres_prioridades && (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-indigo-200 uppercase tracking-wide">📌 Suas 3 Prioridades</p>
                {strategyData.resumo_rapido.tres_prioridades.map((prioridade, idx) => (
                  <div key={idx} className="flex gap-3 items-start p-3 bg-white/10 backdrop-blur rounded-lg">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">
                      {idx + 1}
                    </span>
                    <p className="text-white/90 text-sm leading-relaxed">{prioridade}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* 🎯 Tese da Vitória */}
      <section className="panel bg-gradient-to-br from-indigo-50 via-purple-50 to-slate-50 border-2 border-indigo-200 shadow-lg shadow-indigo-500/10">
        <div className="px-6 py-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">Objetivo Principal</p>
              <h3 className="text-lg font-bold text-slate-900">Tese da Vitória</h3>
            </div>
          </div>
          <div className="text-lg font-medium text-slate-800 leading-relaxed">
            <EditableText
              value={strategyData?.tese_da_vitoria || 'Aguardando estratégia...'}
              pendingEdit={pendingEdit}
              field="tese_da_vitoria"
              onAccept={onAcceptEdit}
              onReject={onRejectEdit}
              isApplying={isApplyingEdit}
            />
          </div>
        </div>
      </section>

      {/* 📊 Análise de Matchup */}
      {strategyData?.analise_de_matchup && (
        <section className="panel">
          <div className="px-6 py-4 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Análise Comparativa</p>
            <h4 className="text-lg font-semibold text-slate-900">Matchup & Assimetrias</h4>
          </div>
          <div className="px-6 py-5 space-y-4">
            <div className="bg-green-50 rounded-xl p-4 border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="font-semibold text-green-800">Vantagem Crítica</p>
              </div>
              <p className="text-slate-700 text-sm leading-relaxed">{strategyData.analise_de_matchup.vantagem_critica}</p>
            </div>

            <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="font-semibold text-orange-800">Risco Oculto</p>
              </div>
              <p className="text-slate-700 text-sm leading-relaxed">{strategyData.analise_de_matchup.risco_oculto}</p>
            </div>

            <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="font-semibold text-blue-800">Fator Chave</p>
              </div>
              <p className="text-slate-700 text-sm leading-relaxed">{strategyData.analise_de_matchup.fator_chave}</p>
            </div>
          </div>
        </section>
      )}

      {/* 🥋 Plano Tático Faseado */}
      {strategyData?.plano_tatico_faseado && (
        <section className="panel">
          <div className="px-6 py-4 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Técnicas por Posição</p>
            <h4 className="text-lg font-semibold text-slate-900">Plano Tático Faseado</h4>
          </div>
          <div className="px-6 py-5 grid gap-4 md:grid-cols-3">
            {/* Em Pé / Stand-up */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">🥋</span>
                <h5 className="font-semibold text-slate-900">Em Pé</h5>
              </div>
              <div className="space-y-3">
                <div>
                  <Badge variant="info">Ação Recomendada</Badge>
                  <p className="text-slate-700 text-sm mt-1.5 leading-relaxed">
                    {strategyData.plano_tatico_faseado.em_pe_standup?.acao_recomendada}
                  </p>
                </div>
                {(strategyData.plano_tatico_faseado.em_pe_standup?.explicacao || strategyData.plano_tatico_faseado.em_pe_standup?.detalhe_tecnico) && (
                  <div className="pt-2 border-t border-slate-200">
                    <Badge variant="default">Por quê?</Badge>
                    <p className="text-slate-600 text-sm mt-1.5 leading-relaxed">
                      {strategyData.plano_tatico_faseado.em_pe_standup?.explicacao || strategyData.plano_tatico_faseado.em_pe_standup?.detalhe_tecnico}
                    </p>
                  </div>
                )}
                {strategyData.plano_tatico_faseado.em_pe_standup?.como_executar && (
                  <div className="pt-2 border-t border-slate-200">
                    <Badge variant="success">Como Executar</Badge>
                    <p className="text-slate-600 text-sm mt-1.5 leading-relaxed">
                      {strategyData.plano_tatico_faseado.em_pe_standup.como_executar}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Jogo de Passagem */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">⬇️</span>
                <h5 className="font-semibold text-slate-900">Passagem</h5>
              </div>
              <div className="space-y-3">
                <div>
                  <Badge variant="success">Estilo Recomendado</Badge>
                  <p className="text-slate-700 text-sm mt-1.5 leading-relaxed">
                    {strategyData.plano_tatico_faseado.jogo_de_passagem_top?.estilo_recomendado || strategyData.plano_tatico_faseado.jogo_de_passagem_top?.caminho_das_pedras}
                  </p>
                </div>
                {strategyData.plano_tatico_faseado.jogo_de_passagem_top?.passo_a_passo && (
                  <div className="pt-2 border-t border-slate-200">
                    <Badge variant="info">Passo a Passo</Badge>
                    <p className="text-slate-600 text-sm mt-1.5 leading-relaxed">
                      {strategyData.plano_tatico_faseado.jogo_de_passagem_top.passo_a_passo}
                    </p>
                  </div>
                )}
                <div className="pt-2 border-t border-slate-200">
                  <Badge variant="warning">⚠️ Armadilha a Evitar</Badge>
                  <p className="text-slate-600 text-sm mt-1.5 leading-relaxed">
                    {strategyData.plano_tatico_faseado.jogo_de_passagem_top?.armadilha_a_evitar || strategyData.plano_tatico_faseado.jogo_de_passagem_top?.alerta_de_reversao}
                  </p>
                </div>
              </div>
            </div>

            {/* Jogo de Guarda */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">⬆️</span>
                <h5 className="font-semibold text-slate-900">Guarda</h5>
              </div>
              <div className="space-y-3">
                <div>
                  <Badge variant="success">Guarda Ideal</Badge>
                  <p className="text-slate-700 text-sm mt-1.5 leading-relaxed">
                    {strategyData.plano_tatico_faseado.jogo_de_guarda_bottom?.guarda_ideal || strategyData.plano_tatico_faseado.jogo_de_guarda_bottom?.melhor_posicao}
                  </p>
                </div>
                <div className="pt-2 border-t border-slate-200">
                  <Badge variant="info">Momento de Atacar</Badge>
                  <p className="text-slate-600 text-sm mt-1.5 leading-relaxed">
                    {strategyData.plano_tatico_faseado.jogo_de_guarda_bottom?.momento_de_atacar || strategyData.plano_tatico_faseado.jogo_de_guarda_bottom?.gatilho_de_ataque}
                  </p>
                </div>
                {strategyData.plano_tatico_faseado.jogo_de_guarda_bottom?.se_der_errado && (
                  <div className="pt-2 border-t border-slate-200">
                    <Badge variant="warning">Plano B</Badge>
                    <p className="text-slate-600 text-sm mt-1.5 leading-relaxed">
                      {strategyData.plano_tatico_faseado.jogo_de_guarda_bottom.se_der_errado}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ⏱️ Cronologia Inteligente */}
      {strategyData?.cronologia_inteligente && (
        <section className="panel">
          <div className="px-6 py-4 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Timeline da Luta</p>
            <h4 className="text-lg font-semibold text-slate-900">Cronologia Inteligente</h4>
          </div>
          <div className="px-6 py-5">
            <div className="relative">
              {/* Timeline Line */}
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-green-500 via-yellow-500 to-red-500"></div>
              
              <div className="space-y-6">
                <div className="relative pl-12">
                  <div className="absolute left-0 w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white text-sm font-bold shadow-lg">
                    1
                  </div>
                  <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                    <p className="font-semibold text-green-800 mb-1">Primeiro Minuto (0:00 - 1:00)</p>
                    <p className="text-slate-700 text-sm leading-relaxed">
                      {strategyData.cronologia_inteligente.primeiro_minuto || strategyData.cronologia_inteligente.inicio}
                    </p>
                  </div>
                </div>

                <div className="relative pl-12">
                  <div className="absolute left-0 w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center text-white text-sm font-bold shadow-lg">
                    2
                  </div>
                  <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
                    <p className="font-semibold text-yellow-800 mb-1">Desenvolvimento (2:00 - 4:00)</p>
                    <p className="text-slate-700 text-sm leading-relaxed">
                      {strategyData.cronologia_inteligente.minutos_2_a_4 || strategyData.cronologia_inteligente.meio}
                    </p>
                  </div>
                </div>

                <div className="relative pl-12">
                  <div className="absolute left-0 w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white text-sm font-bold shadow-lg">
                    3
                  </div>
                  <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                    <p className="font-semibold text-red-800 mb-1">Minutos Finais (5:00+)</p>
                    <p className="text-slate-700 text-sm leading-relaxed">
                      {strategyData.cronologia_inteligente.minutos_finais || strategyData.cronologia_inteligente.final}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ✅ Checklist Tático */}
      {strategyData?.checklist_tatico && (
        <section className="panel">
          <div className="px-6 py-4 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Detalhes Táticos</p>
            <h4 className="text-lg font-semibold text-slate-900">Checklist Tático</h4>
          </div>
          <div className="px-6 py-5 space-y-4">
            {/* Oportunidades de Pontos - Expandido */}
            <div className="bg-green-50 rounded-xl p-4 border border-green-200">
              <p className="font-semibold text-green-800 flex items-center gap-2 mb-4">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Oportunidades de Pontos
              </p>
              <div className="space-y-3">
                {strategyData.checklist_tatico.oportunidades_de_pontos?.map((item, idx) => (
                  <div key={idx} className="bg-white/60 rounded-lg p-3 border border-green-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-green-900">{item.tecnica}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="success">+{item.pontos} pts</Badge>
                        <Badge variant={item.probabilidade === 'alta' ? 'success' : item.probabilidade === 'media' ? 'warning' : 'default'}>
                          {item.probabilidade}
                        </Badge>
                      </div>
                    </div>
                    {(item.situacao || item.quando) && (
                      <p className="text-sm text-slate-700 mb-2 leading-relaxed">
                        <span className="font-medium text-slate-800">Quando: </span>
                        {item.situacao || item.quando}
                      </p>
                    )}
                    {item.por_que_funciona && (
                      <p className="text-sm text-green-700 bg-green-100/50 rounded px-2 py-1.5 leading-relaxed">
                        <span className="font-medium">Por quê funciona: </span>
                        {item.por_que_funciona}
                      </p>
                    )}
                  </div>
                )) || <p className="text-sm text-slate-500 italic">Nenhuma oportunidade identificada</p>}
              </div>
            </div>

            {/* Armadilhas Dele - Expandido */}
            <div className="bg-red-50 rounded-xl p-4 border border-red-200">
              <p className="font-semibold text-red-800 flex items-center gap-2 mb-4">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Armadilhas do Adversário
              </p>
              <div className="space-y-3">
                {strategyData.checklist_tatico.armadilhas_dele?.map((item, idx) => (
                  <div key={idx} className="bg-white/60 rounded-lg p-3 border border-red-100">
                    <div className="mb-2">
                      <span className="font-medium text-red-900 text-sm">Situação de risco:</span>
                      <p className="text-slate-700 text-sm mt-1">{item.situacao}</p>
                    </div>
                    <div className="mb-2">
                      <span className="font-medium text-red-800 text-sm">O que ele faz:</span>
                      <p className="text-slate-700 text-sm mt-1">{item.o_que_ele_faz || item.tecnica_perigosa}</p>
                    </div>
                    <div className="bg-red-100/50 rounded px-2 py-1.5">
                      <span className="font-medium text-red-800 text-sm">Como evitar:</span>
                      <p className="text-red-700 text-sm mt-1 leading-relaxed">{item.como_evitar}</p>
                    </div>
                  </div>
                )) || <p className="text-sm text-slate-500 italic">Nenhuma armadilha identificada</p>}
              </div>
            </div>

            {/* Protocolo de Emergência - Expandido */}
            {(strategyData.checklist_tatico.protocolo_de_emergencia || strategyData.checklist_tatico.protocolo_de_seguranca) && (
              <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
                <p className="font-semibold text-orange-800 flex items-center gap-2 mb-4">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944zM11 14a1 1 0 11-2 0 1 1 0 012 0zm0-7a1 1 0 10-2 0v3a1 1 0 102 0V7z" clipRule="evenodd" />
                  </svg>
                  Protocolo de Emergência
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="bg-white/60 rounded-lg p-3 border border-orange-100">
                    <Badge variant="danger">⛔ Posição Perigosa</Badge>
                    <p className="text-slate-700 text-sm mt-2 leading-relaxed">
                      {strategyData.checklist_tatico.protocolo_de_emergencia?.posicao_perigosa || 
                       strategyData.checklist_tatico.protocolo_de_seguranca?.jamais_fazer || 
                       'Nenhuma posição crítica identificada'}
                    </p>
                  </div>
                  <div className="bg-white/60 rounded-lg p-3 border border-orange-100">
                    <Badge variant="warning">🚨 Como Escapar</Badge>
                    <p className="text-slate-700 text-sm mt-2 leading-relaxed">
                      {strategyData.checklist_tatico.protocolo_de_emergencia?.como_escapar || 
                       strategyData.checklist_tatico.protocolo_de_seguranca?.saida_de_emergencia || 
                       'Nenhuma rota de fuga específica'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
