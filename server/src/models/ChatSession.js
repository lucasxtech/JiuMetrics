// Modelo de dados para Sessões de Chat com IA
const { supabaseAdmin } = require('../config/supabase');

class ChatSession {
  /**
   * Cria uma nova sessão de chat
   * @param {Object} sessionData - Dados da sessão
   * @returns {Promise<Object>} Sessão criada
   */
  static async create(sessionData) {
    const insertData = {
      user_id: sessionData.userId,
      context_type: sessionData.contextType,
      context_id: sessionData.contextId || null, // Permite null para estratégias temporárias
      context_snapshot: sessionData.contextSnapshot,
      messages: sessionData.messages || [],
      title: sessionData.title || null,
      is_active: true
    };

    const { data, error } = await supabaseAdmin
      .from('ai_chat_sessions')
      .insert([insertData])
      .select()
      .single();

    if (error) throw error;
    return this.parseFromDB(data);
  }

  /**
   * Busca sessão por ID
   * @param {string} id - ID da sessão
   * @param {string} userId - ID do usuário (para validação)
   * @returns {Promise<Object|null>} Sessão encontrada ou null
   */
  static async getById(id, userId = null) {
    let query = supabaseAdmin
      .from('ai_chat_sessions')
      .select('*')
      .eq('id', id);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query.single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }
    return this.parseFromDB(data);
  }

  /**
   * Busca sessões por contexto (análise ou estratégia)
   * @param {string} contextType - 'analysis' ou 'strategy'
   * @param {string} contextId - ID do contexto
   * @param {string} userId - ID do usuário
   * @returns {Promise<Array>} Lista de sessões
   */
  static async getByContext(contextType, contextId, userId) {
    const { data, error } = await supabaseAdmin
      .from('ai_chat_sessions')
      .select('*')
      .eq('context_type', contextType)
      .eq('context_id', contextId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(session => this.parseFromDB(session));
  }

  /**
   * Busca todas as sessões ativas do usuário
   * @param {string} userId - ID do usuário
   * @returns {Promise<Array>} Lista de sessões
   */
  static async getByUserId(userId) {
    const { data, error } = await supabaseAdmin
      .from('ai_chat_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(session => this.parseFromDB(session));
  }

  /**
   * Adiciona uma mensagem à sessão
   * @param {string} sessionId - ID da sessão
   * @param {Object} message - Mensagem a adicionar {role, content}
   * @returns {Promise<Object>} Sessão atualizada
   */
  static async addMessage(sessionId, message) {
    // Primeiro, buscar sessão atual para pegar mensagens existentes
    const { data: currentSession, error: fetchError } = await supabaseAdmin
      .from('ai_chat_sessions')
      .select('messages')
      .eq('id', sessionId)
      .single();

    if (fetchError) throw fetchError;

    const currentMessages = currentSession.messages || [];
    const newMessage = {
      ...message,
      timestamp: new Date().toISOString()
    };

    const updatedMessages = [...currentMessages, newMessage];

    const { data, error } = await supabaseAdmin
      .from('ai_chat_sessions')
      .update({ messages: updatedMessages })
      .eq('id', sessionId)
      .select()
      .single();

    if (error) throw error;
    return this.parseFromDB(data);
  }

  /**
   * Adiciona múltiplas mensagens à sessão de uma vez
   * @param {string} sessionId - ID da sessão
   * @param {Array} messages - Array de mensagens a adicionar [{role, content}, ...]
   * @returns {Promise<Object>} Sessão atualizada
   */
  static async addMessages(sessionId, messages) {
    // Primeiro, buscar sessão atual para pegar mensagens existentes
    const { data: currentSession, error: fetchError } = await supabaseAdmin
      .from('ai_chat_sessions')
      .select('messages')
      .eq('id', sessionId)
      .single();

    if (fetchError) throw fetchError;

    const currentMessages = currentSession.messages || [];
    const newMessages = messages.map(msg => ({
      ...msg,
      timestamp: msg.timestamp || new Date().toISOString()
    }));

    const updatedMessages = [...currentMessages, ...newMessages];

    const { data, error } = await supabaseAdmin
      .from('ai_chat_sessions')
      .update({ messages: updatedMessages })
      .eq('id', sessionId)
      .select()
      .single();

    if (error) throw error;
    return this.parseFromDB(data);
  }

  /**
   * Atualiza o contexto snapshot (quando análise é editada)
   * @param {string} sessionId - ID da sessão
   * @param {Object} newSnapshot - Novo snapshot do contexto
   * @returns {Promise<Object>} Sessão atualizada
   */
  static async updateContextSnapshot(sessionId, newSnapshot) {
    const { data, error } = await supabaseAdmin
      .from('ai_chat_sessions')
      .update({ context_snapshot: newSnapshot })
      .eq('id', sessionId)
      .select()
      .single();

    if (error) throw error;
    return this.parseFromDB(data);
  }

  /**
   * Desativa uma sessão (soft delete)
   * @param {string} sessionId - ID da sessão
   * @param {string} userId - ID do usuário (para validação)
   * @returns {Promise<Object>} Sessão desativada
   */
  static async deactivate(sessionId, userId) {
    const { data, error } = await supabaseAdmin
      .from('ai_chat_sessions')
      .update({ is_active: false })
      .eq('id', sessionId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return this.parseFromDB(data);
  }

  /**
   * Deleta uma sessão permanentemente
   * @param {string} sessionId - ID da sessão
   * @param {string} userId - ID do usuário (para validação)
   * @returns {Promise<boolean>} true se deletado
   */
  static async delete(sessionId, userId) {
    const { error } = await supabaseAdmin
      .from('ai_chat_sessions')
      .delete()
      .eq('id', sessionId)
      .eq('user_id', userId);

    if (error) throw error;
    return true;
  }

  /**
   * Converte dados do banco para formato da aplicação
   * @param {Object} dbData - Dados do Supabase
   * @returns {Object} Dados formatados
   */
  static parseFromDB(dbData) {
    if (!dbData) return null;

    return {
      id: dbData.id,
      userId: dbData.user_id,
      contextType: dbData.context_type,
      contextId: dbData.context_id,
      contextSnapshot: dbData.context_snapshot,
      messages: dbData.messages || [],
      title: dbData.title,
      isActive: dbData.is_active,
      createdAt: dbData.created_at,
      updatedAt: dbData.updated_at
    };
  }
}

module.exports = ChatSession;
