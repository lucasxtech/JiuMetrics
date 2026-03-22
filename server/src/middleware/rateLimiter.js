const rateLimit = require('express-rate-limit');

// Rotas de autenticação — proteção contra brute force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Muitas tentativas. Tente novamente em 15 minutos.' },
});

// Rotas gerais de leitura/escrita (atletas, adversários, análises, uso)
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});

// Rotas de IA pesadas (vídeo, estratégia) — operações custosas
const heavyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Limite de operações de IA atingido. Tente novamente em 15 minutos.' },
});

// Chat de IA
const chatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { authLimiter, generalLimiter, heavyLimiter, chatLimiter };
