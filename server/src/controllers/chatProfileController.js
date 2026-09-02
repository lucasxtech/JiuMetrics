/**
 * Chat de IA — perfil técnico de atleta/adversário.
 *
 * Extraído de `chatController.js` pela spec 006.
 *
 * ⚠️ O versionamento de perfil que estes handlers acionam está **quebrado
 * desde 2026-01-16** por contrato incompatível entre `versionManager` e
 * `ProfileVersion` — dívida da spec 007, não desta. Ver docs/PROJECT_STATUS.md.
 *
 * Sobre escopo (AZ-10, corrigido na spec 006): a BUSCA da pessoa usa o escopo
 * resolvido (`resolveScope`), então o admin alcança o dado do grupo; a ESCRITA
 * usa o `userId` do REGISTRO, para não transferir a posse ao editar.
 *
 * As chamadas a `ProfileVersion` continuam usando o `userId` do requisitante,
 * como antes: as versões de perfil são por editor, não compartilhadas com o
 * grupo. Torná-las visíveis ao grupo é mudança de comportamento que depende
 * da decisão P5 (corrigir ou remover o versionamento) — spec 007.
 */
const { resolveScope } = require('../services/authorization');
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

    // Verificar se pessoa existe, dentro do escopo do ator (AZ-10: aqui era
    // `getById(personId, userId)` com o id escalar do requisitante, o que
    // fazia o admin perder o acesso ao dado do próprio grupo).
    const allowedUserIds = await resolveScope(req.actor);
    const Model = personType === 'opponent' ? Opponent : Athlete;
    const person = await Model.getById(personId, allowedUserIds);

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

    const allowedUserIds = await resolveScope(req.actor);
    const Model = personType === 'opponent' ? Opponent : Athlete;

    // Buscar perfil atual para salvar versão anterior (AZ-10: escopo, não o
    // id escalar do requisitante)
    const currentPerson = await Model.getById(personId, allowedUserIds);
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

    // Atualizar perfil com novo resumo — a escrita usa o owner REAL do
    // registro, não o requisitante, para não transferir a posse
    const updatedPerson = await Model.update(personId, {
      technicalSummary: newSummary,
      technicalSummaryUpdatedAt: new Date().toISOString()
    }, currentPerson.userId);

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

    // AZ-10: a pessoa passa a ser buscada no escopo do ator (era o id escalar
    // do requisitante) e ANTES da versão. A ordem importa: antes,
    // `currentPerson` podia vir null sem nenhuma verificação e o `update`
    // logo abaixo falhava com erro cru do PostgREST em vez de um 404 claro.
    const allowedUserIds = await resolveScope(req.actor);
    const Model = personType === 'opponent' ? Opponent : Athlete;
    const currentPerson = await Model.getById(personId, allowedUserIds);
    if (!currentPerson) {
      return res.status(404).json({
        success: false,
        error: `${personType === 'opponent' ? 'Adversário' : 'Atleta'} não encontrado`
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

    // Salvar versão atual antes de restaurar
    await saveProfileVersion({
      personId,
      personType,
      userId,
      currentSummary: currentPerson.technicalSummary,
      editedBy: 'user',
      editReason: `Backup antes de restaurar versão ${versionNumber}`
    });

    // Restaurar versão — a escrita usa o owner REAL do registro
    const updatedPerson = await Model.update(personId, {
      technicalSummary: version.content,
      technicalSummaryUpdatedAt: new Date().toISOString()
    }, currentPerson.userId);

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
