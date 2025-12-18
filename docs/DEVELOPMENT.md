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

### Adicionar Campo em Atleta

1. **Backend** - `server/src/models/Athlete.js`
   ```javascript
   // Adicionar campo na criação
   const newAthlete = {
     ...dados,
     novocampo: valor,
   }
   ```

2. **Frontend** - `frontend/src/components/forms/AthleteForm.jsx`
   ```javascript
   // Adicionar no estado
   const [formData, setFormData] = useState({
     ...outros,
     novoField: '',
   })

   // Adicionar input
   <input
     name="novoField"
     value={formData.novoField}
     onChange={handleChange}
   />
   ```

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

**Última atualização:** Janeiro 2024
