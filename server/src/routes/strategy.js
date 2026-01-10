// Rotas para Estratégias
const express = require('express');
const router = express.Router();
const strategyController = require('../controllers/strategyController');
const strategyVersionController = require('../controllers/strategyVersionController');
const authMiddleware = require('../middleware/auth');

// Aplicar middleware de autenticação em todas as rotas
router.use(authMiddleware);

// Comparar atleta vs adversário e gerar estratégia
router.post('/compare', strategyController.compareAndStrategy);

// Listar análises táticas salvas
router.get('/analyses', strategyController.listAnalyses);

// Buscar análise tática específica
router.get('/analyses/:id', strategyController.getAnalysis);

// Atualizar análise tática
router.patch('/analyses/:id', strategyController.updateAnalysis);

// Deletar análise tática
router.delete('/analyses/:id', strategyController.deleteAnalysis);

// ========== ROTAS DE VERSÕES ==========
// Listar versões de uma análise
router.get('/analyses/:analysisId/versions', strategyVersionController.getVersions);

// Restaurar uma versão
router.post('/analyses/:analysisId/versions/:versionId/restore', strategyVersionController.restoreVersion);

module.exports = router;
