const User = require('../models/User');
const { handleError } = require('../utils/errorHandler');

/**
 * Garante que o usuário alvo pertence ao mesmo tenant do solicitante.
 * Retorna o usuário alvo ou lança erro 403/404.
 */
async function assertSameTenant(targetId, requesterId, res) {
  const [requesterTenant, targetTenant] = await Promise.all([
    User.getTenantId(requesterId),
    User.getTenantId(targetId).catch(() => null),
  ]);
  if (!targetTenant) {
    res.status(404).json({ error: 'Usuário não encontrado.' });
    return false;
  }
  if (requesterTenant !== targetTenant) {
    res.status(403).json({ error: 'Acesso negado.' });
    return false;
  }
  return true;
}

/**
 * Lista todos os usuários do sistema (apenas admin)
 */
exports.listUsers = async (req, res) => {
  try {
    const users = await User.getAll(req.user.id);
    res.json({ success: true, data: users });
  } catch (error) {
    handleError(res, 'Listar usuários', error);
  }
};

/**
 * Cria um novo sub-usuário (apenas admin)
 * Body: { name, email, password }
 */
exports.createUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nome, email e senha são obrigatórios.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Senha deve ter no mínimo 6 caracteres.' });
    }

    // Validação de email com regex segura (sem risco de ReDoS)
    // Usa \S+ no lugar de [^\s@]+ aninhado para evitar backtracking polinomial
    if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 254) {
      return res.status(400).json({ error: 'Email inválido.' });
    }

    const existing = await User.findByEmail(email);
    if (existing) {
      return res.status(400).json({ error: 'Este email já está em uso.' });
    }

    const user = await User.createSubUser({ name, email, password }, req.user.id);

    res.status(201).json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        is_active: user.is_active,
        created_at: user.created_at,
      },
    });
  } catch (error) {
    handleError(res, 'Criar usuário', error);
  }
};

/**
 * Atualiza nome ou senha de um usuário (apenas admin)
 * Body: { name?, password? }
 */
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, password } = req.body;

    if (!name && !password) {
      return res.status(400).json({ error: 'Informe ao menos nome ou senha para atualizar.' });
    }

    if (!await assertSameTenant(id, req.user.id, res)) return;

    const updates = {};
    if (name) updates.name = name;
    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ error: 'Senha deve ter no mínimo 6 caracteres.' });
      }
      updates.password = password;
    }

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

    await User.deactivate(id);
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
    res.json({ success: true, message: 'Usuário reativado.' });
  } catch (error) {
    handleError(res, 'Reativar usuário', error);
  }
};

/**
 * Promove ou rebaixa o role de um usuário.
 * Admin não pode alterar o próprio role.
 * Body: { role: 'admin' | 'user' }
 */
exports.changeRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (id === req.user.id) {
      return res.status(400).json({ error: 'Você não pode alterar seu próprio perfil.' });
    }

    if (!['admin', 'user'].includes(role)) {
      return res.status(400).json({ error: 'Role inválido. Use "admin" ou "user".' });
    }

    if (!await assertSameTenant(id, req.user.id, res)) return;

    const updated = await User.update(id, { role });
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
