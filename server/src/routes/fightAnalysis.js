// Rotas para Análises de Lutas
const express = require('express');
const router = express.Router();
const fightAnalysisController = require('../controllers/fightAnalysisController');
const authMiddleware = require('../middleware/auth');

// Aplicar middleware de autenticação em todas as rotas
router.use(authMiddleware);

// Listar todas as análises
router.get('/', fightAnalysisController.getAllAnalyses);

// Buscar análise por ID
router.get('/:id', fightAnalysisController.getAnalysisById);

// Listar análises de uma pessoa (atleta ou adversário)
router.get('/person/:personId', fightAnalysisController.getAnalysesByPerson);

// Criar nova análise
router.post('/', fightAnalysisController.createAnalysis);

// Deletar análise
router.delete('/:id', fightAnalysisController.deleteAnalysis);

module.exports = router;
