# 🚀 Quick Start: Sistema Multi-Agentes

## Passo 1: Configurar Variáveis de Ambiente

```bash
cd server
cp .env.example .env
```

Edite o arquivo `.env` e adicione:

```bash
# API Keys
GEMINI_API_KEY=your_gemini_key_here
OPENAI_API_KEY=sk-proj-your_openai_key_here  # ← NOVA

# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_key

# Multi-Agentes (inicialmente desabilitado)
USE_MULTI_AGENTS=false
OPENAI_MODEL=gpt-4-turbo-preview
```

## Passo 2: Instalar Dependências

```bash
npm install
```

> ✅ O pacote `openai` já foi adicionado ao `package.json`

## Passo 3: Testar Sistema Monolítico (Baseline)

```bash
# Iniciar servidor
npm run dev

# Em outro terminal, analisar um vídeo de teste do YouTube
# (o caminho de upload de arquivo local foi removido)
curl -X POST http://localhost:5000/api/ai/analyze-link \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"videos":[{"url":"https://youtube.com/watch?v=VIDEO_ID","giColor":"azul"}],"athleteName":"Test Athlete"}'
```

Observe o log:
```
📊 Modo: Sistema Monolítico (Gemini único)
```

## Passo 4: Habilitar Multi-Agentes

```bash
# Editar server/.env
USE_MULTI_AGENTS=true
```

## Passo 5: Reiniciar e Testar Multi-Agentes

```bash
# Reiniciar servidor (Ctrl+C e depois)
npm run dev

# Fazer upload novamente
# (mesmo comando do Passo 3)
```

Observe o novo log:
```
🤖 Modo: Sistema Multi-Agentes (3 agentes + GPT orquestrador)
📸 Analisando frame 1/8 do vídeo 1...
   ✓ Agentes: 3/3
   ✓ Custo: $0.0387
```

## Passo 6: Comparar Análises (Endpoint de Debug)

```bash
# Criar arquivo test-request.json
cat > test-request.json << 'EOF'
{
  "frameData": "data:image/png;base64,iVBOR...",
  "context": {
    "athleteName": "João Silva",
    "giColor": "azul",
    "belt": "roxa",
    "result": "vitória"
  }
}
EOF

# Fazer request
curl -X POST http://localhost:5000/api/ai/debug/compare-analysis \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d @test-request.json
```

**Response esperada:**
```json
{
  "success": true,
  "comparison": {
    "elapsedTime": "15.34s",
    "monolithic": {
      "status": "fulfilled",
      "usage": { "totalTokens": 5000 }
    },
    "multiAgent": {
      "status": "fulfilled",
      "usage": { "totalTokens": 12000 },
      "metadata": {
        "agentsUsed": [
          "Agente Técnico",
          "Agente Tático",
          "Agente de Regras IBJJF"
        ]
      }
    },
    "metrics": {
      "tokensComparison": {
        "percentageIncrease": "140%"
      },
      "costComparison": {
        "multiAgentEstimate": "$0.0387"
      }
    }
  }
}
```

## Passo 7: Monitorar Custos

```bash
# Ver estatísticas de uso
curl -X GET http://localhost:5000/api/usage/stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "stats": {
    "totalCalls": 15,
    "totalTokens": 180000,
    "estimatedCost": "$4.50"
  }
}
```

## Checklist de Veriicação

- [ ] Servidor inicia sem erros
- [ ] Log mostra "Sistema Monolítico" quando `USE_MULTI_AGENTS=false`
- [ ] Log mostra "Sistema Multi-Agentes" quando `USE_MULTI_AGENTS=true`
- [ ] Upload de vídeo funciona em ambos modos
- [ ] Endpoint de debug retorna comparação válida
- [ ] Análises salvam corretamente no Supabase
- [ ] Custos são rastreados em `api_usage`

## Troubleshooting Rápido

### ❌ "openaiApiKey é obrigatória"

**Solução:**
```bash
# Verificar .env
cat server/.env | grep OPENAI_API_KEY

# Se vazio ou inexistente
echo "OPENAI_API_KEY=sk-proj-..." >> server/.env
```

### ❌ "Cannot find module 'openai'"

**Solução:**
```bash
cd server
npm install openai --save
```

### ❌ "Rate limit exceeded"

**Solução:**
```bash
# Aguardar 1 minuto ou
# Reduzir número de frames
# Editar server/src/services/ffmpegService.js
# Mudar de 8 frames para 5
```

### ❌ Análise muito lenta

**Verificações:**
1. Tempo normal: 10-15s por frame
2. Se > 30s, verificar logs para erros de retry
3. Considerar desabilitar multi-agentes temporariamente

## Próximos Passos

1. ✅ Sistema funcionando
2. 📊 Coletar métricas por 1-2 semanas
3. 🔍 Comparar precisão (multi vs mono)
4. 💰 Validar custos vs. orçamento
5. 📈 Decidir rollout gradual
6. 🎯 Ajustar prompts baseado em feedback
7. 🚀 Habilitar por padrão (se ROI positivo)

## Suporte

- **Documentação:** [docs/MULTI_AGENTS.md](docs/MULTI_AGENTS.md)
- **README Agentes:** [server/src/services/agents/README.md](server/src/services/agents/README.md)
- **API Docs:** [docs/API.md](docs/API.md)

---

**Última atualização:** Março 2026  
**Status:** ✅ Pronto para testes
