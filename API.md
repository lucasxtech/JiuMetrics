# 📚 Documentação da API

## Base URL
```
http://localhost:5050/api
```

## Health Check

### GET /health
Verifica se o servidor está rodando.

**Resposta (200 OK):**
```json
{
  "status": "OK",
  "message": "Servidor funcionando"
}
```

---

## Atletas

### GET /athletes
Lista todos os atletas cadastrados.

**Resposta (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "name": "João Silva",
      "age": 28,
      "weight": 85,
      "belt": "Roxa",
      "style": "Guarda",
      "strongAttacks": "Raspagem, Armlock",
      "weaknesses": "Defesa de queda",
      "cardio": 85,
      "videoUrl": "https://youtube.com/...",
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "count": 1
}
```

---

### GET /athletes/:id
Obtém detalhes de um atleta específico.

**Parâmetros:**
- `id` (string, obrigatório) - ID do atleta

**Resposta (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "João Silva",
    "age": 28,
    "weight": 85,
    "belt": "Roxa",
    "style": "Guarda",
    "strongAttacks": "Raspagem, Armlock",
    "weaknesses": "Defesa de queda",
    "cardio": 85,
    "videoUrl": "https://youtube.com/...",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Erro (404 Not Found):**
```json
{
  "success": false,
  "error": "Atleta não encontrado"
}
```

---

### POST /athletes
Cria um novo atleta.

**Body (JSON):**
```json
{
  "name": "João Silva",
  "age": 28,
  "weight": 85,
  "belt": "Roxa",
  "style": "Guarda",
  "strongAttacks": "Raspagem, Armlock",
  "weaknesses": "Defesa de queda",
  "cardio": 85,
  "videoUrl": "https://youtube.com/..."
}
```

**Resposta (201 Created):**
```json
{
  "success": true,
  "message": "Atleta criado com sucesso",
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "João Silva",
    "age": 28,
    "weight": 85,
    "belt": "Roxa",
    "style": "Guarda",
    "strongAttacks": "Raspagem, Armlock",
    "weaknesses": "Defesa de queda",
    "cardio": 85,
    "videoUrl": "https://youtube.com/...",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Erro (400 Bad Request):**
```json
{
  "success": false,
  "error": "Nome, idade e peso são obrigatórios"
}
```

---

### PUT /athletes/:id
Atualiza um atleta existente.

**Parâmetros:**
- `id` (string, obrigatório) - ID do atleta

**Body (JSON):** Mesmo do POST, mas todos os campos são opcionais

**Resposta (200 OK):**
```json
{
  "success": true,
  "message": "Atleta atualizado com sucesso",
  "data": { /* dados atualizados */ }
}
```

---

### DELETE /athletes/:id
Deleta um atleta.

**Parâmetros:**
- `id` (string, obrigatório) - ID do atleta

**Resposta (200 OK):**
```json
{
  "success": true,
  "message": "Atleta deletado com sucesso",
  "data": { /* dados do atleta deletado */ }
}
```

---

## Adversários

### GET /opponents
Lista todos os adversários.

**Resposta:** Idêntica a GET /athletes

---

### GET /opponents/:id
Obtém detalhes de um adversário.

**Resposta:** Idêntica a GET /athletes/:id

---

### POST /opponents
Cria um novo adversário.

**Body:** Idêntico a POST /athletes

**Resposta:** Idêntica a POST /athletes

---

### PUT /opponents/:id
Atualiza um adversário.

**Resposta:** Idêntica a PUT /athletes/:id

---

### DELETE /opponents/:id
Deleta um adversário.

**Resposta:** Idêntica a DELETE /athletes/:id

---

## IA - Estratégias

### POST /ai/strategy
Gera uma estratégia de luta personalizada.

**Body - Opção 1 (com IDs):**
```json
{
  "athleteId": "123e4567-e89b-12d3-a456-426614174000",
  "opponentId": "223f5678-f89c-23e4-b567-536725285111"
}
```

**Body - Opção 2 (com dados completos):**
```json
{
  "athlete": {
    "name": "João Silva",
    "age": 28,
    "weight": 85,
    "belt": "Roxa",
    "style": "Guarda",
    "cardio": 85
  },
  "opponent": {
    "name": "Pedro Ramos",
    "age": 30,
    "weight": 90,
    "belt": "Marrom",
    "style": "Pressão",
    "cardio": 80
  }
}
```

**Resposta (200 OK):**
```json
{
  "success": true,
  "message": "Estratégia gerada com sucesso",
  "data": {
    "athlete": "João Silva",
    "opponent": "Pedro Ramos",
    "styleAnalysis": "João é especialista em Guarda...",
    "strengths": [
      "Seu condicionamento superior...",
      "Usar técnica defensiva..."
    ],
    "weaknesses": [
      "Cuidado com a pressão constante...",
      "Não deixar o adversário..."
    ],
    "opponentPatterns": "Pedro geralmente começa agressivo...",
    "fightPlan": [
      "Round 1: Defesa sólida...",
      "Round 2: Aumentar intensidade...",
      "Round 3: Ofensiva agressiva..."
    ],
    "generatedAt": "2024-01-15T10:35:22.123Z"
  }
}
```

**Erro (404 Not Found):**
```json
{
  "success": false,
  "error": "Atleta ou adversário não encontrado"
}
```

**Erro (400 Bad Request):**
```json
{
  "success": false,
  "error": "Dados do atleta e adversário são obrigatórios"
}
```

---

## Códigos de Status HTTP

| Código | Significado |
|--------|-------------|
| 200    | OK - Requisição bem-sucedida |
| 201    | Created - Recurso criado |
| 400    | Bad Request - Dados inválidos |
| 404    | Not Found - Recurso não existe |
| 500    | Server Error - Erro interno |

---

## Exemplos com cURL

### Listar atletas
```bash
curl http://localhost:5050/api/athletes
```

### Criar atleta
```bash
curl -X POST http://localhost:5050/api/athletes \
  -H "Content-Type: application/json" \
  -d '{
    "name": "João Silva",
    "age": 28,
    "weight": 85,
    "belt": "Roxa",
    "style": "Guarda",
    "cardio": 85
  }'
```

### Gerar estratégia
```bash
curl -X POST http://localhost:5050/api/ai/strategy \
  -H "Content-Type: application/json" \
  -d '{
    "athleteId": "1",
    "opponentId": "1"
  }'
```

---

**Última atualização:** Janeiro 2024
