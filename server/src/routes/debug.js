const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const adminMiddleware = require('../middleware/adminMiddleware');
const rateLimit = require('express-rate-limit');

const envCheckLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * GET /api/debug/env-check
 * Endpoint para verificar variáveis de ambiente em produção (requer autenticação)
 */
router.get('/env-check', envCheckLimiter, authMiddleware, adminMiddleware, (req, res) => {
  res.json({
    USE_MULTI_AGENTS: process.env.USE_MULTI_AGENTS,
    USE_MULTI_AGENTS_TYPE: typeof process.env.USE_MULTI_AGENTS,
    HAS_OPENAI_KEY: !!process.env.OPENAI_API_KEY,
    OPENAI_MODEL: process.env.OPENAI_MODEL,
    NODE_ENV: process.env.NODE_ENV,
  });
});

module.exports = router;
