# 📊 Resumo da Arquitetura

## Árvore de Arquivos Completa

```
projeto analise atletas/
│
├── README.md                    # Documentação principal
├── CODE_REVIEW.md               # Análise e melhorias do código
├── CONTRIBUTING.md              # Guia de contribuição
├── Makefile                     # Comandos de desenvolvimento
├── package.json                 # Configuração raiz
│
├── frontend/                    # Aplicação React Vite
│   ├── public/                  # Arquivos estáticos
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/
│   │   │   │   ├── Header.jsx              # Navegação principal
│   │   │   │   ├── AthleteCard.jsx         # Card de atleta
│   │   │   │   ├── LoadingSpinner.jsx      # Spinner de loading
│   │   │   │   ├── ErrorMessage.jsx        # Mensagem de erro
│   │   │   │   ├── Badge.jsx               # Tag/badge reutilizável
│   │   │   │   └── FormattedText.jsx       # Texto com markdown
│   │   │   ├── analysis/
│   │   │   │   ├── AiStrategyBox.jsx       # Estratégia IA com edição
│   │   │   │   ├── StrategySummaryModal.jsx # Modal de estratégia
│   │   │   │   ├── AnalysisCard.jsx        # Card de análise
│   │   │   │   └── AnalysisDetailModal.jsx # Modal detalhes
│   │   │   ├── chat/
│   │   │   │   ├── ProfileChatPanel.jsx    # Chat para perfis
│   │   │   │   └── StrategyChatPanel.jsx   # Chat para estratégias
│   │   │   ├── forms/
│   │   │   │   └── AthleteForm.jsx         # Formulário de atleta
│   │   │   ├── charts/
│   │   │   │   ├── StatsRadarChart.jsx     # Gráfico radar
│   │   │   │   ├── StatsLineChart.jsx      # Gráfico de linha
│   │   │   │   ├── StatsBarChart.jsx       # Gráfico de barras
│   │   │   │   └── PieChartSection.jsx     # Gráfico de pizza
│   │   │   ├── video/
│   │   │   │   ├── VideoAnalysis.jsx       # Análise de vídeo
│   │   │   │   └── VideoAnalysisCard.jsx   # Card de vídeo
│   │   │   └── routing/
│   │   │       └── ProtectedRoute.jsx      # Rota protegida
│   │   │
│   │   ├── pages/
│   │   │   ├── Overview.jsx                # Dashboard principal
│   │   │   ├── Athletes.jsx                # Listagem de atletas
│   │   │   ├── AthleteDetail.jsx           # Detalhe do atleta
│   │   │   ├── Opponents.jsx               # Listagem de adversários
│   │   │   ├── Analyses.jsx                # Histórico de análises
│   │   │   ├── Strategy.jsx                # Estratégia com IA
│   │   │   ├── VideoAnalysis.jsx           # Análise de vídeos
│   │   │   ├── Settings.jsx                # Configurações
│   │   │   ├── ModernLogin.jsx             # Tela de login
│   │   │   └── Register.jsx                # Tela de cadastro
│   │   │
│   │   ├── services/
│   │   │   ├── api.js                      # Configuração Axios
│   │   │   ├── athleteService.js           # CRUD de atletas
│   │   │   ├── opponentService.js          # CRUD de adversários
│   │   │   ├── analysisService.js          # Análises táticas
│   │   │   ├── chatService.js              # Chat IA
│   │   │   ├── strategyService.js          # Estratégias
│   │   │   ├── aiService.js                # Serviço de IA
│   │   │   └── authService.js              # Autenticação
│   │   │
│   │   ├── hooks/                          # Custom hooks
│   │   │
│   │   ├── utils/
│   │   │   ├── strategyUtils.js            # Manipulação de estratégias
│   │   │   └── formatters.js               # Formatação de texto
│   │   │
│   │   ├── App.jsx                         # Router principal
│   │   ├── index.css                       # Estilos globais (Tailwind)
│   │   └── main.jsx                        # Entry point
│   │
│   ├── .env                    # Variáveis de ambiente
│   ├── tailwind.config.js      # Configuração Tailwind 4
│   ├── vite.config.js          # Configuração Vite
│   └── package.json            # Dependências do frontend
│
├── server/                     # Backend Express
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── athleteController.js        # Lógica de atletas
│   │   │   ├── opponentController.js       # Lógica de adversários
│   │   │   ├── strategyController.js       # Lógica de estratégias
│   │   │   ├── chatController.js           # Lógica de chat IA
│   │   │   └── aiController.js             # Lógica de IA
│   │   │
│   │   ├── models/
│   │   │   ├── Athlete.js                  # Modelo de atleta
│   │   │   ├── Opponent.js                 # Modelo de adversário
│   │   │   └── TacticalAnalysis.js         # Modelo de análises
│   │   │
│   │   ├── routes/
│   │   │   ├── athletes.js                 # Rotas de atletas
│   │   │   ├── opponents.js                # Rotas de adversários
│   │   │   ├── strategy.js                 # Rotas de estratégias
│   │   │   ├── chat.js                     # Rotas de chat
│   │   │   └── ai.js                       # Rotas de IA
│   │   │
│   │   ├── services/
│   │   │   └── geminiService.js            # Integração Google Gemini
│   │   │
│   │   └── middleware/                     # Auth & validações
│   │
│   ├── migrations/             # SQLs do Supabase (001-016)
│   ├── tests/                  # Testes de integração
│   ├── index.js                # Servidor principal
│   ├── config.js               # Configurações
│   └── package.json            # Dependências do backend
│
├── scripts/                    # Scripts de desenvolvimento
│   ├── dev.sh                  # Comandos dev
│   ├── start.sh                # Iniciar app
│   └── startup-info.sh         # Documentação interativa
│
├── tools/                      # Ferramentas de debug
│   ├── api-requests.http       # Requests HTTP
│   └── TEST_TOKEN.js           # Teste de autenticação
│
└── docs/                       # Documentação
    ├── API.md                  # Documentação da API
    ├── architecture.md         # Este arquivo
    ├── DEVELOPMENT.md          # Guia de desenvolvimento
    ├── quick-start.md          # Início rápido
    ├── setup/                  # Guias de configuração
    ├── deployment/             # Guias de deploy
    └── guides/                 # Guias de uso
```

---

## Fluxo de Dados

### 1. Criação de Atleta

```
Frontend (AthleteForm)
    ↓
athleteService.createAthlete()
    ↓
POST /api/athletes
    ↓
athleteController.create()
    ↓
Athlete.create() (modelo em memória)
    ↓
Resposta com novo atleta
    ↓
Frontend atualiza lista
```

### 2. Geração de Estratégia

```
Frontend (Strategy page)
    ↓
User seleciona atleta e adversário
    ↓
aiService.analyzeStrategy()
    ↓
POST /api/ai/strategy {athlete, opponent}
    ↓
aiController.generateStrategy()
    ↓
generateMockStrategy() (lógica de IA)
    ↓
AiStrategyBox renderiza resultado
```

### 3. Sistema de Chat IA

O sistema de chat permite refinamento de conteúdo com IA em três contextos:

```
┌─────────────────────────────────────────────────────────────────┐
│                     SISTEMA DE CHAT IA                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   ANÁLISES      │  │   PERFIS        │  │   ESTRATÉGIAS   │  │
│  │   AiChatPanel   │  │ ProfileChatPanel│  │StrategyChatPanel│  │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘  │
│           │                    │                    │           │
│           ▼                    ▼                    ▼           │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    chatService.js                           ││
│  │  - createSession()          - sendMessage()                 ││
│  │  - applyEditSuggestion()    - saveManualEdit()             ││
│  │  - getVersions()            - restoreVersion()             ││
│  └─────────────────────────────────────────────────────────────┘│
│                              │                                  │
│                              ▼                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                  chatController.js                          ││
│  │  Endpoints: /chat/session, /chat/send, /chat/apply-edit    ││
│  │             /chat/profile-*, /chat/strategy-*              ││
│  └─────────────────────────────────────────────────────────────┘│
│                              │                                  │
│                              ▼                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                   geminiService.js                          ││
│  │  - Prompts especializados por contexto                     ││
│  │  - Mapeamento de campos para estratégias                   ││
│  │  - Retorno estruturado: {field, newValue, reason}          ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Fluxo de Edição por Chat (Estratégias):**

```
1. Usuário pede: "refaça o checklist tático"
                    ↓
2. IA identifica campo via palavras-chave
   "checklist" → checklist_tatico
                    ↓
3. IA retorna: { field: "checklist_tatico", newValue: "...", reason: "..." }
                    ↓
4. Frontend recebe via onPendingEdit
                    ↓
5. EditableText do campo correspondente exibe DIFF
                    ↓
6. Usuário aceita → Estratégia atualizada + Versão salva
   ou rejeita → Diff removido
```

**Campos de Estratégia e Mapeamento:**

| Campo | Palavras-chave no pedido |
|-------|-------------------------|
| `como_vencer` (em resumo_rapido) | tese, vencer, vitória, ganhar, como vencer |
| `plano_tatico_faseado` | plano, faseado, fases, etapas |
| `cronologia_inteligente` | cronologia, tempo, timeline, minutos |
| `analise_de_matchup` | matchup, versus, comparação, vantagens |
| `checklist_tatico` | checklist, lista, não fazer, proibido |

**Sistema de Versionamento:**

O chat integra versionamento automático - cada edição aplicada cria uma nova versão:

```
1. Usuário pede alteração no chat
                    ↓
2. IA gera sugestão de edição
                    ↓
3. Usuário aceita → Conteúdo atualizado
                    ↓
4. Sistema cria registro de versão automaticamente
   - Timestamp
   - Snapshot completo do conteúdo
   - Usuário que fez a mudança
                    ↓
5. Histórico fica disponível em VersionHistoryPanel
   - Comparação visual (diff)
   - Restauração com um clique
```

**Endpoints de Versionamento:**
- `GET /chat/versions/:type/:id` - Lista histórico
- `POST /chat/restore-version/:type/:id` - Restaura versão específica

**Modelos:** AnalysisVersion, ProfileVersion, StrategyVersion

---

### 4. Sistema de Cost Tracking

O sistema registra e monitora o uso da API do Google Gemini para controle de custos:

```
┌─────────────────────────────────────────────────────────────────┐
│                    COST TRACKING SYSTEM                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Cada chamada à API Gemini gera um registro:                   │
│  - Endpoint usado (/ai/analyze-video, /chat/send, etc)         │
│  - Tokens de entrada (promptTokenCount)                        │
│  - Tokens de saída (candidatesTokenCount)                      │
│  - Tokens totais (totalTokenCount)                             │
│  - Timestamp                                                    │
│  - User ID                                                      │
│                                                                 │
│  ┌──────────────────────────┐                                  │
│  │   ApiUsage Model         │                                  │
│  │  (Supabase: api_usage)   │                                  │
│  └──────────┬───────────────┘                                  │
│             │                                                   │
│             ▼                                                   │
│  ┌──────────────────────────┐                                  │
│  │ apiUsageLogger.js        │                                  │
│  │  logApiUsage()           │                                  │
│  └──────────┬───────────────┘                                  │
│             │                                                   │
│             ▼                                                   │
│  ┌──────────────────────────┐                                  │
│  │ usageController.js       │                                  │
│  │  GET /usage/stats        │ ← Estatísticas de uso           │
│  │  GET /usage/pricing      │ ← Cálculo de custos             │
│  └──────────────────────────┘                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Tabela `api_usage`:**
```sql
CREATE TABLE api_usage (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  endpoint TEXT NOT NULL,
  input_tokens INTEGER,
  output_tokens INTEGER,
  total_tokens INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Cálculo de Custos (Gemini 1.5 Pro):**
- Input: $0,00125 / 1K tokens
- Output: $0,005 / 1K tokens

### 5. Comparação

```
Frontend (Compare page)
    ↓
User seleciona dois atletas
    ↓
CompareView renderiza
    ↓
RadarChart duplo mostra diferenças
    ↓
Análise lado a lado
```

---

## Dependências Principais

### Frontend
| Pacote | Versão | Uso |
|--------|--------|-----|
| react | ^19.2.0 | Framework |
| react-router-dom | ^6.20.0 | Roteamento |
| axios | ^1.6.2 | HTTP client |
| recharts | ^2.10.3 | Gráficos |
| tailwindcss | ^4.1.17 | Estilos |

### Backend
| Pacote | Versão | Uso |
|--------|--------|-----|
| express | ^4.18.2 | Framework web |
| @google/generative-ai | ^0.21.0 | Google Gemini API |
| @supabase/supabase-js | ^2.39.0 | Database & Auth |
| cors | latest | CORS middleware |
| multer | ^1.4.5-lts.1 | Upload de arquivos |
| uuid | latest | ID generation |
| dotenv | latest | Variáveis de env |
| nodemon | dev | Auto-reload |

---

## Padrões Implementados

### Frontend
- **Component-Based**: Componentes reutilizáveis e modulares
- **Service Layer**: Separação da lógica de API
- **Router Pattern**: React Router para navegação
- **Responsive Design**: Mobile-first com Tailwind

### Backend
- **MVC Pattern**: Models, Controllers, Routes
- **RESTful API**: Endpoints seguindo convenções REST
- **Error Handling**: Tratamento centralizado de erros com classes customizadas
- **Supabase**: PostgreSQL com Row Level Security (RLS)
- **AI Integration**: Google Gemini API com prompts especializados
- **Cost Tracking**: Monitoramento automático de uso da API

---

## Escalabilidade Futura

### Curto Prazo
- [ ] Upload de vídeos (Cloudinary/S3)
- [ ] Análise automática de vídeos via Gemini 2.0
- [ ] Sistema de notificações em tempo real
- [ ] Testes E2E completos (Playwright)

### Médio Prazo
- [ ] Histórico de lutas e estatísticas
- [ ] Sistema de ranking de atletas
- [ ] Exportação de relatórios (PDF)
- [ ] WebSocket para updates em tempo real

### Longo Prazo
- [ ] Mobile app (React Native)
- [ ] Análise de vídeo frame-by-frame
- [ ] Machine Learning customizado para Jiu-Jitsu
- [ ] Marketplace de estratégias

---

## Variáveis de Ambiente

### Frontend (.env)
```
VITE_API_URL=http://localhost:5050/api
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon
```

### Backend (.env)
```
PORT=5050
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173

# Google Gemini AI
GOOGLE_API_KEY=sua-api-key-do-google

# Supabase
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key
SUPABASE_JWT_SECRET=seu-jwt-secret
```

---

## Scripts Disponíveis

### Frontend
```bash
npm run dev          # Iniciar Vite dev server
npm run build        # Build para produção
npm run preview      # Visualizar build
npm run lint         # Verificar código
```

### Backend
```bash
npm run dev          # Iniciar com nodemon
npm run start        # Iniciar modo produção
```

---

## Recursos Implementados

### ✅ Completados
- [x] Estrutura React 19 + Vite
- [x] Tailwind CSS 4 configurado
- [x] React Router com páginas completas
- [x] Componentes base reutilizáveis (Badge, FormattedText, etc)
- [x] Gráficos com Recharts
- [x] Backend Express com Supabase
- [x] CRUD de atletas e adversários
- [x] IA com Google Gemini
- [x] Chat IA para perfis e estratégias
- [x] Edição manual de estratégias
- [x] Histórico de versões
- [x] Sistema de análises táticas
- [x] Autenticação com Supabase Auth
- [x] API REST completa
- [x] Documentação completa
- [x] Utilitários centralizados (strategyUtils, formatters)

### ⏳ Em Desenvolvimento
- [ ] Testes unitários completos
- [ ] Upload de vídeos (Cloudinary)

### 📋 Próximos
- [ ] Mobile app
- [ ] Analytics avançado
- [ ] Machine Learning customizado

---

## Performance Target

| Métrica | Target |
|---------|--------|
| First Paint | < 1s |
| TTI | < 2s |
| LCP | < 2.5s |
| API Response | < 200ms |
| Bundle Size | < 500kb |

---

## Suporte e Contribuições

Para contribuições, siga o padrão de commit:
```
feat: descrição
fix: descrição
docs: descrição
refactor: descrição
```

---

**Última atualização:** Janeiro 2025
**Versão:** 2.0.0
**Status:** ✅ Em produção
**IA:** Google Gemini API
**Database:** Supabase (PostgreSQL)
