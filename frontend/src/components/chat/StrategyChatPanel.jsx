import { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, Sparkles, X, Loader2, Check, ChevronDown, RefreshCw } from 'lucide-react';
import { createStrategyChatSession, sendStrategyChatMessage } from '../../services/chatService';

/**
 * Componente de mensagem do chat - Versão simplificada
 * O diff agora é mostrado diretamente no AiStrategyBox, não no chat
 */
const ChatMessage = ({ message, pendingEdit, onAccept, onReject, isApplying }) => {
  const isUser = message.role === 'user';
  const hasSuggestion = message.editSuggestion && !message.suggestionApplied && !message.suggestionRejected;
  const isPending = hasSuggestion && pendingEdit?.messageId === message.id;
  
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
        isUser 
          ? 'bg-slate-200 text-slate-600' 
          : 'bg-gradient-to-br from-indigo-500 to-purple-500 text-white'
      }`}>
        {isUser ? (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        ) : (
          <Sparkles className="w-4 h-4" />
        )}
      </div>
      
      {/* Conteúdo */}
      <div className={`flex-1 max-w-[95%] ${isUser ? 'text-right' : ''}`}>
        <div className={`inline-block rounded-2xl px-4 py-2.5 ${
          isUser 
            ? 'bg-slate-900 text-white rounded-br-md' 
            : 'bg-white border border-slate-200 text-slate-700 rounded-bl-md shadow-sm'
        }`}>
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
        </div>
        
        {/* Indicador de sugestão pendente - Mostra botões */}
        {isPending && (
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></div>
              <p className="text-xs font-medium text-amber-700">
                Alteração sugerida para: <span className="font-bold">{pendingEdit.field.replace(/_/g, ' ')}</span>
              </p>
            </div>
            <p className="text-xs text-amber-600 mb-3">
              Veja a prévia das alterações no painel de estratégia à esquerda →
            </p>
            <div className="flex gap-2">
              <button
                onClick={onReject}
                disabled={isApplying}
                className="flex-1 px-3 py-1.5 text-xs font-medium bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                <X className="w-3 h-3 inline mr-1" />
                Rejeitar
              </button>
              <button
                onClick={onAccept}
                disabled={isApplying}
                className="flex-1 px-3 py-1.5 text-xs font-medium bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
              >
                {isApplying ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Aplicando...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3 h-3" />
                    <span>Aceitar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
        
        {/* Indicador de sugestão com diff ativo (outro estado) */}
        {hasSuggestion && !isPending && !message.suggestionApplied && !message.suggestionRejected && (
          <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 text-xs font-medium rounded-full border border-indigo-200">
            <RefreshCw className="w-3 h-3" />
            Sugestão disponível
          </div>
        )}
        
        {/* Indicador de sugestão aplicada */}
        {message.suggestionApplied && (
          <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
            <Check className="w-3 h-3" />
            Alterações aceitas
          </div>
        )}
        
        {/* Indicador de sugestão rejeitada */}
        {message.suggestionRejected && (
          <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
            <X className="w-3 h-3" />
            Alterações rejeitadas
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Painel de chat para refinar estratégias de luta
 * Agora envia sugestões para o componente pai mostrar o diff inline no AiStrategyBox
 */
export default function StrategyChatPanel({ 
  strategyData,
  athleteName,
  opponentName,
  onClose,
  pendingEdit,
  onSuggestEdit,
  onAcceptEdit,
  onRejectEdit,
  isApplyingEdit,
  onStrategyUpdated 
}) {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Sugestões rápidas para estratégia
  const quickSuggestions = [
    { icon: '🎯', text: 'Detalhe mais a tese da vitória' },
    { icon: '⚔️', text: 'Adicione mais opções de ataque' },
    { icon: '🛡️', text: 'Expanda os pontos defensivos' },
    { icon: '⏱️', text: 'Sugira ajustes para cada fase da luta' },
    { icon: '🔄', text: 'Adicione planos alternativos' },
  ];

  // Criar sessão ao montar
  useEffect(() => {
    const initSession = async () => {
      try {
        const response = await createStrategyChatSession(strategyData, athleteName, opponentName);
        if (response.success) {
          setSessionId(response.data.sessionId);
          
          // Mensagem inicial da IA
          setMessages([{
            id: 'welcome',
            role: 'model',
            content: `Olá! Estou aqui para ajudar a refinar a estratégia de ${athleteName} contra ${opponentName}. 

Você pode me pedir para:
• Detalhar pontos específicos da estratégia
• Adicionar planos alternativos
• Expandir análises de matchup
• Ajustar recomendações táticas

Como posso ajudar?`
          }]);
        }
      } catch (err) {
        console.error('Erro ao criar sessão:', err);
        setError('Erro ao iniciar chat. Tente novamente.');
      }
    };
    
    initSession();
  }, [strategyData, athleteName, opponentName]);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus no input ao abrir
  useEffect(() => {
    inputRef.current?.focus();
  }, [sessionId]);

  const handleSendMessage = async (messageText = inputMessage) => {
    if (!messageText.trim() || !sessionId || isLoading) return;

    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText.trim()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setError(null);

    try {
      const response = await sendStrategyChatMessage(
        sessionId,
        messageText.trim(),
        strategyData
      );

      if (response.success) {
        const messageId = (Date.now() + 1).toString();
        const editSuggestion = response.data.editSuggestion;
        
        console.log('📩 Resposta da IA recebida:', {
          hasEditSuggestion: !!editSuggestion,
          editSuggestion: editSuggestion
        });
        
        const aiMessage = {
          id: messageId,
          role: 'model',
          content: response.data.response,
          editSuggestion: editSuggestion || null,
          suggestionApplied: false
        };
        setMessages(prev => [...prev, aiMessage]);
        
        // Se tem sugestão de edição, envia para o componente pai
        // para mostrar o diff inline no AiStrategyBox
        if (editSuggestion && onSuggestEdit) {
          const currentStrategy = strategyData?.strategy || strategyData;
          const fieldName = editSuggestion.field;
          const oldValue = currentStrategy[fieldName] || '';
          
          // newValue pode ser string ou objeto - garantir que é string
          let newValue = editSuggestion.newValue;
          if (typeof newValue === 'object') {
            newValue = JSON.stringify(newValue, null, 2);
          }
          
          console.log('📤 Enviando sugestão para pai:', {
            messageId,
            field: fieldName,
            oldValueType: typeof oldValue,
            newValueType: typeof newValue
          });
          
          onSuggestEdit({
            messageId,
            field: fieldName,
            oldValue: typeof oldValue === 'string' ? oldValue : JSON.stringify(oldValue),
            newValue: newValue,
            reason: editSuggestion.reason
          });
        }
      }
    } catch (err) {
      console.error('Erro ao enviar mensagem:', err);
      setError('Erro ao processar mensagem. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  // Quando aceita, marca a mensagem como aplicada
  const handleAccept = () => {
    if (pendingEdit) {
      setMessages(prev => prev.map(msg => 
        msg.id === pendingEdit.messageId 
          ? { ...msg, suggestionApplied: true }
          : msg
      ));
      onAcceptEdit();
    }
  };

  // Quando rejeita, marca a mensagem como rejeitada
  const handleReject = () => {
    if (pendingEdit) {
      setMessages(prev => prev.map(msg => 
        msg.id === pendingEdit.messageId 
          ? { ...msg, suggestionRejected: true }
          : msg
      ));
      onRejectEdit();
    }
  };

  const handleQuickSuggestion = (text) => {
    handleSendMessage(text);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Chat de Estratégia</h3>
            <p className="text-xs text-white/80">{athleteName} vs {opponentName}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-white/20 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-slate-50 to-slate-100">
        {messages.map((msg) => (
          <ChatMessage
            key={msg.id}
            message={msg}
            pendingEdit={pendingEdit}
            onAccept={handleAccept}
            onReject={handleReject}
            isApplying={isApplyingEdit}
          />
        ))}
        
        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                <span className="text-sm text-slate-500">Analisando estratégia...</span>
              </div>
            </div>
          </div>
        )}
        
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Suggestions */}
      {messages.length <= 2 && (
        <div className="px-4 py-2 border-t border-slate-100 bg-white">
          <p className="text-xs text-slate-500 mb-2">Sugestões rápidas:</p>
          <div className="flex flex-wrap gap-2">
            {quickSuggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleQuickSuggestion(suggestion.text)}
                disabled={isLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs rounded-full transition-colors disabled:opacity-50"
              >
                <span>{suggestion.icon}</span>
                <span>{suggestion.text}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-slate-200 bg-white">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Peça ajustes na estratégia..."
            rows={1}
            className="flex-1 px-4 py-2.5 bg-slate-100 border-0 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            style={{ minHeight: '44px', maxHeight: '120px' }}
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={!inputMessage.trim() || isLoading || !sessionId}
            className="p-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-500/30"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
