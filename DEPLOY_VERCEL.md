# 🚀 Deploy do Backend no Vercel

## Passo 1: Preparar o Projeto
✅ Já está pronto! Os arquivos necessários foram criados:
- `server/vercel.json` - Configuração do Vercel
- `server/index.js` - Modificado para exportar o app

## Passo 2: Deploy no Vercel

### Opção A: Via Interface Web (Recomendado)

1. **Acesse**: https://vercel.com
2. **Login** com GitHub
3. **Click em "Add New Project"**
4. **Selecione** o repositório `JiuMetrics`
5. **Configure**:
   - **Project Name**: `jiumetrics-api`
   - **Framework Preset**: Other
   - **Root Directory**: `server` ⚠️ **IMPORTANTE**
   - **Build Command**: deixe vazio
   - **Output Directory**: deixe vazio
   - **Install Command**: `npm install`

6. **Adicione as Variáveis de Ambiente**:
   Clique em "Environment Variables" e adicione:
   ```
   NODE_ENV=production
   PORT=3000
   SUPABASE_URL=https://ikjudbypwfvdywlgzsjr.supabase.co
   SUPABASE_ANON_KEY=sua_chave_aqui
   SUPABASE_SERVICE_KEY=sua_chave_service_aqui
   JWT_SECRET=seu_jwt_secret_aqui
   GEMINI_API_KEY=sua_gemini_api_key_aqui
   ```

7. **Click em "Deploy"**
8. **Aguarde** ~2-3 minutos
9. **Copie a URL** gerada (ex: `https://jiumetrics-api.vercel.app`)

### Opção B: Via CLI

```bash
# Instalar Vercel CLI
npm i -g vercel

# Na pasta do projeto
cd server

# Deploy
vercel

# Seguir instruções interativas
# Definir variáveis de ambiente quando solicitado
```

## Passo 3: Configurar Frontend

1. **Vá em**: https://github.com/lucasxtech/JiuMetrics/settings/secrets/actions
2. **New repository secret**:
   - Name: `VITE_API_URL`
   - Value: `https://jiumetrics-api.vercel.app/api`
3. **Save**

4. **Faça um novo commit** para triggar o deploy do frontend

## Passo 4: Testar

Acesse: `https://lucasxtech.github.io/JiuMetrics/`

O login agora deve funcionar! ✅

## 🔧 Troubleshooting

### CORS Error
Se tiver erro de CORS, adicione no `server/index.js`:
```javascript
app.use(cors({
  origin: 'https://lucasxtech.github.io'
}));
```

### 404 nas rotas
Verifique se o `vercel.json` está na pasta `server/`

### Variáveis de ambiente
Verifique se todas as variáveis estão configuradas no painel da Vercel

## 📝 Notas

- Vercel tem limite de 100GB de bandwidth/mês no plano grátis
- Serverless functions têm timeout de 10s no plano grátis
- Para uploads grandes de vídeo, considere usar storage separado
