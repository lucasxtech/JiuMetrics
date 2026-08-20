require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const authRoutes = require('./src/routes/auth');
const athleteRoutes = require('./src/routes/athletes');
const opponentRoutes = require('./src/routes/opponents');
const aiRoutes = require('./src/routes/ai');
const fightAnalysisRoutes = require('./src/routes/fightAnalysis');
const strategyRoutes = require('./src/routes/strategy');
const usageRoutes = require('./src/routes/usage');
const chatRoutes = require('./src/routes/chatRoutes');
const debugRoutes = require('./src/routes/debug');
const adminRoutes = require('./src/routes/admin');
const config = require('./config');

const app = express();
const PORT = config.PORT;

// Confiar no proxy reverso (Vercel/Render) para obter IP real do cliente
// Necessário para que o rate limiter use o IP correto via X-Forwarded-For
app.set('trust proxy', 1);

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

// Headers de segurança (spec 010). Não havia nenhum: sem nosniff, sem
// frameguard, sem HSTS, e com `X-Powered-By: Express` anunciando a stack.
//
// A configuração é DELIBERADA, não `helmet()` cru, por dois motivos:
//
// 1. **CSP fica desligada aqui.** Esta API só devolve JSON — CSP protege
//    documento, e o documento é servido pela Vercel a partir de `frontend/`.
//    É lá que a política tem efeito (ver `frontend/vercel.json`). Ligar CSP
//    numa resposta JSON dá sensação de proteção sem proteger nada.
// 2. **Cross-Origin-Resource-Policy fica desligada.** O frontend roda em
//    outro domínio Vercel, e quem governa esse acesso é a config de CORS
//    acima. Ligar CORP aqui é mexer em comportamento cross-origin que já tem
//    dono, sem eu conseguir verificar no navegador.
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: false,
  crossOriginEmbedderPolicy: false
}));

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
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
app.use('/api/fight-analysis', fightAnalysisRoutes);
app.use('/api/strategy', strategyRoutes);
app.use('/api/usage', usageRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/debug', debugRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Servidor funcionando' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

// Error handler
// O 4º parâmetro é OBRIGATÓRIO: o Express identifica error handler por
// fn.length === 4. Prefixado com _ para satisfazer o lint sem alterar a
// aridade — renomear é seguro, remover quebraria o handler.
app.use((err, req, res, _next) => {
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
