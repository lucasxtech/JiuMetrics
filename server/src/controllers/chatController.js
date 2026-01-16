// Controller para Chat de IA
const ChatSession = require('../models/ChatSession');
const AnalysisVersion = require('../models/AnalysisVersion');
const ProfileVersion = require('../models/ProfileVersion');
const FightAnalysis = require('../models/FightAnalysis');
const Athlete = require('../models/Athlete');
const Opponent = require('../models/Opponent');
const { chat } = require('../services/geminiService');
const ApiUsage = require('../models/ApiUsage');

/**
 * Helper para tratar erros
 */
const handleError = (res, operation, error) => {
  console.error(`❌ Erro ao ${operation}:`, error.message);
  res.status(500).json({
    success: false,
    error: `Erro ao ${operation}`,
    details: error.message
  });
};

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

    // Buscar contexto (análise)
    let contextSnapshot;
    if (contextType === 'analysis') {
      const analysis = await FightAnalysis.getById(contextId);
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
        error: 'contextType inválido. Use "analysis" ou "strategy"'
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
    if (aiResponse.usage) {
      try {
        await ApiUsage.create({
          userId,
          endpoint: '/api/chat/send',
          model: aiResponse.usage.modelName,
          promptTokens: aiResponse.usage.promptTokens,
          completionTokens: aiResponse.usage.completionTokens,
          totalTokens: aiResponse.usage.totalTokens
        });
      } catch (usageError) {
        console.warn('⚠️ Erro ao registrar uso da API:', usageError.message);
      }
    }

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
 * Aplica sugestão de edição da IA à análise
 * POST /api/chat/apply-edit
 */
exports.applyEdit = async (req, res) => {
  try {
    const { sessionId, analysisId, editSuggestion, acceptedByUser } = req.body;
    const userId = req.userId;

    console.log('🔧 Apply Edit Request:', {
      sessionId,
      analysisId,
      editSuggestion: JSON.stringify(editSuggestion, null, 2),
      acceptedByUser
    });

    if (!analysisId || !editSuggestion) {
      return res.status(400).json({
        success: false,
        error: 'analysisId e editSuggestion são obrigatórios'
      });
    }

    // Buscar análise atual
    const analysis = await FightAnalysis.getById(analysisId);
    if (!analysis) {
      return res.status(404).json({
        success: false,
        error: 'Análise não encontrada'
      });
    }

    console.log('📊 Análise atual:', {
      id: analysis.id,
      summaryLength: analysis.summary?.length,
      chartsCount: analysis.charts?.length
    });

    // Criar snapshot da versão atual (antes da edição)
    const currentVersionCount = await AnalysisVersion.countVersions(analysisId, 'fight');
    console.log('📚 Versões existentes:', currentVersionCount);
    
    // Se for a primeira edição, salvar versão original
    if (currentVersionCount === 0) {
      await AnalysisVersion.create({
        analysisId,
        analysisType: 'fight',
        versionNumber: 1,
        content: {
          summary: analysis.summary,
          charts: analysis.charts,
          technicalStats: analysis.technicalStats
        },
        editedBy: 'user',
        editReason: 'Versão original',
        isCurrent: false
      });
      console.log('✅ Versão original salva');
    }

    // Preparar dados de atualização baseado na sugestão
    const updateData = {};
    const { field, newValue } = editSuggestion;

    console.log('🎯 Campo a atualizar:', field);
    console.log('📝 Novo valor:', typeof newValue === 'string' ? newValue.substring(0, 100) + '...' : JSON.stringify(newValue).substring(0, 100));

    if (field === 'summary') {
      updateData.summary = newValue;
    } else if (field === 'charts') {
      updateData.charts = newValue;
    } else if (field === 'technical_stats') {
      updateData.technicalStats = newValue;
    }

    if (Object.keys(updateData).length === 0) {
      console.log('⚠️ Nenhum dado válido para atualizar');
      return res.status(400).json({
        success: false,
        error: 'Campo inválido na sugestão'
      });
    }

    // Atualizar análise
    console.log('💾 Atualizando análise...');
    const updatedAnalysis = await FightAnalysis.update(analysisId, updateData);

    // Criar nova versão
    const newVersionNumber = currentVersionCount + (currentVersionCount === 0 ? 2 : 1);
    await AnalysisVersion.create({
      analysisId,
      analysisType: 'fight',
      versionNumber: newVersionNumber,
      content: {
        summary: updatedAnalysis.summary,
        charts: updatedAnalysis.charts,
        technicalStats: updatedAnalysis.technicalStats
      },
      editedBy: acceptedByUser ? 'ai' : 'ai_suggestion',
      editReason: editSuggestion.reason || 'Sugestão da IA aplicada',
      isCurrent: true,
      chatSessionId: sessionId || null
    });

    // Atualizar contexto da sessão de chat (se houver)
    if (sessionId) {
      await ChatSession.updateContextSnapshot(sessionId, updatedAnalysis);
    }

    res.json({
      success: true,
      data: {
        analysis: updatedAnalysis,
        versionNumber: newVersionNumber
      }
    });
  } catch (error) {
    handleError(res, 'aplicar edição', error);
  }
};

/**
 * Salva edição manual do usuário
 * POST /api/chat/manual-edit
 */
exports.manualEdit = async (req, res) => {
  try {
    const { analysisId, field, newValue, reason } = req.body;
    const userId = req.userId;

    if (!analysisId || !field || newValue === undefined) {
      return res.status(400).json({
        success: false,
        error: 'analysisId, field e newValue são obrigatórios'
      });
    }

    // Buscar análise atual
    const analysis = await FightAnalysis.getById(analysisId);
    if (!analysis) {
      return res.status(404).json({
        success: false,
        error: 'Análise não encontrada'
      });
    }

    // Criar snapshot da versão atual (antes da edição)
    const currentVersionCount = await AnalysisVersion.countVersions(analysisId, 'fight');
    
    // Se for a primeira edição, salvar versão original
    if (currentVersionCount === 0) {
      await AnalysisVersion.create({
        analysisId,
        analysisType: 'fight',
        versionNumber: 1,
        content: {
          summary: analysis.summary,
          charts: analysis.charts,
          technicalStats: analysis.technicalStats
        },
        editedBy: 'user',
        editReason: 'Versão original',
        isCurrent: false
      });
    }

    // Preparar dados de atualização
    const updateData = {};
    if (field === 'summary') {
      updateData.summary = newValue;
    } else if (field === 'charts') {
      updateData.charts = newValue;
    } else if (field === 'technical_stats') {
      updateData.technicalStats = newValue;
    }

    // Atualizar análise
    const updatedAnalysis = await FightAnalysis.update(analysisId, updateData);

    // Criar nova versão
    const newVersionNumber = currentVersionCount + (currentVersionCount === 0 ? 2 : 1);
    await AnalysisVersion.create({
      analysisId,
      analysisType: 'fight',
      versionNumber: newVersionNumber,
      content: {
        summary: updatedAnalysis.summary,
        charts: updatedAnalysis.charts,
        technicalStats: updatedAnalysis.technicalStats
      },
      editedBy: 'user',
      editReason: reason || 'Edição manual do usuário',
      isCurrent: true
    });

    res.json({
      success: true,
      data: {
        analysis: updatedAnalysis,
        versionNumber: newVersionNumber
      }
    });
  } catch (error) {
    handleError(res, 'salvar edição manual', error);
  }
};

/**
 * Busca histórico de versões de uma análise
 * GET /api/chat/versions/:analysisId
 */
exports.getVersions = async (req, res) => {
  try {
    const { analysisId } = req.params;
    const { type = 'fight' } = req.query;

    const versions = await AnalysisVersion.getByAnalysisId(analysisId, type);

    res.json({
      success: true,
      data: versions,
      count: versions.length
    });
  } catch (error) {
    handleError(res, 'buscar versões', error);
  }
};

/**
 * Restaura uma versão específica
 * POST /api/chat/restore-version
 */
exports.restoreVersion = async (req, res) => {
  try {
    const { analysisId, versionNumber } = req.body;

    if (!analysisId || !versionNumber) {
      return res.status(400).json({
        success: false,
        error: 'analysisId e versionNumber são obrigatórios'
      });
    }

    // Buscar versão específica
    const version = await AnalysisVersion.getByVersionNumber(analysisId, 'fight', versionNumber);
    if (!version) {
      return res.status(404).json({
        success: false,
        error: 'Versão não encontrada'
      });
    }

    console.log('📦 Restaurando versão:', { versionNumber, content: version.content });

    // Restaurar conteúdo - version.content pode ser o conteúdo direto ou ter subcampos
    const content = version.content || {};
    const updateData = {};
    
    // Tentar extrair campos do content
    if (content.summary !== undefined) updateData.summary = content.summary;
    if (content.charts !== undefined) updateData.charts = content.charts;
    if (content.technicalStats !== undefined) updateData.technicalStats = content.technicalStats;
    if (content.technical_stats !== undefined) updateData.technicalStats = content.technical_stats;

    // Se updateData está vazio mas content tem dados, usar content diretamente como summary
    if (Object.keys(updateData).length === 0 && typeof content === 'string') {
      updateData.summary = content;
    }

    console.log('📝 Dados para update:', updateData);

    // Só fazer update se houver dados
    let updatedAnalysis;
    if (Object.keys(updateData).length > 0) {
      updatedAnalysis = await FightAnalysis.update(analysisId, updateData);
    } else {
      // Buscar análise atual se não há nada para atualizar
      updatedAnalysis = await FightAnalysis.getById(analysisId);
    }

    // Marcar esta versão como atual
    await AnalysisVersion.setAsCurrent(version.id, analysisId, 'fight');

    res.json({
      success: true,
      data: {
        analysis: updatedAnalysis,
        restoredVersion: versionNumber
      }
    });
  } catch (error) {
    handleError(res, 'restaurar versão', error);
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

// ====================================
// CHAT DE PERFIL TÉCNICO
// ====================================

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
    });

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
    });

    // Registrar uso da API
    if (aiResponse.usage) {
      try {
        await ApiUsage.create({
          userId,
          endpoint: '/api/chat/profile-send',
          model: aiResponse.usage.modelName,
          promptTokens: aiResponse.usage.promptTokens,
          completionTokens: aiResponse.usage.completionTokens,
          totalTokens: aiResponse.usage.totalTokens
        });
      } catch (usageError) {
        console.warn('⚠️ Erro ao registrar uso da API:', usageError.message);
      }
    }

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
    if (currentPerson.technicalSummary) {
      await ProfileVersion.create({
        personId,
        personType,
        userId,
        content: currentPerson.technicalSummary,
        editedBy: editReason?.includes('IA') ? 'ai' : 'user',
        editReason: editReason || 'Edição manual'
      });
    }

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
    if (currentPerson?.technicalSummary) {
      await ProfileVersion.create({
        personId,
        personType,
        userId,
        content: currentPerson.technicalSummary,
        editedBy: 'user',
        editReason: `Backup antes de restaurar versão ${versionNumber}`
      });
    }

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

// ====================================
// CHAT DE ESTRATÉGIA
// ====================================

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
    const session = await ChatSession.getById(sessionId);
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
    if (aiResponse.usage) {
      try {
        await ApiUsage.create({
          userId,
          endpoint: '/api/chat/strategy-send',
          model: aiResponse.usage.modelName || model || 'gemini-2.0-flash',
          promptTokens: aiResponse.usage.promptTokens || 0,
          completionTokens: aiResponse.usage.completionTokens || 0,
          totalTokens: aiResponse.usage.totalTokens || 0
        });
      } catch (usageError) {
        console.warn('⚠️ Erro ao registrar uso da API:', usageError.message);
      }
    }

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