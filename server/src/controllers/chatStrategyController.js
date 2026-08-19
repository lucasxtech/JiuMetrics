/**
 * Chat de IA — refinamento de estratégia tática.
 *
 * Extraído de `chatController.js` pela spec 006.
 *
 * Nota: a sessão de estratégia é criada com `contextId: null` porque a
 * estratégia refinada aqui é temporária (não persistida em
 * `tactical_analyses`). É por isso que a migration 014 permitiu
 * `context_id` nulo.
 */
const ChatSession = require('../models/ChatSession');
const { chat } = require('../services/geminiService');

const { handleError } = require('../utils/errorHandler');
const { logApiUsageWithType } = require('../utils/apiUsageLogger');

/**
 * Cria uma nova sessão de chat para refinar estratégia de luta
 * POST /api/chat/strategy-session
 */
exports.createStrategySession = async (req, res) => {
  try {
    const { strategyData, athleteName, opponentName } = req.body;
    const userId = req.userId;

    if (!strategyData) {
      return res.status(400).json({
        success: false,
        error: 'strategyData é obrigatório'
      });
    }

    // Criar sessão com contexto de estratégia
    // Usar NULL para contextId já que é estratégia temporária (não salva)
    const session = await ChatSession.create({
      userId,
      contextType: 'strategy',
      contextId: null, // Estratégias temporárias não têm ID persistente
      contextSnapshot: {
        strategy: strategyData,
        athleteName,
        opponentName
      },
      messages: [],
      title: `Estratégia: ${athleteName} vs ${opponentName}`
    });

    res.status(201).json({
      success: true,
      data: {
        sessionId: session.id,
        athleteName,
        opponentName
      }
    });
  } catch (error) {
    handleError(res, 'criar sessão de chat de estratégia', error);
  }
};

/**
 * Envia mensagem no chat de estratégia e recebe resposta da IA
 * POST /api/chat/strategy-send
 */
exports.sendStrategyMessage = async (req, res) => {
  try {
    const { sessionId, message, currentStrategy, model } = req.body;
    const userId = req.userId;

    if (!sessionId || !message) {
      return res.status(400).json({
        success: false,
        error: 'sessionId e message são obrigatórios'
      });
    }

    // Buscar sessão
    const session = await ChatSession.getById(sessionId, userId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Sessão não encontrada'
      });
    }

    // Preparar contexto para a IA
    const contextData = {
      strategy: currentStrategy || session.contextSnapshot?.strategy,
      athleteName: session.contextSnapshot?.athleteName,
      opponentName: session.contextSnapshot?.opponentName
    };

    // Converter histórico para formato esperado
    const history = (session.messages || []).map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    // Chamar IA
    const aiResponse = await chat({
      contextType: 'strategy',
      contextData,
      history,
      userMessage: message,
      customModel: model
    });

    // Registrar uso da API
    await logApiUsageWithType({
      userId,
      operationType: 'chat_strategy',
      usage: aiResponse.usage
    });

    // Salvar mensagens na sessão
    const newMessages = [
      { role: 'user', content: message, timestamp: new Date().toISOString() },
      {
        role: 'model',
        content: aiResponse.message,
        editSuggestion: aiResponse.editSuggestion || null,
        timestamp: new Date().toISOString()
      }
    ];

    await ChatSession.addMessages(sessionId, newMessages);

    res.json({
      success: true,
      data: {
        response: aiResponse.message,
        editSuggestion: aiResponse.editSuggestion || null,
        usage: aiResponse.usage
      }
    });
  } catch (error) {
    handleError(res, 'processar mensagem de estratégia', error);
  }
};
