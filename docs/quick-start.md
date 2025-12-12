# 🚀 Guia Rápido de Desenvolvimento

## ⚡ Quick Start (5 minutos)

```bash
# 1. Clone
git clone https://github.com/lucasxtech/JiuMetrics.git
cd JiuMetrics

# 2. Backend
cd server
npm install
cp .env.example .env
# Edite .env com suas credenciais
npm run dev

# 3. Frontend (novo terminal)
cd ../frontend
npm install
cp .env.example .env
# Edite .env
npm run dev

# 4. Acesse
# Frontend: http://localhost:5173
# Backend: http://localhost:5050
```

## 📝 Criando uma Nova Funcionalidade

### Exemplo: Adicionar "Notas" nos Atletas

#### 1. Backend

**Atualizar Model:**
```javascript
// server/src/models/Athlete.js
static async create(data, userId) {
  const { name, age, weight, belt, notes } = data; // ← adicionar notes
  
  const { data: athlete, error } = await supabase
    .from('athletes')
    .insert([{
      user_id: userId,
      name,
      age,
      weight,
      belt,
      notes, // ← adicionar
      created_at: new Date(),
    }])
    .select()
    .single();
    
  // ...
}
```

**Atualizar Controller:**
```javascript
// server/src/controllers/athleteController.js
exports.create = async (req, res) => {
  const { name, age, weight, belt, notes } = req.body; // ← adicionar notes
  
  // Validação
  if (!name) {
    return res.status(400).json({ error: 'Nome é obrigatório' });
  }
  
  const newAthlete = await Athlete.create({
    name,
    age,
    weight,
    belt,
    notes, // ← passar notes
  }, req.userId);
  
  res.json({ success: true, data: newAthlete });
};
```

**Atualizar Database:**
```sql
-- No Supabase SQL Editor
ALTER TABLE athletes ADD COLUMN notes TEXT;
```

#### 2. Frontend

**Atualizar Service:**
```javascript
// frontend/src/services/athleteService.js
export const createAthlete = async (data) => {
  const response = await api.post('/athletes', {
    name: data.name,
    age: data.age,
    weight: data.weight,
    belt: data.belt,
    notes: data.notes, // ← adicionar
  });
  return response.data;
};
```

**Atualizar Form:**
```jsx
// frontend/src/components/forms/AthleteForm.jsx
function AthleteForm() {
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    weight: '',
    belt: '',
    notes: '', // ← adicionar
  });
  
  return (
    <form onSubmit={handleSubmit}>
      {/* ... outros campos ... */}
      
      <div>
        <label>Notas</label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({
            ...formData,
            notes: e.target.value
          })}
          className="w-full rounded-lg border p-2"
        />
      </div>
      
      <button type="submit">Salvar</button>
    </form>
  );
}
```

**Exibir no Card:**
```jsx
// frontend/src/components/common/AthleteCard.jsx
function AthleteCard({ athlete }) {
  return (
    <div className="rounded-lg bg-white p-4 shadow">
      <h3>{athlete.name}</h3>
      <p>Faixa: {athlete.belt}</p>
      {athlete.notes && (
        <p className="text-gray-600">{athlete.notes}</p>
      )}
    </div>
  );
}
```

#### 3. Testar

**Backend Test:**
```javascript
// server/src/controllers/__tests__/athleteController.test.js
describe('create', () => {
  it('deve criar atleta com notas', async () => {
    req.body = {
      name: 'João',
      age: 25,
      weight: 75,
      belt: 'Roxa',
      notes: 'Excelente guard player',
    };
    
    await athleteController.create(req, res);
    
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          notes: 'Excelente guard player',
        }),
      })
    );
  });
});
```

**Frontend Test:**
```jsx
// frontend/src/components/__tests__/AthleteForm.test.jsx
it('deve exibir campo de notas', () => {
  render(<AthleteForm />);
  expect(screen.getByLabelText('Notas')).toBeInTheDocument();
});
```

#### 4. Commit

```bash
git checkout -b feature/athlete-notes
git add .
git commit -m "feat(athletes): adiciona campo de notas"
git push origin feature/athlete-notes
# Criar PR no GitHub
```

## 🧪 Rodando Testes

```bash
# Frontend - todos os testes
cd frontend && npm test

# Frontend - um arquivo específico
npm test -- athleteService.test.js

# Frontend - com coverage
npm test -- --coverage

# Backend - todos os testes
cd server && npm test

# Backend - um arquivo específico
npm test -- athleteController.test.js

# Backend - modo watch
npm test -- --watch
```

## 🐛 Debugging

### Frontend (React DevTools)

```bash
# Instalar extensão do navegador
# Chrome: React Developer Tools
# Firefox: React Developer Tools

# No código, adicionar breakpoint:
debugger; // Pausa execução aqui

# Console logs (remover antes de commit):
console.log('State:', athletes);
console.table(athletes); // Tabela bonita
```

### Backend (Node.js)

```javascript
// Adicionar breakpoint
debugger;

// Console logs
console.log('Request body:', req.body);
console.log('User ID:', req.userId);

// Inspect object
console.dir(athlete, { depth: null });
```

```bash
# Rodar com inspector
node --inspect index.js

# No Chrome: chrome://inspect
```

## 🔧 Comandos Úteis

```bash
# Limpar cache
rm -rf node_modules package-lock.json
npm install

# Atualizar dependências
npm update

# Verificar vulnerabilidades
npm audit
npm audit fix

# Formatar código (se configurado Prettier)
npm run format

# Lint e fix
npm run lint -- --fix

# Build de produção
npm run build

# Testar build localmente
npm run preview
```

## 📦 Adicionando Dependências

```bash
# Produção
npm install nome-do-pacote

# Desenvolvimento
npm install -D nome-do-pacote

# Exemplo: adicionar date-fns
npm install date-fns

# Usar
import { format } from 'date-fns';
const formattedDate = format(new Date(), 'dd/MM/yyyy');
```

## 🎨 Tailwind CSS - Padrões Comuns

```jsx
// Container
<div className="mx-auto max-w-6xl px-4">

// Card
<div className="rounded-lg bg-white p-6 shadow-md">

// Button primário
<button className="rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700">

// Button secundário
<button className="rounded-lg border border-gray-300 px-4 py-2 hover:bg-gray-50">

// Grid responsivo
<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">

// Flex center
<div className="flex items-center justify-center">

// Input
<input className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200" />

// Loading spinner
<div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-indigo-600"></div>
```

## 🔐 Testando Autenticação Localmente

```javascript
// 1. Criar usuário
POST http://localhost:5050/api/auth/register
Body: {
  "name": "Test User",
  "email": "test@example.com",
  "password": "123456"
}

// 2. Login
POST http://localhost:5050/api/auth/login
Body: {
  "email": "test@example.com",
  "password": "123456"
}

// 3. Copiar token da resposta
// 4. Usar em requisições protegidas
GET http://localhost:5050/api/athletes
Headers: {
  "Authorization": "Bearer SEU_TOKEN_AQUI"
}
```

## 🚨 Troubleshooting Comum

### "Cannot find module"
```bash
# Reinstalar dependências
rm -rf node_modules package-lock.json
npm install
```

### "Port already in use"
```bash
# Encontrar processo usando porta 5050
lsof -i :5050

# Matar processo
kill -9 PID

# Ou mudar porta no .env
PORT=3000
```

### "CORS error"
```bash
# Backend - verificar origem permitida
# server/index.js
app.use(cors({
  origin: 'http://localhost:5173'
}));

# Frontend - verificar API_URL
# frontend/.env
VITE_API_URL=http://localhost:5050/api
```

### "Token inválido"
```javascript
// Limpar localStorage e fazer login novamente
localStorage.clear();
// Ou no DevTools: Application > Local Storage > Clear All
```

### "Database error"
```bash
# Verificar credenciais Supabase no .env
# Verificar se tabelas existem no Supabase Dashboard
# Verificar RLS policies (Row Level Security)
```

## 📊 Gerando Gráficos (Recharts)

```jsx
import { RadarChart, PolarGrid, PolarAngleAxis, Radar } from 'recharts';

function AthleteRadar({ athlete }) {
  const data = [
    { attribute: 'Técnica', value: athlete.technique },
    { attribute: 'Força', value: athlete.strength },
    { attribute: 'Cardio', value: athlete.cardio },
    { attribute: 'Defesa', value: athlete.defense },
    { attribute: 'Agressividade', value: athlete.aggression },
  ];
  
  return (
    <RadarChart width={400} height={400} data={data}>
      <PolarGrid />
      <PolarAngleAxis dataKey="attribute" />
      <Radar dataKey="value" fill="#8884d8" fillOpacity={0.6} />
    </RadarChart>
  );
}
```

## 🤖 Testando Gemini AI Localmente

```javascript
// Criar arquivo de teste: test-gemini.js
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = ai.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

async function test() {
  const prompt = 'Explique o que é um kimura no jiu-jitsu';
  const result = await model.generateContent(prompt);
  console.log(result.response.text());
}

test();

// Rodar: node test-gemini.js
```

## 📱 Testando Responsividade

```bash
# Chrome DevTools
# F12 > Toggle Device Toolbar (Ctrl+Shift+M)

# Testar em:
# - Mobile: 375x667 (iPhone SE)
# - Tablet: 768x1024 (iPad)
# - Desktop: 1920x1080

# Breakpoints Tailwind:
# sm: 640px
# md: 768px
# lg: 1024px
# xl: 1280px
# 2xl: 1536px
```

## 🔄 Git Workflow Rápido

```bash
# Atualizar main local
git checkout main
git pull

# Criar feature branch
git checkout -b feature/nome

# Fazer alterações...
git add .
git commit -m "feat: descrição"

# Push
git push origin feature/nome

# Criar PR no GitHub

# Depois do merge, limpar
git checkout main
git pull
git branch -d feature/nome
```

## 📝 Dicas Rápidas

1. **Sempre teste localmente antes de commit**
2. **Use ESLint - corrija warnings**
3. **Remova console.logs antes de commit**
4. **Commits pequenos e frequentes são melhores**
5. **Escreva mensagens de commit descritivas**
6. **Teste em diferentes navegadores**
7. **Use Tailwind ao invés de CSS inline**
8. **Adicione loading states em async operations**
9. **Trate erros com try/catch**
10. **Documente funções complexas**

---

**Precisa de ajuda?** Abra uma issue ou veja [CONTRIBUTING.md](../CONTRIBUTING.md)
