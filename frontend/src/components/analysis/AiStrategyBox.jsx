// Componente de caixa de estratégia IA - Todas as seções abertas
import { useState } from 'react';
import { Edit3, Save, X } from 'lucide-react';
import FormattedText from '../common/FormattedText';
import Badge from '../common/Badge';
import { formatObjectToText } from '../../utils/formatters';

/**
 * Componente que renderiza texto com suporte a diff inline
 * Quando há edição pendente para este campo, mostra o diff
 */
const EditableText = ({ value, pendingEdit, field, onAccept, onReject, isApplying, className = '' }) => {
  // Mapeamento bidirecional: campo do componente ↔ campos que a IA pode enviar
  const fieldMappings = {
    'tese_da_vitoria': ['tese_da_vitoria', 'strategy', 'como_vencer'],
    'strategy': ['strategy', 'tese_da_vitoria', 'como_vencer'],
    'plano_tatico_faseado': ['plano_tatico_faseado', 'plano_tatico'],
    'cronologia_inteligente': ['cronologia_inteligente', 'cronologia'],
    'analise_de_matchup': ['analise_de_matchup', 'matchup'],
    'checklist_tatico': ['checklist_tatico', 'checklist']
  };
  
  // Verificar se há edição pendente para este campo específico
  const matchingFields = fieldMappings[field] || [field];
  const hasPendingEdit = pendingEdit && matchingFields.some(f => 
    pendingEdit.field === f
  );
  
  if (hasPendingEdit) {
    // Formatar valores para exibição (nunca JSON bruto)
    const formatValue = (val) => {
      if (!val) return '';
      if (typeof val === 'string') return val;
      return formatObjectToText(val);
    };
    
    const oldText = formatValue(pendingEdit.oldValue || value);
    const newText = formatValue(pendingEdit.newValue);

    return (
      <div className="rounded-xl overflow-hidden border border-slate-200 shadow-md -mx-2">
        {/* Header com razão da alteração */}
        {pendingEdit.reason && (
          <div className="px-4 py-2 bg-slate-50 border-b border-slate-200">
            <p className="text-sm text-slate-600 italic">"{pendingEdit.reason}"</p>
          </div>
        )}
        
        {/* Diff visual */}
        <div className="text-base leading-relaxed">
          {/* Texto antigo - Vermelho */}
          <div className="flex items-start bg-red-50 border-l-4 border-red-400">
            <span className="shrink-0 w-8 text-center py-3 text-red-400 font-semibold select-none">−</span>
            <div className="flex-1 px-4 py-3 text-red-700/80">
              <FormattedText text={oldText} />
            </div>
          </div>
          
          {/* Texto novo - Verde */}
          <div className="flex items-start bg-green-50 border-l-4 border-green-500">
            <span className="shrink-0 w-8 text-center py-3 text-green-500 font-semibold select-none">+</span>
            <div className="flex-1 px-4 py-3 text-green-800">
              <FormattedText text={newText} />
            </div>
            
            {/* Botões de ação */}
            <div className="shrink-0 flex items-center gap-2 px-3 py-3">
              <button
                onClick={onAccept}
                disabled={isApplying}
                className="p-2.5 rounded-lg bg-green-500 hover:bg-green-600 text-white transition-all disabled:opacity-50 shadow-md hover:shadow-lg"
                title="Aceitar alteração"
              >
                {isApplying ? (
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
              <button
                onClick={onReject}
                disabled={isApplying}
                className="p-2.5 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-all disabled:opacity-50 shadow-md hover:shadow-lg"
                title="Rejeitar alteração"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return <span className={className}>{typeof value === 'object' ? formatObjectToText(value) : value}</span>;
};

export default function AiStrategyBox({ 
  strategy, 
  isLoading = false,
  pendingEdit = null,
  onAcceptEdit,
  onRejectEdit,
  isApplyingEdit = false,
  onManualEdit // Nova prop para edição manual
}) {
  // Estados para edição manual
  const [editingSection, setEditingSection] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Iniciar edição
  const startEditing = (section, currentValue) => {
    setEditingSection(section);
    setEditValue(typeof currentValue === 'string' ? currentValue : formatObjectToText(currentValue));
  };

  // Cancelar edição
  const cancelEditing = () => {
    setEditingSection(null);
    setEditValue('');
  };

  // Salvar edição manual
  const saveManualEdit = async (section) => {
    if (!editValue.trim() || !onManualEdit) {
      cancelEditing();
      return;
    }

    setIsSaving(true);
    try {
      await onManualEdit(section, editValue.trim());
      cancelEditing();
    } catch (error) {
      console.error('Erro ao salvar edição:', error);
      alert('Erro ao salvar. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

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

  // Verificar se há edição pendente para a estratégia (campo "strategy" ou "tese_da_vitoria")
  const isEditingStrategy = pendingEdit?.field === 'strategy' || pendingEdit?.field === 'tese_da_vitoria';

  return (
    <div className="space-y-6">
      {/* 🎯 RESUMO RÁPIDO - Novo bloco principal */}
      {strategyData?.resumo_rapido && (
        <section className="panel bg-gradient-to-br from-indigo-50 via-purple-50 to-slate-50 border-2 border-indigo-200 shadow-lg shadow-indigo-500/10">
          <div className="px-6 py-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">Resumo Executivo</p>
                <h3 className="text-lg font-bold text-slate-900">Como Vencer Esta Luta</h3>
              </div>
            </div>
            
            {/* Como Vencer - Texto principal com edição manual */}
            <div className="mb-5 p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
              {isEditingStrategy ? (
                <EditableText
                  value={strategyData.resumo_rapido.como_vencer}
                  pendingEdit={pendingEdit}
                  field={pendingEdit?.field}
                  onAccept={onAcceptEdit}
                  onReject={onRejectEdit}
                  isApplying={isApplyingEdit}
                />
              ) : editingSection === 'resumo_como_vencer' ? (
                <div className="space-y-3">
                  <textarea
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="w-full h-32 px-4 py-3 border border-slate-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm text-slate-700 leading-relaxed"
                    placeholder="Descreva como vencer esta luta..."
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={cancelEditing} className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-all">
                      Cancelar
                    </button>
                    <button
                      onClick={() => saveManualEdit('resumo_como_vencer')}
                      disabled={isSaving}
                      className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center gap-1.5"
                    >
                      {isSaving ? 'Salvando...' : <><Save className="w-3.5 h-3.5" /> Salvar</>}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div className="text-slate-800 leading-relaxed text-base font-medium flex-1">
                    <FormattedText text={strategyData.resumo_rapido.como_vencer} />
                  </div>
                  {onManualEdit && (
                    <button
                      onClick={() => startEditing('resumo_como_vencer', strategyData.resumo_rapido.como_vencer)}
                      className="flex-shrink-0 p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                      title="Editar"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* 3 Prioridades com edição */}
            {strategyData.resumo_rapido.tres_prioridades && (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">📌 Suas 3 Prioridades</p>
                {strategyData.resumo_rapido.tres_prioridades.map((prioridade, idx) => (
                  <div key={idx} className="flex gap-3 items-start p-3 bg-white rounded-lg border border-slate-200 shadow-sm">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm font-bold">
                      {idx + 1}
                    </span>
                    {editingSection === `resumo_prioridade_${idx}` ? (
                      <div className="flex-1 space-y-2">
                        <textarea
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-full h-20 px-3 py-2 border border-slate-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                        />
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={cancelEditing} className="px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 rounded">Cancelar</button>
                          <button onClick={() => saveManualEdit(`resumo_prioridade_${idx}`)} className="px-2 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700">Salvar</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="text-slate-700 text-sm leading-relaxed flex-1"><FormattedText text={prioridade} /></div>
                        {onManualEdit && (
                          <button
                            onClick={() => startEditing(`resumo_prioridade_${idx}`, prioridade)}
                            className="flex-shrink-0 p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-all"
                            title="Editar prioridade"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* 📊 Análise de Matchup */}
      {strategyData?.analise_de_matchup && (
        <section className="panel">
          <div className="px-6 py-4 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Análise Comparativa</p>
            <h4 className="text-lg font-semibold text-slate-900">Matchup & Assimetrias</h4>
          </div>
          
          {/* Diff para edições no matchup */}
          {pendingEdit && (pendingEdit.field === 'analise_de_matchup' || pendingEdit.field === 'matchup') && (
            <div className="px-6 py-4 border-b border-slate-100">
              <EditableText
                value={strategyData.analise_de_matchup}
                pendingEdit={pendingEdit}
                field="analise_de_matchup"
                onAccept={onAcceptEdit}
                onReject={onRejectEdit}
                isApplying={isApplyingEdit}
              />
            </div>
          )}
          
          <div className="px-6 py-5 space-y-4">
            {/* Vantagem Crítica */}
            <div className="bg-green-50 rounded-xl p-4 border border-green-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <p className="font-semibold text-green-800">Vantagem Crítica</p>
                </div>
                {onManualEdit && editingSection !== 'matchup_vantagem_critica' && (
                  <button
                    onClick={() => startEditing('matchup_vantagem_critica', strategyData.analise_de_matchup.vantagem_critica)}
                    className="p-1.5 text-green-600 hover:bg-green-100 rounded-lg transition-all"
                    title="Editar"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                )}
              </div>
              {editingSection === 'matchup_vantagem_critica' ? (
                <div className="space-y-2">
                  <textarea
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="w-full h-24 px-3 py-2 border border-green-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                  />
                  <div className="flex justify-end gap-2">
                    <button onClick={cancelEditing} className="px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 rounded">Cancelar</button>
                    <button onClick={() => saveManualEdit('matchup_vantagem_critica')} className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700">Salvar</button>
                  </div>
                </div>
              ) : (
                <div className="text-slate-700 text-sm leading-relaxed"><FormattedText text={strategyData.analise_de_matchup.vantagem_critica} /></div>
              )}
            </div>

            {/* Risco Oculto */}
            <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <p className="font-semibold text-orange-800">Risco Oculto</p>
                </div>
                {onManualEdit && editingSection !== 'matchup_risco_oculto' && (
                  <button
                    onClick={() => startEditing('matchup_risco_oculto', strategyData.analise_de_matchup.risco_oculto)}
                    className="p-1.5 text-orange-600 hover:bg-orange-100 rounded-lg transition-all"
                    title="Editar"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                )}
              </div>
              {editingSection === 'matchup_risco_oculto' ? (
                <div className="space-y-2">
                  <textarea
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="w-full h-24 px-3 py-2 border border-orange-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                  />
                  <div className="flex justify-end gap-2">
                    <button onClick={cancelEditing} className="px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 rounded">Cancelar</button>
                    <button onClick={() => saveManualEdit('matchup_risco_oculto')} className="px-2 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700">Salvar</button>
                  </div>
                </div>
              ) : (
                <div className="text-slate-700 text-sm leading-relaxed"><FormattedText text={strategyData.analise_de_matchup.risco_oculto} /></div>
              )}
            </div>

            {/* Fator Chave */}
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <p className="font-semibold text-blue-800">Fator Chave</p>
                </div>
                {onManualEdit && editingSection !== 'matchup_fator_chave' && (
                  <button
                    onClick={() => startEditing('matchup_fator_chave', strategyData.analise_de_matchup.fator_chave)}
                    className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition-all"
                    title="Editar"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                )}
              </div>
              {editingSection === 'matchup_fator_chave' ? (
                <div className="space-y-2">
                  <textarea
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="w-full h-24 px-3 py-2 border border-blue-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                  <div className="flex justify-end gap-2">
                    <button onClick={cancelEditing} className="px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 rounded">Cancelar</button>
                    <button onClick={() => saveManualEdit('matchup_fator_chave')} className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">Salvar</button>
                  </div>
                </div>
              ) : (
                <div className="text-slate-700 text-sm leading-relaxed"><FormattedText text={strategyData.analise_de_matchup.fator_chave} /></div>
              )}
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
          
          {/* Diff para edições no plano tático */}
          {pendingEdit && (pendingEdit.field === 'plano_tatico_faseado' || pendingEdit.field === 'plano_tatico') && (
            <div className="px-6 py-4 border-b border-slate-100">
              <EditableText
                value={strategyData.plano_tatico_faseado}
                pendingEdit={pendingEdit}
                field="plano_tatico_faseado"
                onAccept={onAcceptEdit}
                onReject={onRejectEdit}
                isApplying={isApplyingEdit}
              />
            </div>
          )}
          
          <div className="px-6 py-5 grid gap-4 md:grid-cols-3">
            {/* Em Pé / Stand-up */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🥋</span>
                  <h5 className="font-semibold text-slate-900">Em Pé</h5>
                </div>
                {onManualEdit && editingSection !== 'plano_em_pe' && (
                  <button
                    onClick={() => startEditing('plano_em_pe', formatObjectToText(strategyData.plano_tatico_faseado.em_pe_standup))}
                    className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-all"
                    title="Editar"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              {editingSection === 'plano_em_pe' ? (
                <div className="space-y-2">
                  <textarea
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="w-full h-32 px-3 py-2 border border-slate-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    placeholder="Descreva a estratégia em pé..."
                  />
                  <div className="flex justify-end gap-2">
                    <button onClick={cancelEditing} className="px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 rounded">Cancelar</button>
                    <button onClick={() => saveManualEdit('plano_em_pe')} className="px-2 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700">Salvar</button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <Badge variant="info">Ação Recomendada</Badge>
                    <p className="text-slate-700 text-sm mt-1.5 leading-relaxed">
                      <FormattedText text={strategyData.plano_tatico_faseado.em_pe_standup?.acao_recomendada} />
                    </p>
                  </div>
                  {(strategyData.plano_tatico_faseado.em_pe_standup?.explicacao || strategyData.plano_tatico_faseado.em_pe_standup?.detalhe_tecnico) && (
                    <div className="pt-2 border-t border-slate-200">
                      <Badge variant="default">Por quê?</Badge>
                      <p className="text-slate-600 text-sm mt-1.5 leading-relaxed">
                        <FormattedText text={strategyData.plano_tatico_faseado.em_pe_standup?.explicacao || strategyData.plano_tatico_faseado.em_pe_standup?.detalhe_tecnico} />
                      </p>
                    </div>
                  )}
                  {strategyData.plano_tatico_faseado.em_pe_standup?.como_executar && (
                    <div className="pt-2 border-t border-slate-200">
                      <Badge variant="success">Como Executar</Badge>
                      <p className="text-slate-600 text-sm mt-1.5 leading-relaxed">
                        <FormattedText text={strategyData.plano_tatico_faseado.em_pe_standup.como_executar} />
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Jogo de Passagem */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">⬇️</span>
                  <h5 className="font-semibold text-slate-900">Passagem</h5>
                </div>
                {onManualEdit && editingSection !== 'plano_passagem' && (
                  <button
                    onClick={() => startEditing('plano_passagem', formatObjectToText(strategyData.plano_tatico_faseado.jogo_de_passagem_top))}
                    className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-all"
                    title="Editar"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              {editingSection === 'plano_passagem' ? (
                <div className="space-y-2">
                  <textarea
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="w-full h-32 px-3 py-2 border border-slate-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    placeholder="Descreva a estratégia de passagem..."
                  />
                  <div className="flex justify-end gap-2">
                    <button onClick={cancelEditing} className="px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 rounded">Cancelar</button>
                    <button onClick={() => saveManualEdit('plano_passagem')} className="px-2 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700">Salvar</button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <Badge variant="success">Estilo Recomendado</Badge>
                    <p className="text-slate-700 text-sm mt-1.5 leading-relaxed">
                      <FormattedText text={strategyData.plano_tatico_faseado.jogo_de_passagem_top?.estilo_recomendado || strategyData.plano_tatico_faseado.jogo_de_passagem_top?.caminho_das_pedras} />
                    </p>
                  </div>
                  {strategyData.plano_tatico_faseado.jogo_de_passagem_top?.passo_a_passo && (
                    <div className="pt-2 border-t border-slate-200">
                      <Badge variant="info">Passo a Passo</Badge>
                      <p className="text-slate-600 text-sm mt-1.5 leading-relaxed">
                        <FormattedText text={strategyData.plano_tatico_faseado.jogo_de_passagem_top.passo_a_passo} />
                      </p>
                    </div>
                  )}
                  <div className="pt-2 border-t border-slate-200">
                    <Badge variant="warning">⚠️ Armadilha a Evitar</Badge>
                    <p className="text-slate-600 text-sm mt-1.5 leading-relaxed">
                      <FormattedText text={strategyData.plano_tatico_faseado.jogo_de_passagem_top?.armadilha_a_evitar || strategyData.plano_tatico_faseado.jogo_de_passagem_top?.alerta_de_reversao} />
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Jogo de Guarda */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">⬆️</span>
                  <h5 className="font-semibold text-slate-900">Guarda</h5>
                </div>
                {onManualEdit && editingSection !== 'plano_guarda' && (
                  <button
                    onClick={() => startEditing('plano_guarda', formatObjectToText(strategyData.plano_tatico_faseado.jogo_de_guarda_bottom))}
                    className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-all"
                    title="Editar"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              {editingSection === 'plano_guarda' ? (
                <div className="space-y-2">
                  <textarea
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="w-full h-32 px-3 py-2 border border-slate-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    placeholder="Descreva a estratégia de guarda..."
                  />
                  <div className="flex justify-end gap-2">
                    <button onClick={cancelEditing} className="px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 rounded">Cancelar</button>
                    <button onClick={() => saveManualEdit('plano_guarda')} className="px-2 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700">Salvar</button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <Badge variant="success">Guarda Ideal</Badge>
                    <p className="text-slate-700 text-sm mt-1.5 leading-relaxed">
                      <FormattedText text={strategyData.plano_tatico_faseado.jogo_de_guarda_bottom?.guarda_ideal || strategyData.plano_tatico_faseado.jogo_de_guarda_bottom?.melhor_posicao} />
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-200">
                    <Badge variant="info">Momento de Atacar</Badge>
                    <p className="text-slate-600 text-sm mt-1.5 leading-relaxed">
                      <FormattedText text={strategyData.plano_tatico_faseado.jogo_de_guarda_bottom?.momento_de_atacar || strategyData.plano_tatico_faseado.jogo_de_guarda_bottom?.gatilho_de_ataque} />
                    </p>
                  </div>
                  {strategyData.plano_tatico_faseado.jogo_de_guarda_bottom?.se_der_errado && (
                    <div className="pt-2 border-t border-slate-200">
                      <Badge variant="warning">Plano B</Badge>
                      <p className="text-slate-600 text-sm mt-1.5 leading-relaxed">
                        <FormattedText text={strategyData.plano_tatico_faseado.jogo_de_guarda_bottom.se_der_errado} />
                      </p>
                    </div>
                  )}
                </div>
              )}
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
          
          {/* Diff para edições na cronologia */}
          {pendingEdit && (pendingEdit.field === 'cronologia_inteligente' || pendingEdit.field === 'cronologia') && (
            <div className="px-6 py-4 border-b border-slate-100">
              <EditableText
                value={strategyData.cronologia_inteligente}
                pendingEdit={pendingEdit}
                field="cronologia_inteligente"
                onAccept={onAcceptEdit}
                onReject={onRejectEdit}
                isApplying={isApplyingEdit}
              />
            </div>
          )}
          
          <div className="px-6 py-5">
            <div className="relative">
              {/* Timeline Line */}
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-green-500 via-yellow-500 to-red-500"></div>
              
              <div className="space-y-6">
                {/* Primeiro Minuto */}
                <div className="relative pl-12">
                  <div className="absolute left-0 w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white text-sm font-bold shadow-lg">
                    1
                  </div>
                  <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-semibold text-green-800">Primeiro Minuto (0:00 - 1:00)</p>
                      {onManualEdit && editingSection !== 'cronologia_primeiro_minuto' && (
                        <button
                          onClick={() => startEditing('cronologia_primeiro_minuto', strategyData.cronologia_inteligente.primeiro_minuto || strategyData.cronologia_inteligente.inicio)}
                          className="p-1 text-green-600 hover:bg-green-100 rounded transition-all"
                          title="Editar"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    {editingSection === 'cronologia_primeiro_minuto' ? (
                      <div className="space-y-2">
                        <textarea
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-full h-20 px-3 py-2 border border-green-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                        />
                        <div className="flex justify-end gap-2">
                          <button onClick={cancelEditing} className="px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 rounded">Cancelar</button>
                          <button onClick={() => saveManualEdit('cronologia_primeiro_minuto')} className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700">Salvar</button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-slate-700 text-sm leading-relaxed">
                        <FormattedText text={strategyData.cronologia_inteligente.primeiro_minuto || strategyData.cronologia_inteligente.inicio} />
                      </p>
                    )}
                  </div>
                </div>

                {/* Minutos 2-4 */}
                <div className="relative pl-12">
                  <div className="absolute left-0 w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center text-white text-sm font-bold shadow-lg">
                    2
                  </div>
                  <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-semibold text-yellow-800">Desenvolvimento (2:00 - 4:00)</p>
                      {onManualEdit && editingSection !== 'cronologia_minutos_2_a_4' && (
                        <button
                          onClick={() => startEditing('cronologia_minutos_2_a_4', strategyData.cronologia_inteligente.minutos_2_a_4 || strategyData.cronologia_inteligente.meio)}
                          className="p-1 text-yellow-600 hover:bg-yellow-100 rounded transition-all"
                          title="Editar"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    {editingSection === 'cronologia_minutos_2_a_4' ? (
                      <div className="space-y-2">
                        <textarea
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-full h-20 px-3 py-2 border border-yellow-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-yellow-500 text-sm"
                        />
                        <div className="flex justify-end gap-2">
                          <button onClick={cancelEditing} className="px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 rounded">Cancelar</button>
                          <button onClick={() => saveManualEdit('cronologia_minutos_2_a_4')} className="px-2 py-1 text-xs bg-yellow-600 text-white rounded hover:bg-yellow-700">Salvar</button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-slate-700 text-sm leading-relaxed">
                        <FormattedText text={strategyData.cronologia_inteligente.minutos_2_a_4 || strategyData.cronologia_inteligente.meio} />
                      </p>
                    )}
                  </div>
                </div>

                {/* Minutos Finais */}
                <div className="relative pl-12">
                  <div className="absolute left-0 w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white text-sm font-bold shadow-lg">
                    3
                  </div>
                  <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-semibold text-red-800">Minutos Finais (5:00+)</p>
                      {onManualEdit && editingSection !== 'cronologia_minutos_finais' && (
                        <button
                          onClick={() => startEditing('cronologia_minutos_finais', strategyData.cronologia_inteligente.minutos_finais || strategyData.cronologia_inteligente.final)}
                          className="p-1 text-red-600 hover:bg-red-100 rounded transition-all"
                          title="Editar"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    {editingSection === 'cronologia_minutos_finais' ? (
                      <div className="space-y-2">
                        <textarea
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-full h-20 px-3 py-2 border border-red-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                        />
                        <div className="flex justify-end gap-2">
                          <button onClick={cancelEditing} className="px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 rounded">Cancelar</button>
                          <button onClick={() => saveManualEdit('cronologia_minutos_finais')} className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700">Salvar</button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-slate-700 text-sm leading-relaxed">
                        <FormattedText text={strategyData.cronologia_inteligente.minutos_finais || strategyData.cronologia_inteligente.final} />
                      </p>
                    )}
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
          
          {/* Diff para edições no checklist */}
          {pendingEdit && (pendingEdit.field === 'checklist_tatico' || pendingEdit.field === 'checklist') && (
            <div className="px-6 py-4 border-b border-slate-100">
              <EditableText
                value={strategyData.checklist_tatico}
                pendingEdit={pendingEdit}
                field="checklist_tatico"
                onAccept={onAcceptEdit}
                onReject={onRejectEdit}
                isApplying={isApplyingEdit}
              />
            </div>
          )}
          
          <div className="px-6 py-5 space-y-4">
            {/* Se checklist_tatico for string, exibe como texto formatado */}
            {typeof strategyData.checklist_tatico === 'string' ? (
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <FormattedText text={strategyData.checklist_tatico} />
              </div>
            ) : (
              <>
                {/* Formato IA simplificado: fazer/nao_fazer */}
                {(strategyData.checklist_tatico.fazer || strategyData.checklist_tatico.nao_fazer) && (
                  <>
                    {/* O que FAZER */}
                    {strategyData.checklist_tatico.fazer?.length > 0 && (
                      <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                        <p className="font-semibold text-green-800 flex items-center gap-2 mb-4">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          ✅ O que FAZER
                        </p>
                        <ul className="space-y-2">
                          {strategyData.checklist_tatico.fazer.map((item, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                              <span className="text-green-500 mt-0.5">•</span>
                              <FormattedText text={typeof item === 'string' ? item : item.descricao || item.acao || JSON.stringify(item)} />
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {/* O que NÃO FAZER */}
                    {strategyData.checklist_tatico.nao_fazer?.length > 0 && (
                      <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                        <p className="font-semibold text-red-800 flex items-center gap-2 mb-4">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                          ❌ O que NÃO FAZER
                        </p>
                        <ul className="space-y-2">
                          {strategyData.checklist_tatico.nao_fazer.map((item, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                              <span className="text-red-500 mt-0.5">•</span>
                              <FormattedText text={typeof item === 'string' ? item : item.descricao || item.acao || JSON.stringify(item)} />
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {/* Se estiver perdendo */}
                    {strategyData.checklist_tatico.se_estiver_perdendo && (
                      <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
                        <p className="font-semibold text-orange-800 flex items-center gap-2 mb-3">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944zM11 14a1 1 0 11-2 0 1 1 0 012 0zm0-7a1 1 0 10-2 0v3a1 1 0 102 0V7z" clipRule="evenodd" />
                          </svg>
                          🚨 Se Estiver Perdendo
                        </p>
                        <FormattedText text={strategyData.checklist_tatico.se_estiver_perdendo} />
                      </div>
                    )}
                  </>
                )}
                
                {/* Formato original: oportunidades_de_pontos/armadilhas_dele */}
                {(strategyData.checklist_tatico.oportunidades_de_pontos || strategyData.checklist_tatico.armadilhas_dele) && (
                  <>
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
                                <FormattedText text={item.situacao || item.quando} />
                              </p>
                            )}
                            {item.por_que_funciona && (
                              <p className="text-sm text-green-700 bg-green-100/50 rounded px-2 py-1.5 leading-relaxed">
                                <span className="font-medium">Por quê funciona: </span>
                                <FormattedText text={item.por_que_funciona} />
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
                              <p className="text-slate-700 text-sm mt-1"><FormattedText text={item.situacao} /></p>
                            </div>
                            <div className="mb-2">
                              <span className="font-medium text-red-800 text-sm">O que ele faz:</span>
                              <p className="text-slate-700 text-sm mt-1"><FormattedText text={item.o_que_ele_faz || item.tecnica_perigosa} /></p>
                            </div>
                            <div className="bg-red-100/50 rounded px-2 py-1.5">
                              <span className="font-medium text-red-800 text-sm">Como evitar:</span>
                              <p className="text-red-700 text-sm mt-1 leading-relaxed"><FormattedText text={item.como_evitar} /></p>
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
                          {/* Posição Perigosa */}
                          <div className="bg-white/60 rounded-lg p-3 border border-orange-100">
                            <div className="flex items-center justify-between mb-1">
                              <Badge variant="danger">⛔ Posição Perigosa</Badge>
                              {onManualEdit && editingSection !== 'checklist_posicao_perigosa' && (
                                <button
                                  onClick={() => startEditing('checklist_posicao_perigosa', strategyData.checklist_tatico.protocolo_de_emergencia?.posicao_perigosa || strategyData.checklist_tatico.protocolo_de_seguranca?.jamais_fazer || '')}
                                  className="p-1 text-orange-600 hover:bg-orange-100 rounded transition-all"
                                  title="Editar"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                            {editingSection === 'checklist_posicao_perigosa' ? (
                              <div className="space-y-2 mt-2">
                                <textarea
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  className="w-full h-20 px-3 py-2 border border-orange-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                                />
                                <div className="flex justify-end gap-2">
                                  <button onClick={cancelEditing} className="px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 rounded">Cancelar</button>
                                  <button onClick={() => saveManualEdit('checklist_posicao_perigosa')} className="px-2 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700">Salvar</button>
                                </div>
                              </div>
                            ) : (
                              <p className="text-slate-700 text-sm mt-2 leading-relaxed">
                                <FormattedText text={strategyData.checklist_tatico.protocolo_de_emergencia?.posicao_perigosa || 
                                strategyData.checklist_tatico.protocolo_de_seguranca?.jamais_fazer || 
                                'Nenhuma posição crítica identificada'} />
                              </p>
                            )}
                          </div>
                          {/* Como Escapar */}
                          <div className="bg-white/60 rounded-lg p-3 border border-orange-100">
                            <div className="flex items-center justify-between mb-1">
                              <Badge variant="warning">🚨 Como Escapar</Badge>
                              {onManualEdit && editingSection !== 'checklist_como_escapar' && (
                                <button
                                  onClick={() => startEditing('checklist_como_escapar', strategyData.checklist_tatico.protocolo_de_emergencia?.como_escapar || strategyData.checklist_tatico.protocolo_de_seguranca?.saida_de_emergencia || '')}
                                  className="p-1 text-orange-600 hover:bg-orange-100 rounded transition-all"
                                  title="Editar"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                            {editingSection === 'checklist_como_escapar' ? (
                              <div className="space-y-2 mt-2">
                                <textarea
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  className="w-full h-20 px-3 py-2 border border-orange-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                                />
                                <div className="flex justify-end gap-2">
                                  <button onClick={cancelEditing} className="px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 rounded">Cancelar</button>
                                  <button onClick={() => saveManualEdit('checklist_como_escapar')} className="px-2 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700">Salvar</button>
                                </div>
                              </div>
                            ) : (
                              <p className="text-slate-700 text-sm mt-2 leading-relaxed">
                                <FormattedText text={strategyData.checklist_tatico.protocolo_de_emergencia?.como_escapar || 
                                strategyData.checklist_tatico.protocolo_de_seguranca?.saida_de_emergencia || 
                                'Nenhuma rota de fuga específica'} />
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
