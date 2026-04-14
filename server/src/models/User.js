const { supabase, supabaseAdmin } = require('../config/supabase');
const bcrypt = require('bcrypt');

class User {
  /**
   * Cria um novo usuário
   * @param {Object} userData - Dados do usuário (name, email, password)
   * @returns {Promise<Object>} Usuário criado
   */
  static async create({ name, email, password }) {
    try {
      const saltRounds = 10;
      const password_hash = await bcrypt.hash(password, saltRounds);

      const { data, error } = await supabase
        .from('users')
        .insert([
          {
            name,
            email: email.toLowerCase().trim(),
            password_hash,
            role: 'user',
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
            // tenant_id será definido após o insert (self-reference)
          }
        ])
        .select('id, name, email, role, is_active, token_version, created_at')
        .single();

      if (error) {
        throw error;
      }

      // Auto-assign tenant_id = próprio id (usuário raiz do seu ecossistema)
      await supabase.from('users').update({ tenant_id: data.id }).eq('id', data.id);

      return data;
    } catch (error) {
      console.error('❌ Erro no User.create:', error);
      throw error;
    }
  }

  /**
   * Cria um sub-usuário (apenas admin pode chamar este método)
   * @param {Object} userData - { name, email, password }
   * @param {string} adminId - ID do admin que está criando
   * @returns {Promise<Object>} Usuário criado
   */
  static async createSubUser({ name, email, password }, adminId) {
    try {
      // Inherit tenant_id from the creator (ensures group membership even for sub-admins)
      const { data: creator, error: creatorError } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('id', adminId)
        .single();
      if (creatorError) throw creatorError;
      const tenant_id = creator.tenant_id || adminId;

      const saltRounds = 10;
      const password_hash = await bcrypt.hash(password, saltRounds);

      const { data, error } = await supabase
        .from('users')
        .insert([{
          name,
          email: email.toLowerCase().trim(),
          password_hash,
          role: 'user',
          is_active: true,
          created_by: adminId,
          tenant_id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select('id, name, email, role, is_active, created_by, tenant_id, created_at')
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('❌ Erro no User.createSubUser:', error);
      throw error;
    }
  }

  /**
   * Retorna o tenant_id do usuário (root do grupo ao qual pertence)
   * @param {string} userId
   * @returns {Promise<string>}
   */
  static async getTenantId(userId) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('id', userId)
        .single();
      if (error) throw error;
      return data.tenant_id;
    } catch (error) {
      console.error('❌ Erro no User.getTenantId:', error);
      throw error;
    }
  }

  /**
   * Retorna todos os IDs do grupo (mesmo tenant_id).
   * Funciona para múltiplos admins dentro do mesmo grupo.
   * @param {string} userId
   * @returns {Promise<string[]>}
   */
  static async getGroupUserIds(userId) {
    try {
      const tenantId = await User.getTenantId(userId);
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('tenant_id', tenantId);
      // Não filtra is_active: dados de usuários desativados continuam visíveis ao grupo
      if (error) throw error;
      return (data || []).map(u => u.id);
    } catch (error) {
      console.error('❌ Erro no User.getGroupUserIds:', error);
      throw error;
    }
  }

  /**
   * Lista todos os usuários do mesmo grupo (tenant)
   * @param {string} userId - qualquer usuário do grupo (admin ou não)
   * @returns {Promise<Array>}
   */
  static async getAll(userId) {
    try {
      const tenantId = await User.getTenantId(userId);
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email, role, is_active, created_by, tenant_id, last_login, created_at')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('❌ Erro no User.getAll:', error);
      throw error;
    }
  }

  /**
   * Busca usuário por email
   * @param {string} email - Email do usuário
   * @returns {Promise<Object|null>} Usuário encontrado ou null
   */
  static async findByEmail(email) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email, password_hash, role, is_active, token_version, last_login, created_at')
        .eq('email', email.toLowerCase().trim())
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Busca usuário por ID
   * @param {string} userId - ID do usuário
   * @returns {Promise<Object|null>} Usuário encontrado ou null
   */
  static async findById(userId) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email, role, is_active, last_login, created_at')
        .eq('id', userId)
        .eq('is_active', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Verifica se a senha está correta
   * @param {string} password - Senha em texto plano
   * @param {string} hash - Hash armazenado no banco
   * @returns {Promise<boolean>} True se a senha está correta
   */
  static async verifyPassword(password, hash) {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      return false;
    }
  }

  /**
   * Atualiza o último login do usuário
   * @param {string} userId - ID do usuário
   * @returns {Promise<Object>} Usuário atualizado
   */
  static async updateLastLogin(userId) {
    try {
      const { data, error } = await supabase
        .from('users')
        .update({
          last_login: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Atualiza dados do usuário
   * @param {string} userId - ID do usuário
   * @param {Object} updates - Campos a atualizar
   * @returns {Promise<Object>} Usuário atualizado
   */
  static async update(userId, updates) {
    try {
      // Se estiver atualizando a senha, fazer hash
      if (updates.password) {
        const saltRounds = 10;
        updates.password_hash = await bcrypt.hash(updates.password, saltRounds);
        delete updates.password;
      }

      updates.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Desativa um usuário (soft delete — nunca apaga dados).
   * Incrementa token_version para invalidar sessões ativas imediatamente.
   * @param {string} userId - ID do usuário a desativar
   * @returns {Promise<boolean>}
   */
  static async deactivate(userId) {
    try {
      await User.invalidateTokens(userId);
      const { error } = await supabase
        .from('users')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (error) throw error;
      return true;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Reativa um usuário desativado.
   * @param {string} userId
   */
  static async reactivate(userId) {
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_active: true, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (error) throw error;
      return true;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Retorna dados de autenticação do usuário (role, is_active, token_version).
   * Usado pelo middleware para validar sessões sem confiar apenas no JWT.
   * @param {string} userId
   * @returns {Promise<{role: string, is_active: boolean, token_version: number}>}
   */
  static async getAuthInfo(userId) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('role, is_active, token_version')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('❌ Erro no User.getAuthInfo:', error);
      throw error;
    }
  }

  /**
   * Incrementa token_version, invalidando todos os JWTs emitidos anteriormente.
   * Chame após mudança de role ou desativação de usuário.
   * @param {string} userId
   */
  static async invalidateTokens(userId) {
    try {
      // Buscar versão atual e incrementar (Supabase JS não tem .raw() para SQL expressions)
      const { data: current, error: fetchError } = await supabase
        .from('users')
        .select('token_version')
        .eq('id', userId)
        .single();

      if (fetchError) throw fetchError;

      const { error } = await supabase
        .from('users')
        .update({
          token_version: (current?.token_version || 1) + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('❌ Erro no User.invalidateTokens:', error);
      throw error;
    }
  }

  /**
   * Transfere todos os dados de um usuário para outro antes de excluí-lo.
   * Tabelas afetadas: athletes, opponents, fight_analyses, tactical_analyses.
   * Chat sessions e api_usage NÃO são transferidos (descartados com o usuário).
   * @param {string} fromUserId
   * @param {string} toUserId
   */
  static async transferData(fromUserId, toUserId) {
    const tables = ['athletes', 'opponents', 'fight_analyses', 'tactical_analyses'];
    for (const table of tables) {
      const { error } = await supabaseAdmin
        .from(table)
        .update({ user_id: toUserId })
        .eq('user_id', fromUserId);
      if (error) {
        console.error(`❌ Erro ao transferir ${table}:`, error);
        throw error;
      }
    }
  }

  /**
   * Exclui todos os dados de um usuário (athletes, opponents, fight_analyses, tactical_analyses).
   * Chamado quando o admin opta por não transferir os dados antes de excluir o usuário.
   * @param {string} userId
   */
  static async deleteAllData(userId) {
    const tables = ['fight_analyses', 'tactical_analyses', 'athletes', 'opponents'];
    for (const table of tables) {
      const { error } = await supabaseAdmin
        .from(table)
        .delete()
        .eq('user_id', userId);
      if (error) {
        console.error(`❌ Erro ao excluir dados de ${table}:`, error);
        throw error;
      }
    }
  }

  /**
   * Remove permanentemente um usuário do sistema (hard delete).
   * @param {string} userId
   */
  static async hardDelete(userId) {
    try {
      await User.invalidateTokens(userId);
      const { error } = await supabaseAdmin
        .from('users')
        .delete()
        .eq('id', userId);

      if (error) throw error;
      return true;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = User;
