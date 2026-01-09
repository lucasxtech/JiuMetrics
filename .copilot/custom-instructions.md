# Custom Instructions - JiuMetrics

## 📋 Resumo do Projeto

**JiuMetrics** é uma plataforma completa de análise tática de Jiu-Jitsu que utiliza Inteligência Artificial (Google Gemini) para analisar vídeos, gerenciar perfis de atletas/adversários e gerar estratégias de luta personalizadas.

## 🏗️ Arquitetura

### Stack Tecnológico

**Frontend:**
- React 19.2.0 + Vite 7.2.4
- TailwindCSS 4.1.17 (styling)
- React Router DOM 6.30.2 (navegação)
- Axios 1.13.2 (HTTP client)
- Recharts 2.15.4 (visualização de dados)
- Lucide React 0.556.0 (ícones)
- Vitest 2.1.5 (testes)

**Backend:**
- Node.js + Express 5.1.0
- Supabase (PostgreSQL)
- Google Generative AI 0.24.1 (Gemini)
- JWT + bcrypt (autenticação)
- Multer 2.0.2 (upload de arquivos)
- FFmpeg (extração de frames de vídeo)
- Jest 29.7.0 (testes)

**Deploy:**
- Frontend: GitHub Pages
- Backend: Vercel
- Database: Supabase (PostgreSQL)
- CI/CD: GitHub Actions

### Estrutura de Pastas

```
projeto analise atletas/
├── frontend/
│   ├── src/
│   │   ├── components/      # Componentes reutilizáveis (organizados por feature)
│   │   │   ├── analysis/    # Componentes de análise (AiStrategyBox, AnalysisCard, StrategySummaryModal)
│   │   │   ├── video/       # Componentes de vídeo (VideoAnalysis, VideoAnalysisCard)
│   │   │   ├── charts/      # Gráficos (Recharts - Radar, Line, Bar, Pie)
│   │   │   ├── chat/        # Componentes de Chat IA (ProfileChatPanel, StrategyChatPanel)
│   │   │   ├── common/      # Componentes compartilhados (Header, Cards, Modal)
│   │   │   ├── forms/       # Formulários (AthleteForm)
│   │   │   └── routing/     # Rotas (ProtectedRoute)
│   │   ├── pages/           # Páginas/rotas principais
│   │   ├── services/        # Chamadas API e lógica de negócio
│   │   ├── hooks/           # Custom React hooks
│   │   └── utils/           # Funções utilitárias
│   └── public/              # Assets estáticos
│
├── server/
│   ├── src/
│   │   ├── controllers/     # Lógica de controle HTTP (chatController, strategyController)
│   │   ├── models/          # Modelos de dados (Supabase)
│   │   ├── routes/          # Definição de rotas Express (chat.js, strategy.js)
│   │   ├── services/        # Serviços externos (Gemini, FFmpeg)
│   │   ├── middleware/      # Middlewares (auth, etc)
│   │   └── utils/           # Funções auxiliares
│   ├── migrations/          # SQLs do Supabase (001-014, numerados)
│   ├── tests/               # Testes de integração
│   └── uploads/             # Arquivos temporários de upload
│
├── scripts/                 # Scripts de desenvolvimento
│   ├── dev.sh              # Comandos de desenvolvimento
│   ├── start.sh            # Iniciar app completo
│   └── startup-info.sh     # Documentação interativa
│
├── tools/                   # Ferramentas de debug
│   ├── api-requests.http   # Requests HTTP (REST Client)
│   └── TEST_TOKEN.js       # Teste de autenticação
│
├── docs/                    # Documentação completa
│   ├── setup/              # Guias de configuração (Supabase, API, Auth)
│   ├── deployment/         # Guias de deploy (Vercel, GitHub Pages)
│   └── guides/             # Checklists e tutoriais
│
└── .archived/               # Documentação obsoleta
```

## 🎯 Padrões e Convenções

### Nomenclatura

**Arquivos:**
- Componentes React: `PascalCase.jsx` (ex: `AthleteCard.jsx`)
- Services: `camelCase.js` (ex: `athleteService.js`)
- Pages: `PascalCase.jsx` (ex: `Overview.jsx`)
- Utilitários: `camelCase.js` (ex: `chartUtils.js`)
- Testes: `*.test.js` ou `*.test.jsx`
- Migrations SQL: `001-nome-descritivo.sql` (numeradas sequencialmente)
- Scripts shell: `kebab-case.sh` (ex: `start-dev.sh`)

**Código:**
- Componentes: `PascalCase`
- Funções: `camelCase`
- Constantes: `UPPER_SNAKE_CASE`
- Variáveis: `camelCase`

**Organização de Componentes:**
- Componentes organizados por **feature** em subpastas:
  - `analysis/` - Componentes de análise tática e estratégia (AiStrategyBox, StrategySummaryModal)
  - `chat/` - Componentes de Chat IA (ProfileChatPanel, StrategyChatPanel)
  - `video/` - Componentes de análise de vídeo
  - `charts/` - Todos os gráficos e visualizações
  - `common/` - Componentes reutilizáveis globais (ProfileSummaryModal)
  - `forms/` - Formulários de cadastro/edição
  - `routing/` - Componentes de roteamento
- Cada pasta pode ter seu próprio `README.md` documentando os componentes

### Estrutura de Código

**Componentes React:**
```jsx
// Imports
import { useState, useEffect } from 'react';
import ComponentName from './components/ComponentName';

// Component
export default function MyComponent({ prop1, prop2 }) {
  // States
  const [state, setState] = useState(null);
  
  // Effects
  useEffect(() => {
    // ...
  }, []);
  
  // Handlers
  const handleAction = () => {
    // ...
  };
  
  // Render
  return (
    <div className="container">
      {/* JSX */}
    </div>
  );
}
```

**Controllers (Backend):**
```javascript
// Imports
const Model = require('../models/Model');

// Helper functions
const handleError = (res, operation, error) => {
  res.status(500).json({
    success: false,
    error: `Erro ao ${operation}`,
    details: error.message,
  });
};

// Exports
exports.getAll = async (req, res) => {
  try {
    const data = await Model.getAll(req.userId);
    res.json({
      success: true,
      data,
      count: data.length,
    });
  } catch (error) {
    handleError(res, 'buscar dados', error);
  }
};
```

**Services (Frontend):**
```javascript
// Imports
import api from './api';

// Exports com named functions
export const getAll = async () => {
  const response = await api.get('/endpoint');
  return response.data;
};

export const getById = async (id) => {
  const response = await api.get(`/endpoint/${id}`);
  return response.data;
};
```

### Padrões de API Response

**Sucesso:**
```json
{
  "success": true,
  "data": { /* ... */ },
  "count": 10
}
```

**Erro:**
```json
{
  "success": false,
  "error": "Mensagem de erro",
  "details": "Detalhes técnicos"
}
```

### Autenticação

- Token JWT armazenado em `localStorage` com chave: `jiumetrics_token`
- User data armazenado com chave: `jiumetrics_user`
- Middleware de autenticação no backend: `src/middleware/auth.js`
- Interceptor axios adiciona token automaticamente

### Estado e Data Fetching

- Sem Redux/Context - Estado local com `useState`
- Chamadas API diretas via services
- Loading states: `const [loading, setLoading] = useState(false)`
- Error handling: `try/catch` com estados de erro

## 🎨 Styling

### TailwindCSS

- **Utility-first approach**: Classes diretas no JSX
- **Responsive**: Mobile-first com breakpoints `sm:`, `md:`, `lg:`, `xl:`, `2xl:`
- **Dark mode**: Implementado com classes condicionais
- **Custom colors**: Definidas em `tailwind.config.js`

**Padrões de classes comuns:**
```jsx
// Container
<div className="mx-auto max-w-[1500px] px-4 sm:px-8 lg:px-12">

// Card
<div className="rounded-xl bg-white p-6 shadow-lg">

// Button
<button className="rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700">

// Grid
<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
```

## 🧪 Testes

### Frontend (Vitest)

```bash
npm test              # Modo watch
npm test -- --run     # Execução única
```

**Estrutura de teste:**
```javascript
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

describe('Component', () => {
  it('should render correctly', () => {
    render(<Component />);
    expect(screen.getByText('Text')).toBeInTheDocument();
  });
});
```

### Backend (Jest)

```bash
npm test              # Rodar testes
```

**Testes críticos:**
- Autenticação (`authService.test.js`)
- Controllers (`*Controller.test.js`)
- Rotas protegidas

## 🚀 Desenvolvimento

### Comandos Principais

**Frontend:**
```bash
npm run dev          # Dev server (porta 5173)
npm run build        # Build produção
npm run preview      # Preview build
npm run lint         # ESLint
npm test             # Testes
```

**Backend:**
```bash
npm run dev          # Dev com nodemon (porta 5050)
npm start            # Produção
npm test             # Testes
```
**Scripts de Desenvolvimento:**
```bash
# Da raiz do projeto
./scripts/dev.sh install      # Instalar todas as dependências
./scripts/dev.sh both         # Iniciar frontend + backend
./scripts/start.sh            # Iniciar app completo
./scripts/startup-info.sh     # Ver documentação interativa
```
### Variáveis de Ambiente

**Frontend (.env):**
```env
VITE_API_URL=http://localhost:5050/api
```

**Backend (.env):**
```env
GEMINI_API_KEY=xxx
SUPABASE_URL=xxx
SUPABASE_ANON_KEY=xxx
JWT_SECRET=xxx
PORT=5050
```

**⚠️ Importante:**
- Backend usa JWT customizado (não Supabase Auth)
- Middleware `authMiddleware` seta `req.userId` (não `req.user.id`)
- Tabela `api_usage` deve ter RLS **DESABILITADO** (JWT customizado não é reconhecido por `auth.uid()`)
- Outras tabelas (`athletes`, `opponents`, `fight_analyses`) devem ter RLS **HABILITADO** com policies usando casting `::text`

## 📝 Regras Importantes

### ⚠️ NUNCA FAÇA:

1. **Console.log em produção**: Remover antes de commit (apenas para debug local)
2. **Hardcode de credenciais**: Sempre usar variáveis de ambiente
3. **Commits diretos na main**: Sempre usar branches e PRs
4. **Código sem testes**: Features novas devem ter testes
5. **Imports não utilizados**: Remover antes de commit
6. **Magic numbers**: Usar constantes nomeadas
7. **Funções gigantes**: Quebrar em funções menores (<50 linhas)
8. **Mutação direta de estado**: Sempre usar setState
9. **Async sem error handling**: Sempre usar try/catch
10. **Keys duplicadas em listas**: Usar IDs únicos

### ✅ SEMPRE FAÇA:

1. **TypeScript-like JSDoc**: Documentar funções complexas
2. **Destructuring**: Props e objetos
3. **Early returns**: Para validações
4. **Loading states**: Em todas as chamadas assíncronas
5. **Error boundaries**: Em componentes críticos
6. **Semantic HTML**: Usar tags apropriadas
7. **Accessibility**: aria-labels, alt texts
8. **Responsive design**: Mobile-first
9. **Code review**: Antes de merge
10. **Conventional commits**: Seguir padrão de mensagens
11. **Organização por feature**: Componentes em pastas categorizadas
12. **READMEs descritivos**: Documentar cada diretório importante
13. **Migrations numeradas**: SQLs com prefixo numérico (001-, 002-, etc)
14. **Imports relativos corretos**: Ajustar paths após mover arquivos

## 💬 Mensagens de Commit

Seguir padrão **Conventional Commits**:

```
<type>(<scope>): <description>

[optional body]
[optional footer]
```

**Types:**
- `feat`: Nova funcionalidade
- `fix`: Correção de bug
- `refactor`: Refatoração de código
- `test`: Adicionar/modificar testes
- `docs`: Documentação
- `style`: Formatação (não muda lógica)
- `chore`: Tarefas de manutenção
- `perf`: Melhorias de performance
- `ci`: CI/CD changes

**Exemplos:**
```bash
feat(auth): adiciona login com remember me
fix(video): corrige upload de arquivos grandes
refactor(athletes): simplifica lógica de filtros
test(strategy): adicustomizados (não Supabase Auth) com expiração (7 dias padrão, 30 com remember me)
2. **Password hashing**: bcrypt com salt rounds
3. **CORS**: Configurado apenas para origens permitidas
4. **Input validation**: Validação no backend e frontend
5. **SQL Injection**: Prevenido por Supabase/Postgres parametrizado
6. **XSS**: React escapa automaticamente
7. **Secrets**: Nunca commitar `.env` files
8. **RLS (Row Level Security)**:
   - **Habilitado** em: `athletes`, `opponents`, `fight_analyses`, `users`
   - **Desabilitado** em: `api_usage` (dados não sensíveis, JWT customizado)
   - Policies devem usar casting `::text` para comparar UUIDs: `auth.uid()::text = user_id::text`drão, 30 com remember me)
2. **Password hashing**: bcrypt com salt rounds
3. **CORS**: Configurado apenas para origens permitidas
4. **Input validation**: Validação no backend e frontend
5. **SQL Injection**: Prevenido por Supabase/Postgres parametrizado
6. **XSS**: React escapa automaticamente
7. **Secrets**: Nunca commitar `.env` files

## 🤖 Integração com IA

### Google Gemini

**Modelos disponíveis:**
- `gemini-2.0-flash` (padrão) - Rápido e eficiente ($0.075/$0.30 por 1M tokens)
- `gemini-2.5-pro` - Mais preciso ($1.25/$5.00 por 1M tokens)
- `gemini-3-pro-preview` - Preview gratuito (experimental)

**Configuração:**
- Modelo selecionável em Settings
- Salvo em `localStorage` como `ai_model`
- Passado como parâmetro opcional nas chamadas

**Rastreamento de Custos:**
- Tabela `api_usage` no Supabase rastreia tokens e custos
- Modelo `ApiUsage.js` calcula custos automaticamente
- Endpoint `/api/usage/stats` retorna estatísticas por período
- UI em Settings mostra gastos em tempo real

**Funcionalidades:**
- Análise de vídeos (frames + context)
- Geração de estratégias táticas (com prompt expandido)
- Resumos de atletas
- Análise de padrões de luta
- **Chat IA para refinamento** (NOVO)

### Sistema de Chat IA (NOVO)

**Componentes:**
- `StrategyChatPanel.jsx` - Chat para refinar estratégias
- `ProfileChatPanel.jsx` - Chat para refinar perfis de atletas
- `StrategySummaryModal.jsx` - Modal com chat lateral + histórico
- `ProfileSummaryModal.jsx` - Modal de perfil com chat lateral

**Rotas de Chat:**
```javascript
// Chat de Estratégia
POST /api/chat/strategy-send
{
  strategyData: { ... },
  athleteName: "João",
  opponentName: "Pedro",
  question: "Como melhorar a defesa?"
}

// Chat de Perfil
POST /api/chat/profile-send
{
  athleteId: "uuid",
  athleteName: "João",
  currentSummary: "Resumo atual...",
  question: "Detalhar finalizações"
}
```

**Funcionalidades do Modal:**
- Edição manual de seções (textarea + salvar/cancelar)
- Histórico de versões com restauração
- Chat IA lateral para refinamento
- Botões de ação no header (Chat IA / Histórico)

**⚠️ JSON Parsing:**
- Gemini pode retornar JSON com markdown, `\n` literais, ou aspas duplas aninhadas
- `extractJson()` em `chartUtils.js` faz limpeza robusta:
  - Remove markdown code blocks (````json)
  - Remove `\n` literais e `**negrito**`
  - Conta chaves para encontrar fechamento correto do objeto
  - Fallback para gráficos padrão em caso de erro
- Prompt de estratégia proíbe explicitamente markdown e quebras de linha

## 🎯 Fluxo de Desenvolvimento

1. **Branch**: Criar branch a partir da `main`
2. **Desenvolvimento**: Código + testes
3. **Lint**: Rodar `npm run lint`
4. **Testes**: Garantir que passam
5. **Commit**: Mensagem seguindo padrão
6. **Push**: Enviar para remoto
7. **PR**: Criar Pull Request
8. **CI/CD**: Aguardar checks passarem
9. **Review**: Code review
10. **Merge**: Merge para main
11. **Deploy**: Automático via GitHub Actions

## 📊 Métricas de Qualidade

- **Code coverage**: Mínimo 70% (alvo: 80%+)
- **Build time**: < 2 minutos
- **Bundle size**: < 500KB (gzipped)
- **Lighthouse score**: 
  - Performance: 80+
  - Accessibility: 90+
  - Best Practices: 90+
  - SEO: 90+

## 🆘 Troubleshooting

**Erro: "Token inválido"**
- Verificar `jiumetrics_token` no localStorage
- Fazer logout/login novamente

**Erro: "GEMINI_API_KEY não configurada"**
- Verificar `.env` no backend
- Reiniciar servidor

**Erro: "CORS"**
- Verificar VITE_API_URL no frontend
- Verificar origem permitida no backend

**Erro: "PGRST301: No suitable key or wrong key type"**
- Problema com RLS ou Primary Key não reconhecida pelo PostgREST
- Soluções:
  1. Executar `NOTIFY pgrst, 'reload config';` no SQL Editor (recarrega cache)
  2. Verificar se `uuid-ossp` extension está habilitada
  3. Desabilitar RLS se a tabela não precisa de proteção: `ALTER TABLE x DISABLE ROW LEVEL SECURITY;`
  4. Usar policies com casting: `auth.uid()::text = user_id::text`
  5. Para tabela `api_usage`: sempre desabilitar RLS (JWT customizado)

**Erro: "Request failed with status code 401" em /usage/stats**
- Verificar se controller usa `req.userId` (não `req.user.id`)
- Verificar se token JWT está sendo enviado no header Authorization

**Erro: "Cannot find module" após mover componentes**
- Atualizar imports relativos nos arquivos que usam o componente
- Verificar paths em `analysis/`, `video/`, `charts/`, `routing/`
- Testar build: `npm run build`

**Erro: Build warnings sobre chunk size**
- Normal para bundles >500KB
- Considerar code splitting com `React.lazy()` e `Suspense`
- Ver sugestões em `build.rollupOptions.output.manualChunks`

## 📚 Documentação Adicional

O projeto possui documentação completa organizada hierarquicamente:

- **README.md** - Documentação principal do projeto
- **CONTRIBUTING.md** - Guia de contribuição
- **CODE_REVIEW.md** - Análise e melhorias do código
- **docs/setup/** - Guias de configuração (Supabase, API, Auth)
- **docs/deployment/** - Guias de deploy (Vercel, GitHub Pages)
- **docs/guides/** - Checklists e tutoriais
- **scripts/README.md** - Scripts de desenvolvimento
- **server/migrations/README.md** - Migrations do Supabase
- **server/tests/README.md** - Testes de integração
- **tools/README.md** - Ferramentas de debug
- **frontend/src/components/README.md** - Documentação de componentes

---

**Última atualização:** 9 de janeiro de 2026

### Changelog Recente (Branch atual)

**Features de Chat IA:**
- ✅ `StrategyChatPanel.jsx` - Chat lateral para refinar estratégias
- ✅ `ProfileChatPanel.jsx` - Chat lateral para refinar perfis
- ✅ `StrategySummaryModal.jsx` - Modal completo com chat + histórico
- ✅ `ProfileSummaryModal.jsx` - Modal de perfil com chat lateral
- ✅ Rotas `/api/chat/strategy-send` e `/api/chat/profile-send`
- ✅ `chatController.js` e `chatService.js` no backend

**Melhorias de UI:**
- ✅ `AiStrategyBox.jsx` - Seções sempre abertas (sem acordions)
- ✅ Edição manual de seções via textarea
- ✅ Histórico de versões com restauração
- ✅ Botões de ação no header dos modais

**Melhorias de Prompt (geminiService.js):**
- ✅ Campo `resumo_rapido` com 3 prioridades
- ✅ `tese_da_vitoria` expandida (3-4 frases)
- ✅ Campos `explicacao` e `por_que_funciona`
- ✅ Cronologia renomeada: `primeiro_minuto`, `minutos_2_a_4`, `minutos_finais`
- ✅ Checklist com `situacao`, `o_que_ele_faz`, `protocolo_de_emergencia`
- ✅ Fallbacks para campos antigos E novos

**Correções:**
- ✅ Fix `aiResponse.response` → `aiResponse.message` em chatController
- ✅ Fix `ApiUsage.create` → `ApiUsage.logUsage`
- ✅ Fix contexto de estratégia no chat
