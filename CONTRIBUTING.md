# Guia de Contribuição - JiuMetrics

Obrigado por considerar contribuir com o JiuMetrics! Este documento fornece diretrizes para ajudar você a contribuir de forma eficaz.

## 📋 Índice

- [Código de Conduta](#código-de-conduta)
- [Como Posso Contribuir?](#como-posso-contribuir)
- [Processo de Desenvolvimento](#processo-de-desenvolvimento)
- [Padrões de Código](#padrões-de-código)
- [Estrutura de Commits](#estrutura-de-commits)
- [Processo de Pull Request](#processo-de-pull-request)
- [Testes](#testes)
- [Documentação](#documentação)

## 📜 Código de Conduta

Este projeto adere a um código de conduta. Ao participar, espera-se que você mantenha esse código. Por favor, reporte comportamentos inaceitáveis para menezeslucas500@gmail.com.

**Princípios:**
- Seja respeitoso e inclusivo
- Aceite feedback construtivo
- Foque no que é melhor para a comunidade
- Mostre empatia com outros membros

## 🤝 Como Posso Contribuir?

### Reportando Bugs

Antes de criar um issue de bug, por favor:
1. Verifique se o bug já não foi reportado
2. Verifique se o bug persiste na última versão
3. Colete informações sobre o bug

**Template de Bug Report:**
```markdown
**Descrição do Bug**
Uma descrição clara e concisa do bug.

**Passos para Reproduzir**
1. Vá para '...'
2. Clique em '....'
3. Role até '....'
4. Veja o erro

**Comportamento Esperado**
O que deveria acontecer.

**Screenshots**
Se aplicável, adicione screenshots.

**Ambiente:**
- OS: [ex: macOS 14]
- Browser: [ex: Chrome 120]
- Versão: [ex: 1.0.0]

**Informações Adicionais**
Qualquer outra informação relevante.
```

### Sugerindo Melhorias

Issues de melhoria são bem-vindos! Por favor inclua:
- **Título claro**: Descreva a melhoria em poucas palavras
- **Motivação**: Por que isso seria útil?
- **Descrição detalhada**: Como deveria funcionar?
- **Alternativas**: Já considerou outras soluções?

### Implementando Funcionalidades

Quer contribuir com código? Ótimo! Siga estes passos:

1. **Fork o repositório**
2. **Clone seu fork**
3. **Crie uma branch**
4. **Implemente as mudanças**
5. **Teste tudo**
6. **Commit e push**
7. **Abra um Pull Request**

## 🔄 Processo de Desenvolvimento

### 1. Setup do Ambiente

```bash
# Clone o repositório
git clone https://github.com/lucasxtech/JiuMetrics.git
cd JiuMetrics

# Instale dependências
cd frontend && npm install
cd ../server && npm install

# Configure variáveis de ambiente
cp frontend/.env.example frontend/.env
cp server/.env.example server/.env
# Edite os arquivos .env com suas credenciais
```

### 2. Padrões de Branch

**Nomenclatura:**
```
feature/nome-da-funcionalidade    # Nova funcionalidade
fix/descricao-do-bug              # Correção de bug
refactor/nome-refatoracao         # Refatoração
test/descricao-teste              # Adição de testes
docs/descricao-doc                # Documentação
chore/descricao-tarefa            # Tarefas de manutenção
```

**Exemplos:**
```bash
git checkout -b feature/athlete-export
git checkout -b fix/video-upload-timeout
git checkout -b refactor/strategy-service
git checkout -b test/auth-integration
git checkout -b docs/api-endpoints
git checkout -b chore/update-dependencies
```

### 3. Workflow de Desenvolvimento

```bash
# 1. Sincronize com main
git checkout main
git pull origin main

# 2. Crie sua branch
git checkout -b feature/minha-feature

# 3. Desenvolva e teste
npm run dev          # Frontend
npm run dev          # Backend (em outro terminal)
npm test             # Rode os testes

# 4. Commit suas mudanças
git add .
git commit -m "feat: adiciona funcionalidade X"

# 5. Push para seu fork
git push origin feature/minha-feature

# 6. Abra um Pull Request no GitHub
```

## 🎨 Padrões de Código

### Frontend (React)

**Componentes:**
```jsx
// ✅ BOM
export default function AthleteCard({ athlete, onEdit }) {
  const [isEditing, setIsEditing] = useState(false);

  const handleEdit = () => {
    setIsEditing(true);
    onEdit?.(athlete.id);
  };

  return (
    <div className="card">
      <h3>{athlete.name}</h3>
      <button onClick={handleEdit}>Editar</button>
    </div>
  );
}

// ❌ EVITAR
function athleteCard(props) { // PascalCase para componentes
  var isEditing = false; // Usar const/let, não var
  return <div style={{padding: 10}}> // Usar Tailwind
    <h3>{props.athlete.name}</h3> // Destructure props
  </div>
}
```

**Hooks:**
```jsx
// ✅ BOM - Hooks no topo
function MyComponent() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    fetchData();
  }, []);
  
  return <div>{/* ... */}</div>;
}

// ❌ EVITAR - Hooks condicionais
function MyComponent() {
  if (condition) {
    const [data, setData] = useState(null); // ❌ Hook condicional
  }
}
```

**API Calls:**
```jsx
// ✅ BOM
const fetchAthletes = async () => {
  try {
    setLoading(true);
    setError(null);
    const data = await athleteService.getAllAthletes();
    setAthletes(data);
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};

// ❌ EVITAR
const fetchAthletes = async () => {
  const data = await athleteService.getAllAthletes(); // Sem try/catch
  setAthletes(data); // Sem loading state
};
```

### Backend (Node.js)

**Controllers:**
```javascript
// ✅ BOM
exports.getAll = async (req, res) => {
  try {
    const athletes = await Athlete.getAll(req.userId);
    res.json({
      success: true,
      data: athletes,
      count: athletes.length,
    });
  } catch (error) {
    handleError(res, 'buscar atletas', error);
  }
};

// ❌ EVITAR
exports.getAll = async (req, res) => {
  const athletes = await Athlete.getAll(); // Sem try/catch, sem userId
  res.json(athletes); // Sem estrutura padronizada
};
```

**Validação:**
```javascript
// ✅ BOM
exports.create = async (req, res) => {
  const { name, age, weight } = req.body;
  
  if (!name || !age || !weight) {
    return res.status(400).json({
      success: false,
      error: 'Nome, idade e peso são obrigatórios',
    });
  }
  
  // ... resto do código
};

// ❌ EVITAR
exports.create = async (req, res) => {
  const newAthlete = await Athlete.create(req.body); // Sem validação
  res.json(newAthlete);
};
```

### Styling (TailwindCSS)

```jsx
// ✅ BOM - Classes do Tailwind
<div className="flex items-center gap-4 rounded-lg bg-white p-6 shadow-md">
  <img src={url} alt="Athlete" className="h-16 w-16 rounded-full" />
  <h3 className="text-lg font-semibold">{name}</h3>
</div>

// ❌ EVITAR - Styles inline
<div style={{ display: 'flex', padding: '24px', backgroundColor: 'white' }}>
  <img src={url} style={{ width: 64, height: 64 }} />
  <h3 style={{ fontSize: 18 }}>{name}</h3>
</div>
```

## 💬 Estrutura de Commits

Seguimos o padrão **Conventional Commits**:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

| Type | Descrição | Exemplo |
|------|-----------|---------|
| `feat` | Nova funcionalidade | `feat(auth): adiciona login social` |
| `fix` | Correção de bug | `fix(video): corrige timeout em uploads` |
| `refactor` | Refatoração (sem mudança de funcionalidade) | `refactor(athletes): simplifica lógica de filtro` |
| `test` | Adicionar/modificar testes | `test(strategy): adiciona testes unitários` |
| `docs` | Documentação | `docs(readme): atualiza instruções de setup` |
| `style` | Formatação (não muda lógica) | `style: corrige indentação` |
| `chore` | Tarefas de manutenção | `chore: atualiza dependências` |
| `perf` | Melhorias de performance | `perf(video): otimiza processamento de frames` |
| `ci` | CI/CD changes | `ci: adiciona workflow de testes` |

### Scopes

- `auth` - Autenticação
- `athletes` - Funcionalidades de atletas
- `opponents` - Funcionalidades de adversários
- `video` - Análise de vídeo
- `strategy` - Geração de estratégias
- `ai` - Integração com IA
- `ui` - Interface do usuário
- `api` - Backend API
- `db` - Database

### Exemplos Completos

```bash
# Feature
feat(athletes): adiciona exportação em CSV
feat(ai): implementa seleção de modelo Gemini

# Bug Fix
fix(video): corrige erro ao processar vídeos > 100MB
fix(auth): resolve problema de logout automático

# Refactor
refactor(strategy): extrai lógica de comparação para service
refactor(ui): migra componentes para Tailwind v4

# Test
test(auth): adiciona testes de integração de login
test(video): testa upload com diferentes formatos

# Docs
docs(api): documenta endpoints de estratégia
docs(contributing): adiciona guia de testes

# Performance
perf(video): reduz tempo de análise em 40%
perf(db): adiciona índice na tabela de atletas
```

### Mensagens de Commit - Boas Práticas

**✅ BOM:**
```
feat(athletes): adiciona filtro por faixa
fix(video): corrige memory leak no processamento
refactor(strategy): simplifica geração de táticas
```

**❌ EVITAR:**
```
update code          // Vago
fix bug              // Não específico
WIP                  // Não fazer commit de WIP
changes              // Sem contexto
```

## 🔍 Processo de Pull Request

### Checklist Antes de Abrir PR

- [ ] Código segue os padrões do projeto
- [ ] Testes passando (`npm test`)
- [ ] Lint passando (`npm run lint`)
- [ ] Documentação atualizada (se aplicável)
- [ ] Nenhum warning no console
- [ ] Build de produção funciona (`npm run build`)
- [ ] Testado em diferentes navegadores (Chrome, Firefox, Safari)
- [ ] Commits seguem Conventional Commits
- [ ] Branch atualizada com main

### Template de Pull Request

```markdown
## Descrição
Breve descrição do que esse PR faz.

## Tipo de Mudança
- [ ] Bug fix (mudança que corrige um issue)
- [ ] Nova funcionalidade (mudança que adiciona funcionalidade)
- [ ] Breaking change (fix ou feature que causa breaking change)
- [ ] Documentação
- [ ] Refatoração
- [ ] Testes

## Como Foi Testado?
Descreva os testes que você executou.

- [ ] Testes unitários
- [ ] Testes de integração
- [ ] Testes manuais

## Screenshots (se aplicável)
Adicione screenshots para mudanças de UI.

## Checklist
- [ ] Código segue os padrões do projeto
- [ ] Auto-review do código
- [ ] Comentários adicionados em partes complexas
- [ ] Documentação atualizada
- [ ] Sem warnings no console
- [ ] Testes adicionados/atualizados
- [ ] Testes passando localmente
- [ ] Build de produção funciona

## Issues Relacionados
Closes #123
Fixes #456
Related to #789
```

### Processo de Review

1. **Abrir PR**: Preencha o template completamente
2. **CI Checks**: Aguarde os checks automáticos passarem
3. **Code Review**: Aguarde revisão de pelo menos 1 maintainer
4. **Feedback**: Implemente mudanças solicitadas
5. **Aprovação**: PR aprovado por maintainer
6. **Merge**: Squash and merge para main
7. **Deploy**: Deploy automático via GitHub Actions

### Diretrizes de Review

**Para Revisores:**
- Seja construtivo e respeitoso
- Explique o "porquê" de suas sugestões
- Aprove quando estiver satisfeito
- Peça mudanças quando necessário

**Para Autores:**
- Responda todos os comentários
- Faça as mudanças solicitadas
- Marque conversas como resolvidas
- Seja receptivo ao feedback

## 🧪 Testes

### Executando Testes

```bash
# Frontend
cd frontend
npm test              # Modo watch
npm test -- --run     # Execução única
npm test -- --coverage # Com coverage

# Backend
cd server
npm test              # Rodar todos os testes
npm test -- --watch   # Modo watch
```

### Escrevendo Testes

**Frontend (Vitest + React Testing Library):**

```jsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AthleteCard from './AthleteCard';

describe('AthleteCard', () => {
  const mockAthlete = {
    id: 1,
    name: 'João Silva',
    belt: 'Roxa',
  };

  it('deve renderizar o nome do atleta', () => {
    render(<AthleteCard athlete={mockAthlete} />);
    expect(screen.getByText('João Silva')).toBeInTheDocument();
  });

  it('deve chamar onEdit quando botão clicado', () => {
    const handleEdit = vi.fn();
    render(<AthleteCard athlete={mockAthlete} onEdit={handleEdit} />);
    
    fireEvent.click(screen.getByText('Editar'));
    expect(handleEdit).toHaveBeenCalledWith(1);
  });
});
```

**Backend (Jest):**

```javascript
const athleteController = require('../athleteController');
const Athlete = require('../../models/Athlete');

jest.mock('../../models/Athlete');

describe('athleteController', () => {
  let req, res;

  beforeEach(() => {
    req = { userId: '123', body: {}, params: {} };
    res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };
  });

  describe('getAll', () => {
    it('deve retornar todos os atletas', async () => {
      const mockAthletes = [{ id: 1, name: 'João' }];
      Athlete.getAll.mockResolvedValue(mockAthletes);

      await athleteController.getAll(req, res);

      expect(Athlete.getAll).toHaveBeenCalledWith('123');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockAthletes,
        count: 1,
      });
    });
  });
});
```

### Cobertura de Testes

**Objetivos:**
- **Mínimo**: 70% de cobertura
- **Alvo**: 80%+ de cobertura
- **Crítico**: 100% em autenticação e segurança

**Prioridades:**
1. Controllers e routes (backend)
2. Services de API (frontend e backend)
3. Componentes críticos (auth, forms)
4. Utilitários complexos

## 📚 Documentação

### Quando Documentar?

- **Sempre**: Funções públicas e APIs
- **Sempre**: Lógica complexa
- **Sempre**: Decisões arquiteturais
- **Opcionalmente**: Código auto-explicativo

### Como Documentar?

**JSDoc para funções:**

```javascript
/**
 * Calcula estatísticas de um atleta baseado em suas análises
 * @param {Object} athlete - Dados do atleta
 * @param {Array<Object>} analyses - Análises de vídeo
 * @returns {Object} Estatísticas calculadas
 * @throws {Error} Se athlete ou analyses forem inválidos
 */
function calculateStats(athlete, analyses) {
  // ...
}
```

**README para módulos:**

```markdown
# Nome do Módulo

## Descrição
O que esse módulo faz.

## Uso
```javascript
import { funcao } from './modulo';
const resultado = funcao(params);
```

## API
### `funcao(params)`
Descrição da função.

**Parâmetros:**
- `params` (Object) - Descrição

**Retorna:**
- (Object) - Descrição do retorno
```

### Atualizando Documentação

Ao adicionar/modificar funcionalidades, atualize:
- `README.md` - Se muda setup ou uso geral
- `API.md` - Se adiciona/modifica endpoints
- `ARCHITECTURE.md` - Se muda arquitetura
- JSDoc - Em funções modificadas
- CHANGELOG.md - Registre mudanças significativas

## 🆘 Ajuda

**Precisa de ajuda?**
- 📧 Email: menezeslucas500@gmail.com
- 💬 Issues: https://github.com/lucasxtech/JiuMetrics/issues
- 📖 Docs: Veja arquivos `.md` no repositório

**Recursos Úteis:**
- [React Docs](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Express Guide](https://expressjs.com/en/guide/routing.html)
- [Supabase Docs](https://supabase.com/docs)
- [Google Gemini API](https://ai.google.dev/docs)

---

**Obrigado por contribuir! 🥋💪**
