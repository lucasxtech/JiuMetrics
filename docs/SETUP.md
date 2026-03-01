# 🚀 Setup e Inicialização - JiuMetrics

Guia completo para configurar e iniciar o projeto do zero.

---

## ⚡ Quick Start (5 minutos)

```bash
# 1. Clone o repositório
git clone https://github.com/lucasxtech/JiuMetrics.git
cd JiuMetrics

# 2. Configure o Backend
cd server
npm install
cp .env.example .env
# Edite .env com suas credenciais (ver seção abaixo)

# 3. Configure o Frontend (novo terminal)
cd ../frontend
npm install
cp .env.example .env
# Edite .env

# 4. Inicie o Backend
cd ../server
npm run dev
# Servidor rodando em http://localhost:5050

# 5. Inicie o Frontend (novo terminal)
cd frontend
npm run dev
# Acesse http://localhost:5173
```

---

## 📋 Pré-requisitos

- **Node.js** 18+ e npm/yarn
- Conta no **Supabase** (banco de dados)
- **Google Gemini API Key** (análise de IA)

---

## 🔧 Configuração do Ambiente

### 1. Variáveis de Ambiente - Backend

Crie `server/.env` com:

```env
# Servidor
PORT=5050
NODE_ENV=development

# Supabase (Banco de Dados)
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Google Gemini AI
GEMINI_API_KEY=AIzaSy...

# JWT (Autenticação)
JWT_SECRET=seu-secret-super-seguro-aqui
JWT_EXPIRES_IN=7d
```

**Como obter as credenciais:**

- **Supabase:** https://supabase.com/dashboard → Project Settings → API
- **Gemini:** https://aistudio.google.com/app/apikey

### 2. Variáveis de Ambiente - Frontend

Crie `frontend/.env` com:

```env
VITE_API_URL=http://localhost:5050/api
```

---

## 🗄️ Configuração do Banco de Dados (Supabase)

### Passo 1: Execute as Migrações

1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **SQL Editor** → **New Query**
4. Execute os arquivos SQL na ordem:

```bash
server/migrations/
  001-schema.sql              # Tabelas principais (athletes, opponents, analyses)
  002-add-user-id.sql         # Sistema de autenticação
  003-api-usage.sql           # Rastreamento de custos da API
  007-tactical-analyses.sql   # Sistema de estratégias
  010-ai-chat-sessions.sql    # Chat com IA
  016-strategy-versions.sql   # Versionamento de estratégias
```

### Passo 2: Verifique as Tabelas

No **Table Editor**, você deve ver:

- ✅ `users` - Usuários do sistema
- ✅ `athletes` - Atletas cadastrados
- ✅ `opponents` - Adversários
- ✅ `fight_analyses` - Análises de lutas
- ✅ `tactical_analyses` - Estratégias táticas
- ✅ `ai_chat_sessions` - Histórico de conversas IA
- ✅ `analysis_versions` - Versionamento
- ✅ `api_usage` - Custos da API Gemini

### Passo 3: Teste a Conexão

```bash
cd server
node test-connection.js
# Deve retornar: ✅ Conexão com Supabase OK!
```

---

## 🔐 Sistema de Autenticação

### SQL - Criar Tabela de Usuários

Se não executou as migrações acima, execute manualmente:

```sql
-- Criar tabela de usuários
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para email
CREATE INDEX idx_users_email ON users(email);

-- RLS (Row Level Security)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir registro de novos usuários"
ON users FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir leitura de usuários"
ON users FOR SELECT USING (true);

CREATE POLICY "Permitir atualização de usuários"
ON users FOR UPDATE USING (true);
```

### Criar Primeiro Usuário

```bash
# Via terminal (Node.js)
cd server
node -e "const bcrypt = require('bcrypt'); console.log(bcrypt.hashSync('senha123', 10));"
```

Depois, no Supabase SQL Editor:

```sql
INSERT INTO users (name, email, password_hash)
VALUES ('Seu Nome', 'seu@email.com', 'hash-gerado-acima');
```

Ou use a interface de registro em `/login` no frontend.

---

## 💰 Sistema de Rastreamento de Custos (API Gemini)

### Passo 1: Executar SQL

Execute `server/migrations/003-api-usage.sql` no Supabase SQL Editor (ou copie abaixo):

```sql
CREATE TABLE api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  endpoint VARCHAR(100) NOT NULL,
  model_name VARCHAR(100),
  input_tokens INTEGER,
  output_tokens INTEGER,
  total_tokens INTEGER,
  input_cost DECIMAL(10,6),
  output_cost DECIMAL(10,6),
  total_cost DECIMAL(10,6),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_api_usage_user_id ON api_usage(user_id);
CREATE INDEX idx_api_usage_created_at ON api_usage(created_at);
CREATE INDEX idx_api_usage_endpoint ON api_usage(endpoint);
```

### Passo 2: Verificar Custos

Acesse `/settings` no frontend e veja:
- 💵 Custo total
- 🔢 Tokens usados
- 📊 Breakdown por modelo e operação
- 📅 Filtros por período

**Tabela de Preços Gemini (2024):**

| Modelo | Input (1M tokens) | Output (1M tokens) |
|--------|-------------------|-------------------|
| gemini-2.0-flash | $0.075 | $0.30 |
| gemini-2.5-pro | $1.25 | $5.00 |

---

## 🎮 Como Usar a Aplicação

### Primeiro Acesso

1. **Registro:** Acesse `/login` → "Criar conta"
2. **Login:** Entre com suas credenciais
3. **Dashboard:** Veja visão geral do sistema

### Fluxo Básico

1. **Cadastrar Atletas:** `/athletes` → "Novo Atleta"
2. **Cadastrar Adversários:** `/opponents` → "Novo Adversário"
3. **Criar Análise:** Envie vídeo ou link para análise com IA
4. **Gerar Estratégia:** Sistema cria plano tático automaticamente
5. **Refinar com IA:** Use o chat para ajustar estratégias
6. **Comparar:** `/compare` para análise lado a lado

### Principais Páginas

- **Dashboard (`/`)** - Visão geral, estatísticas, gráficos
- **Atletas (`/athletes`)** - CRUD de atletas, perfis completos
- **Adversários (`/opponents`)** - Gerenciamento de oponentes
- **Análises (`/analyses`)** - Histórico de análises e estratégias
- **Comparador (`/compare`)** - Comparação visual atleta vs adversário
- **Configurações (`/settings`)** - Custos da API, configurações

---

## 🔨 Desenvolvimento

### Scripts Disponíveis

**Backend:**
```bash
npm run dev          # Desenvolvimento com nodemon
npm start            # Produção
npm test             # Testes unitários
npm run test:watch   # Testes em watch mode
```

**Frontend:**
```bash
npm run dev          # Desenvolvimento com Vite
npm run build        # Build de produção
npm run preview      # Preview do build
npm run lint         # ESLint
npm test             # Testes com Vitest
```

**Testes E2E (Playwright):**
```bash
cd playwright
npm test             # Rodar todos os testes
npm run test:ui      # Interface visual
npm run test:debug   # Debug mode
```

### Estrutura de Pastas

```
server/src/
├── config/          # Configurações (AI, database)
├── controllers/     # Lógica de negócio
├── middleware/      # Autenticação, validação
├── models/          # Camada de dados (Supabase)
├── routes/          # Definição de rotas
├── services/        # Serviços externos (Gemini AI)
│   └── prompts/     # Arquivos .txt de prompts
└── utils/           # Helpers, errors, logging

frontend/src/
├── components/      # Componentes React reutilizáveis
├── pages/           # Páginas principais
├── services/        # API calls
├── hooks/           # Custom hooks
└── utils/           # Helpers do frontend
```

---

## 🐛 Troubleshooting

### Erro: "Invalid API key" (Supabase)

1. Vá em Project Settings → API no Supabase
2. Copie a **anon/public key** novamente
3. Atualize `server/.env` → `SUPABASE_ANON_KEY`
4. Reinicie o servidor

### Erro: "Quota exceeded" (Gemini)

1. Verifique billing no Google Cloud Console
2. Implemente rate limiting (já configurado em `server/src/middleware/rateLimiter.js`)
3. Monitore custos em `/settings`

### Erro: "Port already in use"

```bash
# Matar processo na porta 5050 (backend)
lsof -ti:5050 | xargs kill -9

# Ou porta 5173 (frontend)
lsof -ti:5173 | xargs kill -9
```

### Tabelas não aparecem no Supabase

Execute as migrações manualmente, uma por vez, verificando erros no SQL Editor.

### Frontend não conecta ao Backend

1. Confirme que backend está rodando: `curl http://localhost:5050/api/health`
2. Verifique CORS em `server/index.js`
3. Confirme `VITE_API_URL` em `frontend/.env`

---

## 📖 Próximos Passos

Após o setup:

1. **Leia:** [ARCHITECTURE.md](ARCHITECTURE.md) - Entenda a arquitetura
2. **Explore:** [API.md](API.md) - Documentação da API REST
3. **Contribua:** [CONTRIBUTING.md](CONTRIBUTING.md) - Guia de contribuição
4. **Deploy:** [DEPLOY.md](DEPLOY.md) - Como fazer deploy

---

## 📞 Suporte

- **Issues:** https://github.com/lucasxtech/JiuMetrics/issues
- **Docs:** https://github.com/lucasxtech/JiuMetrics/tree/main/docs
- **Email:** lucas@example.com
