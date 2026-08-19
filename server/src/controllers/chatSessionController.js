/**
 * Chat de IA — ciclo de vida da sessão.
 *
 * Extraído de `chatController.js` (818 linhas, 3 subdomínios) pela spec 006.
 * Contém a criação de sessão de análise, o envio de mensagem e as operações
 * genéricas de sessão (buscar, listar por contexto, deletar), usadas também
 * pelos chats de perfil e de estratégia.
 */
const { resolveScope } = require('../services/authorization');
const ChatSession = require('../models/ChatSession');
const FightAnalysis = require('../models/FightAnalysis');
const { chat } = require('../services/geminiService');

const { handleError } = require('../utils/errorHandler');
const { logApiUsageWithType } = require('../utils/apiUsageLogger');

/**
 * Inicia uma nova sessão de chat para uma análise
 * POST /api/chat/session
 */
exports.createSession = async (req, res) => {
  try {
    const { contextType, contextId } = req.body;
    const userId = req.userId;

    if (!contextType || !contextId) {
      return res.status(400).json({
        success: false,
        error: 'contextType e contextId são obrigatórios'
      });
    }

    // Buscar contexto (análise) com verificação de acesso por grupo
    let contextSnapshot;
    if (contextType === 'analysis') {
      const allowedUserIds = await resolveScope(req.actor);
      const analysis = await FightAnalysis.getByIdAndUser(contextId, allowedUserIds);
      if (!analysis) {
        return res.status(404).json({
          success: false,
          error: 'Análise não encontrada'
        });
      }
      contextSnapshot = analysis;
    } else {
      return res.status(400).json({
        success: false,
        error: 'contextType inválido. Use "analysis"'
      });
    }

    // Criar sessão
    const session = await ChatSession.create({
      userId,
      contextType,
      contextId,
      contextSnapshot,
      messages: [],
      title: `Chat - ${new Date().toLocaleDateString('pt-BR')}`
    });

    res.status(201).json({
      success: true,
      data: session
    });
  } catch (error) {
    handleError(res, 'criar sessão de chat', error);
  }
};

/**
 * Envia mensagem no chat e recebe resposta da IA
 * POST /api/chat/send
 */
exports.sendMessage = async (req, res) => {
  try {
    const { sessionId, message, model: customModel } = req.body;
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
        error: 'Sessão de chat não encontrada'
      });
    }

    // Adicionar mensagem do usuário ao histórico
    await ChatSession.addMessage(sessionId, {
      role: 'user',
      content: message
    });

    // Chamar IA com contexto e histórico
    const aiResponse = await chat({
      contextType: session.contextType,
      contextData: session.contextSnapshot,
      history: session.messages,
      userMessage: message,
      customModel
    });

    // Adicionar resposta da IA ao histórico
    const updatedSession = await ChatSession.addMessage(sessionId, {
      role: 'model',
      content: aiResponse.message,
      editSuggestion: aiResponse.editSuggestion || null
    });

    // Registrar uso da API
    await logApiUsageWithType({
      userId,
      operationType: 'chat_analysis',
      usage: aiResponse.usage
    });

    res.json({
      success: true,
      data: {
        message: aiResponse.message,
        editSuggestion: aiResponse.editSuggestion,
        session: updatedSession,
        usage: aiResponse.usage
      }
    });
  } catch (error) {
    handleError(res, 'enviar mensagem', error);
  }
};

/**
 * Busca sessão de chat por ID
 * GET /api/chat/session/:id
 */
exports.getSession = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const session = await ChatSession.getById(id, userId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Sessão não encontrada'
      });
    }

    res.json({
      success: true,
      data: session
    });
  } catch (error) {
    handleError(res, 'buscar sessão', error);
  }
};

/**
 * Lista sessões de chat para um contexto específico
 * GET /api/chat/sessions/:contextType/:contextId
 */
exports.getSessionsByContext = async (req, res) => {
  try {
    const { contextType, contextId } = req.params;
    const userId = req.userId;

    const sessions = await ChatSession.getByContext(contextType, contextId, userId);

    res.json({
      success: true,
      data: sessions,
      count: sessions.length
    });
  } catch (error) {
    handleError(res, 'listar sessões', error);
  }
};

/**
 * Deleta sessão de chat
 * DELETE /api/chat/session/:id
 */
exports.deleteSession = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    await ChatSession.delete(id, userId);

    res.json({
      success: true,
      message: 'Sessão deletada com sucesso'
    });
  } catch (error) {
    handleError(res, 'deletar sessão', error);
  }
};
