// Modelo de dados para Atleta com Supabase
const { supabase } = require('../config/supabase');
const { parseAthleteFromDB, parseAthletesFromDB } = require('../utils/dbParsers');

class Athlete {
  /**
   * Busca todos os atletas de um usuário (com contagem de análises)
   */
  static async getAll(userId) {
    // Buscar atletas
    const { data: athletes, error } = await supabase
      .from('athletes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    // Buscar contagem de análises por atleta
    const { data: analysesCounts, error: countError } = await supabase
      .from('fight_analyses')
      .select('person_id')
      .eq('user_id', userId)
      .in('person_id', athletes.map(a => a.id));
    
    // Contar análises por person_id
    const countsMap = {};
    if (analysesCounts && !countError) {
      analysesCounts.forEach(a => {
        countsMap[a.person_id] = (countsMap[a.person_id] || 0) + 1;
      });
    }
    
    // Adicionar contagem a cada atleta
    const athletesWithCount = athletes.map(athlete => ({
      ...athlete,
      analyses_count: countsMap[athlete.id] || 0
    }));
    
    return parseAthletesFromDB(athletesWithCount);
  }

  /**
   * Busca um atleta por ID e user_id
   */
  static async getById(id, userId) {
    const { data, error } = await supabase
      .from('athletes')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }
    return data ? parseAthleteFromDB(data) : null;
  }

  /**
   * Cria um novo atleta
   */
  static async create(athleteData, userId) {
    const { data, error } = await supabase
      .from('athletes')
      .insert([{
        user_id: userId,
        name: athleteData.name,
        belt: athleteData.belt,
        weight: athleteData.weight,
        height: athleteData.height,
        age: athleteData.age,
        style: athleteData.style,
        strong_attacks: athleteData.strongAttacks,
        weaknesses: athleteData.weaknesses,
        video_url: athleteData.videoUrl,
        cardio: athleteData.cardio,
        technical_profile: athleteData.technicalProfile || {},
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  /**
   * Atualiza um atleta
   */
  static async update(id, athleteData, userId) {
    const updateData = {};
    
    if (athleteData.name !== undefined) updateData.name = athleteData.name;
    if (athleteData.belt !== undefined) updateData.belt = athleteData.belt;
    if (athleteData.weight !== undefined) updateData.weight = athleteData.weight;
    if (athleteData.height !== undefined) updateData.height = athleteData.height;
    if (athleteData.age !== undefined) updateData.age = athleteData.age;
    if (athleteData.style !== undefined) updateData.style = athleteData.style;
    if (athleteData.strongAttacks !== undefined) updateData.strong_attacks = athleteData.strongAttacks;
    if (athleteData.weaknesses !== undefined) updateData.weaknesses = athleteData.weaknesses;
    if (athleteData.videoUrl !== undefined) updateData.video_url = athleteData.videoUrl;
    if (athleteData.cardio !== undefined) updateData.cardio = athleteData.cardio;
    if (athleteData.technicalProfile !== undefined) updateData.technical_profile = athleteData.technicalProfile;
    if (athleteData.technicalSummary !== undefined) updateData.technical_summary = athleteData.technicalSummary;
    if (athleteData.technicalSummaryUpdatedAt !== undefined) updateData.technical_summary_updated_at = athleteData.technicalSummaryUpdatedAt;

    const { data, error } = await supabase
      .from('athletes')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();
    
    if (error) throw error;
    return parseAthleteFromDB(data);
  }

  /**
   * Deleta um atleta
   */
  static async delete(id, userId) {
    const { data, error } = await supabase
      .from('athletes')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();
    
    if (error) throw error;
    return parseAthleteFromDB(data);
  }

  /**
   * Atualiza perfil técnico baseado em análises de lutas
   */
  static async updateTechnicalProfile(id, analysisData, userId) {
    const athlete = await this.getById(id, userId);
    if (!athlete) return null;

    // Mesclar dados de análise com perfil existente
    const updatedProfile = {
      ...athlete.technical_profile,
      ...analysisData,
    };

    return this.update(id, { technicalProfile: updatedProfile }, userId);
  }
}

module.exports = Athlete;
