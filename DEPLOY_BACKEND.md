# 🚀 Como fazer o Login funcionar no GitHub Pages

## ⚠️ Problema Atual
O GitHub Pages é **apenas frontend estático**. O backend está em `localhost:5050` que só funciona na sua máquina.

## ✅ Solução: Hospedar o Backend

### Opção 1: Render (Grátis e Fácil)

1. Acesse: https://render.com
2. Crie conta e faça login
3. Clique em **New → Web Service**
4. Conecte seu GitHub → selecione `JiuMetrics`
5. Configure:
   - **Name**: `jiumetrics-api`
   - **Root Directory**: `server`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment**: Node
6. Adicione as variáveis de ambiente (do seu `.env` local):
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_KEY`
   - `JWT_SECRET`
   - `GEMINI_API_KEY`
   - `PORT=5050`
7. Clique em **Create Web Service**
8. Aguarde o deploy (5-10 min)
9. Copie a URL gerada (ex: `https://jiumetrics-api.onrender.com`)

### Opção 2: Railway (Também grátis)

Semelhante ao Render, mas interface diferente.

## 🔧 Configurar Frontend para usar Backend Hospedado

Após hospedar o backend:

1. Vá em: https://github.com/lucasxtech/JiuMetrics/settings/secrets/actions
2. Clique em **New repository secret**
3. Nome: `VITE_API_URL`
4. Value: `https://sua-api.onrender.com/api` (a URL do backend)
5. Salve

O próximo push vai buildar com a API correta! ✅

## 🎯 Alternativa Temporária

Se quiser só demonstrar o frontend, pode criar um mock de autenticação que não precisa de backend.
