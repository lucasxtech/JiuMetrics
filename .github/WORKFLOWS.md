# 🚀 CI/CD Workflows

Este projeto utiliza GitHub Actions para automação de CI/CD. Aqui está uma visão geral dos workflows configurados:

## 📋 Workflows Disponíveis

### 1. **CI - Continuous Integration** (`ci.yml`)
Executado em: Push para `main`/`develop` e Pull Requests

**Jobs:**
- ✅ **Frontend Tests**: Executa testes unitários do frontend
- 🎨 **Frontend Lint**: Verifica qualidade do código (ESLint)
- 🏗️ **Frontend Build**: Verifica se o build funciona
- 🧪 **Backend Tests**: Executa testes do backend
- 🔒 **Backend Security**: Auditoria de segurança de dependências
- ✔️ **Integration Check**: Verifica integração entre componentes

**Artefatos Gerados:**
- Relatório de cobertura de testes (30 dias de retenção)

---

### 2. **Code Quality** (`code-quality.yml`)
Executado em: Pull Requests e Push para `main`

**Jobs:**
- 📦 **Dependency Review**: Revisa mudanças em dependências (apenas PRs)
- 🔍 **Code Scanning**: Análise de segurança com CodeQL
- 🔐 **Secrets Scan**: Detecta secrets expostos no código
- 📊 **Outdated Dependencies**: Verifica dependências desatualizadas

---

### 3. **Performance Check** (`performance.yml`)
Executado em: Pull Requests para `main` e manualmente

**Jobs:**
- 🚦 **Lighthouse CI**: Auditoria de performance, acessibilidade, SEO
- 📦 **Bundle Size**: Análise do tamanho do bundle

**Métricas Verificadas:**
- Performance: mínimo 80%
- Accessibility: mínimo 90%
- Best Practices: mínimo 85%
- SEO: mínimo 80%

---

### 4. **Deploy to GitHub Pages** (`deploy.yml`)
Executado em: Push para `main`

**Jobs:**
1. **Test**: Executa testes antes do deploy
2. **Build**: Cria o build de produção
3. **Deploy**: Faz deploy para GitHub Pages

**Requisitos:**
- Secret `VITE_API_URL` deve estar configurado
- GitHub Pages deve estar habilitado no repositório

---

## 🔧 Configuração Necessária

### Secrets do GitHub
Configure em: `Settings → Secrets and variables → Actions`

| Secret | Descrição | Exemplo |
|--------|-----------|---------|
| `VITE_API_URL` | URL da API backend | `https://jiu-metrics-backend.vercel.app/api` |

### Permissões
Os workflows precisam das seguintes permissões:
- ✅ Read access to contents
- ✅ Write access to pages
- ✅ Write access to security events (para CodeQL)

---

## 📊 Badges de Status

Adicione ao seu README.md:

```markdown
![CI](https://github.com/lucasxtech/JiuMetrics/workflows/CI%20-%20Continuous%20Integration/badge.svg)
![Code Quality](https://github.com/lucasxtech/JiuMetrics/workflows/Code%20Quality/badge.svg)
![Deploy](https://github.com/lucasxtech/JiuMetrics/workflows/Deploy%20to%20GitHub%20Pages/badge.svg)
```

---

## 🐛 Troubleshooting

### Testes falhando no CI mas passando localmente
- Verifique se todas as dependências estão no `package.json`
- Confirme que não há dependências de ambiente local
- Revise os logs do GitHub Actions

### Deploy falhando
1. Verifique se o secret `VITE_API_URL` está configurado
2. Confirme que o build local funciona: `npm run build`
3. Verifique os logs na aba Actions

### CodeQL Analysis falhando
- Normal em projetos JavaScript puros
- Pode ser desabilitado se não for necessário

---

## 📈 Melhorias Futuras

- [ ] Adicionar testes E2E com Playwright
- [ ] Integrar com Codecov para cobertura de testes
- [ ] Adicionar notificações no Slack/Discord
- [ ] Implementar deploy preview para PRs
- [ ] Adicionar testes de carga/stress

---

## 🚀 Como Executar Localmente

### Testes
```bash
# Frontend
cd frontend && npm test

# Backend
cd server && npm test
```

### Build
```bash
# Frontend
cd frontend && npm run build

# Backend
cd server && npm start
```

### Lint
```bash
cd frontend && npm run lint
```

---

## 📝 Manutenção

Os workflows são executados automaticamente, mas você pode:

1. **Executar manualmente**: Vá em Actions → Selecione o workflow → Run workflow
2. **Ver histórico**: Actions → Selecione o workflow → Veja runs anteriores
3. **Debug**: Click em um run → Veja logs detalhados de cada step

---

## ⚡ Performance

Os workflows são otimizados com:
- ✅ Cache de dependências npm
- ✅ Jobs paralelos quando possível
- ✅ `continue-on-error` em checks não-críticos
- ✅ Artefatos com retenção de 30 dias
