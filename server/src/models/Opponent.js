// @ts-check
// Modelo de dados para Adversário — implementação em `personModel.js` (spec 012).
const { createPersonModel } = require('./personModel');

module.exports = createPersonModel({
  table: 'opponents',
  personType: 'opponent',
  label: 'Opponent',
  notFoundLabel: 'Adversário',
});
