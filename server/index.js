require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./src/routes/auth');
const athleteRoutes = require('./src/routes/athletes');
const opponentRoutes = require('./src/routes/opponents');
const aiRoutes = require('./src/routes/ai');
const videoRoutes = require('./src/routes/video');
const fightAnalysisRoutes = require('./src/routes/fightAnalysis');
const strategyRoutes = require('./src/routes/strategy');
const usageRoutes = require('./src/routes/usage');
const chatRoutes = require('./src/routes/chatRoutes');
const debugRoutes = require('./src/routes/debug');
const config = require('./config');

const app = express();
const PORT = config.PORT;

// Configuração CORS - Permitir desenvolvimento local, GitHub Pages e Vercel
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:3000',
      'https://lucasxtech.github.io'
    ];
    
    // Permitir qualquer subdomínio .vercel.app
    const isVercel = origin && origin.match(/^https:\/\/.*\.vercel\.app$/);
    
    if (!origin || allowedOrigins.includes(origin) || isVercel) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ limit: '500mb', extended: true }));

// Log de requisições (apenas em desenvolvimento)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// Rotas
app.use('/api/auth', authRoutes);
app.use('/api/athletes', athleteRoutes);
app.use('/api/opponents', opponentRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/video', videoRoutes);
app.use('/api/fight-analysis', fightAnalysisRoutes);
app.use('/api/strategy', strategyRoutes);
app.use('/api/usage', usageRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/debug', debugRoutes);

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

// Para desenvolvimento local
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`🥋 Servidor de Análise Tática rodando em http://localhost:${PORT}`);
  });
}

// Para Vercel
module.exports = app;
