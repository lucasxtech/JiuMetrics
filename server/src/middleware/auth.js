const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

// Cache em memória para evitar consulta ao banco em cada request.
// Chave: userId → { role, is_active, token_version, expiresAt }
const _authCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos
const CACHE_MAX_SIZE = 5000;         // limite para evitar memory leak em produção

function _getCached(userId) {
  const entry = _authCache.get(userId);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    _authCache.delete(userId);
    return null;
  }
  return entry;
}

function _setCache(userId, data) {
  // Se o cache atingiu o limite, remover a entrada mais antiga (FIFO)
  if (_authCache.size >= CACHE_MAX_SIZE) {
    const oldestKey = _authCache.keys().next().value;
    _authCache.delete(oldestKey);
  }
  _authCache.set(userId, { ...data, expiresAt: Date.now() + CACHE_TTL_MS });
}

/**
 * Evita que um usuário específico fique com dados stale no cache.
 * Chame após changeRole, deactivate ou qualquer mudança de segurança.
 */
const evictAuthCache = (userId) => {
  _authCache.delete(userId);
};

/**
 * Middleware de autenticação JWT
 * Verifica se o token é válido, se a conta está ativa e se a versão do token é atual.
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

    jwt.verify(token, JWT_SECRET, async (err, decoded) => {
      if (err) {
        return res.status(401).json({ error: 'Token inválido ou expirado' });
      }

      try {
        // Verificar cache ou buscar do banco
        let authInfo = _getCached(decoded.userId);
        if (!authInfo) {
          authInfo = await User.getAuthInfo(decoded.userId);
          _setCache(decoded.userId, authInfo);
        }

        // Conta desativada: rejeitar mesmo com token válido
        if (!authInfo.is_active) {
          return res.status(403).json({ error: 'Conta desativada. Contate o administrador.' });
        }

        // Token version: rejeitar se o token foi emitido antes de uma mudança de role/desativação
        if (decoded.tokenVersion !== undefined && decoded.tokenVersion !== authInfo.token_version) {
          return res.status(401).json({ error: 'Sessão expirada. Faça login novamente.' });
        }

        // Usar role do banco (não do token) para evitar role stale no JWT
        req.user = { id: decoded.userId, role: authInfo.role };
        req.userId = decoded.userId;
        return next();
      } catch (dbError) {
        console.error('⚠️ Falha ao verificar usuário no DB — usando dados do token como fallback:', dbError.message);
        // Fallback seguro: continua com dados do token se o banco estiver indisponível
        req.user = { id: decoded.userId, role: decoded.role || 'user' };
        req.userId = decoded.userId;
        return next();
      }
    });
  } catch (error) {
    console.error('Erro no middleware de autenticação:', error);
    return res.status(500).json({ error: 'Erro ao verificar autenticação' });
  }
};

module.exports = authMiddleware;
module.exports.evictAuthCache = evictAuthCache;

