// Controlador de Atletas — implementação em `personController.js` (spec 013).
const Athlete = require('../models/Athlete');
const { createPersonController } = require('./personController');

module.exports = createPersonController(Athlete, { singular: 'Atleta', plural: 'atletas' });
