require('dotenv').config();
// Arquivo de configurações globais

const DEFAULT_PORT = 5050;

module.exports = {
  PORT: Number(process.env.PORT) || DEFAULT_PORT,
  NODE_ENV: process.env.NODE_ENV || 'development',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
  // Adicione outras variáveis conforme necessário
};
