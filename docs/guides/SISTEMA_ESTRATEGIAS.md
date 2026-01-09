# Sistema de Análise de Lutas e Estratégias Táticas

## 🎯 ATUALIZAÇÃO - Sistema de Estratégia com IA (Gemini)

### Visão Geral

O sistema de estratégia utiliza o **Gemini AI** para analisar comparativamente atletas e adversários, gerando recomendações táticas personalizadas e objetivas para aumentar as chances de vitória.

### Arquitetura

#### Backend
1. **Rota**: `POST /api/strategy/compare`
2. **Controller**: `strategyController.compareAndStrategy`
3. **Service**: `geminiService.generateTacticalStrategy`
4. **Utilitário**: `athleteStatsUtils.processPersonAnalyses`

#### Frontend
1. **Página**: `Strategy.jsx` - Interface de seleção e visualização
2. **Componente**: `AiStrategyBox.jsx` - Exibição da análise em seções
3. **Service**: `strategyService.compareAndGenerateStrategy`

### Fluxo Completo

```
1. Usuário seleciona atleta e adversário
   ↓
2. Frontend: compareAndGenerateStrategy(athleteId, opponentId)
   ↓
3. Backend busca dados completos (atleta + adversário + análises)
   ↓
4. Calcula atributos com processPersonAnalyses() - normalizado por análise
   ↓
5. Prepara payload: { name, resumo (aiSummary), atributos }
   ↓
6. Gemini analisa e retorna estratégia em JSON estruturado
   ↓
7. Frontend exibe em AiStrategyBox com seções expansíveis
```

### Response Structure (v2 - Expandida)

```json
{
  "athlete": {
    "id": "uuid",
    "name": "Nome",
    "attributes": { "condicionamento": 75, "tecnica": 80, ... },
    "totalAnalyses": 5
  },
  "opponent": { ... },
  "strategy": {
    "resumo_rapido": {
      "como_vencer": "Explicação em 2-3 frases de COMO vencer essa luta",
      "tres_prioridades": [
        "PRIORIDADE 1 com explicação do PORQUÊ",
        "PRIORIDADE 2 com explicação",
        "PRIORIDADE 3 com explicação"
      ]
    },
    "tese_da_vitoria": "Explicação completa em 3-4 frases da estratégia macro",
    "analise_de_matchup": {
      "vantagem_critica": "2-3 frases detalhando onde temos vantagem significativa",
      "risco_oculto": "Perigo que não é óbvio, com contexto de COMO e QUANDO",
      "fator_chave": "Elemento decisivo da luta com explicação do impacto"
    },
    "plano_tatico_faseado": {
      "em_pe_standup": {
        "acao_recomendada": "Puxar, Quedar ou Contra-atacar",
        "explicacao": "Por quê essa é a melhor opção (2-3 frases)",
        "como_executar": "Passo-a-passo técnico"
      },
      "jogo_de_passagem_top": {
        "estilo_recomendado": "Abordagem de passagem contra a guarda específica dele",
        "passo_a_passo": "Como executar com detalhes",
        "armadilha_a_evitar": "Contra-ataque principal e como neutralizar"
      },
      "jogo_de_guarda_bottom": {
        "guarda_ideal": "Qual guarda usar e por quê funciona",
        "momento_de_atacar": "Quando e como disparar o ataque",
        "se_der_errado": "Plano B se a guarda principal não funcionar"
      }
    },
    "cronologia_inteligente": {
      "primeiro_minuto": "O que fazer nos primeiros 60 segundos e por quê",
      "minutos_2_a_4": "Estratégia para o meio da luta",
      "minutos_finais": "Gestão de placar e estratégia de finalização"
    },
    "checklist_tatico": {
      "oportunidades_de_pontos": [
        {
          "tecnica": "Nome da técnica",
          "situacao": "Contexto completo de quando aplicar",
          "pontos": "2, 3 ou 4",
          "probabilidade": "alta, media ou baixa",
          "por_que_funciona": "Explicação de por que funciona contra ele"
        }
      ],
      "armadilhas_dele": [
        {
          "situacao": "Contexto que ativa a armadilha",
          "o_que_ele_faz": "Descrição da técnica perigosa",
          "como_evitar": "Ação preventiva detalhada"
        }
      ],
      "protocolo_de_emergencia": {
        "posicao_perigosa": "Qual posição evitar e por quê",
        "como_escapar": "Rota de fuga detalhada"
      }
    }
  }
}
```

### Cálculo de Atributos (Normalizado)

Agora usa **médias por análise** para evitar que quem tem mais vídeos tenha score artificialmente alto:

- **Condicionamento**: `avgActionsPerAnalise × 4 + avgPositions × 2`
- **Técnica**: `varietyTecnicas × 8 + avgVolume × 3`
- **Agressividade**: `avgSubmissions × 20 + avgSweeps × 8 + avgBackTakes × 15 + bônus`
- **Defesa**: `sweepSuccessRate × 40 + avgDefensive × 6 + 20`
- **Movimentação**: `avgBackTakes × 18 + avgSweeps × 10 + variety × 4 + bônus`

Todos normalizados entre 10-100 com `Math.min/Math.max`.

### Seções da Análise IA (v2 - Expandida)

1. **Resumo Rápido** (NOVO): Bloco destacado com "Como Vencer" e 3 prioridades
2. **Tese da Vitória**: Estratégia macro em 3-4 frases explicativas
3. **Análise de Matchup**: Vantagem crítica, Risco oculto, Fator chave
4. **Plano Tático Faseado**: Em pé / Passagem / Guarda (com explicações detalhadas)
5. **Cronologia Inteligente**: Primeiro minuto / Minutos 2-4 / Minutos finais
6. **Checklist Tático**: Oportunidades / Armadilhas / Protocolo de emergência

---

## 🤖 Sistema de Chat IA para Estratégias (NOVO)

### Visão Geral

O sistema agora inclui um **Chat IA lateral** para refinar estratégias em tempo real, seguindo o padrão do `ProfileSummaryModal`.

### Componentes

#### Frontend
1. **StrategySummaryModal.jsx** - Modal principal com:
   - Visualização completa da estratégia
   - Painel lateral de Chat IA
   - Painel de Histórico de versões
   - Edição manual de cada seção
   - Botões de salvar/restaurar versões

2. **StrategyChatPanel.jsx** - Chat IA lateral para:
   - Refinamento de seções específicas
   - Perguntas sobre a estratégia
   - Sugestões de ajustes táticos

#### Backend
1. **Rota**: `POST /api/chat/strategy-send`
2. **Controller**: `chatController.sendStrategyMessage`
3. **Service**: `geminiService.chat` (com contexto da estratégia)

### Funcionalidades do Modal

```javascript
// Edição manual de seções
const startEditing = (section, currentValue) => {
  setEditingSection(section);
  setEditValue(currentValue);
};

// Salvar versão no histórico
const saveVersion = (newData, source) => {
  setVersions(prev => [{
    id: prev.length + 1,
    timestamp: new Date().toISOString(),
    data: newData,
    source // 'Edição via Chat IA' ou 'Edição manual: seção'
  }, ...prev]);
};

// Restaurar versão anterior
const restoreVersion = (version) => {
  setCurrentStrategy(version.data);
  saveVersion(version.data, `Restaurado de: ${version.source}`);
};
```

### Fluxo do Chat IA

```
1. Usuário abre modal da estratégia
   ↓
2. Clica em "Chat IA" no header
   ↓
3. Painel lateral abre com contexto da estratégia
   ↓
4. Usuário faz pergunta ou pede ajuste
   ↓
5. Backend: POST /api/chat/strategy-send
   ↓
6. Gemini analisa contexto + pergunta
   ↓
7. Resposta com sugestão de alteração
   ↓
8. Usuário pode aceitar/editar/rejeitar
   ↓
9. Versão salva no histórico automaticamente
```

---

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

## 🚀 Funcionalidades Implementadas

### ✅ Componentes Criados

1. **AiStrategyBox.jsx** - Exibição da estratégia (seções sempre abertas)
2. **StrategySummaryModal.jsx** - Modal completo com:
   - Visualização detalhada
   - Chat IA lateral (StrategyChatPanel)
   - Histórico de versões
   - Edição manual de seções
3. **StrategyChatPanel.jsx** - Chat lateral para refinamento
4. **ProfileSummaryModal.jsx** - Modal de perfil de atleta com chat
5. **ProfileChatPanel.jsx** - Chat para refinamento de perfis

### ✅ Rotas de Chat IA

```bash
# Chat de Estratégia
POST /api/chat/strategy-send
{
  "strategyData": { ... },
  "athleteName": "João",
  "opponentName": "Pedro",
  "question": "Como melhorar a defesa?"
}

# Chat de Perfil
POST /api/chat/profile-send
{
  "athleteId": "uuid",
  "athleteName": "João",
  "currentSummary": "Resumo atual...",
  "question": "Detalhar finalizações"
}
```

### ✅ Melhorias de Prompt

- **Linguagem expandida**: Explicações detalhadas em vez de frases curtas
- **Campo `resumo_rapido`**: Bloco destacado com 3 prioridades
- **Campos `por_que_funciona`**: Contexto em cada oportunidade
- **Campos `explicacao`**: Por quê cada ação é recomendada
- **Fallbacks**: Suporte a campos antigos E novos

---

## 💡 Benefícios

✅ **Histórico completo** de todas análises realizadas  
✅ **Perfil técnico consolidado** baseado em múltiplas lutas  
✅ **Estratégias automáticas** personalizadas para cada confronto  
✅ **Matchmaking inteligente** - encontra melhor atleta para cada adversário  
✅ **Dados persistentes** - análises ficam salvas no sistema  
✅ **Integração com IA real** - Gemini Vision analisa vídeos

### Novas Features (v2)

✅ **Chat IA lateral** - Refine estratégias conversando com a IA  
✅ **Edição manual** - Edite qualquer seção diretamente no modal  
✅ **Histórico de versões** - Restaure versões anteriores com 1 clique  
✅ **Explicações expandidas** - Cada recomendação explica o PORQUÊ  
✅ **Resumo rápido** - 3 prioridades destacadas para memorizar  
✅ **Protocolo de emergência** - Saiba escapar de situações perigosas  
✅ **Seções sempre visíveis** - Sem acordions, tudo acessível
