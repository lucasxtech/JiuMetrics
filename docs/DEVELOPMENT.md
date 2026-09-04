# 📖 Guia de Desenvolvimento

## Adicionando Novos Componentes

### 1. Criar Componente React

```javascript
// src/components/MeuComponente.jsx
export default function MeuComponente({ props }) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* Conteúdo */}
    </div>
  )
}
```

### 2. Usar em Página

```javascript
import MeuComponente from '../components/MeuComponente'

export default function MinhaPage() {
  return <MeuComponente />
}
```

---

## Adicionando Novas Rotas

### 1. Criar Página

```javascript
// src/pages/MinhaPage.jsx
export default function MinhaPage() {
  return <h1>Minha Página</h1>
}
```

### 2. Adicionar ao Router (App.jsx)

```javascript
import MinhaPage from './pages/MinhaPage'

<Route path="/minha-pagina" element={<MinhaPage />} />
```

### 3. Atualizar Navigation (se necessário)

```javascript
// src/components/common/Header.jsx
<Link to="/minha-pagina" className="...">
  Minha Página
</Link>
```

---

## Adicionando Novos Endpoints de API

### 1. Criar Controller

```javascript
// server/src/controllers/meuController.js
exports.minhaAcao = (req, res) => {
  res.json({ success: true, data: {} })
}
```

### 2. Criar Rota

```javascript
// server/src/routes/meuEndpoint.js
const express = require('express')
const controller = require('../controllers/meuController')

const router = express.Router()

router.get('/', controller.minhaAcao)

module.exports = router
```

### 3. Registrar em index.js

```javascript
const meuRoutes = require('./src/routes/meuEndpoint')
app.use('/api/meu-endpoint', meuRoutes)
```

### 4. Criar Serviço Frontend

```javascript
// frontend/src/services/meuService.js
import api from './api'

export const minhaAcao = async () => {
  const response = await api.get('/meu-endpoint')
  return response.data
}
```

---

## Modificando o Modelo de Dados

### Adicionar Campo em Atleta / Adversário

Desde a [spec 013](../specs/013-athletes-opponents-consolidation/spec.md) a implementação é uma só para as duas entidades — o campo é adicionado **uma vez** em cada camada:

1. **Migration** — a coluna nas **duas** tabelas (`athletes` e `opponents` continuam separadas no banco). Migrations são aplicadas à mão; ver `docs/DATABASE.md`.
2. **Schema de entrada** — `server/src/schemas/requests/person.js` (`camposOpcionais`). Campo que o model usa e o schema não declara chega `undefined` **em silêncio**.
3. **Model** — `server/src/models/personModel.js`: `create` (insert) e a allow-list de `update`.
4. **Parser** — `server/src/utils/dbParsers.js#parseAthleteFromDB` (`snake_case` → `camelCase`).
5. **Teste de contrato** — `server/src/__tests__/persons.test.js` roda nas duas rotas.
6. **Frontend** — `frontend/src/components/forms/PersonForm.jsx` (hoje coleta só nome e faixa; envia só `{ name, belt }`) e, se o campo for exibido, `constants/persons.js#describePerson`.

---

## Estilização com Tailwind

### Cores Customizadas

Definir em `tailwind.config.js`:

```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: '#1f2937',
        secondary: '#4f46e5',
        accent: '#f97316',
      },
    },
  },
}
```

Usar em componentes:

```jsx
<div className="bg-primary text-white">
  <h1 className="text-secondary">Título</h1>
  <button className="bg-accent">Botão</button>
</div>
```

### Responsive Design

```jsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
  {/* Mobile: 1 coluna */}
  {/* Tablet (md): 2 colunas */}
  {/* Desktop (lg): 3 colunas */}
</div>
```

---

## Trabalhando com Estados e Hooks

### useState

```javascript
const [contador, setContador] = useState(0)

const incrementar = () => setContador(c => c + 1)
```

### Custom Hooks

```javascript
// hooks/useAthletes.js
import { useState, useEffect } from 'react'
import { getAllAthletes } from '../services/athleteService'

export function useAthletes() {
  const [athletes, setAthletes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAllAthletes()
      .then(setAthletes)
      .finally(() => setLoading(false))
  }, [])

  return { athletes, loading }
}
```

Usar:

```javascript
import { useAthletes } from '../hooks/useAthletes'

export default function Athletes() {
  const { athletes, loading } = useAthletes()
  // ...
}
```

---

## Tratamento de Erros

### Frontend

```javascript
const [error, setError] = useState(null)

const loadData = async () => {
  try {
    const data = await service.fetch()
    setData(data)
  } catch (err) {
    setError(err.message)
  }
}

return (
  <>
    {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}
    {/* Conteúdo */}
  </>
)
```

### Backend

```javascript
exports.getAthletes = async (req, res) => {
  try {
    const athletes = await Athlete.getAll()
    res.json({ success: true, data: athletes })
  } catch (error) {
    console.error('Erro:', error)
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar atletas',
    })
  }
}
```

---

## Validação de Dados

### Frontend

```javascript
const validateForm = () => {
  const errors = {}
  
  if (!formData.name) errors.name = 'Nome obrigatório'
  if (formData.age < 18) errors.age = 'Deve ser maior de idade'
  
  setErrors(errors)
  return Object.keys(errors).length === 0
}
```

### Backend

```javascript
// Middleware de validação
const validateAthlete = (req, res, next) => {
  const { name, age, weight } = req.body
  
  if (!name || !age || !weight) {
    return res.status(400).json({
      error: 'Campos obrigatórios faltando',
    })
  }
  
  next()
}

// Usar em rota
router.post('/', validateAthlete, athleteController.create)
```

---

## Testing (Futuro)

### Frontend com Vitest

```bash
npm install -D vitest @testing-library/react
```

```javascript
// Componente.test.jsx
import { render, screen } from '@testing-library/react'
import MeuComponente from './MeuComponente'

test('renderiza corretamente', () => {
  render(<MeuComponente />)
  expect(screen.getByText('Texto esperado')).toBeInTheDocument()
})
```

### Backend com Jest

```bash
npm install -D jest
```

```javascript
// athlete.test.js
const Athlete = require('../models/Athlete')

describe('Athlete Model', () => {
  test('cria novo atleta', () => {
    const athlete = Athlete.create({ name: 'João' })
    expect(athlete.name).toBe('João')
  })
})
```

---

## Debug

### Frontend

```javascript
// Usar React DevTools
// Chrome: React DevTools extension

// Console logging
console.log('Variável:', variavel)
console.error('Erro:', erro)
console.table(array) // Visualizar arrays em tabela
```

### Backend

```javascript
// Usar console.log strategicamente
console.log('[ATHLETES] Requisição GET recebida')

// ou usar debugger
// node --inspect index.js
// Abrir chrome://inspect
```

---

## Performance

### Frontend

1. **Memoização**
   ```javascript
   import { memo } from 'react'
   
   export default memo(MeuComponente)
   ```

2. **Lazy Loading**
   ```javascript
   import { lazy, Suspense } from 'react'
   
   const LazyComponent = lazy(() => import('./Component'))
   
   <Suspense fallback={<div>Loading...</div>}>
     <LazyComponent />
   </Suspense>
   ```

### Backend

1. **Caching**
   ```javascript
   // Simples em memória
   const cache = new Map()
   
   if (cache.has(key)) {
     return cache.get(key)
   }
   ```

2. **Paginação**
   ```javascript
   const limit = parseInt(req.query.limit) || 10
   const offset = parseInt(req.query.offset) || 0
   
   const data = all.slice(offset, offset + limit)
   ```

---

## Trabalhando com Chat IA

### Arquitetura do Chat

O sistema de chat permite refinar conteúdo usando IA. Existem três tipos:

1. **Analysis Chat** - Refinar análises táticas
2. **Profile Chat** - Refinar perfis de atletas
3. **Strategy Chat** - Refinar estratégias

### Fluxo de Edição

```javascript
// 1. Usuário digita no chat
Frontend → POST /chat/send
  {
    sessionId: "uuid",
    message: "Refaça o checklist tático"  
  }

// 2. IA analisa e retorna sugestão
Backend → {
  message: "Vou refazer o checklist...",
  pendingEdit: {
    field: "checklist_tatico",
    newValue: "...",
    reason: "..."
  }
}

// 3. Frontend recebe e mostra diff
<EditableText 
  pendingEdit={pendingEdit}
  onAccept={handleAccept}
  onReject={handleReject}
/>

// 4. Usuário aceita → Atualização + Nova versão
POST /chat/apply-edit
  { sessionId, editIndex: 0 }
```

### Adicionar Novo Tipo de Chat

**1. Backend - Criar Prompt:**

```javascript
// server/src/services/prompts/chat-meutipo.txt
Você é um assistente especializado em {{CONTEXTO}}.

CONTEÚDO ATUAL:
{{CONTENT}}

CAMPO PARA EDITAR: {{FIELD}}
REGRAS:
- Responda SEMPRE em JSON
- Use o formato exato: {"field": "nome_campo", "newValue": "...", "reason": "..."}
```

**2. Backend - Adicionar no chatController:**

```javascript
// server/src/controllers/chatController.js
const CONTEXT_TYPES = {
  analysis: {...},
  profile: {...},
  meutipo: {  // NOVO
    tableName: 'minha_tabela',
    promptFile: 'chat-meutipo',
    fieldMapping: {
      'campo1': ['palavra1', 'palavra2'],
      'campo2': ['palavra3', 'palavra4']
    }
  }
}
```

**3. Frontend - Criar Chat Panel:**

```jsx
// frontend/src/components/chat/MeuTipoChatPanel.jsx
import { useChatSession } from '../../hooks/useChatSession'

export default function MeuTipoChatPanel({ contentId, content }) {
  const { sessionId, messages, pendingEdit, sendMessage, applyEdit } = 
    useChatSession({ contextType: 'meutipo', contextId: contentId })
  
  return (
    <div className="chat-container">
      {/* Renderizar mensagens */}
      {pendingEdit && <DiffViewer edit={pendingEdit} />}
    </div>
  )
}
```

### Mapeamento de Campos

Para a IA identificar corretamente qual campo editar:

```javascript
// Exemplo: Strategy Chat
const FIELD_MAPPING = {
  'como_vencer': ['tese', 'vencer', 'vitória', 'ganhar'],
  'plano_tatico_faseado': ['plano', 'faseado', 'fases'],
  'checklist_tatico': ['checklist', 'lista', 'não fazer']
}

// Usuário digita: "refaça o checklist"
// IA identifica: campo = "checklist_tatico"
```

---

## Sistema de Versionamento

### Salvar Versão Automaticamente

Cada edição via chat cria uma versão automaticamente:

```javascript
// Backend - strategyVersionController.js
exports.saveVersion = async (req, res) => {
  const { strategyId, content } = req.body
  
  const version = await StrategyVersion.create({
    strategy_id: strategyId,
    content: content,  // Snapshot completo
    created_by: req.user.id
  })
  
  res.json({ success: true, data: version })
}
```

### Listar Histórico de Versões

```javascript
// Frontend
const { data: versions } = await api.get(`/chat/versions/strategy/${id}`)

versions.forEach(v => {
  console.log(`${v.created_at}: por ${v.created_by}`)
})
```

### Restaurar Versão Anterior

```jsx
// Frontend Component
import VersionHistoryPanel from './VersionHistoryPanel'

<VersionHistoryPanel
  contentType="strategy"
  contentId={strategyId}
  onRestore={(versionId) => {
    // Restaura e recarrega conteúdo
    chatService.restoreVersion('strategy', strategyId, versionId)
      .then(() => window.location.reload())
  }}
/>
```

### Modelos de Versão

```javascript
// Backend - models/
AnalysisVersion   // Para análises táticas
ProfileVersion    // Para perfis de atletas
StrategyVersion   // Para estratégias
```

---

## Monitoramento de Custos da API

### Registrar Uso Automaticamente

O sistema registra **automaticamente** cada chamada à API Gemini:

```javascript
// Backend - utils/apiUsageLogger.js
const { logApiUsage } = require('../utils/apiUsageLogger')

// Após chamar Gemini
const result = await model.generateContent(prompt)

await logApiUsage({
  userId: req.user.id,
  endpoint: 'analyze-video',
  usage: result.usageMetadata  // { promptTokenCount, candidatesTokenCount, totalTokenCount }
})
```

### Consultar Estatísticas

```javascript
// GET /usage/stats
{
  "totalCalls": 150,
  "totalTokens": 45230,
  "inputTokens": 30150,
  "outputTokens": 15080,
  "estimatedCost": 0.15  // USD
}
```

### Exibir Custos no Frontend

```jsx
// frontend/src/pages/Usage.jsx
import { useEffect, useState } from 'react'
import api from '../services/api'

export default function UsagePage() {
  const [stats, setStats] = useState(null)
  
  useEffect(() => {
    api.get('/usage/stats').then(r => setStats(r.data.data))
  }, [])
  
  return (
    <div>
      <h2>Uso da API</h2>
      <p>Total de chamadas: {stats?.totalCalls}</p>
      <p>Custo estimado: ${stats?.estimatedCost}</p>
    </div>
  )
}
```

### Alertas de Custo

```javascript
// Backend - middleware/costLimit.js
const checkCostLimit = async (req, res, next) => {
  const stats = await ApiUsage.getStats(req.user.id)
  
  if (stats.estimatedCost > 10) {  // $10 USD
    return res.status(429).json({
      error: 'Limite de custo atingido'
    })
  }
  
  next()
}

// Usar em rotas de IA
router.post('/analyze-video', checkCostLimit, aiController.analyzeVideo)
```

---

## Commits e Versionamento

### Convenção de Commits

```bash
git commit -m "feat: adiciona novo componente de gráfico"
git commit -m "fix: corrige erro na validação de atleta"
git commit -m "docs: atualiza README com instruções"
git commit -m "style: formata código com prettier"
```

### Tipos de Commit

- `feat:` - Nova funcionalidade
- `fix:` - Correção de bug
- `docs:` - Alterações na documentação
- `style:` - Formatação de código
- `refactor:` - Refatoração sem mudança de funcionalidade
- `test:` - Adição ou modificação de testes
- `chore:` - Tarefas de manutenção

---

## Recursos Úteis

- [React Docs](https://react.dev)
- [Vite Docs](https://vitejs.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [Recharts](https://recharts.org)
- [Express.js](https://expressjs.com)

---

**Última atualização:** Janeiro 2025
**Nota:** Para informações sobre deployment, veja [DEPLOY.md](DEPLOY.md)
