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
function ChatMessage({ message, onAcceptSuggestion }) {
  const isUser = message.role === 'user';
  const hasSuggestion = message.editSuggestion && !message.suggestionApplied;

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

        {/* Card de sugestão de edição */}
        {hasSuggestion && (
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
  onAnalysisUpdated
}) {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [error, setError] = useState(null);
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
        const aiMessage = {
          role: 'model',
          content: response.data.message,
          editSuggestion: response.data.editSuggestion,
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, aiMessage]);
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
            key={index} 
            message={message}
            onAcceptSuggestion={handleAcceptSuggestion}
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
