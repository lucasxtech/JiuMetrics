// Modelo de dados para Adversário com Supabase
const { supabase } = require('../config/supabase');
const { parseAthleteFromDB, parseAthletesFromDB } = require('../utils/dbParsers'); // Reutiliza parsers

class Opponent {
  /**
   * Busca todos os adversários de um usuário
   */
  static async getAll(userId) {
    const { data, error } = await supabase
      .from('opponents')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return parseAthletesFromDB(data);
  }

  /**
   * Busca um adversário por ID e user_id
   */
  static async getById(id, userId) {
    const { data, error } = await supabase
      .from('opponents')
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
   * Cria um novo adversário
   */
  static async create(opponentData, userId) {
    const { data, error } = await supabase
      .from('opponents')
      .insert([{
        user_id: userId,
        name: opponentData.name,
        belt: opponentData.belt,
        weight: opponentData.weight,
        height: opponentData.height,
        age: opponentData.age,
        style: opponentData.style,
        strong_attacks: opponentData.strongAttacks,
        weaknesses: opponentData.weaknesses,
        video_url: opponentData.videoUrl,
        cardio: opponentData.cardio,
        technical_profile: opponentData.technicalProfile || {},
      }])
      .select()
      .single();
    
    if (error) throw error;
    return parseAthleteFromDB(data);
  }

  /**
   * Atualiza um adversário
   */
  static async update(id, opponentData, userId) {
    const updateData = {};
    
    if (opponentData.name !== undefined) updateData.name = opponentData.name;
    if (opponentData.belt !== undefined) updateData.belt = opponentData.belt;
    if (opponentData.weight !== undefined) updateData.weight = opponentData.weight;
    if (opponentData.height !== undefined) updateData.height = opponentData.height;
    if (opponentData.age !== undefined) updateData.age = opponentData.age;
    if (opponentData.style !== undefined) updateData.style = opponentData.style;
    if (opponentData.strongAttacks !== undefined) updateData.strong_attacks = opponentData.strongAttacks;
    if (opponentData.weaknesses !== undefined) updateData.weaknesses = opponentData.weaknesses;
    if (opponentData.videoUrl !== undefined) updateData.video_url = opponentData.videoUrl;
    if (opponentData.cardio !== undefined) updateData.cardio = opponentData.cardio;
    if (opponentData.technicalProfile !== undefined) updateData.technical_profile = opponentData.technicalProfile;

    const { data, error } = await supabase
      .from('opponents')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();
    
    if (error) throw error;
    return parseAthleteFromDB(data);
  }

  /**
   * Deleta um adversário
   */
  static async delete(id, userId) {
    const { data, error } = await supabase
      .from('opponents')
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
    const opponent = await this.getById(id, userId);
    if (!opponent) return null;

    // Mesclar dados de análise com perfil existente
    const updatedProfile = {
      ...opponent.technicalProfile,
      ...analysisData,
    };

    return this.update(id, { technicalProfile: updatedProfile }, userId);
  }
}

module.exports = Opponent;
