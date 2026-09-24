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
10. [Administração de Usuários](#-administração-de-usuários)
11. [Health Check](#-health-check)

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
  "password": "senha123",
  "rememberMe": false
}
```

**Resposta (200 OK):**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "name": "João Silva",
    "email": "joao@email.com",
    "role": "user",
    "profile": "atleta",
    "mustChangePassword": false
  },
  "token": "jwt_token_here"
}
```

`profile` e `mustChangePassword` foram acrescentados na [spec 014](../specs/014-identity-and-profiles/spec.md) — lidos do banco (`users.profile`, `users.must_change_password`), nunca do JWT. Uma conta criada pelo admin nasce com `mustChangePassword: true`; o frontend bloqueia toda rota até a troca (`ProtectedRoute`).

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
  "success": true,
  "userId": "uuid",
  "role": "user",
  "profile": "atleta",
  "mustChangePassword": false,
  "message": "Token válido"
}
```

---

### POST /auth/change-password
Trocar a própria senha (autenticado). Novo na [spec 014](../specs/014-identity-and-profiles/spec.md) — exige a senha atual, inclusive quando ela é a provisória (`mustChangePassword: true`). Zera `must_change_password`, **incrementa `token_version`** (o token antigo passa a ser recusado) e devolve um token novo já válido.

**Headers:**
```
Authorization: Bearer {token}
```

**Body:**
```json
{
  "currentPassword": "senhaAtual123",
  "newPassword": "novaSenha456"
}
```

**Resposta (200 OK):**
```json
{
  "success": true,
  "token": "jwt_token_novo"
}
```

**Resposta (401):** `{ "error": "Senha atual incorreta." }` — este 401 **não** é sessão inválida; o frontend chama esta rota com `skipAuthLogout: true` para não forçar logout ao mostrar o erro.

---

## 👤 Atletas

Contrato atualizado na [spec 013](../specs/013-athletes-opponents-consolidation/spec.md): **toda resposta é `camelCase`** (inclusive `POST`), o corpo de `POST`/`PUT` é validado por zod (`server/src/schemas/requests/person.js`) e campo omitido é `null` — não há mais defaults fabricados.

### GET /athletes
Listar os atletas do escopo do usuário (admin vê todo o tenant).

**Resposta (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "userId": "uuid",
      "name": "João Silva",
      "belt": "Roxa",
      "age": 28,
      "weight": 85,
      "height": null,
      "style": null,
      "strongAttacks": null,
      "weaknesses": null,
      "videoUrl": null,
      "cardio": null,
      "technicalProfile": {},
      "technicalSummary": "Guarda forte, bom em raspagens...",
      "technicalSummaryUpdatedAt": "2024-01-15T10:30:00Z",
      "analysesCount": 2,
      "creatorName": "Maria",
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  ],
  "count": 1
}
```

`analysesCount` conta só `fight_analyses` com `person_type` da própria entidade. `creatorName` só vem preenchido quando o escopo tem mais de um usuário (admin); no `GET /:id` é sempre `null`.

---

### GET /athletes/:id
Buscar atleta por ID. Fora do escopo devolve **404** (não 403 — não vaza existência).

---

### POST /athletes
Criar novo atleta.

**Body:**
```json
{
  "name": "João Silva",
  "belt": "Roxa",
  "age": 28,
  "weight": 85
}
```

| Campo | Regra |
|---|---|
| `name` | **obrigatório**, 1–255 caracteres (trim) |
| `belt` | **obrigatório**, um de `Branca`, `Azul`, `Roxa`, `Marrom`, `Preta` — alimenta as regras IBJJF da estratégia; faixa ausente desligaria a restrição |
| `age` | opcional, inteiro 4–100 |
| `weight` | opcional, 20–250 |
| `height` | opcional, 100–250 |
| `cardio` | opcional, inteiro 0–100 |
| `style`, `strongAttacks`, `weaknesses`, `videoUrl` | opcionais, texto |

Strings numéricas (`"28"`) são coerçadas; `""`, `null` e ausência viram `null`. Campos não declarados (ex.: `technicalSummary`, `userId`) são **removidos** antes do controller.

**Resposta (201 Created):** `{ "success": true, "message": "Atleta criado com sucesso", "data": { ...mesmo formato do GET... } }`

**Resposta (400):**
```json
{
  "success": false,
  "error": "Dados inválidos",
  "issues": [{ "campo": "belt", "mensagem": "belt deve ser uma de: Branca, Azul, Roxa, Marrom, Preta" }]
}
```

---

### PUT /athletes/:id
Atualizar atleta. Qualquer subconjunto dos campos do `POST`; corpo vazio é 400. Campo ausente não é tocado; `null` explícito apaga.

`technicalSummary` e `technicalProfile` **não** são aceitos aqui — são escritos pelos módulos de análise, chat e `POST /ai/consolidate-profile`.

**Resposta (200 OK):** `{ "success": true, "message": "Atleta atualizado com sucesso", "data": { ...atleta... } }`

---

### DELETE /athletes/:id
Hard delete **com cascata na aplicação** (o banco não tem FK). Saem junto: as `fight_analyses` da pessoa, as `analysis_versions` dessas análises e as `profile_versions`. As **estratégias são preservadas** de propósito.

**Resposta (200 OK):**
```json
{
  "success": true,
  "message": "Atleta deletado com sucesso",
  "data": { "...": "atleta removido" },
  "deleted": { "analyses": 3, "versions": 5, "profileVersions": 2 },
  "cascadeFailed": false
}
```

Se a cascata falhar, a pessoa já saiu e a resposta diz isso: `cascadeFailed: true`, `deleted: null` e a mensagem `"Atleta deletado, mas a limpeza das análises falhou"`. O `200` não esconde meia operação.

---

## 🥋 Adversários

Mesma implementação (`personController` / `personModel`), mesmo schema, mesmas respostas — só mudam o path e os rótulos das mensagens (`Adversário ...`):

- `GET /opponents` · `GET /opponents/:id` · `POST /opponents` · `PUT /opponents/:id` · `DELETE /opponents/:id`

---

## 🤖 Análise com IA

### POST /ai/analyze-video *(descontinuado)*
Rota mantida apenas como stub: retorna **400** orientando a usar
`POST /ai/analyze-link`. O caminho de upload de arquivo local foi removido.

---

### POST /ai/analyze-link
Analisar vídeos do YouTube (suporta múltiplos links). O vídeo completo é
enviado ao Gemini (URL pública direto, com fallback de download + File API).

**Body:**
```json
{
  "videos": [
    { "url": "https://youtube.com/watch?v=...", "giColor": "branco" },
    { "url": "https://youtu.be/...", "giColor": "azul" }
  ],
  "athleteName": "João Silva",
  "personId": "uuid",
  "personType": "athlete",
  "model": "gemini-2.0-flash",
  "matchResult": "vitoria-pontos",
  "belt": "roxa"
}
```

**Resposta (200 OK):**
```json
{
  "success": true,
  "data": {
    "charts": [ { "title": "Personalidade Geral", "data": [{ "label": "...", "value": 0 }] } ],
    "technical_stats": {
      "sweeps": { "quantidade": 0, "efetividade_percentual": 0 },
      "guard_passes": { "quantidade": 0 },
      "submissions": { "tentativas": 0, "ajustadas": 0, "concluidas": 0, "detalhes": [] },
      "back_takes": { "quantidade": 0, "tentou_finalizar": false }
    },
    "summary": "Consolidação de todas as análises...",
    "generatedAt": "2026-07-23T...",
    "videosAnalyzed": 2
  }
}
```

Se `personId`/`personType` forem enviados, a análise é salva automaticamente
e o resumo técnico do perfil (`technicalSummary`) é regenerado.

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

## 👥 Administração de Usuários

Todas as rotas abaixo exigem admin (`role === 'admin'`) — `authMiddleware` + `adminMiddleware`, sob rate limit de 100 req/15min/IP. Erro de posse é sempre **404**, nunca 403 (não vaza existência de conta de outro tenant). Documentado em detalhe no [módulo `users-and-admin`](./modules/users-and-admin.md); esta seção não existia antes da [spec 014](../specs/014-identity-and-profiles/spec.md), que acrescentou perfil, vínculo de ficha e exclusão total.

### GET /admin/users
Listar os usuários do tenant.

**Resposta (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "João Silva",
      "email": "joao@email.com",
      "role": "user",
      "profile": "atleta",
      "mustChangePassword": false,
      "is_active": true,
      "athleteId": "uuid-ou-null",
      "athleteName": "João Silva ou null",
      "lastLogin": "2026-09-24T10:00:00Z",
      "created_at": "2026-01-15T10:30:00Z"
    }
  ]
}
```

`athleteId`/`athleteName` vêm da ficha vinculada (`athletes.account_user_id`), quando existir.

---

### POST /admin/users
Criar sub-usuário. Sempre nasce com `must_change_password = true` (spec 014).

**Body:**
```json
{
  "name": "Maria Souza",
  "email": "maria@email.com",
  "password": "senha123",
  "profile": "atleta",
  "isAdmin": false,
  "createAthlete": true,
  "athlete": { "belt": "Azul" }
}
```

| Campo | Regra |
|---|---|
| `profile` | um de `atleta`, `professor`, `nutricionista`, `fisioterapeuta`, `preparador_fisico` — default `atleta` |
| `isAdmin` | vira `role: 'admin' \| 'user'` |
| `createAthlete` | se `true`, cria a ficha e já vincula (`account_user_id` = a nova conta) |
| `athlete.belt` | **obrigatório se `createAthlete: true`** (faixa é obrigatória desde a spec 013) |

**Resposta (201):** `{ "success": true, "data": { ...mesmo formato do GET, com a ficha já vinculada se createAthlete... } }`

---

### PATCH /admin/users/:id
Atualizar nome/senha. **Body:** `{ name?, password? }` — ao menos um dos dois.

---

### PATCH /admin/users/:id/role
Promover/rebaixar. **Body:** `{ role: 'admin' | 'user' }`. Recusa alterar o próprio (`400`) e recusa remover o **último admin ativo** do tenant (`400`, spec 014). Invalida tokens e evicta o cache.

---

### PATCH /admin/users/:id/profile *(novo, spec 014)*
Alterar o perfil profissional. **Body:** `{ profile }` (mesmo enum do `POST`). Invalida tokens e evicta o cache — o escopo do usuário pode ter mudado.

**Resposta (200 OK):** `{ "success": true, "data": { ...publicUser... } }`

---

### PATCH /admin/users/:id/athlete *(novo, spec 014)*
Vincular ou desvincular uma ficha de atleta à conta. **Body:** `{ athleteId: "uuid" }` para vincular, `{ athleteId: null }` para desvincular.

- **404** se a ficha não existir no escopo do tenant.
- **409** se a ficha já estiver vinculada a **outra** conta.
- Idempotente: vincular a mesma ficha à mesma conta duas vezes não é erro.

**Resposta (200 OK):** `{ "success": true, "data": { ...publicUser, com athleteId/athleteName atualizados... } }`

---

### DELETE /admin/users/:id
Desativar (soft delete). Dados preservados e continuam visíveis ao grupo.

---

### POST /admin/users/:id/reactivate
Reativar uma conta desativada.

---

### DELETE /admin/users/:id/permanent
**Exclusão total, sem transferência** (spec 014 — substitui o antigo fluxo "transferir ou apagar"). **Body:** `{}` — qualquer `transferToUserId` no corpo é **400** (`{ error: '...' }`, o campo saiu do contrato).

Apaga, dentro do tenant: `ai_chat_sessions`, `tactical_analyses` (com `strategy_versions` em cascata no banco), `analysis_versions` e `profile_versions` das análises da conta, `fight_analyses`, `athletes` geridas ou vinculadas pela conta (com exceção abaixo), `opponents`, e por fim a linha em `users`. `api_usage` é **preservado**.

**Decisão tomada durante a implementação, mais restritiva que o texto original da spec:** uma ficha **gerida** pela conta (`athletes.user_id = id`) mas **vinculada** a **outra** conta viva do tenant (`athletes.account_user_id` ≠ `id`, dentro do escopo de quem chama) **não é apagada** — é **reparentada** (`user_id` passa a ser `account_user_id`, com suas `fight_analyses`/`profile_versions` migrando junto) e contada em `deleted.reparentedAthletes`. Uma ficha vinculada a uma conta fora do escopo do chamador é apagada normalmente. Rationale: apagar a conta de um professor não pode apagar a ficha e o histórico de um aluno vivo. Esta decisão é do controller, não da spec original, e o proprietário pode reverter.

**Resposta (200 OK):**
```json
{
  "success": true,
  "message": "Conta e todos os dados excluídos.",
  "deleted": {
    "athletes": 1,
    "opponents": 2,
    "fightAnalyses": 5,
    "analysisVersions": 3,
    "profileVersions": 1,
    "tacticalAnalyses": 2,
    "chatSessions": 4,
    "reparentedAthletes": 1
  }
}
```

**Resposta (400):** tentar excluir a própria conta.

**Resposta (409):** o alvo é a **raiz do tenant** (`tenant_id === id`) e há outros membros vivos no grupo — `users.tenant_id → users(id)` não tem `ON DELETE`, então apagar a raiz com o grupo vivo deixaria a purga inteira feita e só a exclusão da linha falhando.

**Resposta (500):** falha no meio da exclusão. `{ error, step, deleted }` — `step` é a etapa que falhou, `deleted` é o que já foi apagado até ali. A causa real vai só para o log do servidor, nunca para o cliente (regra 2 de *Security* do `CLAUDE.md`).

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

**Última atualização:** 2026-09-24 (spec 014 — perfil da conta, senha, administração de usuários)
**Versão da API:** 2.0
