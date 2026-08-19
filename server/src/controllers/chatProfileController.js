/**
 * Chat de IA — perfil técnico de atleta/adversário.
 *
 * Extraído de `chatController.js` pela spec 006.
 *
 * ⚠️ O versionamento de perfil que estes handlers acionam está **quebrado
 * desde 2026-01-16** por contrato incompatível entre `versionManager` e
 * `ProfileVersion` — dívida da spec 007, não desta. Ver docs/PROJECT_STATUS.md.
 */
const ChatSession = require('../models/ChatSession');
const ProfileVersion = require('../models/ProfileVersion');
const Athlete = require('../models/Athlete');
const Opponent = require('../models/Opponent');
const { chat } = require('../services/geminiService');

const { handleError } = require('../utils/errorHandler');
const { logApiUsageWithType } = require('../utils/apiUsageLogger');
const { saveProfileVersion } = require('../utils/versionManager');

/**
 * Cria sessão de chat para editar perfil técnico
 * POST /api/chat/profile-session
 */
exports.createProfileSession = async (req, res) => {
  try {
    const { personId, personType, currentSummary } = req.body;
    const userId = req.userId;

    if (!personId || !personType || !currentSummary) {
      return res.status(400).json({
        success: false,
        error: 'personId, personType e currentSummary são obrigatórios'
      });
    }

    // Verificar se pessoa existe
    const Model = personType === 'opponent' ? Opponent : Athlete;
    const person = await Model.getById(personId, userId);

    if (!person) {
      return res.status(404).json({
        success: false,
        error: `${personType === 'opponent' ? 'Adversário' : 'Atleta'} não encontrado`
      });
    }

    // Criar sessão
    const session = await ChatSession.create({
      userId,
      contextType: 'profile',
      contextId: personId,
      contextSnapshot: {
        personType,
        personId,
        personName: person.name,
        currentSummary
      },
      messages: [],
      title: `Chat Perfil - ${person.name}`
    });

    res.status(201).json({
      success: true,
      data: session
    });
  } catch (error) {
    handleError(res, 'criar sessão de chat de perfil', error);
  }
};

/**
 * Envia mensagem no chat de perfil e recebe resposta da IA
 * POST /api/chat/profile-send
 */
exports.sendProfileMessage = async (req, res) => {
  try {
    const { sessionId, message, currentSummary, model: customModel } = req.body;
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
    }, userId);

    // Chamar IA com contexto de perfil
    const aiResponse = await chat({
      contextType: 'profile',
      contextData: {
        ...session.contextSnapshot,
        currentSummary: currentSummary || session.contextSnapshot.currentSummary
      },
      history: session.messages,
      userMessage: message,
      customModel
    });

    // Adicionar resposta da IA ao histórico
    const updatedSession = await ChatSession.addMessage(sessionId, {
      role: 'model',
      content: aiResponse.message,
      editSuggestion: aiResponse.editSuggestion || null
    }, userId);

    // Registrar uso da API
    await logApiUsageWithType({
      userId,
      operationType: 'chat_profile',
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
    handleError(res, 'enviar mensagem no chat de perfil', error);
  }
};

/**
 * Salva resumo técnico editado no perfil
 * POST /api/chat/profile-save
 */
exports.saveProfileSummary = async (req, res) => {
  try {
    const { personId, personType, newSummary, editReason } = req.body;
    const userId = req.userId;

    if (!personId || !personType || !newSummary) {
      return res.status(400).json({
        success: false,
        error: 'personId, personType e newSummary são obrigatórios'
      });
    }

    const Model = personType === 'opponent' ? Opponent : Athlete;

    // Buscar perfil atual para salvar versão anterior
    const currentPerson = await Model.getById(personId, userId);
    if (!currentPerson) {
      return res.status(404).json({
        success: false,
        error: `${personType === 'opponent' ? 'Adversário' : 'Atleta'} não encontrado`
      });
    }

    // Salvar versão anterior (se tinha resumo)
    await saveProfileVersion({
      personId,
      personType,
      userId,
      currentSummary: currentPerson.technicalSummary,
      editedBy: editReason?.includes('IA') ? 'ai' : 'user',
      editReason: editReason || 'Edição manual'
    });

    // Atualizar perfil com novo resumo
    const updatedPerson = await Model.update(personId, {
      technicalSummary: newSummary,
      technicalSummaryUpdatedAt: new Date().toISOString()
    }, userId);

    res.json({
      success: true,
      data: updatedPerson,
      message: 'Resumo técnico atualizado com sucesso'
    });
  } catch (error) {
    handleError(res, 'salvar resumo técnico', error);
  }
};

/**
 * Busca histórico de versões do perfil técnico
 * GET /api/chat/profile-versions/:personType/:personId
 */
exports.getProfileVersions = async (req, res) => {
  try {
    const { personId, personType } = req.params;
    const userId = req.userId;

    const versions = await ProfileVersion.getByPersonId(personId, personType, userId);

    res.json({
      success: true,
      data: versions,
      count: versions.length
    });
  } catch (error) {
    handleError(res, 'buscar versões do perfil', error);
  }
};

/**
 * Restaura uma versão específica do perfil técnico
 * POST /api/chat/profile-restore
 */
exports.restoreProfileVersion = async (req, res) => {
  try {
    const { personId, personType, versionNumber } = req.body;
    const userId = req.userId;

    if (!personId || !personType || !versionNumber) {
      return res.status(400).json({
        success: false,
        error: 'personId, personType e versionNumber são obrigatórios'
      });
    }

    // Buscar versão específica
    const version = await ProfileVersion.getByVersionNumber(personId, personType, versionNumber, userId);
    if (!version) {
      return res.status(404).json({
        success: false,
        error: 'Versão não encontrada'
      });
    }

    const Model = personType === 'opponent' ? Opponent : Athlete;

    // Salvar versão atual antes de restaurar
    const currentPerson = await Model.getById(personId, userId);
    await saveProfileVersion({
      personId,
      personType,
      userId,
      currentSummary: currentPerson?.technicalSummary,
      editedBy: 'user',
      editReason: `Backup antes de restaurar versão ${versionNumber}`
    });

    // Restaurar versão
    const updatedPerson = await Model.update(personId, {
      technicalSummary: version.content,
      technicalSummaryUpdatedAt: new Date().toISOString()
    }, userId);

    // Marcar como versão atual
    await ProfileVersion.setAsCurrent(version.id, personId, personType, userId);

    res.json({
      success: true,
      data: updatedPerson,
      restoredVersion: versionNumber
    });
  } catch (error) {
    handleError(res, 'restaurar versão do perfil', error);
  }
};
