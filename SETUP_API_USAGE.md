# 💰 Sistema de Rastreamento de Custos da API Gemini

## 📋 Implementação Completa

Este sistema rastreia automaticamente o uso da API do Google Gemini e calcula os custos em tempo real.

---

## 🔧 **PASSO 1: Executar SQL no Supabase**

1. Acesse o painel do Supabase: https://supabase.com/dashboard
2. Selecione seu projeto **JiuMetrics**
3. Vá em **SQL Editor** (menu lateral)
4. Abra o arquivo [`server/supabase-api-usage.sql`](server/supabase-api-usage.sql)
5. **Copie todo o conteúdo** e cole no SQL Editor
6. Clique em **RUN** para executar

Isso criará:
- ✅ Tabela `api_usage` com colunas para tokens, custos e metadata
- ✅ Índices para performance
- ✅ Políticas RLS (Row Level Security) para segurança

---

## 📊 **PASSO 2: Verificar Implementação**

### Backend Implementado:
- ✅ **Model**: `server/src/models/ApiUsage.js` - Funções de log e cálculo de custos
- ✅ **Controller**: `server/src/controllers/usageController.js` - Endpoints de estatísticas
- ✅ **Routes**: `server/src/routes/usage.js` - Rotas `/api/usage/stats` e `/api/usage/pricing`
- ✅ **Service**: `server/src/services/geminiService.js` - Captura usageMetadata em cada chamada
- ✅ **Integration**: Controllers `linkController` e `videoController` salvam uso automaticamente

### Frontend Implementado:
- ✅ **UI**: `frontend/src/pages/Settings.jsx` - Nova seção "Uso da API Gemini"
- ✅ **Styles**: `frontend/src/pages/Settings.module.css` - Estilos responsivos
- ✅ **Features**:
  - Filtro por período (Hoje, Semana, Mês, Tudo)
  - Cards de custo total, tokens usados e quantidade de análises
  - Breakdown por modelo (gemini-2.0-flash, gemini-2.5-pro, gemini-3.0)
  - Breakdown por tipo de operação (Análise de Vídeo, Estratégia, Resumo)

---

## 💵 **Tabela de Preços Gemini (Dez 2024)**

| Modelo | Input (1M tokens) | Output (1M tokens) |
|--------|-------------------|-------------------|
| **gemini-2.0-flash** | $0.075 | $0.30 |
| **gemini-2.5-pro** | $1.25 | $5.00 |
| **gemini-3.0** | $1.25* | $5.00* |

*Valores experimentais

---

## 🚀 **Como Funciona**

### Fluxo Automático:

1. **Usuário faz análise** (vídeo do YouTube ou upload)
2. **geminiService** chama API e captura `result.response.usageMetadata`
3. **Controller** recebe `{ analysis, usage }` do service
4. **ApiUsage.logUsage()** salva no Supabase:
   - user_id (do JWT)
   - model_name (ex: 'gemini-2.0-flash')
   - operation_type ('video_analysis', 'strategy', 'summary')
   - prompt_tokens
   - completion_tokens
   - estimated_cost_usd (calculado automaticamente)
5. **Frontend** exibe estatísticas em Settings

---

## 📱 **Como Usar**

1. **Faça login** na plataforma
2. Vá em **Configurações** (menu lateral)
3. Role até a seção **"Uso da API Gemini"**
4. Selecione o período desejado (Hoje, Semana, Mês, Tudo)
5. Visualize:
   - 💰 Custo total em USD
   - 🔢 Total de tokens usados
   - 📊 Quantidade de análises realizadas
   - Breakdown por modelo e tipo de operação

---

## 🔐 **Segurança**

- ✅ **RLS Habilitado**: Usuários só veem seus próprios registros
- ✅ **JWT Auth**: Todas as rotas de usage requerem autenticação
- ✅ **Service Role**: Apenas backend pode inserir registros
- ✅ **Isolamento**: user_id vinculado em cada registro

---

## 📈 **Endpoints Disponíveis**

### GET `/api/usage/stats?period=month`
Retorna estatísticas agregadas de uso

**Query Params:**
- `period`: `today` | `week` | `month` | `all`

**Response:**
```json
{
  "success": true,
  "period": "month",
  "stats": {
    "totalCost": 0.123456,
    "totalTokens": 150000,
    "requestsCount": 25,
    "byModel": [
      {
        "model": "gemini-2.0-flash",
        "tokens": 100000,
        "cost": 0.0825,
        "count": 20
      }
    ],
    "byOperation": [
      {
        "operation": "video_analysis",
        "tokens": 140000,
        "cost": 0.115,
        "count": 23
      }
    ],
    "recentUsage": [...]
  }
}
```

### GET `/api/usage/pricing`
Retorna tabela de preços dos modelos

---

## 🎯 **Próximos Passos**

Após executar o SQL no Supabase:

1. ✅ Fazer commit das alterações
2. ✅ Fazer deploy no Vercel
3. ✅ Testar criando análises de vídeo
4. ✅ Verificar custos em Configurações

---

## 📝 **Arquivos Modificados**

**Backend (10 arquivos):**
- `server/supabase-api-usage.sql` (NOVO)
- `server/src/models/ApiUsage.js` (NOVO)
- `server/src/controllers/usageController.js` (NOVO)
- `server/src/routes/usage.js` (NOVO)
- `server/index.js` (MODIFICADO - registra rota)
- `server/src/services/geminiService.js` (MODIFICADO - retorna usage)
- `server/src/controllers/linkController.js` (MODIFICADO - salva usage)
- `server/src/controllers/videoController.js` (MODIFICADO - salva usage)

**Frontend (2 arquivos):**
- `frontend/src/pages/Settings.jsx` (MODIFICADO - nova seção)
- `frontend/src/pages/Settings.module.css` (MODIFICADO - novos estilos)

---

**Total: 12 arquivos | 8 novos | 4 modificados**

🎉 Sistema completo de rastreamento de custos implementado!
