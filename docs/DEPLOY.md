# 🚀 Guia de Deploy - JiuMetrics

Guia completo para fazer deploy do frontend e backend em produção.

---

## 📋 Visão Geral

- **Frontend:** Static site (React + Vite) → Vercel, Netlify ou GitHub Pages
- **Backend:** Node.js API → Vercel, Railway, Render ou Heroku
- **Banco:** Supabase (já em cloud)
- **IA:** Google Gemini API (já em cloud)

---

## 🎨 Deploy do Frontend

### Opção 1: Vercel (Recomendado)

1. **Instalar Vercel CLI** (opcional)
   ```bash
   npm i -g vercel
   ```

2. **Via Interface Web:**
   - Acesse: https://vercel.com
   - Login com GitHub
   - Click em "New Project"
   - Selecione o repositório `JiuMetrics`
   - Configure:
     - **Framework:** Vite
     - **Root Directory:** `frontend`
     - **Build Command:** `npm run build`
     - **Output Directory:** `dist`
     - **Install Command:** `npm install`

3. **Environment Variables:**
   Adicione no painel da Vercel:
   ```
   VITE_API_URL=https://seu-backend.vercel.app/api
   ```

4. **Deploy:**
   - Click "Deploy"
   - Aguarde ~2-3 minutos
   - URL gerada: `https://jiumetrics.vercel.app`

**Via CLI:**
```bash
cd frontend
vercel
# Seguir instruções interativas
```

### Opção 2: Netlify

1. **Configurar**
   - Acesse: https://netlify.com
   - Conecte o repositório
   - Build Command: `npm run build`
   - Publish directory: `frontend/dist`
   - Base directory: `frontend`

2. **Environment Variables:**
   ```
   VITE_API_URL=https://seu-backend.com/api
   ```

3. **Deploy automático** em cada push para `main`

### Opção 3: GitHub Pages

**⚠️ Limitação:** Apenas static files (sem backend)

1. **Instalar gh-pages:**
   ```bash
   cd frontend
   npm install --save-dev gh-pages
   ```

2. **Adicionar scripts em `package.json`:**
   ```json
   {
     "scripts": {
       "predeploy": "npm run build",
       "deploy": "gh-pages -d dist"
     }
   }
   ```

3. **Deploy:**
   ```bash
   npm run deploy
   ```

4. **Ativar no GitHub:**
   - Settings → Pages
   - Source: `gh-pages` branch
   - URL: `https://usuario.github.io/JiuMetrics/`

---

## ⚙️ Deploy do Backend

### Opção 1: Vercel (Serverless)

**✅ Melhor para:** API leve, sem estado persistente

1. **Preparar projeto:**
   Certifique-se que existe `server/vercel.json`:
   ```json
   {
     "version": 2,
     "builds": [
       {
         "src": "index.js",
         "use": "@vercel/node"
       }
     ],
     "routes": [
       {
         "src": "/(.*)",
         "dest": "index.js"
       }
     ]
   }
   ```

2. **Deploy via Web:**
   - Acesse: https://vercel.com
   - New Project → Selecione o repositório
   - Configure:
     - **Project Name:** `jiumetrics-api`
     - **Root Directory:** `server`
     - **Framework Preset:** Other
     - **Build Command:** (deixe vazio)
     - **Install Command:** `npm install`

3. **Environment Variables:**
   ```
   NODE_ENV=production
   PORT=3000
   SUPABASE_URL=https://seu-projeto.supabase.co
   SUPABASE_ANON_KEY=sua_chave_aqui
   JWT_SECRET=seu_secret_aqui
   GEMINI_API_KEY=sua_api_key_aqui
   CORS_ORIGIN=https://seu-frontend.vercel.app
   ```

4. **Deploy:**
   - Click "Deploy"
   - URL gerada: `https://jiumetrics-api.vercel.app`

**⚠️ Limitações:**
- Timeout: 10s (plano grátis)
- No file uploads persistentes (use Supabase Storage)

### Opção 2: Railway (Recomendado para Backend Robusto)

**✅ Melhor para:** APIs com estado, uploads, long-running processes

1. **Preparar repositório:**
   ```bash
   git add .
   git commit -m "Prepare for Railway deploy"
   git push
   ```

2. **Deploy:**
   - Acesse: https://railway.app
   - Login com GitHub
   - "New Project" → "Deploy from GitHub"
   - Selecione o repositório
   - Railway detectará Node.js automaticamente

3. **Configurar:**
   - Root Directory: `server`
   - Start Command: `npm start` (automático)

4. **Environment Variables:**
   No painel do Railway, adicione:
   ```
   NODE_ENV=production
   PORT=5050
   SUPABASE_URL=...
   SUPABASE_ANON_KEY=...
   JWT_SECRET=...
   GEMINI_API_KEY=...
   CORS_ORIGIN=https://seu-frontend.vercel.app
   ```

5. **URL gerada:**
   - `https://jiumetrics-api.up.railway.app`

**💰 Plano grátis:**
- $5 de crédito/mês
- Suficiente para MVP

### Opção 3: Render

**✅ Melhor para:** Deploy totalmente grátis (com sleep após 15min)

1. **Deploy:**
   - Acesse: https://render.com
   - New → Web Service
   - Conecte GitHub → selecione `JiuMetrics`

2. **Configure:**
   - **Name:** `jiumetrics-api`
   - **Root Directory:** `server`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Environment:** Node

3. **Environment Variables:**
   Adicione todas as variáveis do `.env`

4. **Deploy:**
   - Click "Create Web Service"
   - Aguarde 5-10 minutos
   - URL: `https://jiumetrics-api.onrender.com`

**⚠️ Limitação:**
- Plano grátis: serviço "dorme" após 15min sem uso
- Primeira request após sleep: ~30s para acordar

### Opção 4: Heroku

**⚠️ Não tem plano grátis desde Nov/2022**

1. **Instalar CLI:**
   ```bash
   brew install heroku/brew/heroku
   heroku login
   ```

2. **Criar app:**
   ```bash
   cd server
   heroku create jiumetrics-api
   ```

3. **Configurar envs:**
   ```bash
   heroku config:set NODE_ENV=production
   heroku config:set SUPABASE_URL=...
   heroku config:set JWT_SECRET=...
   # ... todas as variáveis
   ```

4. **Deploy:**
   ```bash
   git push heroku main
   ```

---

## 🗄️ Banco de Dados (Supabase)

**✅ Já está em produção!** Supabase é cloud-native.

### Checklist:
- [ ] Migrações executadas (migrations/*.sql) — ver ressalva em [`docs/DATABASE.md`](./DATABASE.md) §1: elas não são a fonte de verdade
- [ ] `anon`/`authenticated` sem GRANT nas tabelas de `public` (spec 008) — **não** RLS: [ADR-009](./decisions/009-acesso-ao-banco-exclusivamente-por-service-role.md) escolheu revogar acesso em vez de reativar RLS, porque a autenticação é JWT próprio e `auth.uid()` nunca é satisfeita
- [ ] Índices criados para performance
- [ ] Backup automático ativado (Settings → Database)
- [ ] Connection pooling configurado se necessário

### Boas Práticas:
- ⚠️ **O frontend não usa Supabase.** Nenhuma variável `SUPABASE_*` pertence a `frontend/.env.production` — chegou a existir uma chave publicável lá, rastreada no Git, e ela é o achado de segurança mais grave já registrado neste projeto (ver [`docs/AUTHORIZATION.md`](./AUTHORIZATION.md))
- **Só existe `SUPABASE_SERVICE_ROLE_KEY` no backend** (spec 008) — o cliente anon foi removido, não só despriorizado
- **Não configure RLS por tabela.** A decisão do projeto ([ADR-002](./decisions/002-rls-desligado-autorizacao-na-aplicacao.md), [ADR-009](./decisions/009-acesso-ao-banco-exclusivamente-por-service-role.md)) é manter RLS desligada e proteger o banco por `REVOKE` + autorização na aplicação

---

## 🔐 Variáveis de Ambiente

### Frontend (`frontend/.env.production`)
```env
VITE_API_URL=https://jiumetrics-api.vercel.app/api
```
Nenhuma variável de Supabase pertence aqui — o frontend nunca falou com o Supabase. Desde a spec 008 este arquivo está fora do Git (`.gitignore` cobre `.env.*`); configure `VITE_API_URL` também como variável de ambiente no painel da Vercel, para o build funcionar a partir de um checkout limpo.

### Backend (configurar no painel de deploy)
```env
NODE_ENV=production
PORT=5050
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
JWT_SECRET=seu-secret-super-seguro-min-32-chars
JWT_EXPIRES_IN=7d
GEMINI_API_KEY=AIzaSy...
CORS_ORIGIN=https://jiumetrics.vercel.app
```
Desde a spec 008 o backend **não inicia** sem `SUPABASE_SERVICE_ROLE_KEY` — não há mais `SUPABASE_ANON_KEY` nem fallback entre clientes.

**⚠️ Segurança:**
- NUNCA commitar arquivos `.env` ao Git — `frontend/.env.production` foi o exemplo real disso acontecendo, por um `.gitignore` que só cobria `.env` e não `.env.*`
- Usar `.env.example` como template
- Rotacionar secrets regularmente

---

## ✅ Checklist de Deploy

### Pré-Deploy

**Backend:**
- [ ] Testes passando: `npm test`
- [ ] Build sem erros: `npm run build` (se aplicável)
- [ ] Variáveis de ambiente documentadas
- [ ] CORS configurado para domínio do frontend
- [ ] Rate limiting ativado
- [ ] Logs estruturados (não usar `console.log`)
- [ ] Health check endpoint: `/api/health`

**Frontend:**
- [ ] Build sem erros: `npm run build`
- [ ] Variáveis de ambiente configuradas
- [ ] API URL atualizada para produção
- [ ] Performance otimizada (Lighthouse > 90)
- [ ] Meta tags para SEO
- [ ] Favicon e manifest.json

**Database:**
- [ ] Todas as migrações executadas
- [ ] Índices criados
- [ ] RLS configurado
- [ ] Backup ativado

### Pós-Deploy

- [ ] Testar login em produção
- [ ] Testar CRUD de atletas/adversários
- [ ] Testar análise de vídeo com IA
- [ ] Verificar custos da API Gemini em `/settings`
- [ ] Configurar monitoramento (Sentry, LogRocket)
- [ ] Configurar alertas de erro
- [ ] Documentar URLs de produção no README

---

## 📊 Monitoramento

### Frontend
- **Sentry:** Rastreamento de erros
  ```bash
  npm install @sentry/react
  ```
- **Google Analytics:** Métricas de uso
- **Vercel Analytics:** Performance (se usar Vercel)

### Backend
- **Logs:** Usar Winston ou Pino
  ```bash
  npm install winston
  ```
- **APM:** New Relic, Datadog (opcional)
- **Health Checks:** Endpoint `/api/health`

### Exemplo de Health Check:

```javascript
// server/src/routes/health.js
app.get('/api/health', async (req, res) => {
  const dbStatus = await checkDatabaseConnection();
  const aiStatus = await checkGeminiAPI();
  
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      database: dbStatus,
      ai: aiStatus
    }
  });
});
```

---

## 🐛 Troubleshooting

### CORS Error
```javascript
// server/index.js
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
```

### 404 nas Rotas (SPA)
Frontend precisa de fallback para `index.html`:

**Vercel:** `vercel.json`
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

**Netlify:** `netlify.toml`
```toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### API Timeout (Vercel)
- Mover operações longas para Railway/Render
- Ou usar Vercel Pro (60s timeout)

### Database Connection Limit
- Usar connection pooling:
  ```javascript
  // supabase-js já faz pooling automaticamente
  ```

---

## 🚀 CI/CD Automático

### GitHub Actions

Crie `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - name: Deploy to Vercel
        run: |
          cd frontend
          npm install
          npm run build
          vercel --prod --token=${{ secrets.VERCEL_TOKEN }}

  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Railway
        run: |
          # Railway faz deploy automático via webhook
```

---

## 💰 Custos Estimados

| Serviço | Plano Grátis | Plano Pago |
|---------|--------------|------------|
| Vercel (Frontend) | Ilimitado | $20/mês (Pro) |
| Railway (Backend) | $5 crédito/mês | $5/mês base |
| Supabase | 500MB DB, 2GB transfer | $25/mês (Pro) |
| Gemini API | 15 req/min | Pay-as-you-go |

**Estimativa MVP:** $0-10/mês (planos grátis são suficientes)

---

## 📞 Suporte

- **Vercel Docs:** https://vercel.com/docs
- **Railway Docs:** https://docs.railway.app
- **Supabase Docs:** https://supabase.com/docs
- **Issues:** https://github.com/lucasxtech/JiuMetrics/issues
