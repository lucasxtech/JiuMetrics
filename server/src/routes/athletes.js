// Rotas de Atletas
const express = require('express');
const athleteController = require('../controllers/athleteController');
const authMiddleware = require('../middleware/auth');
const { generalLimiter } = require('../middleware/rateLimiter');
const { validateBody } = require('../middleware/validate');
const { createPersonSchema, updatePersonSchema } = require('../schemas/requests/person');

const router = express.Router();

router.use(generalLimiter);
router.use(authMiddleware);

router.get('/', athleteController.getAll);
router.get('/:id', athleteController.getById);
router.post('/', validateBody(createPersonSchema), athleteController.create);
router.put('/:id', validateBody(updatePersonSchema), athleteController.update);
router.delete('/:id', athleteController.delete);

module.exports = router;
