// Modelo de dados para Adversário com Supabase
const { supabase } = require('../config/supabase');
const { parseAthleteFromDB, parseAthletesFromDB } = require('../utils/dbParsers'); // Reutiliza parsers

class Opponent {
  /**
   * Busca todos os adversários dentro do grupo permitido
   * @param {string[]} allowedUserIds - IDs do grupo (tenant)
   */
  static async getAll(allowedUserIds) {
    const { data: opponents, error } = await supabase
      .from('opponents')
      .select('*')
      .in('user_id', allowedUserIds)
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (opponents.length === 0) return [];

    // Buscar nomes dos criadores
    const creatorMap = {};
    if (allowedUserIds.length > 1) {
      const { data: usersData } = await supabase
        .from('users')
        .select('id, name')
        .in('id', allowedUserIds);
      if (usersData) usersData.forEach(u => { creatorMap[u.id] = u.name; });
    }

    const { data: analysesCounts, error: countError } = await supabase
      .from('fight_analyses')
      .select('person_id')
      .in('person_id', opponents.map(o => o.id));

    const countsMap = {};
    if (analysesCounts && !countError) {
      analysesCounts.forEach(a => {
        countsMap[a.person_id] = (countsMap[a.person_id] || 0) + 1;
      });
    }

    const opponentsWithCount = opponents.map(opponent => ({
      ...opponent,
      creator_name: creatorMap[opponent.user_id] || null,
      analyses_count: countsMap[opponent.id] || 0
    }));

    return parseAthletesFromDB(opponentsWithCount);
  }

  /**
   * Busca um adversário por ID dentro do grupo permitido
   * @param {string} id
   * @param {string|string[]} userIdOrAllowed - userId único OU array de allowedUserIds
   */
  static async getById(id, userIdOrAllowed) {
    const ids = Array.isArray(userIdOrAllowed) ? userIdOrAllowed : [userIdOrAllowed];
    const { data, error } = await supabase
      .from('opponents')
      .select('*')
      .eq('id', id)
      .in('user_id', ids)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    if (!data) return null;
    return parseAthleteFromDB({ ...data, creator_name: null });
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
    if (opponentData.technicalSummary !== undefined) updateData.technical_summary = opponentData.technicalSummary;
    if (opponentData.technicalSummaryUpdatedAt !== undefined) updateData.technical_summary_updated_at = opponentData.technicalSummaryUpdatedAt;

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
