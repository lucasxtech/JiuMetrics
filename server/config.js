require('dotenv').config();
// Arquivo de configurações globais

module.exports = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
  // Adicione outras variáveis conforme necessário
};
