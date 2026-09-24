const jwt = require('jsonwebtoken');
const User = require('../models/User');

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET é obrigatório. Configure a variável de ambiente.');
}
const JWT_SECRET = process.env.JWT_SECRET;

// Cache em memória para evitar consulta ao banco em cada request.
// Chave: userId → { role, is_active, token_version, profile, must_change_password, expiresAt }
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
        // profile — spec 014: lido do banco, nunca do token; linha sem a
        // coluna (banco anterior à migration 025 — `getAuthInfo` usa
        // `select('*')`, então a coluna ausente chega `undefined` em vez de
        // derrubar a query) vale como o perfil mais restritivo ('atleta').
        const profile = authInfo.profile || 'atleta';
        const mustChangePassword = authInfo.must_change_password === true;
        req.user = { id: decoded.userId, role: authInfo.role, profile, mustChangePassword };
        req.userId = decoded.userId;
        // req.actor — SPEC-005: shape estável para server/src/services/authorization.js.
        // tenantId fica reservado (não resolvido aqui) até uma dimensão futura precisar dele.
        req.actor = { id: decoded.userId, role: authInfo.role, profile, tenantId: null };
        return next();
      } catch (dbError) {
        // Três casos, decididos pelo `code` do erro (revisão final da spec
        // 014, C1). O PostgREST devolve `code` quando o BANCO respondeu
        // (`PGRST*` do PostgREST, SQLSTATE do Postgres, ex. `42703`); o
        // supabase-js devolve `code: ''` para falha de rede, e um gateway que
        // responde HTML não traz `code` nenhum. Por isso:
        //
        // 1. `PGRST116` — o banco respondeu que a linha de `users` não existe
        //    (conta excluída pela purga da spec 014). O token é de uma conta
        //    que deixou de existir: 401, nunca fallback.
        // 2. Qualquer outro código — o banco respondeu com erro (coluna
        //    inexistente porque o deploy veio antes da migration, query
        //    inválida, timeout de statement...). Não há por que confiar no
        //    token quando o banco está no ar: 503, e o código vai para o log.
        //    Antes desta correção, esses casos caíam no fallback e desligavam
        //    em silêncio as checagens de `is_active` e `token_version`.
        // 3. Sem código — falha de conectividade/timeout. Único caso em que o
        //    fallback do token continua valendo (dívida conhecida, AZ-8 em
        //    docs/AUTHORIZATION.md): o `role` vem do JWT, `profile` fica no
        //    mais restritivo ('atleta') porque o token não carrega perfil.
        const code = dbError && dbError.code;
        if (code === 'PGRST116') {
          return res.status(401).json({ error: 'Sessão inválida. Faça login novamente.' });
        }
        if (code) {
          console.error(`❌ Banco respondeu com erro ao verificar usuário (código ${code}) — requisição recusada, sem fallback para o token`);
          return res.status(503).json({ error: 'Serviço temporariamente indisponível.' });
        }
        console.error('⚠️ Falha de conexão ao verificar usuário no DB — usando dados do token como fallback:', dbError && dbError.message);
        req.user = { id: decoded.userId, role: decoded.role || 'user', profile: 'atleta', mustChangePassword: false };
        req.userId = decoded.userId;
        req.actor = { id: decoded.userId, role: decoded.role || 'user', profile: 'atleta', tenantId: null };
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

