const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middleware/auth');

/**
 * GET /api/debug/env-check
 * Endpoint temporário para verificar variáveis de ambiente em produção
 */
router.get('/env-check', authenticateUser, (req, res) => {
  res.json({
    USE_MULTI_AGENTS: process.env.USE_MULTI_AGENTS,
    USE_MULTI_AGENTS_TYPE: typeof process.env.USE_MULTI_AGENTS,
    HAS_OPENAI_KEY: !!process.env.OPENAI_API_KEY,
    OPENAI_KEY_PREFIX: process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.substring(0, 7) : 'undefined',
    OPENAI_MODEL: process.env.OPENAI_MODEL,
    NODE_ENV: process.env.NODE_ENV,
    ALL_ENV_KEYS: Object.keys(process.env).filter(k => 
      k.includes('MULTI') || k.includes('OPENAI') || k.includes('USE_')
    )
  });
});

module.exports = router;
