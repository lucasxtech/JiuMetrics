import { useState } from 'react';
import { X, Play, Calendar, BarChart3, TrendingUp, Target, Award, MessageSquare, Edit3, History, Save, Check } from 'lucide-react';
import PieChartSection from '../charts/PieChartSection';
import AiChatPanel from '../chat/AiChatPanel';
import EditableAnalysisText from '../chat/EditableAnalysisText';
import VersionHistoryPanel from '../chat/VersionHistoryPanel';
import { applyEditSuggestion, saveManualEdit } from '../../services/chatService';

/**
 * Modal detalhado para visualizar análise completa
 * com gráficos, estatísticas, chat IA e edição
 */
export default function AnalysisDetailModal({ analysis: initialAnalysis, onClose, onAnalysisUpdated }) {
  const [analysis, setAnalysis] = useState(initialAnalysis);
  const [activePanel, setActivePanel] = useState(null); // 'chat' | 'history' | null
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  if (!analysis) return null;

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const hasCharts = analysis.charts && analysis.charts.length > 0;
  const hasTechnicalStats = analysis.technical_stats && Object.keys(analysis.technical_stats).length > 0;

  // Handler para aplicar sugestão de edição da IA
  const handleApplySuggestion = async (sessionId, analysisId, editSuggestion) => {
    setIsSaving(true);
    try {
      const response = await applyEditSuggestion(sessionId, analysisId, editSuggestion, true);
      if (response.success) {
        setAnalysis(response.data.analysis);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
        if (onAnalysisUpdated) {
          onAnalysisUpdated(response.data.analysis);
        }
      }
    } catch (error) {
      console.error('Erro ao aplicar sugestão:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Handler para salvar edição manual
  const handleSaveSummary = async (newSummary) => {
    setIsSaving(true);
    try {
      const response = await saveManualEdit(analysis.id, 'summary', newSummary, 'Edição manual do resumo');
      if (response.success) {
        setAnalysis(response.data.analysis);
        setIsEditing(false);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
        if (onAnalysisUpdated) {
          onAnalysisUpdated(response.data.analysis);
        }
      }
    } catch (error) {
      console.error('Erro ao salvar edição:', error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  // Handler quando versão é restaurada
  const handleVersionRestored = (updatedAnalysis) => {
    setAnalysis(updatedAnalysis);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
    if (onAnalysisUpdated) {
      onAnalysisUpdated(updatedAnalysis);
    }
  };

  // Atualizar análise após chat
  const handleAnalysisUpdated = () => {
    // Re-fetch seria ideal aqui, mas por simplicidade atualizamos via state
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
          activePanel ? 'max-w-3xl' : 'max-w-5xl mx-auto'
        }`}>
          {/* Header */}
          <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
            <div className="flex items-start justify-between gap-4 p-6">
              <div className="flex items-start gap-4 flex-1">
                <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/30">
                  <Play className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">
                    Análise Detalhada
                  </h2>
                  <div className="flex items-center gap-3 text-sm text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4" />
                      {formatDate(analysis.createdAt)}
                    </div>
                    {analysis.framesAnalyzed && (
                      <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
                        {analysis.framesAnalyzed} frames analisados
                      </span>
                    )}
                    {saveSuccess && (
                      <span className="px-2.5 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium flex items-center gap-1 animate-pulse">
                        <Check className="w-3.5 h-3.5" />
                        Salvo!
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
          {/* Video URL */}
          {analysis.videoUrl && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-slate-50 to-slate-100/50 border border-slate-200">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-white shadow-sm">
                  <Play className="w-5 h-5 text-slate-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-600 mb-1">Vídeo analisado</p>
                  <a
                    href={analysis.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-700 hover:underline break-all"
                  >
                    {analysis.videoUrl}
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Summary - Editável */}
          {analysis.summary && (
            <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-50 to-white border border-slate-200 shadow-sm">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100">
                    <Award className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">Resumo da Análise</h3>
                </div>
                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Editar
                  </button>
                )}
              </div>
              
              {isEditing ? (
                <EditableAnalysisText
                  value={analysis.summary}
                  onSave={handleSaveSummary}
                  label=""
                  placeholder="Digite o resumo da análise..."
                  maxLength={3000}
                  minHeight={150}
                />
              ) : (
                <div className="space-y-6">
                  {(() => {
                    // Dividir o texto em frases
                    const sentences = analysis.summary.split(/(?<=[.!?])\s+/);
                    const paragraphs = [];
                    
                    // Agrupar frases em parágrafos de 2-3 frases
                    for (let i = 0; i < sentences.length; i += 3) {
                      paragraphs.push(sentences.slice(i, i + 3).join(' '));
                    }
                    
                    return paragraphs.map((paragraph, index) => (
                      <p key={index} className="text-sm text-slate-700 leading-relaxed">
                        {paragraph}
                      </p>
                    ));
                  })()}
                </div>
              )}
            </div>
          )}

          {/* Technical Stats Grid */}
          {hasTechnicalStats && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                Estatísticas Técnicas
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Sweeps */}
                {analysis.technical_stats.sweeps && (
                  <div className="relative overflow-hidden p-5 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-200 hover:shadow-lg transition-shadow">
                    <div className="absolute top-0 right-0 opacity-10">
                      <TrendingUp className="w-24 h-24 text-emerald-600" />
                    </div>
                    <div className="relative">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="p-2 rounded-lg bg-emerald-200/50">
                          <TrendingUp className="w-5 h-5 text-emerald-700" />
                        </div>
                        <h4 className="text-sm font-bold text-emerald-900">Raspagens</h4>
                      </div>
                      <p className="text-4xl font-bold text-emerald-900 mb-2">
                        {analysis.technical_stats.sweeps.quantidade}
                      </p>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-emerald-700">Concluídas:</span>
                          <span className="font-bold text-emerald-900">
                            {analysis.technical_stats.sweeps.concluidas || 0}
                          </span>
                        </div>
                        {analysis.technical_stats.sweeps.detalhes && (
                          <div className="mt-3 pt-3 border-t border-emerald-200">
                            <p className="text-xs font-semibold text-emerald-700 mb-2">Detalhes:</p>
                            {analysis.technical_stats.sweeps.detalhes.slice(0, 3).map((detail, idx) => (
                              <p key={idx} className="text-xs text-emerald-800 mb-1">• {detail}</p>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Submissions */}
                {analysis.technical_stats.submissions && (
                  <div className="relative overflow-hidden p-5 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100/50 border border-purple-200 hover:shadow-lg transition-shadow">
                    <div className="absolute top-0 right-0 opacity-10">
                      <Target className="w-24 h-24 text-purple-600" />
                    </div>
                    <div className="relative">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="p-2 rounded-lg bg-purple-200/50">
                          <Target className="w-5 h-5 text-purple-700" />
                        </div>
                        <h4 className="text-sm font-bold text-purple-900">Finalizações</h4>
                      </div>
                      <p className="text-4xl font-bold text-purple-900 mb-2">
                        {analysis.technical_stats.submissions.tentativas}
                      </p>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-purple-700">Ajustadas:</span>
                          <span className="font-bold text-purple-900">
                            {analysis.technical_stats.submissions.ajustadas || 0}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-purple-700">Concluídas:</span>
                          <span className="font-bold text-green-600">
                            {analysis.technical_stats.submissions.concluidas || 0}
                          </span>
                        </div>
                        {analysis.technical_stats.submissions.detalhes && (
                          <div className="mt-3 pt-3 border-t border-purple-200">
                            <p className="text-xs font-semibold text-purple-700 mb-2">Detalhes:</p>
                            {analysis.technical_stats.submissions.detalhes.slice(0, 3).map((detail, idx) => (
                              <p key={idx} className="text-xs text-purple-800 mb-1">• {detail}</p>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Back Takes */}
                {analysis.technical_stats.back_takes && (
                  <div className="relative overflow-hidden p-5 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-200 hover:shadow-lg transition-shadow">
                    <div className="absolute top-0 right-0 opacity-10">
                      <Award className="w-24 h-24 text-blue-600" />
                    </div>
                    <div className="relative">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="p-2 rounded-lg bg-blue-200/50">
                          <Award className="w-5 h-5 text-blue-700" />
                        </div>
                        <h4 className="text-sm font-bold text-blue-900">Pegadas de Costas</h4>
                      </div>
                      <p className="text-4xl font-bold text-blue-900 mb-2">
                        {analysis.technical_stats.back_takes.quantidade}
                      </p>
                      <div className="space-y-1">
                        {analysis.technical_stats.back_takes.tempo_medio_segundos && (
                          <div className="flex justify-between text-xs">
                            <span className="text-blue-700">Tempo médio:</span>
                            <span className="font-bold text-blue-900">
                              {analysis.technical_stats.back_takes.tempo_medio_segundos}s
                            </span>
                          </div>
                        )}
                        {analysis.technical_stats.back_takes.tentou_finalizar && (
                          <div className="mt-2 px-2 py-1 rounded bg-green-100 border border-green-200">
                            <p className="text-xs font-semibold text-green-700">✓ Tentou finalizar</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Charts */}
          {hasCharts && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-purple-600" />
                Gráficos e Análises Visuais
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {analysis.charts.map((chart, idx) => (
                  <PieChartSection 
                    key={idx} 
                    title={chart.title} 
                    data={{ titulo: chart.title, dados: chart.data }} 
                  />
                ))}
              </div>
            </div>
          )}

          {/* Chart URLs (if any) */}
          {analysis.chartUrls && analysis.chartUrls.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-700">Imagens dos gráficos:</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {analysis.chartUrls.map((url, idx) => (
                  <a
                    key={idx}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-lg overflow-hidden border-2 border-slate-200 hover:border-blue-400 transition-all hover:shadow-lg"
                  >
                    <img 
                      src={url} 
                      alt={`Gráfico ${idx + 1}`}
                      className="w-full h-32 object-cover"
                    />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
          <div className="sticky bottom-0 border-t border-slate-200 bg-slate-50/95 backdrop-blur-sm px-6 py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>💡 Use o <strong>Chat IA</strong> para refinar a análise ou <strong>Editar</strong> para ajustes manuais</span>
              </div>
              <div className="flex items-center gap-3">
                {isEditing && (
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 rounded-lg text-slate-600 font-medium hover:bg-slate-200 transition-all"
                  >
                    Cancelar Edição
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-lg bg-white border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition-all"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Painel Lateral - Chat ou Histórico */}
        {activePanel && (
          <div className="w-96 ml-4 flex-shrink-0 animate-fadeIn">
            {activePanel === 'chat' && (
              <AiChatPanel
                analysis={analysis}
                onClose={() => setActivePanel(null)}
                onApplySuggestion={handleApplySuggestion}
                onAnalysisUpdated={handleAnalysisUpdated}
              />
            )}
            {activePanel === 'history' && (
              <VersionHistoryPanel
                analysisId={analysis.id}
                analysisType="fight"
                onVersionRestored={handleVersionRestored}
                onClose={() => setActivePanel(null)}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
