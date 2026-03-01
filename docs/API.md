# 📚 Documentação da API - JiuMetrics

**Base URL:** `http://localhost:5050/api`

**Todas as rotas (exceto /auth) requerem autenticação via JWT Bearer Token.**

---

## 📑 Índice

1. [Autenticação](#-autenticação)
2. [Atletas](#-atletas)
3. [Adversários](#-adversários)
4. [Análise com IA](#-análise-com-ia)
5. [Estratégias Táticas](#-estratégias-táticas)
6. [Análises de Lutas](#-análises-de-lutas)
7. [Upload de Vídeos](#-upload-de-vídeos)
8. [Chat com IA](#-chat-com-ia)
9. [Rastreamento de Custos](#-rastreamento-de-custos)
10. [Health Check](#-health-check)

---

## 🔐 Autenticação

### POST /auth/register
Criar nova conta de usuário.

**Body:**
```json
{
  "name": "João Silva",
  "email": "joao@email.com",
  "password": "senha123"
}
```

**Resposta (201 Created):**
```json
{
  "success": true,
  "message": "Usuário registrado com sucesso",
  "user": {
    "id": "uuid",
    "name": "João Silva",
    "email": "joao@email.com"
  },
  "token": "jwt_token_here"
}
```

---

### POST /auth/login
Fazer login e obter token JWT.

**Body:**
```json
{
  "email": "joao@email.com",
  "password": "senha123"
}
```

**Resposta (200 OK):**
```json
{
  "success": true,
  "message": "Login realizado com sucesso",
  "user": {
    "id": "uuid",
    "name": "João Silva",
    "email": "joao@email.com"
  },
  "token": "jwt_token_here"
}
```

---

### GET /auth/validate
Validar token JWT atual.

**Headers:**
```
Authorization: Bearer {token}
```

**Resposta (200 OK):**
```json
{
  "valid": true,
  "userId": "uuid"
}
```

---

## 👤 Atletas

### GET /athletes
Listar todos os atletas do usuário autenticado.

**Resposta (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "name": "João Silva",
      "age": 28,
      "weight": 85,
      "belt": "roxa",
      "technical_summary": "Guarda forte, bom em raspagens...",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "count": 1
}
```

---

### GET /athletes/:id
Buscar atleta específico por ID.

**Resposta (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "João Silva",
    "age": 28,
    "weight": 85,
    "belt": "roxa",
    "technical_summary": "...",
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

---

### POST /athletes
Criar novo atleta.

**Body:**
```json
{
  "name": "João Silva",
  "age": 28,
  "weight": 85,
  "belt": "roxa",
  "technical_summary": "Opcional"
}
```

**Resposta (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "João Silva",
    "age": 28,
    "weight": 85,
    "belt": "roxa",
    "technical_summary": null,
    "user_id": "uuid",
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

---

### PUT /athletes/:id
Atualizar atleta existente.

**Body (todos os campos opcionais):**
```json
{
  "name": "João Silva Jr.",
  "age": 29,
  "weight": 83,
  "belt": "marrom",
  "technical_summary": "Novo resumo técnico..."
}
```

**Resposta (200 OK):**
```json
{
  "success": true,
  "data": { /* atleta atualizado */ }
}
```

---

### DELETE /athletes/:id
Deletar atleta.

**Resposta (200 OK):**
```json
{
  "success": true,
  "message": "Atleta deletado com sucesso"
}
```

---

## 🥋 Adversários

Os endpoints de adversários seguem a mesma estrutura dos atletas:

- `GET /opponents` - Listar adversários
- `GET /opponents/:id` - Buscar adversário
- `POST /opponents` - Criar adversário
- `PUT /opponents/:id` - Atualizar adversário
- `DELETE /opponents/:id` - Deletar adversário

**Body** e **Responses** são idênticos aos de atletas.

---

## 🤖 Análise com IA

### POST /ai/analyze-video
Analisar vídeo local (upload via multipart/form-data).

**Form Data:**
```
video: File (arquivo de vídeo)
athleteName: string
personId: uuid
personType: "athlete" | "opponent"
model: "gemini-2.0-flash" | "gemini-2.5-pro" (opcional)
matchResult: "win" | "loss" | "draw" (opcional)
belt: string (opcional)
```

**Resposta (200 OK):**
```json
{
  "success": true,
  "analysis": {
    "summary": "Análise consolidada...",
    "charts": {
      "technical_stats": { /* dados do gráfico */ }
    },
    "frames_analyzed": 5
  },
  "usageMetadata": {
    "totalTokens": 12500
  }
}
```

---

### POST /ai/analyze-link
Analisar vídeos do YouTube (suporta múltiplos links).

**Body:**
```json
{
  "videos": [
    {
      "url": "https://youtube.com/watch?v=...",
      "color": "white"
    },
    {
      "url": "https://youtu.be/...",
      "color": "blue"
    }
  ],
  "athleteName": "João Silva",
  "personId": "uuid",
  "personType": "athlete",
  "model": "gemini-2.0-flash",
  "matchResult": "win",
  "belt": "roxa"
}
```

**Resposta (200 OK):**
```json
{
  "success": true,
  "analysis": {
    "id": "uuid",
    "summary": "Consolidação de todas as análises...",
    "charts": {
      "technical_stats": { /* radar chart data */ }
    },
    "individual_analyses": [
      {
        "video_url": "https://youtube.com/...",
        "summary": "Análise deste vídeo...",
        "frames_analyzed": 5
      }
    ]
  },
  "savedAnalysisId": "uuid"
}
```

---

### POST /ai/athlete-summary
Gerar resumo técnico de um atleta com base em todas as suas análises.

**Body:**
```json
{
  "athleteId": "uuid",
  "athleteName": "João Silva"
}
```

**Resposta (200 OK):**
```json
{
  "success": true,
  "summary": "Resumo técnico consolidado baseado em todas as análises...",
  "totalAnalyses": 5
}
```

---

### POST /ai/consolidate-profile
Consolidar perfil técnico de atleta/adversário usando IA.

**Body:**
```json
{
  "personId": "uuid",
  "personType": "athlete"
}
```

**Resposta (200 OK):**
```json
{
  "success": true,
  "summary": "Perfil técnico consolidado...",
  "analysesCount": 3
}
```

---

## 🎯 Estratégias Táticas

### POST /strategy/compare
Comparar atleta vs adversário e gerar estratégia tática com IA.

**Body:**
```json
{
  "athleteId": "uuid",
  "opponentId": "uuid",
  "model": "gemini-2.0-flash"
}
```

**Resposta (200 OK):**
```json
{
  "success": true,
  "athlete": { /* dados do atleta */ },
  "opponent": { /* dados do adversário */ },
  "strategy": {
    "resumo_rapido": {
      "como_vencer": "Estratégia principal em 2-3 frases",
      "tres_prioridades": [
        "Prioridade 1",
        "Prioridade 2",
        "Prioridade 3"
      ]
    },
    "analise_de_matchup": {
      "vantagem_critica": "Sua maior vantagem...",
      "risco_oculto": "Perigo não óbvio...",
      "fator_chave": "Elemento decisivo..."
    },
    "plano_tatico_faseado": {
      "em_pe_standup": { /* táticas para em pé */ },
      "passagem_de_guarda": { /* táticas de passagem */ },
      "guarda": { /* táticas de guarda */ }
    },
    "cronologia_inteligente": {
      "primeiro_minuto": "O que fazer no início...",
      "minutos_2_a_4": "Meio da luta...",
      "minutos_finais": "Finalizações..."
    },
    "checklist_tatico": {
      "oportunidades_ouro": ["Oportunidade 1", "..."],
      "armadilhas_adversario": ["Armadilha 1", "..."],
      "protocolo_de_emergencia": {
        "situacao": "Se...",
        "o_que_ele_faz": "Ele vai...",
        "sua_resposta": "Você deve..."
      }
    }
  },
  "savedAnalysisId": "uuid",
  "usageMetadata": { /* tokens usados */ }
}
```

---

### GET /strategy/analyses
Listar análises táticas salvas.

**Query Params:**
- `athleteId` (opcional) - Filtrar por atleta
- `opponentId` (opcional) - Filtrar por adversário

**Resposta (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "athlete_id": "uuid",
      "opponent_id": "uuid",
      "athlete_name": "João Silva",
      "opponent_name": "Pedro Santos",
      "strategy": { /* objeto completo da estratégia */ },
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "count": 1
}
```

---

### GET /strategy/analyses/:id
Buscar análise tática específica.

**Resposta (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "athlete_name": "João Silva",
    "opponent_name": "Pedro Santos",
    "strategy": { /* estratégia completa */ },
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

---

### PATCH /strategy/analyses/:id
Atualizar análise tática (usado para edições manuais).

**Body:**
```json
{
  "strategy": {
    "resumo_rapido": {
      "como_vencer": "Novo texto..."
    }
  }
}
```

**Resposta (200 OK):**
```json
{
  "success": true,
  "data": { /* análise atualizada */ }
}
```

---

### DELETE /strategy/analyses/:id
Deletar análise tática.

**Resposta (200 OK):**
```json
{
  "success": true,
  "message": "Análise deletada com sucesso"
}
```

---

### GET /strategy/analyses/:analysisId/versions
Listar versões de uma análise tática.

**Resposta (200 OK):**
```json
{
  "success": true,
  "versions": [
    {
      "id": "uuid",
      "version_number": 2,
      "edited_by": "uuid",
      "edit_reason": "Ajustado plano tático",
      "created_at": "2024-01-15T10:35:00Z",
      "preview": {
        "field": "Plano Tático",
        "text": "Em pé: Puxar para guarda..."
      }
    }
  ]
}
```

---

### POST /strategy/analyses/:analysisId/versions/:versionId/restore
Restaurar versão anterior de uma análise.

**Resposta (200 OK):**
```json
{
  "success": true,
  "message": "Versão restaurada com sucesso",
  "data": { /* análise restaurada */ }
}
```

---

## 📊 Análises de Lutas

### GET /fight-analysis
Listar análises de lutas do usuário.

**Query Params:**
- `personId` (opcional) - Filtrar por atleta/adversário
- `personType` (opcional) - "athlete" ou "opponent"

**Resposta (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "person_id": "uuid",
      "person_type": "athlete",
      "person_name": "João Silva",
      "summary": "Análise consolidada...",
      "charts": { /* dados dos gráficos */ },
      "videos": [
        {
          "url": "https://youtube.com/...",
          "color": "white"
        }
      ],
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "count": 1
}
```

---

### GET /fight-analysis/:id
Buscar análise de luta específica.

**Resposta (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "person_name": "João Silva",
    "summary": "...",
    "charts": {},
    "videos": [],
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

---

### PATCH /fight-analysis/:id
Atualizar análise de luta (edição manual).

**Body:**
```json
{
  "summary": "Novo resumo editado..."
}
```

**Resposta (200 OK):**
```json
{
  "success": true,
  "data": { /* análise atualizada */ }
}
```

---

### DELETE /fight-analysis/:id
Deletar análise de luta.

**Resposta (200 OK):**
```json
{
  "success": true,
  "message": "Análise deletada com sucesso"
}
```

---

## 🎥 Upload de Vídeos

### POST /video/upload
Fazer upload de vídeo para análise (alternativa ao /ai/analyze-video).

**Form Data:**
```
video: File
```

**Resposta (200 OK):**
```json
{
  "success": true,
  "filename": "video-1234567890.mp4",
  "path": "/uploads/video-1234567890.mp4"
}
```

---

### POST /video/analyze
Analisar vídeo já enviado por upload.

**Body:**
```json
{
  "videoPath": "/uploads/video-1234567890.mp4",
  "athleteName": "João Silva",
  "personId": "uuid",
  "personType": "athlete",
  "model": "gemini-2.0-flash"
}
```

**Resposta:** Similar a `/ai/analyze-video`

---

## 💬 Chat com IA

### POST /chat/session
Criar nova sessão de chat para refinar uma análise.

**Body:**
```json
{
  "contextType": "analysis",
  "contextId": "uuid"
}
```

**Resposta (201 Created):**
```json
{
  "success": true,
  "session": {
    "id": "uuid",
    "context_type": "analysis",
    "context_id": "uuid",
    "context_snapshot": { /* dados da análise */ },
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

---

### GET /chat/session/:id
Buscar sessão de chat com histórico de mensagens.

**Resposta (200 OK):**
```json
{
  "success": true,
  "session": {
    "id": "uuid",
    "messages": [
      {
        "role": "user",
        "content": "Pode melhorar o plano tático?",
        "timestamp": "2024-01-15T10:31:00Z"
      },
      {
        "role": "assistant",
        "content": "Claro! Vou detalhar...",
        "timestamp": "2024-01-15T10:31:15Z"
      }
    ],
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

---

### GET /chat/sessions/:contextType/:contextId
Listar sessões de chat por contexto.

**Exemplo:** `GET /chat/sessions/analysis/uuid-da-analise`

**Resposta (200 OK):**
```json
{
  "success": true,
  "sessions": [
    {
      "id": "uuid",
      "created_at": "2024-01-15T10:30:00Z",
      "message_count": 5
    }
  ]
}
```

---

### DELETE /chat/session/:id
Deletar sessão de chat.

**Resposta (200 OK):**
```json
{
  "success": true,
  "message": "Sessão deletada"
}
```

---

### POST /chat/send
Enviar mensagem ao chat e receber resposta da IA.

**Body:**
```json
{
  "sessionId": "uuid",
  "message": "Pode detalhar mais a estratégia de guarda?"
}
```

**Resposta (200 OK):**
```json
{
  "success": true,
  "response": {
    "content": "Claro! Na guarda você deve...",
    "hasEditSuggestion": true,
    "editSuggestion": {
      "field": "plano_tatico_faseado",
      "newValue": "Texto completo atualizado...",
      "reason": "Adicionei mais detalhes sobre a guarda"
    }
  },
  "session": { /* sessão atualizada com nova mensagem */ }
}
```

---

### POST /chat/apply-edit
Aplicar sugestão de edição da IA à análise.

**Body:**
```json
{
  "analysisId": "uuid",
  "field": "plano_tatico_faseado",
  "newValue": "Novo texto...",
  "reason": "Motivo da alteração"
}
```

**Resposta (200 OK):**
```json
{
  "success": true,
  "message": "Edição aplicada com sucesso",
  "data": { /* análise atualizada */ },
  "versionCreated": 3
}
```

---

### POST /chat/manual-edit
Salvar edição manual feita pelo usuário (sem IA).

**Body:**
```json
{
  "analysisId": "uuid",
  "field": "resumo_rapido",
  "newValue": "Texto editado manualmente...",
  "reason": "Edição manual do usuário"
}
```

**Resposta:** Similar a `/chat/apply-edit`

---

### GET /chat/versions/:analysisId
Buscar histórico de versões de uma análise.

**Resposta (200 OK):**
```json
{
  "success": true,
  "versions": [
    {
      "id": "uuid",
      "version_number": 1,
      "content": { /* conteúdo da versão */ },
      "edited_by": "uuid",
      "edit_reason": "Versão original",
      "created_at": "2024-01-15T10:00:00Z"
    }
  ]
}
```

---

### POST /chat/restore-version
Restaurar versão anterior de uma análise.

**Body:**
```json
{
  "analysisId": "uuid",
  "versionId": "uuid"
}
```

**Resposta (200 OK):**
```json
{
  "success": true,
  "message": "Versão restaurada",
  "data": { /* análise restaurada */ }
}
```

---

### POST /chat/profile-session
Criar sessão de chat para refinar perfil técnico.

**Body:**
```json
{
  "personType": "athlete",
  "personId": "uuid"
}
```

**Resposta (201 Created):**
```json
{
  "success": true,
  "session": {
    "id": "uuid",
    "context_type": "profile",
    "person_type": "athlete",
    "person_id": "uuid"
  }
}
```

---

### POST /chat/profile-send
Enviar mensagem no chat de perfil técnico.

**Body:**
```json
{
  "sessionId": "uuid",
  "message": "Pode melhorar o resumo técnico?"
}
```

**Resposta:** Similar a `/chat/send`

---

### POST /chat/profile-save
Salvar resumo técnico editado pelo chat.

**Body:**
```json
{
  "personType": "athlete",
  "personId": "uuid",
  "newSummary": "Novo resumo técnico...",
  "reason": "Refinado via chat IA"
}
```

**Resposta (200 OK):**
```json
{
  "success": true,
  "message": "Perfil atualizado",
  "data": { /* atleta/adversário atualizado */ }
}
```

---

### GET /chat/profile-versions/:personType/:personId
Buscar histórico de versões do perfil técnico.

**Exemplo:** `GET /chat/profile-versions/athlete/uuid`

**Resposta (200 OK):**
```json
{
  "success": true,
  "versions": [
    {
      "id": "uuid",
      "version_number": 1,
      "summary": "Versão anterior do resumo...",
      "edited_by": "uuid",
      "edit_reason": "Chat IA",
      "created_at": "2024-01-15T09:00:00Z"
    }
  ]
}
```

---

### POST /chat/profile-restore
Restaurar versão anterior do perfil técnico.

**Body:**
```json
{
  "personType": "athlete",
  "personId": "uuid",
  "versionId": "uuid"
}
```

**Resposta:** Similar a `/chat/restore-version`

---

### POST /chat/strategy-session
Criar sessão de chat para refinar estratégia tática.

**Body:**
```json
{
  "strategyData": {
    "resumo_rapido": { /* estratégia */ }
  },
  "athleteName": "João Silva",
  "opponentName": "Pedro Santos"
}
```

**Resposta (201 Created):**
```json
{
  "success": true,
  "session": {
    "id": "uuid",
    "context_type": "strategy",
    "context_snapshot": { /* dados da estratégia */ }
  }
}
```

---

### POST /chat/strategy-send
Enviar mensagem no chat de estratégia.

**Body:**
```json
{
  "sessionId": "uuid",
  "message": "E se ele defender a raspagem?"
}
```

**Resposta:** Similar a `/chat/send` com sugestões de edição

---

## 💰 Rastreamento de Custos

### GET /usage/stats
Estatísticas de uso da API Gemini.

**Query Params:**
- `period` - "today" | "week" | "month" | "all" (default: "all")

**Resposta (200 OK):**
```json
{
  "success": true,
  "stats": {
    "totalCost": 2.45,
    "totalTokens": 125000,
    "totalRequests": 15,
    "byModel": {
      "gemini-2.0-flash": {
        "requests": 12,
        "totalTokens": 100000,
        "totalCost": 1.5
      },
      "gemini-2.5-pro": {
        "requests": 3,
        "totalTokens": 25000,
        "totalCost": 0.95
      }
    },
    "byEndpoint": {
      "video_analysis": {
        "requests": 8,
        "totalCost": 1.2
      },
      "strategy_generation": {
        "requests": 7,
        "totalCost": 1.25
      }
    },
    "period": "all",
    "periodStart": null,
    "periodEnd": null
  }
}
```

---

### GET /usage/pricing
Tabela de preços dos modelos Gemini.

**Resposta (200 OK):**
```json
{
  "success": true,
  "pricing": {
    "gemini-2.0-flash": {
      "inputPer1M": 0.075,
      "outputPer1M": 0.3,
      "description": "Rápido e barato"
    },
    "gemini-2.5-pro": {
      "inputPer1M": 1.25,
      "outputPer1M": 5.0,
      "description": "Alta qualidade"
    }
  }
}
```

---

## 🩺 Health Check

### GET /health
Verificar status do servidor.

**Resposta (200 OK):**
```json
{
  "status": "OK",
  "message": "Servidor funcionando",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

---

## 🔒 Autenticação e Autorização

### Headers Obrigatórios

Todas as rotas (exceto `/auth` e `/health`) requerem:

```
Authorization: Bearer {jwt_token}
```

### Códigos de Erro Comuns

| Código | Significado |
|--------|-------------|
| 400 | Bad Request - Dados inválidos ou ausentes |
| 401 | Unauthorized - Token inválido ou ausente |
| 403 | Forbidden - Sem permissão para acessar recurso |
| 404 | Not Found - Recurso não encontrado |
| 429 | Too Many Requests - Rate limit excedido |
| 500 | Internal Server Error - Erro no servidor |

### Rate Limiting

- **Chat endpoints:** 100 requisições por 15 minutos
- **Outros endpoints:** Sem limite (por enquanto)

---

## 📝 Notas Importantes

1. **IDs:** Todos os IDs são UUID v4
2. **Timestamps:** Formato ISO 8601 com timezone UTC
3. **Modelos Gemini:** 
   - `gemini-2.0-flash` (padrão) - Rápido e econômico
   - `gemini-2.5-pro` - Alta qualidade, mais caro
4. **Versionamento:** Edições criam versões automáticas com histórico
5. **Custos:** Monitore em `/usage/stats` para evitar surpresas

---

## 🛠️ Exemplos de Uso

### Fluxo Completo: Análise → Estratégia → Refinamento

```bash
# 1. Fazer login
curl -X POST http://localhost:5050/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@mail.com", "password":"senha123"}'
# Salvar o token retornado

# 2. Analisar vídeo do YouTube
curl -X POST http://localhost:5050/api/ai/analyze-link \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "videos": [{"url": "https://youtube.com/watch?v=...", "color": "white"}],
    "athleteName": "João",
    "personId": "uuid-atleta",
    "personType": "athlete"
  }'

# 3. Gerar estratégia tática
curl -X POST http://localhost:5050/api/strategy/compare \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "athleteId": "uuid-atleta",
    "opponentId": "uuid-adversario"
  }'
# Salvar analysisId retornado

# 4. Criar sessão de chat para refinar
curl -X POST http://localhost:5050/api/chat/session \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "contextType": "analysis",
    "contextId": "{analysisId}"
  }'
# Salvar sessionId

# 5. Enviar mensagem ao chat
curl -X POST http://localhost:5050/api/chat/send \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "{sessionId}",
    "message": "Pode detalhar mais o plano de finalização?"
  }'

# 6. Aplicar sugestão da IA
curl -X POST http://localhost:5050/api/chat/apply-edit \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "analysisId": "{analysisId}",
    "field": "plano_tatico_faseado",
    "newValue": "{texto_retornado_pela_ia}",
    "reason": "Detalhamento de finalizações"
  }'

# 7. Ver custos
curl -X GET 'http://localhost:5050/api/usage/stats?period=today' \
  -H "Authorization: Bearer {token}"
```

---

**Última atualização:** Março 2026  
**Versão da API:** 2.0
