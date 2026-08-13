// Rotas para Análises de Lutas
const express = require('express');
const router = express.Router();
const fightAnalysisController = require('../controllers/fightAnalysisController');
const authMiddleware = require('../middleware/auth');
const { generalLimiter } = require('../middleware/rateLimiter');

router.use(generalLimiter);
router.use(authMiddleware);

// Listar todas as análises
router.get('/', fightAnalysisController.getAllAnalyses);

// ⚠️ ROTAS ESPECÍFICAS DEVEM VIR ANTES DAS ROTAS DINÂMICAS
// Listar análises de uma pessoa (atleta ou adversário)
router.get('/person/:personId', fightAnalysisController.getAnalysesByPerson);

// Buscar análise por ID (deve vir depois de /person/:personId)
router.get('/:id', fightAnalysisController.getAnalysisById);

// Criar nova análise
router.post('/', fightAnalysisController.createAnalysis);

// Deletar análise
router.delete('/:id', fightAnalysisController.deleteAnalysis);

module.exports = router;
