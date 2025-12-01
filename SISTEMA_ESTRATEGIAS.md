# Sistema de Análise de Lutas e Estratégias Táticas

## 📋 Resumo das Funcionalidades Implementadas

### 1. **Histórico de Análises de Lutas** (`FightAnalysis`)
Agora o sistema guarda todas as análises de vídeos processadas:
- Link/nome do vídeo da luta
- Dados da análise do Gemini (gráficos, resumo)
- Perfil técnico consolidado
- Associação com atleta ou adversário

### 2. **Perfil Técnico Completo** (Atletas e Adversários)
Cada atleta e adversário possui perfil técnico detalhado:

```javascript
technicalProfile: {
  // Estilo de jogo
  gameStyle: 'Guarda' | 'Passagem' | 'Balanced',
  
  // Posições
  mostUsedPositions: ['Guarda Fechada', 'Spider Guard', ...],
  strongPositions: ['Raspagem', 'Triângulo', ...],
  weakPositions: ['Defesa de queda', ...],
  
  // Preferência
  preference: 'guard' | 'passing' | 'balanced',
  
  // Personalidade (%)
  personality: {
    aggressive: 45,
    explosive: 25,
    calm: 20,
    tactical: 10
  },
  
  // Comportamento inicial (%)
  initialBehavior: {
    pullGuard: 55,
    takedown: 30,
    standup: 15
  },
  
  // Jogo de guarda (%)
  guardGame: {
    closedGuard: 50,
    sweep: 30,
    leglock: 20
  },
  
  // Jogo de passagem (%)
  passingGame: {
    pressure: 50,
    sidePass: 30,
    toreada: 20
  }
}
```

### 3. **Sistema de Estratégias Táticas**
Compara atleta vs adversário e gera estratégias automáticas:

#### Análise de Matchup:
- ✅ **Vantagens**: Pontos fortes do atleta vs pontos fracos do adversário
- ⚠️ **Desvantagens**: Pontos fracos do atleta vs pontos fortes do adversário
- 🟡 **Zonas Neutras**: Áreas equilibradas
- 🎯 **Pontos-chave**: Insights importantes

#### Estratégia Gerada:
- **Plano de jogo**: O que fazer durante a luta
- **Prioridades**: Focos principais
- **Evitar**: O que não fazer
- **Técnicas**: Técnicas específicas a treinar
- **Preparação mental**: Aspectos psicológicos

### 4. **Recomendação de Matchup**
Sistema encontra o melhor atleta da sua equipe para enfrentar um adversário específico, baseado em:
- Score de compatibilidade (vantagens - desvantagens)
- Análise técnica dos perfis

---

## 🔌 APIs Criadas

### **Análises de Lutas**
```bash
# Listar todas análises
GET /api/fight-analysis

# Buscar análise por ID
GET /api/fight-analysis/:id

# Listar análises de uma pessoa
GET /api/fight-analysis/person/:personId

# Criar nova análise
POST /api/fight-analysis
{
  "personId": "1",
  "personType": "athlete", // ou "opponent"
  "videoUrl": "https://...",
  "videoName": "Luta IBJJF 2024",
  "charts": [...],
  "summary": "...",
  "framesAnalyzed": 8
}

# Deletar análise
DELETE /api/fight-analysis/:id
```

### **Estratégias Táticas**
```bash
# Comparar atleta vs adversário
POST /api/strategy/compare
{
  "athleteId": "1",
  "opponentId": "1"
}

# Encontrar melhor atleta para enfrentar adversário
GET /api/strategy/best-matchup/:opponentId
```

### **Upload de Vídeo (Atualizado)**
```bash
# Upload com salvamento automático
POST /api/video/upload
FormData {
  video: <arquivo>,
  personId: "1",           // opcional
  personType: "athlete"    // opcional
}
```

---

## 🎯 Fluxo de Uso Completo

### **Cenário 1: Analisar Adversário**

1. **Upload de vídeo do adversário**
```javascript
const formData = new FormData();
formData.append('video', videoFile);
formData.append('personId', opponentId);
formData.append('personType', 'opponent');

const result = await uploadVideo(videoFile, opponentId, 'opponent');
// Análise salva automaticamente + perfil técnico atualizado
```

2. **Comparar com seu atleta**
```javascript
const strategy = await compareAndGenerateStrategy(athleteId, opponentId);
// Retorna análise completa + estratégia tática
```

3. **Visualizar estratégia**
```javascript
console.log(strategy.data.matchupAnalysis);
// { advantages: [...], disadvantages: [...], keyPoints: [...] }

console.log(strategy.data.strategy);
// { gameplan: [...], priorities: [...], avoid: [...], techniques: [...] }
```

### **Cenário 2: Encontrar Melhor Atleta**

```javascript
const matchups = await findBestMatchup(opponentId);
// Retorna todos atletas ranqueados por compatibilidade
```

### **Cenário 3: Histórico de Atleta**

```javascript
const analyses = await getAnalysesByPerson(athleteId);
// Lista todas lutas analisadas do atleta
```

---

## 📊 Exemplo de Resposta de Estratégia

```json
{
  "success": true,
  "data": {
    "athlete": {
      "id": "1",
      "name": "João Silva",
      "profile": { ... },
      "totalAnalyses": 5
    },
    "opponent": {
      "id": "1",
      "name": "Pedro Ramos",
      "profile": { ... },
      "totalAnalyses": 3
    },
    "matchupAnalysis": {
      "advantages": [
        "Você é mais agressivo que o adversário",
        "Seu ponto forte (Raspagem) é ponto fraco do adversário"
      ],
      "disadvantages": [
        "Adversário é mais agressivo",
        "Seu ponto fraco (Defesa de queda) é ponto forte do adversário"
      ],
      "neutralZones": [],
      "keyPoints": [
        "Confronto clássico: Guardeiro vs Passador",
        "Prepare-se para pressão constante"
      ]
    },
    "strategy": {
      "gameplan": [
        "Desenvolva sua guarda ativa e movimentada",
        "Não deixe o adversário estabelecer controle"
      ],
      "priorities": [
        "Raspagens rápidas",
        "Ataques de guarda (triângulo, omoplata)",
        "Explorar pontos fracos: Movimentação rápida lateral"
      ],
      "avoid": [
        "Deixar adversário consolidar pressão",
        "Evitar: Passagem de guarda, Smash pass"
      ],
      "techniques": [
        "Preparar contra-ataques e transições rápidas"
      ],
      "mentalPreparation": [
        "Adversário é agressivo - mantenha a calma"
      ]
    },
    "generatedAt": "2024-12-01T..."
  }
}
```

---

## 🚀 Próximos Passos

Para usar o sistema completo:

1. **Reinicie o servidor** para carregar as novas rotas
2. **No frontend**, crie componentes para:
   - Exibir histórico de análises
   - Comparar atleta vs adversário
   - Mostrar estratégias geradas
   - Listar recomendações de matchup

3. **Exemplos de componentes a criar**:
   - `<FightHistory personId={id} />` - Histórico de lutas
   - `<StrategyComparison athleteId={} opponentId={} />` - Comparação
   - `<MatchupRecommendation opponentId={} />` - Recomendações

---

## 💡 Benefícios

✅ **Histórico completo** de todas análises realizadas  
✅ **Perfil técnico consolidado** baseado em múltiplas lutas  
✅ **Estratégias automáticas** personalizadas para cada confronto  
✅ **Matchmaking inteligente** - encontra melhor atleta para cada adversário  
✅ **Dados persistentes** - análises ficam salvas no sistema  
✅ **Integração com IA real** - Gemini Vision analisa vídeos
