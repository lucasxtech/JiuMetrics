// Rotas de Adversários
const express = require('express');
const opponentController = require('../controllers/opponentController');

const router = express.Router();

// GET /api/opponents - Listar todos
router.get('/', opponentController.getAll);

// GET /api/opponents/:id - Detalhes de um adversário
router.get('/:id', opponentController.getById);

// POST /api/opponents - Criar novo
router.post('/', opponentController.create);

// PUT /api/opponents/:id - Atualizar
router.put('/:id', opponentController.update);

// DELETE /api/opponents/:id - Deletar
router.delete('/:id', opponentController.delete);

module.exports = router;
