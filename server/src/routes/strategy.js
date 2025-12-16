// Rotas para Estratégias
const express = require('express');
const router = express.Router();
const strategyController = require('../controllers/strategyController');
const authMiddleware = require('../middleware/auth');

// Aplicar middleware de autenticação em todas as rotas
router.use(authMiddleware);

// Comparar atleta vs adversário e gerar estratégia
router.post('/compare', strategyController.compareAndStrategy);

// Listar análises táticas salvas
router.get('/analyses', strategyController.listAnalyses);

// Buscar análise tática específica
router.get('/analyses/:id', strategyController.getAnalysis);

// Deletar análise tática
router.delete('/analyses/:id', strategyController.deleteAnalysis);

module.exports = router;
