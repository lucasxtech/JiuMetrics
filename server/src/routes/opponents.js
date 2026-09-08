// Rotas de Adversários
const express = require('express');
const opponentController = require('../controllers/opponentController');
const authMiddleware = require('../middleware/auth');
const { generalLimiter } = require('../middleware/rateLimiter');
const { validateBody } = require('../middleware/validate');
const { createPersonSchema, updatePersonSchema } = require('../schemas/requests/person');

const router = express.Router();

router.use(generalLimiter);
router.use(authMiddleware);

router.get('/', opponentController.getAll);
router.get('/:id', opponentController.getById);
router.post('/', validateBody(createPersonSchema), opponentController.create);
router.put('/:id', validateBody(updatePersonSchema), opponentController.update);
router.delete('/:id', opponentController.delete);

module.exports = router;
