// Rotas de Atletas
const express = require('express');
const athleteController = require('../controllers/athleteController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Aplicar middleware de autenticação em todas as rotas
router.use(authMiddleware);

// GET /api/athletes - Listar todos
router.get('/', athleteController.getAll);

// GET /api/athletes/:id - Detalhes de um atleta
router.get('/:id', athleteController.getById);

// POST /api/athletes - Criar novo
router.post('/', athleteController.create);

// PUT /api/athletes/:id - Atualizar
router.put('/:id', athleteController.update);

// DELETE /api/athletes/:id - Deletar
router.delete('/:id', athleteController.delete);

module.exports = router;
