# Arquitetura Detalhada - JiuMetrics

## 📐 Visão Geral

JiuMetrics é uma aplicação web full-stack que segue arquitetura cliente-servidor (Client-Server) com separação clara entre frontend e backend.

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│                 │         │                  │         │                 │
│  GitHub Pages   │◄────────│   React + Vite   │────────►│   Vercel API    │
│   (Frontend)    │  HTTPS  │   (Build SPA)    │  HTTPS  │   (Backend)     │
│                 │         │                  │         │                 │
└─────────────────┘         └──────────────────┘         └────────┬────────┘
                                     │                             │
                                     │                             │
                                     ▼                             ▼
                            ┌────────────────┐          ┌─────────────────┐
                            │  localStorage  │          │    Supabase     │
                            │  (JWT Token)   │          │   (PostgreSQL)  │
                            └────────────────┘          └─────────────────┘
                                                                  │
                                                                  ▼
                                                        ┌─────────────────┐
                                                        │  Google Gemini  │
                                                        │   AI (Vision)   │
                                                        └─────────────────┘
```

## 🏗️ Camadas da Aplicação

### Frontend (Presentation Layer)

**Tecnologias:**
- React 19.2.0 (UI Library)
- React Router DOM 6.30.2 (SPA Routing)
- Vite 7.2.4 (Build Tool & Dev Server)
- TailwindCSS 4.1.17 (Utility-first CSS)

**Estrutura:**

```
src/
├── pages/              # Páginas/Rotas principais
│   ├── Overview.jsx          # Dashboard com métricas
│   ├── Athletes.jsx          # Lista de atletas
│   ├── AthleteDetail.jsx     # Detalhes do atleta
│   ├── Opponents.jsx         # Lista de adversários
│   ├── Strategy.jsx          # Geração de estratégias
│   ├── VideoAnalysis.jsx     # Upload e análise de vídeos
│   ├── Settings.jsx          # Configurações (modelo AI)
│   ├── ModernLogin.jsx       # Tela de login
│   └── Register.jsx          # Tela de registro
│
├── components/         # Componentes reutilizáveis
│   ├── common/              # Componentes compartilhados
│   │   ├── Header.jsx            # Navegação principal
│   │   ├── LoadingSpinner.jsx    # Indicador de carregamento
│   │   └── ErrorMessage.jsx      # Mensagens de erro
│   ├── forms/               # Formulários
│   │   └── AthleteForm.jsx       # Form de criação/edição
│   ├── charts/              # Gráficos (Recharts)
│   │   ├── RadarChart.jsx        # Gráfico radar de atributos
│   │   └── LineChart.jsx         # Gráfico de linha
│   ├── ProtectedRoute.jsx   # HOC para rotas protegidas
│   ├── VideoAnalysis.jsx    # Componente de análise
│   ├── VideoAnalysisCard.jsx
│   ├── AiStrategyBox.jsx    # Box de estratégia gerada
│   └── PieChartSection.jsx
│
├── services/           # Chamadas API
│   ├── api.js                # Configuração Axios + interceptors
│   ├── authService.js        # Login, registro, logout
│   ├── athleteService.js     # CRUD de atletas
│   ├── opponentService.js    # CRUD de adversários
│   ├── strategyService.js    # Geração de estratégias
│   ├── videoAnalysisService.js # Análise de vídeos
│   ├── videoUploadService.js # Upload de vídeos
│   ├── aiService.js          # Resumos e análises AI
│   └── fightAnalysisService.js
│
├── hooks/              # Custom React Hooks (futuro)
├── utils/              # Funções utilitárias
│   └── athleteStats.js       # Cálculos de estatísticas
│
├── App.jsx             # Configuração de rotas
├── main.jsx            # Entry point
└── index.css           # Estilos globais (Tailwind imports)
```

**Fluxo de Dados (Frontend):**

```
User Action (UI)
    ↓
Event Handler (Component)
    ↓
Service Call (API)
    ↓
Axios Interceptor (Add JWT)
    ↓
HTTP Request → Backend
    ↓
Response ← Backend
    ↓
setState (Update UI)
    ↓
Re-render (React)
```

### Backend (Business Logic & Data Layer)

**Tecnologias:**
- Node.js + Express 5.1.0 (Web Framework)
- Supabase Client 2.86.0 (Database ORM)
- JWT + bcrypt (Authentication)
- Google Generative AI 0.24.1 (Gemini)
- Multer 2.0.2 (File Upload)
- FFmpeg (Video Processing)

**Estrutura:**

```
server/
├── src/
│   ├── controllers/         # Lógica de controle HTTP
│   │   ├── authController.js        # Login, registro
│   │   ├── athleteController.js     # CRUD atletas
│   │   ├── opponentController.js    # CRUD adversários
│   │   ├── strategyController.js    # Geração de estratégias
│   │   ├── videoController.js       # Upload e processamento
│   │   ├── aiController.js          # Resumos AI
│   │   ├── linkController.js        # Vinculação de análises
│   │   └── fightAnalysisController.js
│   │
│   ├── models/              # Modelos de dados (Supabase)
│   │   ├── User.js                  # Modelo de usuário
│   │   ├── Athlete.js               # Modelo de atleta
│   │   ├── Opponent.js              # Modelo de adversário
│   │   └── FightAnalysis.js         # Modelo de análise
│   │
│   ├── routes/              # Definição de rotas
│   │   ├── auth.js                  # POST /auth/login, /auth/register
│   │   ├── athletes.js              # CRUD /athletes
│   │   ├── opponents.js             # CRUD /opponents
│   │   ├── strategy.js              # POST /strategy/compare
│   │   ├── ai.js                    # POST /ai/*
│   │   ├── video.js                 # POST /video/analyze
│   │   ├── link.js                  # POST /link
│   │   └── fightAnalysis.js         # CRUD /fight-analysis
│   │
│   ├── services/            # Serviços externos
│   │   ├── geminiService.js         # Integração Google Gemini
│   │   └── strategyService.js       # Lógica de estratégias
│   │
│   ├── middleware/          # Middlewares
│   │   └── auth.js                  # Verificação JWT
│   │
│   ├── utils/               # Utilitários
│   │   ├── chartUtils.js            # Geração de gráficos
│   │   └── athleteStatsUtils.js     # Cálculos de stats
│   │
│   └── config/              # Configurações
│       └── supabase.js              # Cliente Supabase
│
├── uploads/                 # Arquivos temporários de upload
├── index.js                 # Entry point do servidor
├── config.js                # Configurações gerais
└── vercel.json              # Config deploy Vercel
```

**Fluxo de Requisição (Backend):**

```
HTTP Request
    ↓
Express Router
    ↓
Auth Middleware (verify JWT)
    ↓
Controller (business logic)
    ↓
Model (database queries)
    ↓
Supabase Client
    ↓
PostgreSQL Database
    ↓
Response ← Controller
    ↓
JSON Response → Client
```

### Banco de Dados (Supabase / PostgreSQL)

**Esquema:**

```sql
-- Tabela de usuários
users (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
)

-- Tabela de atletas
athletes (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  name TEXT NOT NULL,
  age INTEGER,
  weight NUMERIC,
  belt TEXT,
  style TEXT,
  strong_attacks TEXT,
  weaknesses TEXT,
  cardio INTEGER,
  video_url TEXT,
  ai_summary TEXT,
  created_at TIMESTAMP DEFAULT NOW()
)

-- Tabela de adversários (mesma estrutura de athletes)
opponents (
  -- mesma estrutura de athletes
)

-- Tabela de análises de luta
fight_analyses (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  person_id INTEGER,  -- ID de athlete ou opponent
  person_type TEXT,   -- 'athlete' ou 'opponent'
  video_url TEXT,
  kimono_color TEXT,
  analysis JSONB,
  created_at TIMESTAMP DEFAULT NOW()
)
```

**Relacionamentos:**
- `users` 1:N `athletes` (Um usuário tem muitos atletas)
- `users` 1:N `opponents` (Um usuário tem muitos adversários)
- `users` 1:N `fight_analyses` (Um usuário tem muitas análises)
- `fight_analyses` N:1 `athletes/opponents` (Análise pertence a um atleta/adversário)

## 🔐 Autenticação e Autorização

### Fluxo de Autenticação

```
1. Login Request
   POST /api/auth/login
   Body: { email, password, rememberMe }
   
2. Backend Validation
   - Busca usuário no DB por email
   - Compara password_hash com bcrypt
   - Gera JWT token
   
3. Response
   {
     success: true,
     token: "eyJhbGciOi...",
     user: { id, name, email }
   }
   
4. Frontend Storage
   localStorage.setItem('jiumetrics_token', token)
   localStorage.setItem('jiumetrics_user', JSON.stringify(user))
   
5. Subsequent Requests
   Authorization: Bearer eyJhbGciOi...
```

### JWT Token Structure

```javascript
{
  userId: "uuid-123-456",
  email: "user@example.com",
  iat: 1702500000,  // Issued at
  exp: 1703104800   // Expires (7 ou 30 dias)
}
```

### Middleware de Autenticação

```javascript
// server/src/middleware/auth.js
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido' });
  }
};
```

## 🤖 Integração com Google Gemini AI

### Arquitetura da Integração

```
Frontend (Settings)
    ↓
Select AI Model → localStorage('ai_model')
    ↓
Video Upload / Strategy Request
    ↓
Backend receives: { data, model: 'gemini-2.0-flash' }
    ↓
geminiService.js
    ├─→ getModel(modelName) // Instancia modelo dinamicamente
    │
    ├─→ analyzeFrame(imageUrl, context, customModel)
    │   └─→ Gemini Vision API
    │       └─→ Analisa técnicas, posições, movimentos
    │
    ├─→ generateTacticalStrategy(athleteData, opponentData, customModel)
    │   └─→ Gemini Text API
    │       └─→ Gera plano de luta personalizado
    │
    └─→ generateAthleteSummary(athleteData, customModel)
        └─→ Gemini Text API
            └─→ Cria resumo técnico do atleta
```

### Modelos Disponíveis

| Modelo | Características | Uso |
|--------|----------------|-----|
| `gemini-2.0-flash-exp` | Rápido, eficiente | Padrão - análises gerais |
| `gemini-2.5-pro` | Mais preciso, detalhado | Estratégias complexas |
| `gemini-3.0` | Experimental | Testes |

### Prompt Engineering

**Análise de Vídeo:**
```
Você é um Analista de Jiu-Jitsu especializado.
Analise este frame de vídeo:
- Cor do kimono: [branco/azul]
- Contexto: [atleta/adversário]

Identifique:
1. Posição atual
2. Técnicas sendo aplicadas
3. Pontos fortes demonstrados
4. Vulnerabilidades expostas
```

**Geração de Estratégia:**
```
Você é um Coach de Jiu-Jitsu de nível mundial.

ATLETA:
- Nome: [nome]
- Atributos: [técnica, agressividade, etc]
- Resumo: [análises anteriores]

ADVERSÁRIO:
- Nome: [nome]
- Atributos: [técnica, agressividade, etc]
- Resumo: [análises anteriores]

Crie um plano tático COMPLETO em JSON:
{
  "pontos_fortes_atleta": [...],
  "pontos_fracos_adversario": [...],
  "estrategia_para_vencer": "...",
  "taticas_especificas": "...",
  ...
}
```

## 📊 Processamento de Vídeos

### Fluxo de Processamento

```
1. Upload do Vídeo
   Frontend → Multer (Backend)
   ├─→ Salva temporariamente em /uploads
   └─→ Valida formato e tamanho
   
2. Extração de Frames
   FFmpeg
   ├─→ Captura frames em intervalos (ex: 1 frame/5s)
   ├─→ Converte para base64
   └─→ Retorna array de frames
   
3. Análise de Cada Frame
   Para cada frame:
   ├─→ Envia para Gemini Vision
   ├─→ Recebe análise (posição, técnicas)
   └─→ Agrega resultados
   
4. Consolidação
   ├─→ Agrupa análises por técnica
   ├─→ Identifica padrões
   ├─→ Calcula estatísticas
   └─→ Gera resumo final
   
5. Salvamento
   ├─→ Salva análise no banco (fight_analyses)
   ├─→ Vincula ao atleta/adversário
   ├─→ Atualiza ai_summary se aplicável
   └─→ Remove arquivo temporário
   
6. Resposta
   Frontend recebe análise completa + gráficos
```

### Estrutura de Análise

```javascript
{
  id: 123,
  videoUrl: "https://...",
  kimonoColor: "azul",
  frames: [
    {
      timestamp: "00:00:05",
      position: "Guarda Fechada",
      techniques: ["Armlock setup", "Triangle attempt"],
      notes: "Boa postura, braços protegidos"
    },
    // ... mais frames
  ],
  summary: {
    dominantPositions: ["Guarda Fechada", "Montada"],
    mostUsedTechniques: ["Triangle", "Armbar"],
    strengths: ["Controle de distância", "Finalização"],
    weaknesses: ["Passagem de guarda", "Scrambles"]
  },
  charts: {
    positionDistribution: {...},
    techniqueFrequency: {...}
  }
}
```

## 🔄 Estado e Sincronização

### Frontend State Management

**Sem Redux/Context** - Estado local com React useState/useEffect

```jsx
function Athletes() {
  const [athletes, setAthletes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    fetchAthletes();
  }, []);
  
  const fetchAthletes = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await athleteService.getAllAthletes();
      setAthletes(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    // UI baseada em athletes, loading, error
  );
}
```

### Cache Strategy

**LocalStorage:**
- `jiumetrics_token` - JWT token (persistente)
- `jiumetrics_user` - User data (persistente)
- `ai_model` - Modelo AI selecionado (persistente)

**Session (Memory):**
- Listas de atletas/adversários (re-fetch a cada navegação)
- Análises de vídeo (re-fetch)

## 🚀 Deploy e CI/CD

### Pipeline de Deploy

```
Git Push (main)
    ↓
GitHub Actions (CI)
    ├─→ Frontend Tests (Vitest)
    ├─→ Backend Tests (Jest)
    ├─→ Lint (ESLint)
    ├─→ Security Scan (npm audit)
    ├─→ Code Quality (CodeQL)
    └─→ Lighthouse (Performance)
    
    ✓ All Checks Pass
    ↓
Deploy (Parallel)
    ├─→ Frontend → GitHub Pages
    │   ├─→ npm run build
    │   ├─→ Deploy to gh-pages branch
    │   └─→ Live: https://lucasxtech.github.io/JiuMetrics/
    │
    └─→ Backend → Vercel
        ├─→ Vercel build
        ├─→ Deploy to production
        └─→ Live: https://jiu-metrics-backend.vercel.app/api
```

### Workflows

1. **ci.yml** - Testes e builds
2. **code-quality.yml** - Security e quality
3. **performance.yml** - Lighthouse audits
4. **deploy.yml** - Deploy automático

## 📈 Performance

### Otimizações Implementadas

**Frontend:**
- Code splitting (React.lazy)
- Image optimization
- Gzip compression
- CDN via GitHub Pages
- Lazy loading de componentes

**Backend:**
- Connection pooling (Supabase)
- Response compression
- JWT stateless (sem session DB)
- File cleanup após processamento

**Database:**
- Índices em colunas frequentes (user_id, email)
- Queries otimizadas com joins
- Row Level Security (RLS)

## 🔒 Segurança

### Medidas Implementadas

1. **SQL Injection**: Prevenido por Supabase (queries parametrizadas)
2. **XSS**: React escapa automaticamente
3. **CSRF**: JWT stateless (não usa cookies)
4. **Password Security**: bcrypt com salt
5. **CORS**: Configurado para origens específicas
6. **Rate Limiting**: Implementado no Vercel
7. **Input Validation**: Backend e frontend
8. **JWT Expiration**: 7 ou 30 dias
9. **HTTPS**: Obrigatório em produção
10. **Secrets Management**: Variáveis de ambiente

---

**Última atualização:** 12 de dezembro de 2025
