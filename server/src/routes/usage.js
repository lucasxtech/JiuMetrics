const express = require('express');
const router = express.Router();
const usageController = require('../controllers/usageController');
const authMiddleware = require('../middleware/auth');

// Todas as rotas de usage requerem autenticação
router.use(authMiddleware);

/**
 * GET /api/usage/stats?period=today|week|month|all
 * Retorna estatísticas de uso da API Gemini
 */
router.get('/stats', usageController.getStats);

/**
 * GET /api/usage/pricing
 * Retorna tabela de preços dos modelos
 */
router.get('/pricing', usageController.getPricing);

module.exports = router;
