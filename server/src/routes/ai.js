// Rotas de IA
const express = require('express');
const aiController = require('../controllers/aiController');
const authMiddleware = require('../middleware/auth');
const { heavyLimiter } = require('../middleware/rateLimiter');

const { validateBody } = require('../middleware/validate');
const {
  analyzeLinkSchema,
  athleteSummarySchema,
  consolidateProfileSchema
} = require('../schemas/requests/ai');

const router = express.Router();

router.use(heavyLimiter);
router.use(authMiddleware);

// POST /api/ai/strategy - Gerar estratégia (removido)
// Rota desabilitada após remoção de mock. Mantida comentada para referência.
// router.post('/strategy', aiController.generateStrategy);

// POST /api/ai/analyze-video - Analisar vídeo
router.post('/analyze-video', aiController.analyzeVideo);

// POST /api/ai/analyze-link - Analisar link de vídeo (YouTube)
const linkController = require('../controllers/linkController');
router.post('/analyze-link', validateBody(analyzeLinkSchema), linkController.analyzeLink);

// POST /api/ai/athlete-summary - Gerar resumo técnico do atleta
router.post('/athlete-summary', validateBody(athleteSummarySchema), aiController.generateAthleteSummary);

// POST /api/ai/consolidate-profile - Consolida todas as análises e salva no perfil
router.post('/consolidate-profile', validateBody(consolidateProfileSchema), aiController.consolidateProfile);

module.exports = router;
