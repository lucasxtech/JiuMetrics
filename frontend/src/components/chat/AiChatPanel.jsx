import { useState, useRef, useEffect } from 'react';
import { 
  MessageSquare, 
  Send, 
  Sparkles, 
  X, 
  Check,
  RefreshCw,
  Bot,
  User,
  Loader2
} from 'lucide-react';
import { sendChatMessage, createChatSession } from '../../services/chatService';

/**
 * Componente de mensagem individual do chat
 */
function ChatMessage({ message, onAcceptSuggestion, onRejectSuggestion, isPending, isSaving }) {
  const isUser = message.role === 'user';
  const hasSuggestion = message.editSuggestion && !message.suggestionApplied && !message.suggestionRejected;

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
        isUser 
          ? 'bg-indigo-100 text-indigo-600' 
          : 'bg-gradient-to-br from-purple-500 to-pink-500 text-white'
      }`}>
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      {/* Conteúdo */}
      <div className={`flex-1 max-w-[80%] ${isUser ? 'text-right' : ''}`}>
        <div className={`inline-block px-4 py-2.5 rounded-2xl ${
          isUser 
            ? 'bg-indigo-600 text-white rounded-br-md' 
            : 'bg-slate-100 text-slate-800 rounded-bl-md'
        }`}>
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        </div>

        {/* Indicador de sugestão pendente - mostra caixa amarela com botões (diff está no modal) */}
        {hasSuggestion && isPending && (
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></div>
              <p className="text-xs font-medium text-amber-700">
                Alteração sugerida para: <span className="font-bold">Resumo da Análise</span>
              </p>
            </div>
            <p className="text-xs text-amber-600 mb-3">
              Veja a prévia das alterações no painel à esquerda →
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => onRejectSuggestion(message)}
                disabled={isSaving}
                className="flex-1 px-3 py-1.5 text-xs font-medium bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                <X className="w-3 h-3 inline mr-1" />
                Rejeitar
              </button>
              <button
                onClick={() => onAcceptSuggestion(message.editSuggestion)}
                disabled={isSaving}
                className="flex-1 px-3 py-1.5 text-xs font-medium bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
              >
                {isSaving ? (
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

        {/* Card de sugestão de edição (fallback quando não há onPendingEdit) */}
        {hasSuggestion && !isPending && (
          <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-semibold text-amber-700">Sugestão de Edição</span>
            </div>
            <p className="text-xs text-amber-800 mb-2">
              {message.editSuggestion.reason}
            </p>
            <button
              onClick={() => onAcceptSuggestion(message.editSuggestion)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-white text-xs font-medium rounded-lg hover:bg-amber-600 transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              Aplicar sugestão
            </button>
          </div>
        )}

        {/* Indicador de sugestão aplicada */}
        {message.suggestionApplied && (
          <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
            <Check className="w-3 h-3" />
            Sugestão aplicada
          </div>
        )}
        
        {/* Indicador de sugestão rejeitada */}
        {message.suggestionRejected && (
          <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
            <X className="w-3 h-3" />
            Sugestão rejeitada
          </div>
        )}

        {/* Timestamp */}
        {message.timestamp && (
          <p className={`text-xs text-slate-400 mt-1 ${isUser ? 'text-right' : ''}`}>
            {new Date(message.timestamp).toLocaleTimeString('pt-BR', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Painel de chat com IA para refinar análises
 */
export default function AiChatPanel({ 
  analysis, 
  onClose, 
  onApplySuggestion,
  onAnalysisUpdated,
  onPendingEdit // Callback para mostrar diff inline no modal pai
}) {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [error, setError] = useState(null);
  const [pendingMessageId, setPendingMessageId] = useState(null); // ID da mensagem com diff pendente
  const messagesEndRef = useRef(null);

  // Sugestões rápidas
  const quickSuggestions = [
    'Corrija o resumo para mencionar mais sobre guardas',
    'Adicione informações sobre defesas',
    'Destaque os pontos fracos encontrados',
    'Reformule de forma mais técnica'
  ];

  // Scroll automático para última mensagem
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Iniciar sessão de chat
  useEffect(() => {
    const initSession = async () => {
      if (!analysis?.id) return;
      
      try {
        const response = await createChatSession('analysis', analysis.id);
        if (response.success) {
          setSessionId(response.data.id);
          // Mensagem inicial de boas-vindas
          setMessages([{
            role: 'model',
            content: `Olá! Estou aqui para ajudar a refinar a análise. Você pode:\n\n• Pedir para corrigir informações no resumo\n• Ajustar estatísticas técnicas\n• Reformular o texto de uma forma diferente\n\nO que você gostaria de ajustar?`,
            timestamp: new Date().toISOString()
          }]);
        }
      } catch (err) {
        console.error('Erro ao iniciar sessão:', err);
        setError('Não foi possível iniciar o chat. Tente novamente.');
      }
    };

    initSession();
  }, [analysis?.id]);

  // Enviar mensagem
  const handleSend = async () => {
    if (!inputValue.trim() || isLoading || !sessionId) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    setError(null);

    // Adicionar mensagem do usuário
    const newUserMessage = {
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, newUserMessage]);

    setIsLoading(true);

    try {
      const response = await sendChatMessage(sessionId, userMessage);
      
      if (response.success) {
        const messageId = Date.now().toString();
        const aiMessage = {
          id: messageId,
          role: 'model',
          content: response.data.message,
          editSuggestion: response.data.editSuggestion,
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, aiMessage]);
        
        // Se há sugestão de edição e onPendingEdit, notificar o modal
        if (response.data.editSuggestion && onPendingEdit) {
          setPendingMessageId(messageId);
          const suggestion = response.data.editSuggestion;
          onPendingEdit({
            oldValue: analysis.summary,
            newValue: suggestion.newValue,
            reason: suggestion.reason || response.data.message,
            messageId: messageId,
            onAccept: () => {
              setPendingMessageId(null);
              setMessages(prev => prev.map(msg => 
                msg.id === messageId ? { ...msg, suggestionApplied: true } : msg
              ));
              setMessages(prev => [...prev, {
                role: 'model',
                content: '✅ Sugestão aplicada com sucesso!',
                timestamp: new Date().toISOString()
              }]);
            },
            onReject: () => {
              setPendingMessageId(null);
              setMessages(prev => prev.map(msg => 
                msg.id === messageId ? { ...msg, suggestionRejected: true } : msg
              ));
              setMessages(prev => [...prev, {
                role: 'model',
                content: 'Sugestão descartada. Me diga se precisa de outra alteração.',
                timestamp: new Date().toISOString()
              }]);
            }
          });
        }
      } else {
        setError(response.error || 'Erro ao obter resposta da IA');
      }
    } catch (err) {
      console.error('Erro ao enviar mensagem:', err);
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  // Enviar com Enter
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Aceitar sugestão de edição
  const handleAcceptSuggestion = async (suggestion) => {
    if (onApplySuggestion) {
      await onApplySuggestion(sessionId, analysis.id, suggestion);
      
      // Limpar pending state
      setPendingMessageId(null);
      if (onPendingEdit) {
        onPendingEdit(null);
      }
      
      // Marcar sugestão como aplicada (para esconder o botão)
      setMessages(prev => prev.map(msg => 
        msg.editSuggestion === suggestion 
          ? { ...msg, suggestionApplied: true }
          : msg
      ));
      
      // Adicionar mensagem confirmando
      setMessages(prev => [...prev, {
        role: 'model',
        content: '✅ Sugestão aplicada com sucesso! A análise foi atualizada.',
        timestamp: new Date().toISOString()
      }]);

      if (onAnalysisUpdated) {
        onAnalysisUpdated();
      }
    }
  };

  // Rejeitar sugestão de edição
  const handleRejectSuggestion = (suggestion) => {
    // Limpar pending state
    setPendingMessageId(null);
    
    // Chamar callback do pai se existir
    if (onPendingEdit) {
      onPendingEdit(null);
    }
    
    // Marcar sugestão como rejeitada
    setMessages(prev => prev.map(msg => 
      msg.editSuggestion === suggestion 
        ? { ...msg, suggestionRejected: true }
        : msg
    ));
    
    // Adicionar mensagem confirmando
    setMessages(prev => [...prev, {
      role: 'model',
      content: '❌ Sugestão descartada. Como posso ajudar de outra forma?',
      timestamp: new Date().toISOString()
    }]);
  };

  // Usar sugestão rápida
  const handleQuickSuggestion = (suggestion) => {
    setInputValue(suggestion);
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          <span className="font-semibold">Chat IA</span>
          <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
            Refinar Análise
          </span>
        </div>
        <button 
          onClick={onClose}
          className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
        {messages.map((message, index) => (
          <ChatMessage 
            key={message.id || index} 
            message={message}
            onAcceptSuggestion={handleAcceptSuggestion}
            onRejectSuggestion={handleRejectSuggestion}
            isPending={pendingMessageId && message.id === pendingMessageId}
            isSaving={false}
          />
        ))}
        
        {isLoading && (
          <div className="flex items-center gap-2 text-slate-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">IA está pensando...</span>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Suggestions */}
      {messages.length === 1 && (
        <div className="px-4 py-2 border-t border-slate-100 bg-white">
          <p className="text-xs text-slate-500 mb-2">Sugestões rápidas:</p>
          <div className="flex flex-wrap gap-2">
            {quickSuggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleQuickSuggestion(suggestion)}
                className="px-3 py-1.5 text-xs bg-slate-100 text-slate-700 rounded-full hover:bg-slate-200 transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-slate-200 bg-white">
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Digite sua mensagem..."
              className="w-full px-4 py-3 pr-12 border border-slate-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              rows={1}
              disabled={isLoading || !sessionId}
              style={{ minHeight: '48px', maxHeight: '120px' }}
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || isLoading || !sessionId}
            className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
        <p className="text-xs text-slate-400 mt-2">
          Pressione Enter para enviar • Shift+Enter para nova linha
        </p>
      </div>
    </div>
  );
}
