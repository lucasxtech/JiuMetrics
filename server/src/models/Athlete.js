// Modelo de dados para Atleta com Supabase
const { supabase } = require('../config/supabase');
const { parseAthleteFromDB, parseAthletesFromDB } = require('../utils/dbParsers');

class Athlete {
  /**
   * Busca todos os atletas dentro do grupo permitido
   * @param {string[]} allowedUserIds - IDs do grupo (tenant)
   */
  static async getAll(allowedUserIds) {
    const { data: athletes, error } = await supabase
      .from('athletes')
      .select('*')
      .in('user_id', allowedUserIds)
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (athletes.length === 0) return [];

    // Paralelizar queries de criadores e contagens
    const [creatorMap, countsMap] = await Promise.all([
      // Buscar nomes dos criadores
      (async () => {
        const map = {};
        if (allowedUserIds.length > 1) {
          const { data: usersData } = await supabase
            .from('users')
            .select('id, name')
            .in('id', allowedUserIds);
          if (usersData) usersData.forEach(u => { map[u.id] = u.name; });
        }
        return map;
      })(),
      // Buscar contagens de análises
      (async () => {
        const map = {};
        const { data: analysesCounts, error: countError } = await supabase
          .from('fight_analyses')
          .select('person_id')
          .in('person_id', athletes.map(a => a.id));
        if (analysesCounts && !countError) {
          analysesCounts.forEach(a => {
            map[a.person_id] = (map[a.person_id] || 0) + 1;
          });
        }
        return map;
      })()
    ]);

    const athletesWithCount = athletes.map(athlete => ({
      ...athlete,
      creator_name: creatorMap[athlete.user_id] || null,
      analyses_count: countsMap[athlete.id] || 0
    }));

    return parseAthletesFromDB(athletesWithCount);
  }

  /**
   * Busca um atleta por ID dentro do grupo permitido
   * @param {string} id
   * @param {string|string[]} userIdOrAllowed - userId único OU array de allowedUserIds
   */
  static async getById(id, userIdOrAllowed) {
    const ids = Array.isArray(userIdOrAllowed) ? userIdOrAllowed : [userIdOrAllowed];
    const { data, error } = await supabase
      .from('athletes')
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
