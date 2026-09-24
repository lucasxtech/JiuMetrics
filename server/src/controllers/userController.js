const User = require('../models/User');
const Athlete = require('../models/Athlete');
const { handleError } = require('../utils/errorHandler');
const { evictAuthCache } = require('../middleware/auth');
const { supabase } = require('../config/supabase');
const { resolveScope } = require('../services/authorization');

/**
 * Garante que o usuário alvo pertence ao mesmo tenant do solicitante.
 * Usa uma única query para buscar os dois tenant_ids de forma eficiente.
 * Retorna o usuário alvo ou lança erro 404 — nunca 403, para não vazar a
 * existência de um usuário de outro tenant (spec 014).
 */
async function assertSameTenant(targetId, requesterId, res) {
  const { data, error } = await supabase
    .from('users')
    .select('id, tenant_id')
    .in('id', [targetId, requesterId]);

  if (error) throw error;

  const requester = data?.find(u => u.id === requesterId);
  const target = data?.find(u => u.id === targetId);

  if (!target || !requester || requester.tenant_id !== target.tenant_id) {
    res.status(404).json({ error: 'Usuário não encontrado.' });
    return false;
  }
  return true;
}

/**
 * Formata um usuário para a resposta pública, com a ficha de atleta
 * vinculada (se houver) e o `profile` default 'atleta' (linha anterior à
 * migration 025, sem a coluna).
 * @param {Object} u - linha de `users`
 * @param {Array<{id: string, name: string, account_user_id: string}>} linked - resultado de `User.getLinkedAthletes`
 */
function publicUser(u, linked) {
  const ficha = linked.find((a) => a.account_user_id === u.id);
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    profile: u.profile || 'atleta',
    mustChangePassword: u.must_change_password === true,
    is_active: u.is_active,
    athleteId: ficha ? ficha.id : null,
    athleteName: ficha ? ficha.name : null,
    lastLogin: u.last_login || null,
    created_at: u.created_at,
  };
}

/**
 * Lista todos os usuários do sistema (apenas admin)
 */
exports.listUsers = async (req, res) => {
  try {
    const users = await User.getAll(req.user.id);
    const linked = await User.getLinkedAthletes(users.map((u) => u.id));
    res.json({ success: true, data: users.map((u) => publicUser(u, linked)) });
  } catch (error) {
    handleError(res, 'Listar usuários', error);
  }
};

/**
 * Cria um novo sub-usuário (apenas admin)
 * Body (já validado pelo zod — `createUserSchema`): { name, email, password,
 * profile, isAdmin, createAthlete, athlete: { belt } }
 */
exports.createUser = async (req, res) => {
  try {
    const { name, email, password, profile, isAdmin, createAthlete, athlete } = req.body;

    const existing = await User.findByEmail(email);
    if (existing) {
      return res.status(400).json({ error: 'Este email já está em uso.' });
    }

    const user = await User.createSubUser(
      { name, email, password, profile, role: isAdmin ? 'admin' : 'user', mustChangePassword: true },
      req.user.id
    );

    let linked = [];
    if (createAthlete) {
      const ficha = await Athlete.create({ name, belt: athlete.belt }, user.id);
      await User.linkAthlete(user.id, ficha.id, [user.id]);
      linked = [{ id: ficha.id, name: ficha.name, account_user_id: user.id }];
    }

    console.log(`🔐 [AUDIT] Admin ${req.user.id} criou usuário ${user.id} (${profile}${isAdmin ? ', admin' : ''})`);
    res.status(201).json({ success: true, data: publicUser(user, linked) });
  } catch (error) {
    handleError(res, 'Criar usuário', error);
  }
};

/**
 * Atualiza nome ou senha de um usuário (apenas admin)
 * Body (já validado pelo zod — `updateUserSchema`): { name?, password? }
 */
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, password } = req.body;

    if (!await assertSameTenant(id, req.user.id, res)) return;

    const updates = {};
    if (name) updates.name = name;
    if (password) updates.password = password;

    const updated = await User.update(id, updates);
    res.json({
      success: true,
      data: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        role: updated.role,
        is_active: updated.is_active,
      },
    });
  } catch (error) {
    handleError(res, 'Atualizar usuário', error);
  }
};

/**
 * Desativa um usuário (soft delete — dados preservados).
 * Admin não pode desativar a si mesmo.
 */
exports.deactivateUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (id === req.user.id) {
      return res.status(400).json({ error: 'Você não pode desativar sua própria conta.' });
    }

    if (!await assertSameTenant(id, req.user.id, res)) return;

    await User.deactivate(id); // já chama invalidateTokens internamente
    evictAuthCache(id);
    console.log(`🔐 [AUDIT] Admin ${req.user.id} desativou usuário ${id}`);
    res.json({ success: true, message: 'Usuário desativado.' });
  } catch (error) {
    handleError(res, 'Desativar usuário', error);
  }
};

/**
 * Reativa um usuário desativado.
 */
exports.reactivateUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (!await assertSameTenant(id, req.user.id, res)) return;

    await User.reactivate(id);
    evictAuthCache(id);
    console.log(`🔐 [AUDIT] Admin ${req.user.id} reativou usuário ${id}`);
    res.json({ success: true, message: 'Usuário reativado.' });
  } catch (error) {
    handleError(res, 'Reativar usuário', error);
  }
};

/**
 * Promove ou rebaixa o role de um usuário.
 * Admin não pode alterar o próprio role, e o último admin ativo do tenant
 * não pode ser rebaixado a `user` (spec 014, R9) — o grupo ficaria sem
 * ninguém com `users:manage`.
 * Body (já validado pelo zod — `changeRoleSchema`): { role: 'admin' | 'user' }
 */
exports.changeRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (id === req.user.id) {
      return res.status(400).json({ error: 'Você não pode alterar seu próprio perfil.' });
    }

    if (!await assertSameTenant(id, req.user.id, res)) return;

    // Lê `countActiveAdmins`/`getAll` do banco (nunca do cache de auth do
    // requisitante) — por isso a guarda funciona mesmo quando o cache de
    // `middleware/auth.js` está com o role do PRÓPRIO requisitante
    // desatualizado (ver spec 014, revisão T8 — achado 3).
    // ⚠️ Limitação conhecida: é "ler depois escrever", sem lock nem
    // constraint no banco — dois admins rebaixando um ao outro na mesma
    // janela ainda podem, em teoria, zerar os admins do tenant. Fechar isso
    // de verdade exige uma checagem no nível do banco (fora do escopo aqui).
    if (role === 'user') {
      const tenantId = await User.getTenantId(id);
      const admins = await User.countActiveAdmins(tenantId);
      const target = (await User.getAll(req.user.id)).find((u) => u.id === id);
      if (target && target.role === 'admin' && target.is_active && admins <= 1) {
        return res.status(400).json({ error: 'Não é possível remover o último admin ativo da equipe.' });
      }
    }

    const updated = await User.update(id, { role });
    // Invalidar tokens e cache — força re-login imediato após mudança de role
    await User.invalidateTokens(id);
    evictAuthCache(id);
    console.log(`🔐 [AUDIT] Admin ${req.user.id} alterou role do usuário ${id} para '${role}'`);
    res.json({
      success: true,
      data: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        role: updated.role,
        is_active: updated.is_active,
      },
    });
  } catch (error) {
    handleError(res, 'Alterar perfil do usuário', error);
  }
};

/**
 * Altera o perfil profissional (`profile`) de um usuário do próprio tenant
 * (spec 014, R6). Invalida tokens/cache — o `profile` é lido do banco no
 * middleware de auth, mas o front decide UX (rotas visíveis) a partir do
 * JWT/estado local, então forçamos reautenticação para evitar estado stale.
 * Body (já validado pelo zod — `changeProfileSchema`): { profile }
 */
exports.changeProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const { profile } = req.body;

    if (!await assertSameTenant(id, req.user.id, res)) return;

    const updated = await User.update(id, { profile });
    await User.invalidateTokens(id);
    evictAuthCache(id);
    console.log(`🔐 [AUDIT] Admin ${req.user.id} alterou profile do usuário ${id} para '${profile}'`);
    res.json({ success: true, data: publicUser(updated, await User.getLinkedAthletes([id])) });
  } catch (error) {
    handleError(res, 'Alterar perfil do usuário', error);
  }
};

/**
 * Vincula ou desvincula (`athleteId: null`) uma ficha de atleta à conta de
 * um usuário do próprio tenant (spec 014, R6).
 * Body (já validado pelo zod — `linkAthleteSchema`): { athleteId: string|null }
 */
exports.linkAthlete = async (req, res) => {
  try {
    const { id } = req.params;
    const { athleteId } = req.body;

    if (!await assertSameTenant(id, req.user.id, res)) return;

    const scope = await resolveScope(req.actor);
    try {
      const result = await User.linkAthlete(id, athleteId, scope);
      console.log(`🔐 [AUDIT] Admin ${req.user.id} ${result} ficha ${athleteId} ↔ usuário ${id}`);
      const linked = await User.getLinkedAthletes([id]);
      const u = (await User.getAll(req.user.id)).find((x) => x.id === id);
      return res.json({ success: true, data: publicUser(u, linked) });
    } catch (e) {
      if (e.code === 'NOT_FOUND') return res.status(404).json({ error: 'Ficha não encontrada.' });
      if (e.code === 'CONFLICT') return res.status(409).json({ error: 'Esta ficha já está vinculada a outra conta.' });
      throw e;
    }
  } catch (error) {
    handleError(res, 'Vincular ficha', error);
  }
};

/**
 * Remove permanentemente um usuário (hard delete).
 * Body: { transferToUserId?: string } — se fornecido, transfere dados antes de excluir.
 * Admin não pode excluir a si mesmo.
 */
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { transferToUserId } = req.body;

    if (id === req.user.id) {
      return res.status(400).json({ error: 'Você não pode excluir sua própria conta.' });
    }

    if (!await assertSameTenant(id, req.user.id, res)) return;

    if (transferToUserId) {
      if (transferToUserId === id) {
        return res.status(400).json({ error: 'Não é possível transferir dados para o próprio usuário.' });
      }
      if (!await assertSameTenant(transferToUserId, req.user.id, res)) return;
      await User.transferData(id, transferToUserId);
      console.log(`🔐 [AUDIT] Admin ${req.user.id} transferiu dados do usuário ${id} para ${transferToUserId}`);
    } else {
      await User.deleteAllData(id);
      console.log(`🔐 [AUDIT] Admin ${req.user.id} excluiu todos os dados do usuário ${id}`);
    }

    await User.hardDelete(id);
    evictAuthCache(id);
    console.log(`🔐 [AUDIT] Admin ${req.user.id} EXCLUIU permanentemente o usuário ${id}`);
    res.json({ success: true, message: 'Usuário excluído permanentemente.' });
  } catch (error) {
    handleError(res, 'Excluir usuário', error);
  }
};
