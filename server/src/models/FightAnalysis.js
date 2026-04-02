// Modelo de dados para Análise de Lutas com Supabase
const { supabase } = require('../config/supabase');
const { parseAnalysisFromDB, parseAnalysesFromDB } = require('../utils/dbParsers');

class FightAnalysis {
  /**
   * Busca todas as análises dentro do grupo permitido
   * @param {string[]} allowedUserIds
   */
  static async getAll(allowedUserIds) {
    if (!allowedUserIds || allowedUserIds.length === 0) throw new Error('allowedUserIds obrigatório');

    const { data, error } = await supabase
      .from('fight_analyses')
      .select('*')
      .in('user_id', allowedUserIds)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Buscar nomes dos criadores (só quando há mais de um usuário no grupo)
    const creatorMap = {};
    if (allowedUserIds.length > 1) {
      const { data: usersData } = await supabase
        .from('users')
        .select('id, name')
        .in('id', allowedUserIds);
      if (usersData) usersData.forEach(u => { creatorMap[u.id] = u.name; });
    }

    const analysesWithCreator = (data || []).map(a => ({
      ...a,
      creator_name: creatorMap[a.user_id] || null,
    }));

    return parseAnalysesFromDB(analysesWithCreator);
  }

  /**
   * Busca análises por pessoa dentro do grupo permitido
   * @param {string} personId
   * @param {string|string[]|null} userIdOrAllowed - userId, array de IDs, ou null (sem filtro)
   */
  static async getByPersonId(personId, userIdOrAllowed = null) {
    let query = supabase
      .from('fight_analyses')
      .select('*')
      .eq('person_id', personId);

    if (userIdOrAllowed) {
      const ids = Array.isArray(userIdOrAllowed) ? userIdOrAllowed : [userIdOrAllowed];
      query = query.in('user_id', ids);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Erro ao buscar análises:', error);
      throw error;
    }

    return parseAnalysesFromDB(data);
  }

  /**
   * Busca uma análise por ID
   */
  static async getById(id) {
    const { data, error } = await supabase
      .from('fight_analyses')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return parseAnalysisFromDB(data);
  }

  /**
   * Busca análise por ID garantindo que pertence ao usuário (ou é admin)
   */
  static async getByIdAndUser(id, allowedUserIds) {
    const { data, error } = await supabase
      .from('fight_analyses')
      .select('*')
      .eq('id', id)
      .in('user_id', allowedUserIds)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return parseAnalysisFromDB({ ...data, creator_name: null });
  }

  /**
   * Cria uma nova análise de luta
   */
  static async create(analysisData) {
    const insertData = {
      person_id: analysisData.personId,
      person_type: analysisData.personType,
      video_url: analysisData.videoUrl || '',
      charts: analysisData.charts || [],
      summary: analysisData.summary || '',
      technical_profile: analysisData.technicalProfile || '',
      technical_stats: analysisData.technicalStats || null,
      frames_analyzed: analysisData.framesAnalyzed || 0,
      current_version: 1,
      is_edited: false,
    };
    
    // Adicionar user_id se fornecido
    if (analysisData.userId) {
      insertData.user_id = analysisData.userId;
    }
    
    const { data, error } = await supabase
      .from('fight_analyses')
      .insert([insertData])
      .select()
      .single();
    
    if (error) throw error;
    return parseAnalysisFromDB(data);
  }

  /**
   * Atualiza uma análise
   */
  static async update(id, analysisData) {
    const updateData = {};
    
    if (analysisData.videoUrl !== undefined) updateData.video_url = analysisData.videoUrl;
    if (analysisData.charts !== undefined) updateData.charts = analysisData.charts;
    if (analysisData.summary !== undefined) updateData.summary = analysisData.summary;
    if (analysisData.technicalProfile !== undefined) updateData.technical_profile = analysisData.technicalProfile;
    if (analysisData.technicalStats !== undefined) updateData.technical_stats = analysisData.technicalStats;
    if (analysisData.framesAnalyzed !== undefined) updateData.frames_analyzed = analysisData.framesAnalyzed;
    if (analysisData.currentVersion !== undefined) updateData.current_version = analysisData.currentVersion;
    if (analysisData.isEdited !== undefined) updateData.is_edited = analysisData.isEdited;
    if (analysisData.originalSummary !== undefined) updateData.original_summary = analysisData.originalSummary;
    if (analysisData.originalCharts !== undefined) updateData.original_charts = analysisData.originalCharts;

    // Se não há nada para atualizar, apenas buscar e retornar
    if (Object.keys(updateData).length === 0) {
      return this.getById(id);
    }

    const { data, error } = await supabase
      .from('fight_analyses')
      .update(updateData)
      .eq('id', id)
      .select();
    
    if (error) throw error;
    
    // Retornar primeira linha ou null
    return data && data.length > 0 ? parseAnalysisFromDB(data[0]) : null;
  }

  /**
   * Deleta uma análise
   */
  static async delete(id) {
    const { data, error } = await supabase
      .from('fight_analyses')
      .delete()
      .eq('id', id)
      .select();
    
    if (error) throw error;
    return data && data.length > 0 ? parseAnalysisFromDB(data[0]) : null;
  }
}

module.exports = FightAnalysis;
