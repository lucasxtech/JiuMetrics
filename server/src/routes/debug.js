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
    HAS_GEMINI_KEY: !!process.env.GEMINI_API_KEY,
    NODE_ENV: process.env.NODE_ENV,
  });
});

module.exports = router;
