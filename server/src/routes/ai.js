// Rotas de IA
const express = require('express');
const aiController = require('../controllers/aiController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Aplicar middleware de autenticação em todas as rotas
router.use(authMiddleware);

// POST /api/ai/strategy - Gerar estratégia (removido)
// Rota desabilitada após remoção de mock. Mantida comentada para referência.
// router.post('/strategy', aiController.generateStrategy);

// POST /api/ai/analyze-video - Analisar vídeo
router.post('/analyze-video', aiController.analyzeVideo);

// POST /api/ai/analyze-link - Analisar link de vídeo (YouTube)
const linkController = require('../controllers/linkController');
router.post('/analyze-link', linkController.analyzeLink);

// POST /api/ai/athlete-summary - Gerar resumo técnico do atleta
router.post('/athlete-summary', aiController.generateAthleteSummary);

// POST /api/ai/consolidate-profile - Consolida todas as análises e salva no perfil
router.post('/consolidate-profile', aiController.consolidateProfile);

module.exports = router;
