/**
 * Middleware que garante que apenas administradores acessem a rota.
 * Deve ser usado APÓS authMiddleware.
 */
const adminMiddleware = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso restrito a administradores.' });
  }
  next();
};

module.exports = adminMiddleware;
