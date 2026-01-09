import { useState } from 'react';
import { X, Calendar, MessageSquare, History, Check, Edit3, User, Sparkles } from 'lucide-react';
import ProfileChatPanel from '../chat/ProfileChatPanel';
import ProfileVersionHistoryPanel from '../chat/ProfileVersionHistoryPanel';

/**
 * Modal detalhado para visualizar e editar o resumo técnico do perfil
 * com chat IA lateral e histórico de versões
 */
export default function ProfileSummaryModal({ 
  person, 
  personType, // 'athlete' ou 'opponent'
  currentSummary,
  lastUpdated,
  onClose, 
  onSummaryUpdated 
}) {
  const [summary, setSummary] = useState(currentSummary);
  const [activePanel, setActivePanel] = useState(null); // 'chat' | 'history' | null
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(currentSummary);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!person || !summary) return null;

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Handler para salvar edição manual
  const handleSaveManualEdit = async () => {
    if (!editText.trim() || editText === summary) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      await onSummaryUpdated(editText.trim(), 'Edição manual do resumo técnico');
      setSummary(editText.trim());
      setIsEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (error) {
      console.error('Erro ao salvar edição:', error);
      alert('Erro ao salvar. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  // Handler para atualização via chat
  const handleChatUpdate = async (newSummary) => {
    try {
      await onSummaryUpdated(newSummary, 'Edição via Chat IA');
      setSummary(newSummary);
      setEditText(newSummary);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (error) {
      console.error('Erro ao aplicar sugestão:', error);
      throw error;
    }
  };

  // Handler quando versão é restaurada
  const handleVersionRestored = (restoredSummary) => {
    setSummary(restoredSummary);
    setEditText(restoredSummary);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  // Dividir texto em parágrafos
  const renderParagraphs = (text) => {
    const sentences = text.split(/(?<=[.!?])\s+/);
    const paragraphs = [];
    
    for (let i = 0; i < sentences.length; i += 3) {
      paragraphs.push(sentences.slice(i, i + 3).join(' '));
    }
    
    return paragraphs.map((paragraph, index) => (
      <p key={index} className="text-slate-700 leading-relaxed text-[15px]">
        {paragraph}
      </p>
    ));
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
          activePanel ? 'max-w-3xl' : 'max-w-4xl mx-auto'
        }`}>
          {/* Header */}
          <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
            <div className="flex items-start justify-between gap-4 p-6">
              <div className="flex items-start gap-4 flex-1">
                <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30">
                  <Sparkles className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">
                    Resumo Técnico
                  </h2>
                  <div className="flex items-center gap-3 text-sm text-slate-600 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <User className="w-4 h-4" />
                      {person.name}
                    </div>
                    <span className="text-slate-300">•</span>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4" />
                      {formatDate(lastUpdated)}
                    </div>
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
          <div className="p-6">
            {/* Resumo Técnico */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-50 to-white border border-slate-200 shadow-sm">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100">
                    <Sparkles className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Perfil Consolidado</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Baseado em todas as análises de vídeo
                    </p>
                  </div>
                </div>
                {!isEditing && (
                  <button
                    onClick={() => {
                      setEditText(summary);
                      setIsEditing(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Editar manualmente
                  </button>
                )}
              </div>
              
              {isEditing ? (
                <div className="space-y-3">
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="w-full h-64 px-4 py-3 border border-slate-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm text-slate-700 leading-relaxed"
                    placeholder="Digite o resumo técnico..."
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">
                      {editText.length} caracteres
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditText(summary);
                          setIsEditing(false);
                        }}
                        className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleSaveManualEdit}
                        disabled={isSaving || !editText.trim() || editText === summary}
                        className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
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
                            <Check className="w-4 h-4" />
                            Salvar
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {renderParagraphs(summary)}
                </div>
              )}
            </div>

            {/* Info box */}
            <div className="mt-6 p-4 rounded-xl bg-blue-50 border border-blue-200">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-blue-100">
                  <MessageSquare className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-blue-900 mb-1">
                    Dica: Use o Chat IA para edições inteligentes
                  </p>
                  <p className="text-xs text-blue-700">
                    Peça para a IA remover informações específicas, adicionar detalhes, 
                    reformular o texto ou fazer qualquer ajuste. A IA mantém o contexto 
                    e gera sugestões que você pode aceitar ou rejeitar.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 border-t border-slate-200 bg-slate-50/95 backdrop-blur-sm px-6 py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>💡 Use o <strong>Chat IA</strong> para edições inteligentes ou <strong>Editar manualmente</strong></span>
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
              <ProfileChatPanel
                personId={person.id}
                personType={personType}
                currentSummary={summary}
                personName={person.name}
                onClose={() => setActivePanel(null)}
                onSummaryUpdated={handleChatUpdate}
              />
            )}
            {activePanel === 'history' && (
              <ProfileVersionHistoryPanel
                personId={person.id}
                personType={personType}
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
