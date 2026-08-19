// Modelo de dados para Sessões de Chat com IA
//
// ⚠️ Sessão de chat é PESSOAL, não compartilhada com o grupo: todos os
// métodos filtram pelo `user_id` do próprio requisitante, inclusive para
// admin. Isso é comportamento pré-existente (`getByContext`/`getByUserId`
// sempre filtraram assim) e a spec 006 o estendeu para os métodos de
// escrita, que aceitavam qualquer `sessionId` — a causa do vazamento AZ-5.
//
// Este model usa `supabaseAdmin` (service_role), então RLS não se aplica:
// o filtro aqui é a ÚNICA proteção.
const { supabaseAdmin } = require('../config/supabase');
const { requireScope } = require('../utils/scopeGuard');
const { NotFoundError } = require('../utils/errors');

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
   * @param {string} userId - dono da sessão (obrigatório — spec 006)
   * @returns {Promise<Object>} Sessão atualizada
   */
  static async addMessage(sessionId, message, userId) {
    const ids = requireScope(userId, 'ChatSession.addMessage');

    // Primeiro, buscar sessão atual para pegar mensagens existentes
    const { data: currentSession, error: fetchError } = await supabaseAdmin
      .from('ai_chat_sessions')
      .select('messages')
      .eq('id', sessionId)
      .in('user_id', ids)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') throw new NotFoundError('Sessão de chat');
      throw fetchError;
    }

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
      .in('user_id', ids)
      .select()
      .single();

    if (error) throw error;
    return this.parseFromDB(data);
  }

  /**
   * Adiciona múltiplas mensagens à sessão de uma vez
   * @param {string} sessionId - ID da sessão
   * @param {Array} messages - Array de mensagens a adicionar [{role, content}, ...]
   * @param {string} userId - dono da sessão (obrigatório — spec 006)
   * @returns {Promise<Object>} Sessão atualizada
   */
  static async addMessages(sessionId, messages, userId) {
    const ids = requireScope(userId, 'ChatSession.addMessages');

    // Primeiro, buscar sessão atual para pegar mensagens existentes
    const { data: currentSession, error: fetchError } = await supabaseAdmin
      .from('ai_chat_sessions')
      .select('messages')
      .eq('id', sessionId)
      .in('user_id', ids)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') throw new NotFoundError('Sessão de chat');
      throw fetchError;
    }

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
      .in('user_id', ids)
      .select()
      .single();

    if (error) throw error;
    return this.parseFromDB(data);
  }

  /**
   * Atualiza o contexto snapshot (quando análise é editada)
   *
   * Era aqui o vazamento AZ-5: o método não recebia nem filtrava `userId`, e
   * `applyEdit` passava um `sessionId` cru do `req.body` — envenenando o
   * contexto que a IA de outro usuário recebia nos turnos seguintes.
   *
   * Devolve `null` (em vez de lançar) quando a sessão não existe ou não é do
   * usuário: é um efeito colateral best-effort da edição, e a edição da
   * análise — que já foi validada e aplicada — não deve ser desfeita por
   * causa de um `sessionId` inválido. Quem chama decide o que fazer com o
   * `null`, e `applyEdit` registra um aviso.
   *
   * @param {string} sessionId - ID da sessão
   * @param {Object} newSnapshot - Novo snapshot do contexto
   * @param {string} userId - dono da sessão (obrigatório — spec 006)
   * @returns {Promise<Object|null>} Sessão atualizada, ou null se nada casou
   */
  static async updateContextSnapshot(sessionId, newSnapshot, userId) {
    const ids = requireScope(userId, 'ChatSession.updateContextSnapshot');

    const { data, error } = await supabaseAdmin
      .from('ai_chat_sessions')
      .update({ context_snapshot: newSnapshot })
      .eq('id', sessionId)
      .in('user_id', ids)
      .select();

    if (error) throw error;
    return data && data.length > 0 ? this.parseFromDB(data[0]) : null;
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
