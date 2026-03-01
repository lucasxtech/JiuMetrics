// Modelo de dados para Análise de Lutas com Supabase
const { supabase } = require('../config/supabase');
const { parseAnalysisFromDB, parseAnalysesFromDB } = require('../utils/dbParsers');

class FightAnalysis {
  /**
   * Busca todas as análises
   */
  static async getAll() {
    const { data, error } = await supabase
      .from('fight_analyses')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return parseAnalysesFromDB(data);
  }

  /**
   * Busca análises por tipo de pessoa (athlete ou opponent)
   */
  static async getByPersonId(personId, userId = null) {
    let query = supabase
      .from('fight_analyses')
      .select('*')
      .eq('person_id', personId);
    
    // Filtrar por user_id se fornecido
    if (userId) {
      query = query.eq('user_id', userId);
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
