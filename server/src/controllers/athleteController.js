// Controlador de Atletas — implementação em `personController.js` (spec 012).
const Athlete = require('../models/Athlete');
const { createPersonController } = require('./personController');

module.exports = createPersonController(Athlete, { singular: 'Atleta', plural: 'atletas' });
