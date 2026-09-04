// Controlador de Adversários — implementação em `personController.js` (spec 013).
const Opponent = require('../models/Opponent');
const { createPersonController } = require('./personController');

module.exports = createPersonController(Opponent, { singular: 'Adversário', plural: 'adversários' });
