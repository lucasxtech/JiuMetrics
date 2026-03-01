import { useState } from 'react';
import { X, Calendar, MessageSquare, Sparkles, Zap, Shield, Target, Clock, CheckSquare, History, Edit3, Check, Save } from 'lucide-react';
import StrategyChatPanel from '../chat/StrategyChatPanel';
import Badge from '../common/Badge';
import FormattedText from '../common/FormattedText';

/**
 * Modal detalhado para visualizar a estratégia gerada com chat IA lateral
 * Segue o mesmo padrão do ProfileSummaryModal
 */
export default function StrategySummaryModal({ 
  strategy,
  athleteName,
  opponentName,
  onClose, 
  onStrategyUpdated 
}) {
  const [currentStrategy, setCurrentStrategy] = useState(strategy);
  const [activePanel, setActivePanel] = useState(null); // 'chat' | 'history' | null
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // Estados para edição manual
  const [editingSection, setEditingSection] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  // Estados para chat com sugestões pendentes
  const [pendingEdit, setPendingEdit] = useState(null); // { messageId, field, oldValue, newValue, reason }
  const [isApplyingEdit, setIsApplyingEdit] = useState(false);
  
  // Histórico de versões local (para estratégias temporárias)
  const [versions, setVersions] = useState([{
    id: 1,
    timestamp: new Date().toISOString(),
    data: strategy,
    source: 'Geração inicial'
  }]);

  if (!strategy) return null;

  const strategyData = currentStrategy?.strategy || currentStrategy;

  const formatDate = (date) => {
    if (!date) return new Date().toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Handler para atualização via chat
  const handleChatUpdate = async (suggestion) => {
    try {
      const updatedData = { ...strategyData };
      
      // Aplicar sugestão baseada na seção
      if (suggestion.section === 'tese_da_vitoria') {
        updatedData.tese_da_vitoria = suggestion.newValue;
      } else if (suggestion.section === 'analise_de_matchup') {
        updatedData.analise_de_matchup = {
          ...updatedData.analise_de_matchup,
          ...suggestion.newValue
        };
      } else if (suggestion.section === 'plano_tatico_faseado') {
        updatedData.plano_tatico_faseado = {
          ...updatedData.plano_tatico_faseado,
          ...suggestion.newValue
        };
      } else if (suggestion.section === 'cronologia_inteligente') {
        updatedData.cronologia_inteligente = {
          ...updatedData.cronologia_inteligente,
          ...suggestion.newValue
        };
      } else if (suggestion.section === 'checklist_tatico') {
        updatedData.checklist_tatico = {
          ...updatedData.checklist_tatico,
          ...suggestion.newValue
        };
      } else {
        // Fallback
        updatedData[suggestion.section || suggestion.field] = suggestion.newValue;
      }
      
      const newStrategyObj = { strategy: updatedData };
      setCurrentStrategy(newStrategyObj);
      
      // Salvar versão
      saveVersion(newStrategyObj, 'Edição via Chat IA');
      
      // Notificar o componente pai
      if (onStrategyUpdated) {
        await onStrategyUpdated(suggestion);
      }
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (error) {
      console.error('Erro ao aplicar sugestão:', error);
      throw error;
    }
  };

  // Handler quando chat sugere uma edição (mostra o diff)
  const handleSuggestEdit = (suggestion) => {
    setPendingEdit(suggestion);
  };

  // Handler quando usuário aceita a sugestão
  const handleAcceptEdit = async () => {
    if (!pendingEdit) return;
    
    setIsApplyingEdit(true);
    try {
      const updatedData = { ...strategyData };
      const { field, newValue } = pendingEdit;
      
      // Aplicar sugestão baseada no campo
      if (field === 'como_vencer' || field === 'tese_da_vitoria') {
        // Atualizar "Como Vencer" no resumo rápido
        updatedData.resumo_rapido = {
          ...updatedData.resumo_rapido,
          como_vencer: newValue
        };
        // Também atualizar tese_da_vitoria como fallback
        updatedData.tese_da_vitoria = newValue;
      } else if (field === 'analise_de_matchup' || field === 'matchup') {
        updatedData.analise_de_matchup = newValue;
      } else if (field === 'plano_tatico_faseado' || field === 'plano_tatico') {
        updatedData.plano_tatico_faseado = newValue;
      } else if (field === 'cronologia_inteligente' || field === 'cronologia') {
        updatedData.cronologia_inteligente = newValue;
      } else if (field === 'checklist_tatico') {
        updatedData.checklist_tatico = newValue;
      } else {
        // Fallback genérico
        updatedData[field] = newValue;
      }
      
      const newStrategyObj = { strategy: updatedData };
      setCurrentStrategy(newStrategyObj);
      
      // Salvar versão no histórico
      saveVersion(newStrategyObj, `Edição via Chat IA: ${pendingEdit.reason || 'atualização'}`);
      
      // Limpar sugestão pendente
      setPendingEdit(null);
      
      // Notificar sucesso
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
      
    } catch (error) {
      console.error('❌ [StrategySummaryModal] Erro ao aplicar sugestão:', error);
    } finally {
      setIsApplyingEdit(false);
    }
  };

  // Handler quando usuário rejeita a sugestão
  const handleRejectEdit = () => {
    setPendingEdit(null);
  };

  // Salvar uma nova versão no histórico
  const saveVersion = (newData, source) => {
    setVersions(prev => [{
      id: prev.length + 1,
      timestamp: new Date().toISOString(),
      data: newData,
      source
    }, ...prev]);
  };

  // Iniciar edição de uma seção
  const startEditing = (section, currentValue) => {
    setEditingSection(section);
    setEditValue(typeof currentValue === 'string' ? currentValue : JSON.stringify(currentValue, null, 2));
  };

  // Cancelar edição
  const cancelEditing = () => {
    setEditingSection(null);
    setEditValue('');
  };

  // Salvar edição manual
  const saveManualEdit = async (section) => {
    if (!editValue.trim()) {
      cancelEditing();
      return;
    }

    setIsSaving(true);
    try {
      const updatedData = { ...strategyData };
      
      // Aplicar edição baseada na seção
      if (section === 'tese_da_vitoria') {
        updatedData.tese_da_vitoria = editValue.trim();
      } else if (section === 'resumo_como_vencer') {
        // Edição do "Como Vencer" no resumo rápido
        updatedData.resumo_rapido = {
          ...updatedData.resumo_rapido,
          como_vencer: editValue.trim()
        };
      } else if (section.startsWith('resumo_prioridade_')) {
        // Edição de uma prioridade específica
        const idx = parseInt(section.replace('resumo_prioridade_', ''), 10);
        const prioridades = [...(updatedData.resumo_rapido?.tres_prioridades || [])];
        prioridades[idx] = editValue.trim();
        updatedData.resumo_rapido = {
          ...updatedData.resumo_rapido,
          tres_prioridades: prioridades
        };
      } else if (section.startsWith('matchup_')) {
        const field = section.replace('matchup_', '');
        updatedData.analise_de_matchup = {
          ...updatedData.analise_de_matchup,
          [field]: editValue.trim()
        };
      } else if (section.startsWith('cronologia_')) {
        const field = section.replace('cronologia_', '');
        updatedData.cronologia_inteligente = {
          ...updatedData.cronologia_inteligente,
          [field]: editValue.trim()
        };
      } else if (section.startsWith('tatico_')) {
        // Parse JSON para campos complexos
        try {
          const parsed = JSON.parse(editValue);
          const field = section.replace('tatico_', '');
          updatedData.plano_tatico_faseado = {
            ...updatedData.plano_tatico_faseado,
            [field]: parsed
          };
        } catch {
          // Se não for JSON, tratar como string
          updatedData[section] = editValue.trim();
        }
      } else if (section.startsWith('checklist_')) {
        const field = section.replace('checklist_', '');
        if (field === 'protocolo_de_seguranca') {
          try {
            updatedData.checklist_tatico.protocolo_de_seguranca = JSON.parse(editValue);
          } catch {
            // Ignorar se não for JSON válido
          }
        }
      }
      
      const newStrategyObj = { strategy: updatedData };
      setCurrentStrategy(newStrategyObj);
      
      // Salvar versão
      saveVersion(newStrategyObj, `Edição manual: ${section}`);
      
      // Notificar o componente pai
      if (onStrategyUpdated) {
        await onStrategyUpdated({ section, newValue: editValue.trim() });
      }
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
      cancelEditing();
    } catch (error) {
      console.error('Erro ao salvar edição:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Restaurar versão
  const restoreVersion = (version) => {
    setCurrentStrategy(version.data);
    saveVersion(version.data, `Restaurado de: ${version.source}`);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div 
        className="absolute inset-0"
        onClick={onClose}
      />
      
      {/* Container principal com possível painel lateral */}
      <div className="relative flex w-full max-w-7xl max-h-[90vh]">
        {/* Modal Principal */}
        <div className={`relative w-full overflow-y-auto rounded-2xl bg-white shadow-2xl transition-all duration-300 ${
          activePanel ? 'max-w-4xl' : 'max-w-5xl mx-auto'
        }`}>
          {/* Header */}
          <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
            <div className="flex items-start justify-between gap-4 p-6">
              <div className="flex items-start gap-4 flex-1">
                <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/30">
                  <Zap className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">
                    Estratégia de Luta
                  </h2>
                  <div className="flex items-center gap-3 text-sm text-slate-600 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <Target className="w-4 h-4" />
                      {athleteName} vs {opponentName}
                    </div>
                    <span className="text-slate-300">•</span>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4" />
                      {formatDate(currentStrategy?.createdAt)}
                    </div>
                    {saveSuccess && (
                      <span className="px-2.5 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium flex items-center gap-1 animate-pulse">
                        <CheckSquare className="w-3.5 h-3.5" />
                        Atualizado!
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Ações do Header */}
              <div className="flex items-center gap-2">
                {/* Botão Chat IA */}
                <button
                  onClick={() => setActivePanel(activePanel === 'chat' ? null : 'chat')}
                  className={`p-2.5 rounded-lg transition-all flex items-center gap-2 ${
                    activePanel === 'chat'
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'
                  }`}
                  title="Refinar com IA"
                >
                  <MessageSquare className="w-5 h-5" />
                  <span className="text-sm font-medium hidden sm:inline">Chat IA</span>
                </button>

                {/* Botão Histórico */}
                <button
                  onClick={() => setActivePanel(activePanel === 'history' ? null : 'history')}
                  className={`p-2.5 rounded-lg transition-all flex items-center gap-2 ${
                    activePanel === 'history'
                      ? 'bg-slate-200 text-slate-700'
                      : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                  }`}
                  title="Histórico de versões"
                >
                  <History className="w-5 h-5" />
                  <span className="text-sm font-medium hidden sm:inline">Histórico</span>
                </button>

                {/* Botão Fechar */}
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* 🎯 RESUMO RÁPIDO - Novo bloco principal */}
            {strategyData?.resumo_rapido && (
              <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-700 text-white shadow-xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-indigo-200 uppercase tracking-wide">Resumo Executivo</p>
                    <h3 className="text-lg font-bold">Como Vencer Esta Luta</h3>
                  </div>
                </div>
                
                {/* Como Vencer - Texto principal com edição */}
                <div className="mb-5 p-4 bg-white/10 backdrop-blur rounded-xl relative">
                  {editingSection === 'resumo_como_vencer' ? (
                    <div className="space-y-3">
                      <textarea
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="w-full h-28 px-4 py-3 border-0 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-white/50 text-sm text-slate-800 leading-relaxed bg-white"
                        placeholder="Descreva como vencer esta luta..."
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={cancelEditing}
                          className="px-3 py-1.5 text-sm text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => saveManualEdit('resumo_como_vencer')}
                          disabled={isSaving}
                          className="px-3 py-1.5 text-sm bg-white text-indigo-700 rounded-lg hover:bg-white/90 disabled:opacity-50 transition-all flex items-center gap-1.5 font-medium"
                        >
                          {isSaving ? 'Salvando...' : <><Save className="w-3.5 h-3.5" /> Salvar</>}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-4">
                      <FormattedText 
                        text={strategyData.resumo_rapido.como_vencer}
                        className="text-white/95 leading-relaxed text-base flex-1"
                      />
                      <button
                        onClick={() => startEditing('resumo_como_vencer', strategyData.resumo_rapido.como_vencer)}
                        className="flex-shrink-0 p-1.5 text-white/70 hover:text-white hover:bg-white/20 rounded-lg transition-all"
                        title="Editar"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* 3 Prioridades com edição */}
                {strategyData.resumo_rapido.tres_prioridades && (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-indigo-200 uppercase tracking-wide">📌 Suas 3 Prioridades</p>
                    {strategyData.resumo_rapido.tres_prioridades.map((prioridade, idx) => (
                      <div key={idx} className="flex gap-3 items-start p-3 bg-white/10 backdrop-blur rounded-lg">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">
                          {idx + 1}
                        </span>
                        {editingSection === `resumo_prioridade_${idx}` ? (
                          <div className="flex-1 space-y-2">
                            <textarea
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="w-full h-20 px-3 py-2 border-0 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-white/50 text-sm text-slate-800 leading-relaxed bg-white"
                            />
                            <div className="flex items-center justify-end gap-2">
                              <button onClick={cancelEditing} className="px-2 py-1 text-xs text-white/80 hover:text-white hover:bg-white/10 rounded">Cancelar</button>
                              <button 
                                onClick={() => saveManualEdit(`resumo_prioridade_${idx}`)} 
                                className="px-2 py-1 text-xs bg-white text-indigo-700 rounded hover:bg-white/90 font-medium"
                              >
                                Salvar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="text-white/90 text-sm leading-relaxed flex-1">{prioridade}</p>
                            <button
                              onClick={() => startEditing(`resumo_prioridade_${idx}`, prioridade)}
                              className="flex-shrink-0 p-1 text-white/60 hover:text-white hover:bg-white/20 rounded transition-all"
                              title="Editar prioridade"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 🎯 Como Vencer Esta Luta */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-50 via-purple-50 to-slate-50 border-2 border-indigo-200 shadow-lg shadow-indigo-500/10">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                    <Target className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">Objetivo Principal</p>
                    <h3 className="text-lg font-bold text-slate-900">Como Vencer Esta Luta</h3>
                  </div>
                </div>
                {editingSection !== 'tese_da_vitoria' && (
                  <button
                    onClick={() => startEditing('tese_da_vitoria', strategyData?.tese_da_vitoria || '')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Editar
                  </button>
                )}
              </div>
              
              {editingSection === 'tese_da_vitoria' ? (
                <div className="space-y-3">
                  <textarea
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="w-full h-32 px-4 py-3 border border-indigo-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm text-slate-700 leading-relaxed bg-white"
                    placeholder="Digite como vencer esta luta..."
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={cancelEditing}
                      className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => saveManualEdit('tese_da_vitoria')}
                      disabled={isSaving}
                      className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center gap-2"
                    >
                      {isSaving ? (
                        <>
                          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Salvando...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          Salvar
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <FormattedText 
                  text={strategyData?.tese_da_vitoria || 'Aguardando estratégia...'} 
                  className="text-lg font-medium text-slate-800 leading-relaxed"
                />
              )}
            </div>

            {/* 📊 Análise de Matchup */}
            {strategyData?.analise_de_matchup && (
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Análise Comparativa</p>
                    <h3 className="text-lg font-bold text-slate-900">Matchup & Assimetrias</h3>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  {/* Vantagem Crítica */}
                  <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-semibold text-green-800 text-sm">✅ Vantagem Crítica</p>
                      {editingSection !== 'matchup_vantagem_critica' && (
                        <button
                          onClick={() => startEditing('matchup_vantagem_critica', strategyData.analise_de_matchup.vantagem_critica)}
                          className="p-1 text-green-600 hover:bg-green-100 rounded transition-all"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    {editingSection === 'matchup_vantagem_critica' ? (
                      <div className="space-y-2">
                        <textarea
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-full h-24 px-3 py-2 border border-green-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-green-500 text-sm bg-white"
                        />
                        <div className="flex gap-2">
                          <button onClick={cancelEditing} className="px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 rounded">Cancelar</button>
                          <button onClick={() => saveManualEdit('matchup_vantagem_critica')} className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700">Salvar</button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-slate-700 text-sm leading-relaxed">{strategyData.analise_de_matchup.vantagem_critica}</p>
                    )}
                  </div>
                  
                  {/* Risco Oculto */}
                  <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-semibold text-orange-800 text-sm">⚠️ Risco Oculto</p>
                      {editingSection !== 'matchup_risco_oculto' && (
                        <button
                          onClick={() => startEditing('matchup_risco_oculto', strategyData.analise_de_matchup.risco_oculto)}
                          className="p-1 text-orange-600 hover:bg-orange-100 rounded transition-all"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    {editingSection === 'matchup_risco_oculto' ? (
                      <div className="space-y-2">
                        <textarea
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-full h-24 px-3 py-2 border border-orange-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm bg-white"
                        />
                        <div className="flex gap-2">
                          <button onClick={cancelEditing} className="px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 rounded">Cancelar</button>
                          <button onClick={() => saveManualEdit('matchup_risco_oculto')} className="px-2 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700">Salvar</button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-slate-700 text-sm leading-relaxed">{strategyData.analise_de_matchup.risco_oculto}</p>
                    )}
                  </div>
                  
                  {/* Fator Chave */}
                  <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-semibold text-blue-800 text-sm">⚡ Fator Chave</p>
                      {editingSection !== 'matchup_fator_chave' && (
                        <button
                          onClick={() => startEditing('matchup_fator_chave', strategyData.analise_de_matchup.fator_chave)}
                          className="p-1 text-blue-600 hover:bg-blue-100 rounded transition-all"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    {editingSection === 'matchup_fator_chave' ? (
                      <div className="space-y-2">
                        <textarea
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-full h-24 px-3 py-2 border border-blue-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                        />
                        <div className="flex gap-2">
                          <button onClick={cancelEditing} className="px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 rounded">Cancelar</button>
                          <button onClick={() => saveManualEdit('matchup_fator_chave')} className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">Salvar</button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-slate-700 text-sm leading-relaxed">{strategyData.analise_de_matchup.fator_chave}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 🥋 Plano Tático Faseado */}
            {strategyData?.plano_tatico_faseado && (
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                    <span className="text-xl">🥋</span>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Técnicas por Posição</p>
                    <h3 className="text-lg font-bold text-slate-900">Plano Tático Faseado</h3>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  {/* Em Pé */}
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xl">🥋</span>
                      <h5 className="font-semibold text-slate-900">Em Pé</h5>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <Badge variant="info">Ação Recomendada</Badge>
                        <p className="text-slate-700 text-sm mt-1.5 leading-relaxed">
                          {strategyData.plano_tatico_faseado.em_pe_standup?.acao_recomendada}
                        </p>
                      </div>
                      {/* Suporta tanto o campo antigo quanto o novo */}
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

                  {/* Passagem */}
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xl">⬇️</span>
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

                  {/* Guarda */}
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xl">⬆️</span>
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
              </div>
            )}

            {/* ⏱️ Cronologia Inteligente */}
            {strategyData?.cronologia_inteligente && (
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Timeline da Luta</p>
                    <h3 className="text-lg font-bold text-slate-900">Cronologia Inteligente</h3>
                  </div>
                </div>
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-green-500 via-yellow-500 to-red-500"></div>
                  <div className="space-y-4">
                    {/* Início / Primeiro Minuto */}
                    <div className="relative pl-12">
                      <div className="absolute left-0 w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white text-sm font-bold shadow-lg">1</div>
                      <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-semibold text-green-800">Primeiro Minuto (0:00 - 1:00)</p>
                          {editingSection !== 'cronologia_inicio' && (
                            <button
                              onClick={() => startEditing('cronologia_inicio', strategyData.cronologia_inteligente.primeiro_minuto || strategyData.cronologia_inteligente.inicio)}
                              className="p-1 text-green-600 hover:bg-green-100 rounded transition-all"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        {editingSection === 'cronologia_inicio' ? (
                          <div className="space-y-2">
                            <textarea
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="w-full h-24 px-3 py-2 border border-green-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-green-500 text-sm bg-white"
                            />
                            <div className="flex gap-2">
                              <button onClick={cancelEditing} className="px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 rounded">Cancelar</button>
                              <button onClick={() => saveManualEdit('cronologia_inicio')} className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700">Salvar</button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-slate-700 text-sm leading-relaxed">{strategyData.cronologia_inteligente.primeiro_minuto || strategyData.cronologia_inteligente.inicio}</p>
                        )}
                      </div>
                    </div>
                    
                    {/* Meio / Minutos 2-4 */}
                    <div className="relative pl-12">
                      <div className="absolute left-0 w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center text-white text-sm font-bold shadow-lg">2</div>
                      <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-semibold text-yellow-800">Desenvolvimento (2:00 - 4:00)</p>
                          {editingSection !== 'cronologia_meio' && (
                            <button
                              onClick={() => startEditing('cronologia_meio', strategyData.cronologia_inteligente.minutos_2_a_4 || strategyData.cronologia_inteligente.meio)}
                              className="p-1 text-yellow-600 hover:bg-yellow-100 rounded transition-all"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        {editingSection === 'cronologia_meio' ? (
                          <div className="space-y-2">
                            <textarea
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="w-full h-24 px-3 py-2 border border-yellow-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-yellow-500 text-sm bg-white"
                            />
                            <div className="flex gap-2">
                              <button onClick={cancelEditing} className="px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 rounded">Cancelar</button>
                              <button onClick={() => saveManualEdit('cronologia_meio')} className="px-2 py-1 text-xs bg-yellow-600 text-white rounded hover:bg-yellow-700">Salvar</button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-slate-700 text-sm leading-relaxed">{strategyData.cronologia_inteligente.minutos_2_a_4 || strategyData.cronologia_inteligente.meio}</p>
                        )}
                      </div>
                    </div>
                    
                    {/* Final / Minutos Finais */}
                    <div className="relative pl-12">
                      <div className="absolute left-0 w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white text-sm font-bold shadow-lg">3</div>
                      <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-semibold text-red-800">Minutos Finais (5:00+)</p>
                          {editingSection !== 'cronologia_final' && (
                            <button
                              onClick={() => startEditing('cronologia_final', strategyData.cronologia_inteligente.minutos_finais || strategyData.cronologia_inteligente.final)}
                              className="p-1 text-red-600 hover:bg-red-100 rounded transition-all"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        {editingSection === 'cronologia_final' ? (
                          <div className="space-y-2">
                            <textarea
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="w-full h-24 px-3 py-2 border border-red-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-red-500 text-sm bg-white"
                            />
                            <div className="flex gap-2">
                              <button onClick={cancelEditing} className="px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 rounded">Cancelar</button>
                              <button onClick={() => saveManualEdit('cronologia_final')} className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700">Salvar</button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-slate-700 text-sm leading-relaxed">{strategyData.cronologia_inteligente.minutos_finais || strategyData.cronologia_inteligente.final}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ✅ Checklist Tático */}
            {strategyData?.checklist_tatico && (
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                    <CheckSquare className="w-5 h-5 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Detalhes Táticos</p>
                    <h3 className="text-lg font-bold text-slate-900">Checklist Tático</h3>
                  </div>
                </div>
                <div className="space-y-4">
                  {/* Oportunidades de Pontos - Expandido */}
                  <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                    <p className="font-semibold text-green-800 flex items-center gap-2 mb-4">
                      ✅ Oportunidades de Pontos
                    </p>
                    <div className="space-y-4">
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

                  {/* Armadilhas - Expandido */}
                  <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                    <p className="font-semibold text-red-800 flex items-center gap-2 mb-4">
                      ⚠️ Armadilhas do Adversário
                    </p>
                    <div className="space-y-4">
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
                        🛡️ Protocolo de Emergência
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
              </div>
            )}

            {/* Info box */}
            <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-indigo-100">
                  <MessageSquare className="w-4 h-4 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-indigo-900 mb-1">
                    Dica: Use o Chat IA para refinar a estratégia
                  </p>
                  <p className="text-xs text-indigo-700">
                    Peça para a IA detalhar pontos específicos, adicionar planos alternativos, 
                    expandir análises de matchup ou ajustar recomendações táticas para cada fase da luta.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 border-t border-slate-200 bg-slate-50/95 backdrop-blur-sm px-6 py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>💡 Use o <strong>Chat IA</strong> para refinar a estratégia de forma inteligente</span>
              </div>
              <button
                onClick={onClose}
                className="px-6 py-2.5 rounded-lg bg-white border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition-all"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>

        {/* Painel Lateral - Chat ou Histórico */}
        {activePanel && (
          <div className="w-96 ml-4 flex-shrink-0 animate-fadeIn">
            {activePanel === 'chat' && (
              <StrategyChatPanel
                strategyData={currentStrategy}
                athleteName={athleteName}
                opponentName={opponentName}
                onClose={() => setActivePanel(null)}
                pendingEdit={pendingEdit}
                onSuggestEdit={handleSuggestEdit}
                onAcceptEdit={handleAcceptEdit}
                onRejectEdit={handleRejectEdit}
                isApplyingEdit={isApplyingEdit}
                onStrategyUpdated={handleChatUpdate}
              />
            )}
            {activePanel === 'history' && (
              <div className="h-full max-h-[85vh] flex flex-col bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 bg-slate-100 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <History className="w-5 h-5 text-slate-600" />
                    <div>
                      <h3 className="font-semibold text-slate-900 text-sm">Histórico de Versões</h3>
                      <p className="text-xs text-slate-500">{versions.length} versões</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActivePanel(null)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                {/* Lista de Versões */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {versions.map((version, index) => (
                    <div 
                      key={version.id}
                      className={`p-4 rounded-xl border transition-all ${
                        index === 0 
                          ? 'bg-indigo-50 border-indigo-200' 
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          {index === 0 && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-indigo-100 text-indigo-700 rounded-full">
                              Atual
                            </span>
                          )}
                          <span className="text-xs text-slate-500">
                            v{versions.length - index}
                          </span>
                        </div>
                        <span className="text-xs text-slate-400">
                          {new Date(version.timestamp).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      
                      <p className="text-sm font-medium text-slate-700 mb-2">
                        {version.source}
                      </p>
                      
                      {/* Preview da tese */}
                      <p className="text-xs text-slate-500 line-clamp-2 mb-3">
                        {version.data?.strategy?.tese_da_vitoria || 'Sem tese definida'}
                      </p>
                      
                      {index !== 0 && (
                        <button
                          onClick={() => restoreVersion(version)}
                          className="w-full px-3 py-2 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-all flex items-center justify-center gap-1.5"
                        >
                          <History className="w-3.5 h-3.5" />
                          Restaurar esta versão
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                
                {/* Footer */}
                <div className="p-4 border-t border-slate-200 bg-slate-50">
                  <p className="text-xs text-slate-500 text-center">
                    💡 Versões são salvas automaticamente a cada edição
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
