require('dotenv').config();
const express = require('express');
const cors = require('cors');
const athleteRoutes = require('./src/routes/athletes');
const opponentRoutes = require('./src/routes/opponents');
const aiRoutes = require('./src/routes/ai');
const videoRoutes = require('./src/routes/video');
const fightAnalysisRoutes = require('./src/routes/fightAnalysis');
const strategyRoutes = require('./src/routes/strategy');
const config = require('./config');

const app = express();
const PORT = config.PORT;

// Middleware
app.use(cors());
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ limit: '500mb', extended: true }));

// Logs de requisição
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Rotas
app.use('/api/athletes', athleteRoutes);
app.use('/api/opponents', opponentRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/video', videoRoutes);
app.use('/api/fight-analysis', fightAnalysisRoutes);
app.use('/api/strategy', strategyRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Servidor funcionando' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

app.listen(PORT, () => {
  console.log(`🥋 Servidor de Análise Tática rodando em http://localhost:${PORT}`);
});
