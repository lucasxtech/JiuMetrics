# ADR-008 — Vercel como único destino de deploy

## Status

**Accepted — não implementado** (decidido em 2026-08-12).

⚠️ O workflow do GitHub Pages **ainda está no repositório e ativo**. Até ser removido, os dois destinos coexistem.

## Context

O projeto tem **dois destinos de deploy configurados simultaneamente**, e nada no repositório indica qual é o oficial:

| Destino | Configuração | Estado |
|---|---|---|
| **Vercel** — frontend | `frontend/vercel.json` (SPA rewrites) | ativo |
| **Vercel** — backend | `server/vercel.json` (`@vercel/node`) | ativo |
| **GitHub Pages** — frontend | `.github/workflows/deploy.yml`, dispara em push para `main` | ativo |

Sinais espalhados de que ambos foram usados de verdade:

- o CORS do backend libera `https://lucasxtech.github.io` **e** qualquer `*.vercel.app`;
- `App.jsx` detecta GitHub Pages em runtime (`window.location.hostname.includes('github.io')`) e ajusta o `basename` do router para `/JiuMetrics`;
- `frontend/.env.production` aponta `VITE_API_URL` para `https://jiu-metrics-backend.vercel.app/api`;
- `frontend/public/404.html` existe — artefato típico de SPA no GitHub Pages;
- o workflow do Pages usa `VITE_API_URL: ${{ secrets.VITE_API_URL || 'http://localhost:5050/api' }}` — **se o secret não estiver configurado, publica um frontend apontando para `localhost`**.

## Decision

**Vercel é o único destino de produção.** O GitHub Pages deve ser removido.

Palavras do proprietário (2026-08-12): *"é Vercel, pode até remover o github"*.

Escopo da remoção:

1. `.github/workflows/deploy.yml`
2. a detecção de GitHub Pages em `frontend/src/App.jsx` (`isGitHubPages`, `basename`)
3. a origem `https://lucasxtech.github.io` da allow-list de CORS em `server/index.js`
4. `frontend/public/404.html`, se existir apenas para o Pages — **NEEDS_CONFIRMATION**

## Rationale

Vercel é o destino que **efetivamente sustenta o produto**: o backend só roda lá (GitHub Pages serve estático e não executa a API Express), e `frontend/.env.production` já aponta para o backend na Vercel. O deploy no Pages produz, na melhor hipótese, uma segunda cópia do frontend falando com o mesmo backend — e, na pior (sem o secret), uma cópia publicada e quebrada apontando para `localhost`.

Manter dois destinos custa: duas configurações para manter em sincronia, uma allow-list de CORS mais larga do que o necessário, e código de detecção de ambiente em runtime no `App.jsx` que existe só para acomodar o segundo destino.

## Consequences

### Positivas

- **Um único ambiente de produção**, sem ambiguidade sobre o que está no ar.
- **Elimina o risco de publicar um frontend apontando para `localhost`** quando o secret `VITE_API_URL` não está configurado.
- **Permite fechar a allow-list de CORS.** Hoje ela aceita qualquer `*.vercel.app` — inclusive deploys de terceiros —, o que amplia o impacto de um XSS em qualquer app nesse domínio. Com um destino só, a origem pode ser explícita.
- **Remove código de detecção de ambiente em runtime** do `App.jsx`.
- **Simplifica o CI** — um workflow a menos.

### Negativas / riscos

- **Perde-se o fallback de hospedagem.** Se a Vercel tiver indisponibilidade, não há segunda cópia do frontend. Aceitável para o estágio atual do produto.
- **Se o GitHub Pages estiver em uso por alguém** (link compartilhado, bookmark), a remoção quebra esse acesso. **NEEDS_CONFIRMATION:** o Pages está publicado e acessado hoje?
- **A remoção toca código de aplicação** (`App.jsx`, `index.js`), não só configuração — portanto não é uma mudança puramente de infraestrutura e precisa de revisão.
- **Restrição herdada da Vercel serverless que permanece** e não é resolvida por este ADR: o backend roda como function, o que torna o rate limiting em memória inoperante, o cache de auth não compartilhado entre instâncias, e o trabalho longo de IA sujeito a timeout. Ver [`../ARCHITECTURE.md`](../ARCHITECTURE.md#7-infraestrutura-e-deploy). **NEEDS_CONFIRMATION:** qual plano da Vercel e qual o `maxDuration` efetivo — não há `maxDuration` no `vercel.json`.

## Evidence

- `frontend/vercel.json`, `server/vercel.json` — configuração da Vercel
- `.github/workflows/deploy.yml` — deploy no GitHub Pages, com o fallback para `localhost`
- `frontend/src/App.jsx` — `isGitHubPages` e o `basename` condicional
- `server/index.js` — allow-list de CORS com `lucasxtech.github.io` e `*.vercel.app`
- `frontend/.env.production` — `VITE_API_URL` apontando para a Vercel
- `frontend/public/404.html`
- Decisão: conversa com o proprietário, 2026-08-12 (registrada em [`../../AUDIT.md`](../../AUDIT.md), seção "Decisões — RESPONDIDAS", D5)
