/**
 * Middleware que garante que apenas administradores acessem a rota.
 * Deve ser usado APÓS authMiddleware.
 * Registra log de auditoria para cada acesso a rotas admin.
 */
const adminMiddleware = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    console.warn(`🚫 [AUDIT] Acesso admin negado — userId: ${req.user?.id || 'anônimo'} → ${req.method} ${req.path}`);
    return res.status(403).json({ error: 'Acesso restrito a administradores.' });
  }
  console.log(`🔑 [AUDIT] Acesso admin — userId: ${req.user.id} → ${req.method} ${req.path}`);
  next();
};

module.exports = adminMiddleware;
