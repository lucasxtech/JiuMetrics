# 🚀 Guia de Deploy

## Deploy do Frontend (Vercel/Netlify)

### Vercel (Recomendado)

1. **Conectar repositório**
   - Vá para [vercel.com](https://vercel.com)
   - Clique em "New Project"
   - Selecione o repositório

2. **Configurações**
   - Framework: Vite
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `dist`

3. **Environment Variables**
   Adicione no Vercel:
   ```
   VITE_API_URL=https://seu-backend.com/api
   ```

### Netlify

1. Conecte o repositório
2. Build Command: `npm run build`
3. Publish directory: `frontend/dist`
4. Environment: Adicione `VITE_API_URL`

---

## Deploy do Backend (Heroku/Railway)

### Railway (Recomendado)

1. **Preparar repositório**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```

2. **Conectar ao Railway**
   - Vá para [railway.app](https://railway.app)
   - Clique em "New Project"
   - Selecione "Deploy from GitHub"

3. **Configuração automática**
   - Railway detectará Node.js
   - Start command: `npm run start` (automático)

4. **Environment Variables**
   ```
   PORT=5000
   NODE_ENV=production
   CORS_ORIGIN=https://seu-frontend.vercel.app
   ```

### Heroku

1. **Instalar Heroku CLI**
   ```bash
   brew install heroku/brew/heroku
   heroku login
   ```

2. **Criar app**
   ```bash
   cd server
   heroku create seu-app-nome
   ```

3. **Configurar envs**
   ```bash
   heroku config:set NODE_ENV=production
   heroku config:set PORT=5000
   ```

4. **Deploy**
   ```bash
   git push heroku main
   ```

---

## Usando Supabase/Firebase (Próximas versões)

### Supabase (PostgreSQL)

```bash
npm install @supabase/supabase-js
```

Substituir models em `server/src/models/Athlete.js`:

```javascript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
)

class Athlete {
  static async getAll() {
    const { data, error } = await supabase
      .from('athletes')
      .select('*')
    return data || []
  }
  // ... outros métodos
}
```

### Firebase Realtime Database

```bash
npm install firebase-admin
```

---

## Checklist de Deploy

### Frontend
- [ ] Build sem erros: `npm run build`
- [ ] Environment variables configuradas
- [ ] URLs da API corretas
- [ ] Performance checada
- [ ] PWA configurado (opcional)
- [ ] SEO básico adicionado

### Backend
- [ ] Variáveis de ambiente definidas
- [ ] CORS configurado corretamente
- [ ] Banco de dados migrado
- [ ] Logs de erro funcionando
- [ ] Backups automáticos ativados
- [ ] Rate limiting implementado

---

## Monitoramento

### Frontend
- Usar Sentry para rastreamento de erros
- Google Analytics para métricas

### Backend
- Datadog ou NewRelic para APM
- Logs estruturados com Winston

```bash
npm install winston sentry-sdk
```

---

## CI/CD com GitHub Actions

Criar `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm ci
      - run: npm run build
      - run: npm test
```

---

## Domínios e DNS

### Configuração de DNS

```
Frontend:  analisejj.com → vercel.app
Backend:   api.analisejj.com → railway.app
```

Adicionar records no seu provedor de DNS:
- A record para apontar IPs
- CNAME records conforme necessário

---

## Performance Optimization

### Frontend
```bash
# Análise de bundle
npm install -D webpack-bundle-analyzer
```

### Backend
```bash
# Caching
npm install redis
```

---

**Última atualização:** Janeiro 2024
