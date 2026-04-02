const { supabase } = require('../config/supabase');
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
        .select('id, name, email, role, is_active, created_at')
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
        .select('id, name, email, password_hash, role, is_active, last_login, created_at')
        .eq('email', email.toLowerCase().trim())
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
   * Deleta um usuário
   * @param {string} userId - ID do usuário
   * @returns {Promise<boolean>} True se deletado com sucesso
   */
  /**
   * Desativa um usuário (soft delete — nunca apaga dados)
   * @param {string} userId - ID do usuário a desativar
   * @returns {Promise<boolean>}
   */
  static async deactivate(userId) {
    try {
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
   * Reativa um usuário desativado
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
}

module.exports = User;
