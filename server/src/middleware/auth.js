const jwt = require('jsonwebtoken');

/**
 * Middleware de autenticação JWT
 * Verifica se o token é válido e adiciona userId ao req
 */
const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const parts = authHeader.split(' ');
    
    if (parts.length !== 2) {
      return res.status(401).json({ error: 'Formato de token inválido' });
    }

    const [scheme, token] = parts;

    if (!/^Bearer$/i.test(scheme)) {
      return res.status(401).json({ error: 'Token mal formatado' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(401).json({ error: 'Token inválido ou expirado' });
      }

      req.userId = decoded.userId;
      return next();
    });
  } catch (error) {
    console.error('Erro no middleware de autenticação:', error);
    return res.status(500).json({ error: 'Erro ao verificar autenticação' });
  }
};

module.exports = authMiddleware;
