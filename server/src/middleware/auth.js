const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

/**
 * Middleware de autenticação JWT
 * Verifica se o token é válido e adiciona userId ao req
 */
const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    console.log('🔐 Auth middleware - Headers:', { 
      authorization: authHeader ? 'presente' : 'ausente',
      path: req.path 
    });
    
    if (!authHeader) {
      console.log('❌ Token não fornecido');
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

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(401).json({ error: 'Token inválido ou expirado' });
      }

      // Expor req.user com id e role para novos controllers
      req.user = { id: decoded.userId, role: decoded.role || 'user' };
      // Manter req.userId como alias para retrocompatibilidade
      req.userId = decoded.userId;
      return next();
    });
  } catch (error) {
    console.error('Erro no middleware de autenticação:', error);
    return res.status(500).json({ error: 'Erro ao verificar autenticação' });
  }
};

module.exports = authMiddleware;
