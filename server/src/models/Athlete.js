// @ts-check
// Modelo de dados para Atleta — implementação em `personModel.js` (spec 012).
const { createPersonModel } = require('./personModel');

module.exports = createPersonModel({
  table: 'athletes',
  personType: 'athlete',
  label: 'Athlete',
  notFoundLabel: 'Atleta',
});
