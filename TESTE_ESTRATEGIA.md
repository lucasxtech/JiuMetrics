# 🧪 Guia de Teste - Sistema de Estratégia IA

## Pré-requisitos

1. **Gemini API Key configurada** em `.env`:
   ```
   GEMINI_API_KEY=your_key_here
   ```

2. **Pelo menos 1 atleta e 1 adversário cadastrados**
3. **Idealmente com análises de vídeo processadas** (para aiSummary)

## Como Testar

### 1. Iniciar servidores

```bash
# Terminal 1 - Backend
cd server
npm start

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### 2. Navegar para Estratégia

1. Abrir `http://localhost:5173`
2. Clicar em **Estratégia** no menu

### 3. Gerar Estratégia

1. **Selecionar um atleta** (lado esquerdo)
2. **Selecionar um adversário** (lado direito)
3. **Clicar em "Gerar estratégia de luta"**
4. **Aguardar** (pode levar 5-10 segundos)

### 4. Explorar Resultado

A análise aparecerá em seções expansíveis:

- ✅ **Análise Direta** - Comparação estilo vs estilo
- ✅ **Como Vencer** - Estratégias ofensivas e defensivas
- ✅ **Táticas Específicas** - Técnicas recomendadas
- ✅ **Plano por Fases** - Início / Meio / Fim da luta
- ✅ **Checklist Final** - Grid com 4 categorias

## Teste via API Direta (Postman/cURL)

```bash
curl -X POST http://localhost:3000/api/strategy/compare \
  -H "Content-Type: application/json" \
  -d '{
    "athleteId": "seu-athlete-id",
    "opponentId": "seu-opponent-id"
  }'
```

## Logs Esperados (Console Backend)

```
🎯 Gerando estratégia: Atleta <id> vs Adversário <id>
📊 Atleta: X análises | Adversário: Y análises
🎯 Gerando estratégia tática com Gemini...
📊 Resposta bruta do Gemini: {...
✅ Estratégia tática gerada com sucesso
```

## Logs Esperados (Console Frontend)

```
🎯 Gerando estratégia: { athlete: "Nome", opponent: "Nome" }
✅ Estratégia gerada: { data: {...} }
```

## Possíveis Erros

### ❌ "Gemini API não configurada"
- Verificar `GEMINI_API_KEY` no `.env`
- Reiniciar servidor backend

### ❌ "Atleta não encontrado"
- Verificar se IDs existem no banco
- Cadastrar atleta/adversário primeiro

### ❌ "Estrutura de estratégia incompleta"
- Gemini pode ter retornado formato inválido
- Verificar logs no console backend
- Tentar novamente (Gemini pode ter tido erro momentâneo)

### ❌ Página em branco ou erro no frontend
- Abrir DevTools (F12) e verificar console
- Verificar se backend está rodando
- Verificar rede (Network tab) para ver status da requisição

## Validação de Sucesso

✅ **Checklist completo:**
- [ ] Atletas e adversários carregam na página
- [ ] Seleção funciona (botões ficam destacados)
- [ ] Loading aparece ao clicar em "Gerar estratégia"
- [ ] Estratégia aparece após ~5-10s
- [ ] Todas as 5 seções estão presentes
- [ ] Seções expandem/colapsam ao clicar
- [ ] Checklist final tem grid 2x2 com ícones coloridos
- [ ] Texto é coerente e específico (não genérico)

## Exemplo de Resposta Esperada

```json
{
  "success": true,
  "data": {
    "athlete": {
      "name": "João Silva",
      "attributes": {
        "condicionamento": 78,
        "tecnica": 82,
        "agressividade": 65,
        "defesa": 71,
        "movimentacao": 75
      }
    },
    "opponent": {...},
    "strategy": {
      "analise": "João apresenta jogo mais técnico...",
      "estrategia_para_vencer": "Explorar vantagem técnica...",
      "taticas_especificas": "Iniciar com controle de distância...",
      "plano_por_fases": {
        "inicio": "Buscar clinch e controlar ritmo...",
        "meio": "Trabalhar passagens e pressão...",
        "fim": "Manter placar e evitar reversões..."
      },
      "checklist": {
        "fazer": ["Controlar distância", "Trabalhar passagens"],
        "evitar": ["Puxar guarda precipitadamente"],
        "buscar": ["Posições de topo", "Laterais"],
        "nunca_permitir": ["Finalização de triângulo"]
      }
    }
  }
}
```

## Casos de Teste Recomendados

1. **Atleta agressivo vs Defensivo** - Deve sugerir pressionar
2. **Guardeiro vs Passador** - Deve identificar matchup clássico
3. **Ambos sem análises** - Deve funcionar mas com menos detalhes
4. **Atleta com 5+ análises vs Adversário com 1** - Atributos devem ser normalizados corretamente

## Performance Esperada

- **Carregamento inicial**: < 1s
- **Geração de estratégia**: 5-15s (depende do Gemini)
- **Renderização**: Instantânea

## Troubleshooting Avançado

### Verificar se rota está registrada
```bash
# No console do backend ao iniciar, deve aparecer:
# GET /api/strategy/best-matchup/:opponentId
# POST /api/strategy/compare
```

### Testar só o Gemini
```javascript
// No console do Node.js (server)
const { generateTacticalStrategy } = require('./src/services/geminiService');

await generateTacticalStrategy(
  { name: "Teste A", resumo: "Atleta agressivo", atributos: {...} },
  { name: "Teste B", resumo: "Defensivo", atributos: {...} }
);
```

### Verificar atributos calculados
```javascript
// No console do Node.js
const { processPersonAnalyses } = require('./src/utils/athleteStatsUtils');
const FightAnalysis = require('./src/models/FightAnalysis');

const analyses = FightAnalysis.getByPersonId('athlete-id');
const attrs = processPersonAnalyses(analyses, { name: 'Test' });
console.log(attrs);
// Deve retornar: { condicionamento: X, tecnica: Y, ... }
```
