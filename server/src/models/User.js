// @ts-check
const { supabase } = require('../config/supabase');
const bcrypt = require('bcrypt');
const { requireScope } = require('../utils/scopeGuard');

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
   * @param {Object} userData
   * @param {string} userData.name
   * @param {string} userData.email
   * @param {string} userData.password
   * @param {string} [userData.profile] - perfil profissional (spec 014); default 'atleta'
   * @param {string} [userData.role] - 'admin' ou 'user'; default 'user'
   * @param {boolean} [userData.mustChangePassword] - default true
   * @param {string} adminId - ID do admin que está criando
   * @returns {Promise<Object>} Usuário criado
   */
  static async createSubUser({ name, email, password, profile = 'atleta', role = 'user', mustChangePassword = true }, adminId) {
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
          role,
          profile,
          must_change_password: mustChangePassword,
          is_active: true,
          created_by: adminId,
          tenant_id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select('id, name, email, role, profile, must_change_password, is_active, created_by, tenant_id, created_at')
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
        .select('id, name, email, role, profile, must_change_password, is_active, created_by, tenant_id, last_login, created_at')
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
   * Conta admins ativos de um tenant — usado pela regra do último admin
   * (spec 014, R9): não é possível rebaixar/desativar o único admin ativo.
   * @param {string} tenantId
   * @returns {Promise<number>}
   */
  static async countActiveAdmins(tenantId) {
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('role', 'admin')
      .eq('is_active', true);
    if (error) throw error;
    return (data || []).length;
  }

  /**
   * Fichas de atleta vinculadas a um conjunto de contas (spec 014, R6).
   * @param {string[]} userIds
   * @returns {Promise<Array<{id: string, name: string, account_user_id: string}>>}
   */
  static async getLinkedAthletes(userIds) {
    if (!userIds.length) return [];
    const { data, error } = await supabase
      .from('athletes')
      .select('id, name, account_user_id')
      .in('account_user_id', userIds);
    if (error) throw error;
    return data || [];
  }

  /**
   * Vincula (ou desvincula, com `athleteId = null`) uma ficha de atleta à
   * conta de usuário (spec 014, R6). Uma ficha só pode estar vinculada a uma
   * conta por vez; vincular uma nova solta a anterior desta mesma conta.
   *
   * Exige escopo nas DUAS pontas (spec 014, revisão T8 — achado 1): o
   * controller já valida `userId` via `assertSameTenant`, mas este método é
   * chamado diretamente por outro código (ex.: `createUser` linkando a ficha
   * recém-criada) e não pode depender de um caminho de chamada específico
   * para não vazar. Toda escrita em `athletes` carrega `.in('user_id',
   * allowedUserIds)`, e `userId` é conferido contra o escopo antes de
   * qualquer leitura/escrita.
   * @param {string} userId - conta a vincular/desvincular
   * @param {string|null} athleteId - ficha a vincular, ou `null` para desvincular a atual
   * @param {string[]} allowedUserIds - escopo de posse do admin que chama (deve conter `userId` e a ficha)
   * @returns {Promise<'linked'|'unlinked'>}
   */
  static async linkAthlete(userId, athleteId, allowedUserIds) {
    const ids = requireScope(allowedUserIds, 'User.linkAthlete');

    if (!ids.includes(userId)) {
      /** @type {Error & {code: string}} */
      const e = Object.assign(new Error('Usuário fora do escopo do chamador'), { code: 'NOT_FOUND' });
      throw e;
    }

    if (athleteId === null) {
      const { error } = await supabase
        .from('athletes')
        .update({ account_user_id: null })
        .eq('account_user_id', userId)
        .in('user_id', ids);
      if (error) throw error;
      return 'unlinked';
    }

    const { data: rows, error } = await supabase
      .from('athletes')
      .select('id, user_id, account_user_id')
      .eq('id', athleteId)
      .in('user_id', ids);
    if (error) throw error;

    const athlete = rows && rows[0];
    if (!athlete) {
      /** @type {Error & {code: string}} */
      const e = Object.assign(new Error('Ficha não encontrada'), { code: 'NOT_FOUND' });
      throw e;
    }
    // Já vinculada a esta mesma conta: no-op idempotente — não repete a
    // sequência solta-e-prende (spec 014, revisão T8 — achado 2: um erro no
    // meio dela deixaria a conta sem ficha).
    if (athlete.account_user_id === userId) {
      return 'linked';
    }
    if (athlete.account_user_id) {
      /** @type {Error & {code: string}} */
      const e = Object.assign(new Error('Ficha já vinculada a outra conta'), { code: 'CONFLICT' });
      throw e;
    }

    // Uma ficha por conta: solta a anterior desta conta antes de prender a nova.
    // Erro checado (achado 2): sem isso, uma falha aqui era engolida e a
    // escrita seguinte podia bater na constraint `athletes_account_user_id_key`
    // como um 500 cru, com a causa original perdida.
    const { error: releaseErr } = await supabase
      .from('athletes')
      .update({ account_user_id: null })
      .eq('account_user_id', userId)
      .in('user_id', ids);
    if (releaseErr) throw releaseErr;

    const { error: upErr } = await supabase
      .from('athletes')
      .update({ account_user_id: userId })
      .eq('id', athleteId)
      .in('user_id', ids);
    if (upErr) throw upErr;
    return 'linked';
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
        .select('id, name, email, password_hash, role, is_active, token_version, profile, must_change_password, last_login, created_at')
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
   * Retorna apenas o hash de senha do usuário — usado por `changePassword`
   * para verificar a senha atual sem trazer o restante da linha.
   * @param {string} userId
   * @returns {Promise<string|null>}
   */
  static async getPasswordHash(userId) {
    const { data, error } = await supabase
      .from('users')
      .select('password_hash')
      .eq('id', userId)
      .single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data.password_hash;
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
   * Retorna dados de autenticação do usuário (role, is_active, token_version,
   * profile, must_change_password).
   * Usado pelo middleware para validar sessões sem confiar apenas no JWT.
   * @param {string} userId
   * @returns {Promise<{role: string, is_active: boolean, token_version: number, profile: string, must_change_password: boolean}>}
   */
  static async getAuthInfo(userId) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('role, is_active, token_version, profile, must_change_password')
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

      // `?? 1`, não `|| 1`: token_version=0 é um valor válido (ver fixtures da
      // spec 014) e `||` o trataria como "ausente", incrementando em dobro na
      // primeira invalidação.
      const { error } = await supabase
        .from('users')
        .update({
          token_version: (current?.token_version ?? 1) + 1,
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
   * Apaga TUDO de uma conta (spec 014, R-13): fichas geridas ou vinculadas,
   * análises e versões dessas fichas e dos adversários da conta,
   * estratégias, chats e adversários criados pela conta, e a própria conta.
   * `api_usage` é preservado (livro-caixa). Ordem: filhos antes dos pais,
   * para um erro no meio deixar estado consistente (`error.step`/`.partial`).
   *
   * Exceção (revisão T10, ruling do controller): uma ficha GERIDA pela conta
   * (`user_id = userId`) mas ainda VINCULADA a OUTRA conta viva
   * (`account_user_id` setado e diferente de `userId`) não é apagada — é
   * REAPARENTADA (`user_id` passa a ser o `account_user_id`), porque a ficha
   * pertence à identidade vinculada, não a quem a geria. Suas análises e
   * versões de perfil migram com ela. Isto roda ANTES de coletar
   * `athleteIds`, para excluir essas fichas e análises das exclusões.
   *
   * Exige que `userId` esteja dentro do próprio `allowedUserIds` (achado 1,
   * revisão T10) — sem isto, um chamador poderia apagar a conta de outro
   * tenant só por controlar o escopo passado.
   * @param {string} userId
   * @param {string[]} allowedUserIds escopo do admin (o tenant)
   * @returns {Promise<{athletes: number, opponents: number, fightAnalyses: number, analysisVersions: number, profileVersions: number, tacticalAnalyses: number, chatSessions: number, reparentedAthletes: number}>}
   */
  static async purgeAccount(userId, allowedUserIds) {
    const ids = requireScope(allowedUserIds, 'User.purgeAccount');
    if (!ids.includes(userId)) {
      /** @type {Error & {code: string}} */
      const e = Object.assign(new Error('Usuário fora do escopo do chamador'), { code: 'NOT_FOUND' });
      throw e;
    }

    const counts = { athletes: 0, opponents: 0, fightAnalyses: 0, analysisVersions: 0, profileVersions: 0, tacticalAnalyses: 0, chatSessions: 0, reparentedAthletes: 0 };
    /**
     * @param {string} label
     * @param {() => Promise<void>} fn
     */
    const run = async (label, fn) => {
      try {
        return await fn();
      } catch (e) {
        /** @type {Error & {step?: string, partial?: typeof counts}} */
        const err = e;
        err.partial = { ...counts };
        err.step = label;
        throw err;
      }
    };
    /**
     * @param {string} table
     * @param {(q: any) => any} apply
     * @returns {Promise<number>}
     */
    const del = async (table, apply) => {
      const q = apply(supabase.from(table).delete());
      const { data, error } = await q.select();
      if (error) throw error;
      return (data || []).length;
    };

    // 0. fichas GERIDAS pela conta, separando as que continuam VINCULADAS a
    // outra conta viva — essas reparentam em vez de apagar (ver JSDoc acima).
    // Sem `.neq` no fake: filtra em JS.
    const { data: managedRows, error: eManaged } = await supabase.from('athletes').select('id, account_user_id').eq('user_id', userId);
    if (eManaged) throw eManaged;
    const isLinkedElsewhere = (/** @type {{account_user_id?: string}} */ a) => Boolean(a.account_user_id) && a.account_user_id !== userId;
    const toReparent = (managedRows || []).filter(isLinkedElsewhere);
    const ownAthleteIds = (managedRows || []).filter((a) => !isLinkedElsewhere(a)).map((a) => a.id);

    if (toReparent.length) {
      await run('reparentAthletes', async () => {
        for (const row of toReparent) {
          const newOwner = row.account_user_id;
          const { error: upErr } = await supabase.from('athletes').update({ user_id: newOwner }).eq('id', row.id);
          if (upErr) throw upErr;
          const { data: fRows, error: fErr } = await supabase.from('fight_analyses').select('id').eq('person_id', row.id).eq('person_type', 'athlete');
          if (fErr) throw fErr;
          if (fRows && fRows.length) {
            const { error: fUpErr } = await supabase.from('fight_analyses').update({ user_id: newOwner }).in('id', fRows.map((f) => f.id));
            if (fUpErr) throw fUpErr;
          }
          const { error: pvUpErr } = await supabase.from('profile_versions').update({ user_id: newOwner }).eq('person_id', row.id).eq('person_type', 'athlete');
          if (pvUpErr) throw pvUpErr;
          counts.reparentedAthletes += 1;
        }
      });
    }

    // 1. fichas: as que restaram geridas pela conta (sem vínculo a outra
    // conta) OU vinculadas à conta (só dentro do tenant)
    const { data: a2, error: e2 } = await supabase.from('athletes').select('id').eq('account_user_id', userId).in('user_id', ids);
    if (e2) throw e2;
    const athleteIds = [...new Set([...ownAthleteIds, ...(a2 || []).map((a) => a.id)])];

    // 1b. adversários geridos pela conta (achado 4, revisão T10 — o lado do
    // adversário também precisa cair na purga; sem conceito de "vínculo"
    // como o de athletes, então não há reparenting aqui).
    const { data: oppRows, error: eOpp } = await supabase.from('opponents').select('id').eq('user_id', userId);
    if (eOpp) throw eOpp;
    const opponentIds = (oppRows || []).map((o) => o.id);

    // 2. análises da conta + análises das fichas/adversários da conta (mesmo
    // que criadas por outro do tenant)
    const { data: f1, error: e3 } = await supabase.from('fight_analyses').select('id').eq('user_id', userId);
    if (e3) throw e3;
    let f2 = [];
    if (athleteIds.length) {
      const r = await supabase.from('fight_analyses').select('id').in('person_id', athleteIds).eq('person_type', 'athlete').in('user_id', ids);
      if (r.error) throw r.error;
      f2 = r.data || [];
    }
    let f3 = [];
    if (opponentIds.length) {
      const r = await supabase.from('fight_analyses').select('id').in('person_id', opponentIds).eq('person_type', 'opponent').in('user_id', ids);
      if (r.error) throw r.error;
      f3 = r.data || [];
    }
    const analysisIds = [...new Set([...(f1 || []), ...f2, ...f3].map((f) => f.id))];

    await run('chatSessions', async () => { counts.chatSessions = await del('ai_chat_sessions', (q) => q.eq('user_id', userId)); });
    await run('tacticalAnalyses', async () => { counts.tacticalAnalyses = await del('tactical_analyses', (q) => q.eq('user_id', userId)); });
    if (analysisIds.length) {
      await run('analysisVersions', async () => { counts.analysisVersions = await del('analysis_versions', (q) => q.in('analysis_id', analysisIds)); });
    }

    // 3. profile_versions: da conta + das fichas/adversários da conta
    // (achado 4), deduplicadas por id — uma linha pode casar em mais de um
    // dos três filtros.
    const { data: pv1, error: ePv1 } = await supabase.from('profile_versions').select('id').eq('user_id', userId);
    if (ePv1) throw ePv1;
    let pv2 = [];
    if (athleteIds.length) {
      const r = await supabase.from('profile_versions').select('id').in('person_id', athleteIds).eq('person_type', 'athlete');
      if (r.error) throw r.error;
      pv2 = r.data || [];
    }
    let pv3 = [];
    if (opponentIds.length) {
      const r = await supabase.from('profile_versions').select('id').in('person_id', opponentIds).eq('person_type', 'opponent');
      if (r.error) throw r.error;
      pv3 = r.data || [];
    }
    const profileVersionIds = [...new Set([...(pv1 || []), ...pv2, ...pv3].map((p) => p.id))];
    if (profileVersionIds.length) {
      await run('profileVersions', async () => { counts.profileVersions = await del('profile_versions', (q) => q.in('id', profileVersionIds)); });
    }

    if (analysisIds.length) {
      await run('fightAnalyses', async () => { counts.fightAnalyses = await del('fight_analyses', (q) => q.in('id', analysisIds)); });
    }
    if (athleteIds.length) {
      await run('athletes', async () => { counts.athletes = await del('athletes', (q) => q.in('id', athleteIds)); });
    }
    await run('opponents', async () => { counts.opponents = await del('opponents', (q) => q.eq('user_id', userId)); });
    await run('user', async () => {
      await User.invalidateTokens(userId);
      const { error } = await supabase.from('users').delete().eq('id', userId);
      if (error) throw error;
    });
    return counts;
  }
}

module.exports = User;
