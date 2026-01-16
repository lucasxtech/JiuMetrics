import api from './api';

/**
 * Obtém o modelo de IA selecionado pelo usuário
 */
const getSelectedModel = () => {
  return localStorage.getItem('ai_model') || 'gemini-2.0-flash';
};

// ====================================
// SESSÕES DE CHAT
// ====================================

/**
 * Cria uma nova sessão de chat para uma análise
 * @param {string} contextType - 'analysis' ou 'strategy'
 * @param {string} contextId - ID da análise/estratégia
 * @returns {Promise<Object>} Sessão criada
 */
export const createChatSession = async (contextType, contextId) => {
  const response = await api.post('/chat/session', {
    contextType,
    contextId
  });
  return response.data;
};

/**
 * Busca sessão de chat por ID
 * @param {string} sessionId - ID da sessão
 * @returns {Promise<Object>} Sessão encontrada
 */
export const getChatSession = async (sessionId) => {
  const response = await api.get(`/chat/session/${sessionId}`);
  return response.data;
};

/**
 * Lista sessões de chat para um contexto específico
 * @param {string} contextType - 'analysis' ou 'strategy'
 * @param {string} contextId - ID da análise/estratégia
 * @returns {Promise<Array>} Lista de sessões
 */
export const getChatSessionsByContext = async (contextType, contextId) => {
  const response = await api.get(`/chat/sessions/${contextType}/${contextId}`);
  return response.data;
};

/**
 * Deleta uma sessão de chat
 * @param {string} sessionId - ID da sessão
 * @returns {Promise<Object>} Resultado
 */
export const deleteChatSession = async (sessionId) => {
  const response = await api.delete(`/chat/session/${sessionId}`);
  return response.data;
};

// ====================================
// MENSAGENS
// ====================================

/**
 * Envia mensagem no chat e recebe resposta da IA
 * @param {string} sessionId - ID da sessão
 * @param {string} message - Mensagem do usuário
 * @returns {Promise<Object>} Resposta da IA com possíveis sugestões
 */
export const sendChatMessage = async (sessionId, message) => {
  const model = getSelectedModel();
  
  const response = await api.post('/chat/send', {
    sessionId,
    message,
    model
  });
  return response.data;
};

// ====================================
// EDIÇÕES
// ====================================

/**
 * Aplica sugestão de edição da IA à análise
 * @param {string} sessionId - ID da sessão de chat (opcional)
 * @param {string} analysisId - ID da análise
 * @param {Object} editSuggestion - Sugestão de edição {field, newValue, reason}
 * @param {boolean} acceptedByUser - Se o usuário aceitou explicitamente
 * @returns {Promise<Object>} Análise atualizada
 */
export const applyEditSuggestion = async (sessionId, analysisId, editSuggestion, acceptedByUser = true) => {
  const response = await api.post('/chat/apply-edit', {
    sessionId,
    analysisId,
    editSuggestion,
    acceptedByUser
  });
  return response.data;
};

/**
 * Salva edição manual do usuário
 * @param {string} analysisId - ID da análise
 * @param {string} field - Campo a editar ('summary', 'charts', 'technical_stats')
 * @param {any} newValue - Novo valor
 * @param {string} reason - Motivo da edição (opcional)
 * @returns {Promise<Object>} Análise atualizada
 */
export const saveManualEdit = async (analysisId, field, newValue, reason = '') => {
  const response = await api.post('/chat/manual-edit', {
    analysisId,
    field,
    newValue,
    reason
  });
  return response.data;
};

// ====================================
// VERSÕES/HISTÓRICO
// ====================================

/**
 * Busca histórico de versões de uma análise
 * @param {string} analysisId - ID da análise
 * @param {string} type - Tipo da análise ('fight' ou 'tactical')
 * @returns {Promise<Array>} Lista de versões
 */
export const getAnalysisVersions = async (analysisId, type = 'fight') => {
  const response = await api.get(`/chat/versions/${analysisId}`, {
    params: { type }
  });
  return response.data;
};

/**
 * Restaura uma versão específica da análise
 * @param {string} analysisId - ID da análise
 * @param {number} versionNumber - Número da versão a restaurar
 * @returns {Promise<Object>} Análise restaurada
 */
export const restoreAnalysisVersion = async (analysisId, versionNumber) => {
  const response = await api.post('/chat/restore-version', {
    analysisId,
    versionNumber
  });
  return response.data;
};

// ====================================
// CHAT DE PERFIL TÉCNICO
// ====================================

/**
 * Cria uma nova sessão de chat para editar resumo técnico do perfil
 * @param {string} personId - ID do atleta ou adversário
 * @param {string} personType - 'athlete' ou 'opponent'
 * @param {string} currentSummary - Resumo técnico atual
 * @returns {Promise<Object>} Sessão criada
 */
export const createProfileChatSession = async (personId, personType, currentSummary) => {
  const response = await api.post('/chat/profile-session', {
    personId,
    personType,
    currentSummary
  });
  return response.data;
};

/**
 * Envia mensagem no chat de perfil e recebe resposta da IA
 * @param {string} sessionId - ID da sessão
 * @param {string} message - Mensagem do usuário
 * @param {string} currentSummary - Resumo técnico atual
 * @returns {Promise<Object>} Resposta da IA com sugestão de edição
 */
export const sendProfileChatMessage = async (sessionId, message, currentSummary) => {
  const model = getSelectedModel();
  
  const response = await api.post('/chat/profile-send', {
    sessionId,
    message,
    currentSummary,
    model
  });
  return response.data;
};

/**
 * Salva edição do resumo técnico do perfil
 * @param {string} personId - ID do atleta ou adversário
 * @param {string} personType - 'athlete' ou 'opponent'
 * @param {string} newSummary - Novo resumo técnico
 * @param {string} editReason - Motivo da edição (opcional)
 * @returns {Promise<Object>} Perfil atualizado
 */
export const saveProfileSummary = async (personId, personType, newSummary, editReason = '') => {
  const response = await api.post('/chat/profile-save', {
    personId,
    personType,
    newSummary,
    editReason
  });
  return response.data;
};

/**
 * Busca histórico de versões do perfil técnico
 * @param {string} personId - ID do atleta ou adversário
 * @param {string} personType - 'athlete' ou 'opponent'
 * @returns {Promise<Array>} Lista de versões
 */
export const getProfileVersions = async (personId, personType) => {
  const response = await api.get(`/chat/profile-versions/${personType}/${personId}`);
  return response.data;
};

/**
 * Restaura uma versão específica do perfil técnico
 * @param {string} personId - ID do atleta ou adversário
 * @param {string} personType - 'athlete' ou 'opponent'
 * @param {number} versionNumber - Número da versão a restaurar
 * @returns {Promise<Object>} Perfil restaurado
 */
export const restoreProfileVersion = async (personId, personType, versionNumber) => {
  const response = await api.post('/chat/profile-restore', {
    personId,
    personType,
    versionNumber
  });
  return response.data;
};

// ====================================
// CHAT DE ESTRATÉGIA
// ====================================

/**
 * Cria uma nova sessão de chat para refinar estratégia de luta
 * @param {Object} strategyData - Dados da estratégia gerada
 * @param {string} athleteName - Nome do atleta
 * @param {string} opponentName - Nome do adversário
 * @returns {Promise<Object>} Sessão criada
 */
export const createStrategyChatSession = async (strategyData, athleteName, opponentName) => {
  const response = await api.post('/chat/strategy-session', {
    strategyData,
    athleteName,
    opponentName
  });
  return response.data;
};

/**
 * Envia mensagem no chat de estratégia e recebe resposta da IA
 * @param {string} sessionId - ID da sessão
 * @param {string} message - Mensagem do usuário
 * @param {Object} currentStrategy - Estratégia atual
 * @returns {Promise<Object>} Resposta da IA com sugestão de edição
 */
export const sendStrategyChatMessage = async (sessionId, message, currentStrategy) => {
  const model = getSelectedModel();
  
  const response = await api.post('/chat/strategy-send', {
    sessionId,
    message,
    currentStrategy,
    model
  });
  return response.data;
};

export default {
  // Sessões
  createChatSession,
  getChatSession,
  getChatSessionsByContext,
  deleteChatSession,
  
  // Mensagens
  sendChatMessage,
  
  // Edições
  applyEditSuggestion,
  saveManualEdit,
  
  // Versões
  getAnalysisVersions,
  restoreAnalysisVersion,
  
  // Chat de Perfil
  createProfileChatSession,
  sendProfileChatMessage,
  saveProfileSummary,
  getProfileVersions,
  restoreProfileVersion,
  
  // Chat de Estratégia
  createStrategyChatSession,
  sendStrategyChatMessage
};
