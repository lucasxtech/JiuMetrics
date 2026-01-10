// Modelo de dados para Análises Táticas com Supabase
const { supabase } = require('../config/supabase');

class TacticalAnalysis {
  /**
   * Lista todas as análises táticas do usuário
   * @param {string} userId - ID do usuário
   * @param {Object} options - Opções de filtro e paginação
   * @returns {Promise<Array>} Lista de análises
   */
  static async getAll(userId, options = {}) {
    const { 
      athleteId, 
      opponentId, 
      limit = 50, 
      offset = 0 
    } = options;

    let query = supabase
      .from('tactical_analyses')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (athleteId) {
      query = query.eq('athlete_id', athleteId);
    }

    if (opponentId) {
      query = query.eq('opponent_id', opponentId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  }

  /**
   * Busca uma análise tática por ID
   * @param {string} id - ID da análise
   * @param {string} userId - ID do usuário (para verificação de segurança)
   * @returns {Promise<Object>} Análise tática
   */
  static async getById(id, userId) {
    const { data, error } = await supabase
      .from('tactical_analyses')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return data;
  }

  /**
   * Cria uma nova análise tática
   * @param {Object} analysisData - Dados da análise
   * @returns {Promise<Object>} Análise criada
   */
  static async create(analysisData) {
    console.log('🔵 TacticalAnalysis.create chamado com:', {
      userId: analysisData.userId,
      athleteId: analysisData.athleteId,
      athleteName: analysisData.athleteName,
      opponentName: analysisData.opponentName
    });

    const { data, error } = await supabase
      .from('tactical_analyses')
      .insert([{
        user_id: analysisData.userId,
        athlete_id: analysisData.athleteId,
        athlete_name: analysisData.athleteName,
        opponent_id: analysisData.opponentId,
        opponent_name: analysisData.opponentName,
        strategy_data: analysisData.strategyData,
        metadata: analysisData.metadata || {}
      }])
      .select()
      .single();

    if (error) {
      console.error('🔴 Erro no TacticalAnalysis.create:', error);
      throw error;
    }

    console.log('🟢 TacticalAnalysis.create sucesso! ID:', data?.id);
    return data;
  }

  /**
   * Deleta uma análise tática
   * @param {string} id - ID da análise
   * @param {string} userId - ID do usuário (para verificação de segurança)
   * @returns {Promise<boolean>} Sucesso
   */
  static async delete(id, userId) {
    const { error } = await supabase
      .from('tactical_analyses')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;
    return true;
  }

  /**
   * Atualiza uma análise tática
   * @param {string} id - ID da análise
   * @param {string} userId - ID do usuário (para verificação de segurança)
   * @param {Object} updateData - Dados a atualizar
   * @returns {Promise<Object>} Análise atualizada
   */
  static async update(id, userId, updateData) {
    const { data, error } = await supabase
      .from('tactical_analyses')
      .update({
        strategy_data: updateData.strategy_data,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select();

    if (error) {
      throw error;
    }
    
    if (!data || data.length === 0) {
      throw new Error('Análise não encontrada ou sem permissão para atualizar');
    }
    
    return data[0];
  }

  /**
   * Conta o total de análises do usuário
   * @param {string} userId - ID do usuário
   * @returns {Promise<number>} Total de análises
   */
  static async count(userId) {
    const { count, error } = await supabase
      .from('tactical_analyses')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (error) throw error;
    return count || 0;
  }

  /**
   * Busca análises recentes (últimas N)
   * @param {string} userId - ID do usuário
   * @param {number} limit - Quantidade de análises
   * @returns {Promise<Array>} Análises recentes
   */
  static async getRecent(userId, limit = 10) {
    const { data, error } = await supabase
      .from('tactical_analyses')
      .select('id, athlete_name, opponent_name, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }
}

module.exports = TacticalAnalysis;
