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
   *
   * Exige escopo (revisão final da spec 014, I6): a leitura filtra por
   * `account_user_id` E por `user_id` (quem gere a ficha) dentro de
   * `allowedUserIds`. Sem o segundo filtro, uma ficha gerida em OUTRO tenant
   * que apontasse `account_user_id` para uma conta deste tenant apareceria
   * como "a ficha dela" — o mesmo esquecimento que produziu os IDORs da spec
   * 006, agora falhando em vez de vazar.
   * @param {string[]} userIds - contas cujas fichas vinculadas se quer
   * @param {string[]} allowedUserIds - escopo de posse do chamador (`resolveScope`)
   * @returns {Promise<Array<{id: string, name: string, account_user_id: string}>>}
   */
  static async getLinkedAthletes(userIds, allowedUserIds) {
    const ids = requireScope(allowedUserIds, 'User.getLinkedAthletes');
    if (!userIds.length) return [];
    const { data, error } = await supabase
      .from('athletes')
      .select('id, name, account_user_id')
      .in('account_user_id', userIds)
      .in('user_id', ids);
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
   *
   * `select('*')`, não lista de colunas (revisão final da spec 014, C1): o
   * login é o primeiro caminho a rodar depois de um deploy, e nomear
   * `profile`/`must_change_password` fazia o PostgREST responder `42703`
   * (coluna inexistente) se o código subisse antes da migration 025 — o login
   * dava 500 para todo mundo. Com `*`, coluna ausente só chega `undefined`, e
   * os defaults de quem lê (`'atleta'`, `false`) valem. O objeto devolvido é
   * montado campo a campo, então nada além do que o login precisa sai daqui.
   * ⚠️ A ordem de deploy continua sendo "migration 025 antes do código" — isto
   * é rede de segurança, não licença para inverter.
   * @param {string} email - Email do usuário
   * @returns {Promise<{id: string, name: string, email: string, password_hash: string, role: string, is_active: boolean, token_version: number, profile?: string, must_change_password?: boolean, last_login: string|null, created_at: string}|null>} Usuário encontrado ou null
   */
  static async findByEmail(email) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }

    return {
      id: data.id,
      name: data.name,
      email: data.email,
      password_hash: data.password_hash,
      role: data.role,
      is_active: data.is_active,
      token_version: data.token_version,
      profile: data.profile,
      must_change_password: data.must_change_password,
      last_login: data.last_login,
      created_at: data.created_at,
    };
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
   *
   * `select('*')` pela mesma razão de `findByEmail` (revisão final da spec
   * 014, C1): nomear colunas novas faz o PostgREST responder `42703` antes da
   * migration 025, e o middleware inteiro passava a depender disso. O objeto
   * devolvido é montado explicitamente — **`password_hash` nunca entra nele**,
   * porque este valor vai para o cache em memória do middleware.
   *
   * Erros sobem com o `code` do PostgREST/Postgres intacto: o middleware usa
   * esse código para decidir entre 401 (`PGRST116`, conta não existe mais),
   * 503 (qualquer outro código) e o fallback do token (sem código — falha de
   * rede). Ver `middleware/auth.js`.
   * @param {string} userId
   * @returns {Promise<{role: string, is_active: boolean, token_version: number, profile?: string, must_change_password?: boolean}>}
   */
  static async getAuthInfo(userId) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return {
      role: data.role,
      is_active: data.is_active,
      token_version: data.token_version,
      profile: data.profile,
      must_change_password: data.must_change_password,
    };
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
   * `api_usage` é preservado (livro-caixa).
   *
   * Duas fases (revisão T10 r2, achado A): primeiro **coleta** todos os ids
   * envolvidos — só leitura, nenhuma escrita — dentro de um único
   * `run('collect', ...)`, para que uma leitura que falhe também carregue
   * `error.step`/`error.partial` (zerado, porque nada foi escrito ainda) em
   * vez de lançar cru. Só depois disso a purga escreve: transferências
   * (reassign + reparent), depois as exclusões, filhos antes de pais.
   *
   * Exceção (ruling do controller): uma ficha GERIDA pela conta
   * (`user_id = userId`) mas ainda VINCULADA a OUTRA conta viva e DENTRO DO
   * ESCOPO do chamador (`account_user_id` setado, diferente de `userId` e
   * presente em `allowedUserIds`) não é apagada — é REAPARENTADA (`user_id`
   * passa a ser o `account_user_id`), porque a ficha pertence à identidade
   * vinculada, não a quem a geria. Suas análises e versões de perfil migram
   * com ela. Uma ficha vinculada a uma conta FORA do escopo (achado C1) não
   * reparenta — ficaria fora do alcance de quem chamou — e cai no conjunto
   * de exclusão como qualquer outra ficha da conta.
   *
   * Segunda exceção (ruling do controller na revisão final da spec 014, I3 —
   * reversível pelo proprietário): uma `fight_analyses`/`profile_versions`
   * ESCRITA pela conta (`user_id = userId`) sobre uma pessoa que SOBREVIVE à
   * purga (ficha ou adversário do tenant fora do conjunto de exclusão — ex.:
   * o atleta autogerido que o professor excluído analisou) é TRANSFERIDA ao
   * gestor dessa pessoa (`user_id` da ficha/adversário), não apagada —
   * contada em `reassignedAnalyses`/`reassignedProfileVersions`. Linha cuja
   * pessoa vai ser apagada, ou não é encontrada no tenant, é apagada como
   * antes. A decisão é tomada inteira na coleta; a escrita acontece no passo
   * `reparent`, antes do reparent das fichas.
   *
   * Como a coleta roda ANTES do reparent (a escrita), uma análise/versão de
   * perfil de uma ficha-a-reparentar ainda aparece com `user_id = userId`
   * no momento da leitura "própria" — por isso essas linhas são excluídas
   * em JS (por `person_id`/`person_type`) da leitura "própria" antes de
   * formar os conjuntos de exclusão, em vez de depender de uma segunda
   * leitura pós-escrita.
   *
   * O reparent escreve filhos (`fight_analyses`, `profile_versions`) antes
   * da ficha (achado H1, revisão T10 r3) — só assim uma retentativa após
   * falha parcial é segura: enquanto a ficha ainda estiver com
   * `user_id = userId`, ela volta a aparecer em `managedRows` na próxima
   * chamada, e a releitura dos filhos (já migrados ou não) decide de novo o
   * que falta. Na ordem inversa, uma ficha já reparentada mas com filhos
   * pendentes "desapareceria" de `managedRows`, e esses filhos seriam lidos
   * como se ainda fossem da conta apagada.
   *
   * Exige que `userId` esteja dentro do próprio `allowedUserIds` (achado 1)
   * — sem isto, um chamador poderia apagar a conta de outro tenant só por
   * controlar o escopo passado.
   * @param {string} userId
   * @param {string[]} allowedUserIds escopo do admin (o tenant)
   * @returns {Promise<{athletes: number, opponents: number, fightAnalyses: number, analysisVersions: number, profileVersions: number, tacticalAnalyses: number, chatSessions: number, reparentedAthletes: number, reassignedAnalyses: number, reassignedProfileVersions: number}>}
   */
  static async purgeAccount(userId, allowedUserIds) {
    const ids = requireScope(allowedUserIds, 'User.purgeAccount');
    if (!ids.includes(userId)) {
      /** @type {Error & {code: string}} */
      const e = Object.assign(new Error('Usuário fora do escopo do chamador'), { code: 'NOT_FOUND' });
      throw e;
    }

    const counts = { athletes: 0, opponents: 0, fightAnalyses: 0, analysisVersions: 0, profileVersions: 0, tacticalAnalyses: 0, chatSessions: 0, reparentedAthletes: 0, reassignedAnalyses: 0, reassignedProfileVersions: 0 };
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

    /** @type {Array<{id: string, account_user_id?: string, fightAnalysisIds: string[]}>} */
    let toReparent = [];
    /** @type {Array<{id: string, newOwner: string}>} */
    let reassignFA = [];
    /** @type {Array<{id: string, newOwner: string}>} */
    let reassignPV = [];
    /** @type {string[]} */
    let athleteIds = [];
    /** @type {string[]} */
    let opponentIds = [];
    /** @type {string[]} */
    let analysisIds = [];
    /** @type {string[]} */
    let profileVersionIds = [];

    // FASE 1 — coleta (só leitura; sem `.neq` no fake, filtra em JS).
    await run('collect', async () => {
      // fichas GERIDAS pela conta, separando as que continuam VINCULADAS a
      // outra conta viva E dentro do escopo do chamador (achado C1) — essas
      // reparentam; as demais (sem vínculo, vinculadas à própria conta, ou
      // vinculadas a alguém fora do escopo) entram no conjunto de exclusão.
      const rManaged = await supabase.from('athletes').select('id, account_user_id').eq('user_id', userId);
      if (rManaged.error) throw rManaged.error;
      const managedRows = rManaged.data || [];
      const isReparentable = (/** @type {{account_user_id?: string}} */ a) =>
        Boolean(a.account_user_id) && a.account_user_id !== userId && ids.includes(a.account_user_id);
      const reparentCandidates = managedRows.filter(isReparentable);
      const reparentAthleteIds = reparentCandidates.map((a) => a.id);
      const ownAthleteIds = managedRows.filter((a) => !isReparentable(a)).map((a) => a.id);

      // achado H1 (revisão T10 r3): lê os fight_analyses de cada ficha a
      // reparentar AQUI (fase de leitura), para a fase de escrita não
      // precisar ler nada — condição para retomar uma retentativa parcial
      // sem se importar com o que já migrou (ver JSDoc da fase de escrita).
      toReparent = [];
      for (const row of reparentCandidates) {
        const rFA = await supabase.from('fight_analyses').select('id').eq('person_id', row.id).eq('person_type', 'athlete').in('user_id', ids);
        if (rFA.error) throw rFA.error;
        toReparent.push({ ...row, fightAnalysisIds: (rFA.data || []).map((f) => f.id) });
      }

      // fichas vinculadas à conta (geridas por qualquer um do tenant)
      const rLinked = await supabase.from('athletes').select('id').eq('account_user_id', userId).in('user_id', ids);
      if (rLinked.error) throw rLinked.error;
      athleteIds = [...new Set([...ownAthleteIds, ...(rLinked.data || []).map((a) => a.id)])];

      // adversários geridos pela conta (achado 4) — sem conceito de
      // "vínculo" como o de athletes, então não há reparenting aqui.
      const rOpp = await supabase.from('opponents').select('id').eq('user_id', userId);
      if (rOpp.error) throw rOpp.error;
      opponentIds = (rOpp.data || []).map((o) => o.id);

      // Linhas "próprias" (escritas pela conta) de fight_analyses e
      // profile_versions, excluindo as de fichas que vão reparentar (ver
      // JSDoc) — essas migram com a ficha no passo de reparent.
      const rOwnFA = await supabase.from('fight_analyses').select('id, person_id, person_type').eq('user_id', userId);
      if (rOwnFA.error) throw rOwnFA.error;
      const ownFA = (rOwnFA.data || []).filter(
        (f) => !(f.person_type === 'athlete' && reparentAthleteIds.includes(f.person_id))
      );
      const rOwnPV = await supabase.from('profile_versions').select('id, person_id, person_type').eq('user_id', userId);
      if (rOwnPV.error) throw rOwnPV.error;
      const ownPV = (rOwnPV.data || []).filter(
        (p) => !(p.person_type === 'athlete' && reparentAthleteIds.includes(p.person_id))
      );

      // I3 (revisão final da spec 014 — ruling do controller, reversível pelo
      // proprietário): uma linha própria cuja PESSOA sobrevive à purga (ficha
      // ou adversário do tenant fora do conjunto de exclusão — ex.: atleta
      // autogerido analisado pelo professor excluído) é TRANSFERIDA ao gestor
      // dessa pessoa (`user_id` da ficha/adversário), espelhando o reparent.
      // Pessoa no conjunto de exclusão, ou que não se acha no tenant (id
      // inexistente, de outro tenant, `person_type` desconhecido), continua
      // sendo apagada. Tudo decidido aqui, na leitura; a escrita só aplica.
      const deletedPersons = new Set([
        ...athleteIds.map((id) => `athlete:${id}`),
        ...opponentIds.map((id) => `opponent:${id}`),
      ]);
      const personKey = (/** @type {{person_type: string, person_id: string}} */ r) => `${r.person_type}:${r.person_id}`;
      const maybeSurvivors = [...ownFA, ...ownPV].filter((r) => !deletedPersons.has(personKey(r)));
      /** @type {Map<string, string>} chave `tipo:id` da pessoa → `user_id` do gestor */
      const survivorOwner = new Map();
      for (const [personType, table] of /** @type {const} */ ([['athlete', 'athletes'], ['opponent', 'opponents']])) {
        const personIds = [...new Set(maybeSurvivors.filter((r) => r.person_type === personType).map((r) => r.person_id))];
        if (!personIds.length) continue;
        const r = await supabase.from(table).select('id, user_id').in('id', personIds).in('user_id', ids);
        if (r.error) throw r.error;
        for (const person of r.data || []) {
          // defensivo: uma pessoa gerida pela própria conta ou já está no
          // conjunto de exclusão ou no de reparent — nunca é "sobrevivente".
          if (person.user_id !== userId) survivorOwner.set(`${personType}:${person.id}`, person.user_id);
        }
      }
      const ownerOf = (/** @type {{person_type: string, person_id: string}} */ r) => survivorOwner.get(personKey(r));
      reassignFA = ownFA.filter((f) => ownerOf(f)).map((f) => ({ id: f.id, newOwner: /** @type {string} */ (ownerOf(f)) }));
      reassignPV = ownPV.filter((p) => ownerOf(p)).map((p) => ({ id: p.id, newOwner: /** @type {string} */ (ownerOf(p)) }));
      const ownFAToDelete = ownFA.filter((f) => !ownerOf(f));
      const ownPVToDelete = ownPV.filter((p) => !ownerOf(p));

      // fight_analyses a apagar: próprias sem pessoa sobrevivente + das
      // fichas/adversários da conta (mesmo que criadas por outro do tenant).
      let athleteFA = [];
      if (athleteIds.length) {
        const r = await supabase.from('fight_analyses').select('id').in('person_id', athleteIds).eq('person_type', 'athlete').in('user_id', ids);
        if (r.error) throw r.error;
        athleteFA = r.data || [];
      }
      let opponentFA = [];
      if (opponentIds.length) {
        const r = await supabase.from('fight_analyses').select('id').in('person_id', opponentIds).eq('person_type', 'opponent').in('user_id', ids);
        if (r.error) throw r.error;
        opponentFA = r.data || [];
      }
      analysisIds = [...new Set([...ownFAToDelete, ...athleteFA, ...opponentFA].map((f) => f.id))];

      // profile_versions a apagar: mesma regra, deduplicadas por id — uma
      // linha pode casar em mais de um dos três filtros.
      let athletePV = [];
      if (athleteIds.length) {
        // achado H2 (revisão T10 r3): mesma restrição de escopo do
        // equivalente em fight_analyses (athleteFA), por consistência.
        const r = await supabase.from('profile_versions').select('id').in('person_id', athleteIds).eq('person_type', 'athlete').in('user_id', ids);
        if (r.error) throw r.error;
        athletePV = r.data || [];
      }
      let opponentPV = [];
      if (opponentIds.length) {
        const r = await supabase.from('profile_versions').select('id').in('person_id', opponentIds).eq('person_type', 'opponent').in('user_id', ids);
        if (r.error) throw r.error;
        opponentPV = r.data || [];
      }
      profileVersionIds = [...new Set([...ownPVToDelete, ...athletePV, ...opponentPV].map((p) => p.id))];
    });

    /**
     * Agrupa `{id, newOwner}` por dono, para uma escrita por dono.
     * @param {Array<{id: string, newOwner: string}>} rows
     * @returns {Map<string, string[]>}
     */
    const byOwner = (rows) => {
      /** @type {Map<string, string[]>} */
      const m = new Map();
      for (const r of rows) m.set(r.newOwner, [...(m.get(r.newOwner) || []), r.id]);
      return m;
    };

    // FASE 2 — escreve: transferências primeiro (reassign + reparent), depois
    // as exclusões (filhos antes de pais).
    if (toReparent.length || reassignFA.length || reassignPV.length) {
      await run('reparent', async () => {
        // I3: filhos cujo pai sobrevive só trocam de dono. `.eq('user_id',
        // userId)` torna a escrita idempotente numa retentativa — uma linha
        // já transferida não casa mais, e também já não aparece na leitura
        // "própria" da coleta seguinte.
        for (const [newOwner, faIds] of byOwner(reassignFA)) {
          const { data, error } = await supabase.from('fight_analyses').update({ user_id: newOwner }).in('id', faIds).eq('user_id', userId).select('id');
          if (error) throw error;
          counts.reassignedAnalyses += (data || []).length;
        }
        for (const [newOwner, pvIds] of byOwner(reassignPV)) {
          const { data, error } = await supabase.from('profile_versions').update({ user_id: newOwner }).in('id', pvIds).eq('user_id', userId).select('id');
          if (error) throw error;
          counts.reassignedProfileVersions += (data || []).length;
        }
        for (const row of toReparent) {
          const newOwner = row.account_user_id;
          // achado H1 (revisão T10 r3): filhos primeiro, ficha por último —
          // seguro para retentativa. Se a escrita falhar depois de migrar os
          // filhos mas antes da ficha, o `user_id` da ficha continua sendo o
          // `userId` original: a próxima chamada volta a encontrá-la em
          // `managedRows` e a reidentifica como candidata a reparent: a
          // releitura de `fight_analyses`/`profile_versions` (fase de
          // coleta) já os encontra com `user_id = newOwner` (dentro do
          // escopo) e reescreve o mesmo valor — idempotente. Na ordem
          // inversa (ficha primeiro), uma falha nos filhos os deixaria
          // `user_id = userId` órfãos: a ficha já não estaria em
          // `managedRows` na retentativa, e esses filhos cairiam na leitura
          // "própria" como se ainda fossem da conta apagada.
          if (row.fightAnalysisIds.length) {
            const { error: fUpErr } = await supabase.from('fight_analyses').update({ user_id: newOwner }).in('id', row.fightAnalysisIds);
            if (fUpErr) throw fUpErr;
          }
          const { error: pvUpErr } = await supabase.from('profile_versions').update({ user_id: newOwner }).eq('person_id', row.id).eq('person_type', 'athlete').in('user_id', ids);
          if (pvUpErr) throw pvUpErr;
          // M6: `.in('user_id', ids)` — defesa em profundidade; a ficha foi
          // lida com `user_id = userId`, que está no escopo por construção.
          const { error: upErr } = await supabase.from('athletes').update({ user_id: newOwner }).eq('id', row.id).in('user_id', ids);
          if (upErr) throw upErr;
          counts.reparentedAthletes += 1;
        }
      });
    }

    await run('chatSessions', async () => { counts.chatSessions = await del('ai_chat_sessions', (q) => q.eq('user_id', userId)); });
    await run('tacticalAnalyses', async () => { counts.tacticalAnalyses = await del('tactical_analyses', (q) => q.eq('user_id', userId)); });
    if (analysisIds.length) {
      await run('analysisVersions', async () => { counts.analysisVersions = await del('analysis_versions', (q) => q.in('analysis_id', analysisIds)); });
    }
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
