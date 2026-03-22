# 📊 Resumo da Arquitetura

## Árvore de Arquivos Completa

```
projeto analise atletas/
│
├── README.md
├── Makefile
├── package.json
│
├── frontend/                    # Aplicação React + Vite
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/
│   │   │   │   ├── Header.jsx
│   │   │   │   ├── AthleteCard.jsx
│   │   │   │   ├── LoadingSpinner.jsx
│   │   │   │   ├── ErrorMessage.jsx
│   │   │   │   ├── Badge.jsx
│   │   │   │   └── FormattedText.jsx
│   │   │   ├── analysis/
│   │   │   │   ├── AiStrategyBox.jsx       # Estratégia IA com diff/edição
│   │   │   │   ├── StrategySummaryModal.jsx
│   │   │   │   ├── AnalysisCard.jsx        # Preview de análise
│   │   │   │   └── AnalysisDetailModal.jsx
│   │   │   ├── chat/
│   │   │   │   ├── AiChatPanel.jsx         # Chat para análises
│   │   │   │   ├── ProfileChatPanel.jsx    # Chat para perfis
│   │   │   │   └── StrategyChatPanel.jsx   # Chat para estratégias
│   │   │   ├── version/
│   │   │   │   └── VersionHistoryPanel.jsx # Histórico de versões
│   │   │   ├── video/
│   │   │   │   ├── VideoAnalysis.jsx       # Consome AnalysisProgressContext
│   │   │   │   └── VideoAnalysisCard.jsx
│   │   │   ├── forms/
│   │   │   │   └── AthleteForm.jsx
│   │   │   └── charts/
│   │   │       ├── StatsRadarChart.jsx
│   │   │       ├── StatsLineChart.jsx
│   │   │       └── PieChartSection.jsx
│   │   │
│   │   ├── contexts/                       # Estado global (React Context)
│   │   │   ├── AnalysisProgressContext.jsx # Estado da análise de vídeo em curso
│   │   │   └── StrategyContext.jsx         # Estado da estratégia gerada
│   │   │
│   │   ├── pages/
│   │   │   ├── Overview.jsx
│   │   │   ├── Athletes.jsx
│   │   │   ├── AthleteDetail.jsx           # Resumo técnico + "Gerar com IA"
│   │   │   ├── Opponents.jsx
│   │   │   ├── Analyses.jsx
│   │   │   ├── Strategy.jsx                # Consome StrategyContext
│   │   │   ├── Settings.jsx                # Monitoramento de custos da API
│   │   │   ├── ModernLogin.jsx
│   │   │   └── Register.jsx
│   │   │
│   │   ├── services/
│   │   │   ├── api.js
│   │   │   ├── athleteService.js
│   │   │   ├── opponentService.js
│   │   │   ├── analysisService.js
│   │   │   ├── chatService.js
│   │   │   ├── strategyService.js
│   │   │   ├── aiService.js
│   │   │   ├── usageService.js             # Estatísticas de custo da API
│   │   │   └── authService.js
│   │   │
│   │   ├── utils/
│   │   │   ├── strategyUtils.js
│   │   │   └── formatters.js
│   │   │
│   │   ├── App.jsx                         # Wrapped com providers de contexto
│   │   ├── index.css
│   │   └── main.jsx
│   │
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── package.json
│
├── server/                      # Backend Express
│   ├── src/
│   │   ├── config/
│   │   │   └── ai.js                       # Constantes: DEFAULT_MODEL, AGENT_CONFIG,
│   │   │                                   #   STRATEGY_AGENT_CONFIG, BELT_RULES
│   │   │
│   │   ├── controllers/
│   │   │   ├── athleteController.js
│   │   │   ├── opponentController.js
│   │   │   ├── fightAnalysisController.js  # Auto-regenera technicalSummary pós criar/deletar
│   │   │   ├── strategyController.js
│   │   │   ├── strategyVersionController.js
│   │   │   ├── chatController.js
│   │   │   ├── aiController.js             # consolidate-profile, athlete-summary
│   │   │   └── usageController.js          # Estatísticas e preços da API
│   │   │
│   │   ├── models/
│   │   │   ├── Athlete.js
│   │   │   ├── Opponent.js
│   │   │   ├── FightAnalysis.js
│   │   │   ├── ChatSession.js
│   │   │   ├── AnalysisVersion.js
│   │   │   ├── ProfileVersion.js
│   │   │   ├── StrategyVersion.js
│   │   │   └── ApiUsage.js                 # Registro e cálculo de custos
│   │   │
│   │   ├── routes/
│   │   │   ├── athletes.js
│   │   │   ├── opponents.js
│   │   │   ├── fightAnalysis.js
│   │   │   ├── strategy.js
│   │   │   ├── chatRoutes.js
│   │   │   ├── ai.js
│   │   │   └── usage.js
│   │   │
│   │   ├── services/
│   │   │   ├── geminiService.js            # Gemini + chat + multi-agentes
│   │   │   ├── strategyService.js          # Consolida análises + gera estratégia
│   │   │   ├── agents/                     # Sistema multi-agentes
│   │   │   │   ├── AgentBase.js            # Base com Vision (vídeo)
│   │   │   │   ├── TechnicalAgent.js
│   │   │   │   ├── TacticalAgent.js
│   │   │   │   ├── RulesAgent.js
│   │   │   │   ├── Orchestrator.js         # Orquestrador de vídeo (GPT-4)
│   │   │   │   ├── index.js
│   │   │   │   └── strategy/               # Multi-agentes de estratégia
│   │   │   │       ├── StrategyAgentBase.js # Base text-only
│   │   │   │       ├── ScoutAgent.js       # Analisa adversário
│   │   │   │       ├── GameplanAgent.js    # Cataloga arsenal do atleta
│   │   │   │       ├── StrategyRulesAgent.js # Valida regras IBJJF
│   │   │   │       ├── StrategyOrchestrator.js # GPT-4 consolida estratégia
│   │   │   │       └── index.js
│   │   │   └── prompts/                    # Todos os prompts em .txt
│   │   │       ├── video-analysis.txt
│   │   │       ├── agent-technical.txt
│   │   │       ├── agent-tactical.txt
│   │   │       ├── agent-rules.txt
│   │   │       ├── agent-orchestrator-video.txt
│   │   │       ├── athlete-summary.txt
│   │   │       ├── tactical-strategy.txt
│   │   │       ├── strategy-scout.txt
│   │   │       ├── strategy-gameplan.txt
│   │   │       ├── strategy-rules.txt
│   │   │       ├── strategy-orchestrator.txt
│   │   │       ├── chat-analysis.txt
│   │   │       ├── chat-profile.txt
│   │   │       └── chat-strategy.txt
│   │   │
│   │   ├── middleware/
│   │   │   └── auth.js
│   │   │
│   │   └── utils/
│   │       ├── errors.js
│   │       ├── errorHandler.js
│   │       ├── apiUsageLogger.js
│   │       ├── versionManager.js
│   │       └── dbParsers.js
│   │
│   ├── migrations/              # SQLs Supabase (001-016)
│   ├── index.js
│   └── package.json
│
├── playwright/                  # Testes E2E (TypeScript)
│   ├── pages/                   # Page Object Model
│   ├── fixtures/
│   └── tests/
│
├── scripts/
│   ├── dev.sh
│   └── start.sh
│
└── docs/
    ├── API.md
    ├── ARCHITECTURE.md
    ├── MULTI_AGENTS.md
    ├── ESTRATEGIAS.md
    ├── DEVELOPMENT.md
    ├── SETUP.md
    └── DEPLOY.md
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
Frontend (Strategy.jsx — consome StrategyContext)
    ↓
Usuário seleciona atleta + adversário → generateStrategy()
    ↓
POST /api/strategy/compare
    ↓
strategyController → strategyService.generateStrategy()
    ↓
Busca análises do atleta e adversário no banco
    ↓
Usa technicalSummary salvo (ou consolida na hora via IA)
    ↓
Se USE_MULTI_AGENTS=true:
  └→ generateTacticalStrategyWithAgents()
       ├── ScoutAgent (adversário)    ─┐
       ├── GameplanAgent (atleta)      ├─ paralelo
       └── StrategyRulesAgent (IBJJF) ─┘
           ↓
       StrategyOrchestrator (GPT-4) consolida JSON final
Se USE_MULTI_AGENTS=false:
  └→ generateTacticalStrategy() — prompt único Gemini
    ↓
AiStrategyBox renderiza resultado com chat + versões
```

### 2a. Resumo Técnico (Auto-geração)

```
Usuário envia vídeo → análise salva
    ↓ (fire-and-forget, não bloqueia resposta)
fightAnalysisController.createAnalysis()
    └→ refreshTechnicalSummary(personId, personType, userId)
        ↓
        strategyService.consolidateAnalyses() — consolida todas as análises via IA
        ↓
        Athlete/Opponent.update({ technicalSummary, technicalSummaryUpdatedAt })

Usuário deleta análise:
    ↓
fightAnalysisController.deleteAnalysis()
    ├── Se restam análises → refreshTechnicalSummary() (regenera)
    └── Se 0 análises → limpa technicalSummary (seta null)
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
