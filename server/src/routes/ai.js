// Rotas de IA
const express = require('express');
const aiController = require('../controllers/aiController');

const router = express.Router();

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

module.exports = router;
