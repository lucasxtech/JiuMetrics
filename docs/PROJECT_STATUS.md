# PROJECT STATUS — JiuMetrics

> **Responde a uma pergunta:** em que estado o JiuMetrics está agora?
>
> **Última atualização:** 2026-08-18 · **Baseline:** `main` (`895066f`) + specs 002–007 e 009 executadas · **Origem:** [`../AUDIT.md`](../AUDIT.md) + [spec 002](../specs/002-verification-baseline/spec.md) (verificação contra produção)
>
> **Regra deste documento:** `IMPLEMENTED` significa que existe no código e funciona. `PLANNED` significa decidido e **não** implementado. Nada é promovido de `PLANNED` para `IMPLEMENTED` sem verificação no código.

---

## Resumo em cinco linhas

O produto funciona e é usado. A camada de IA passou por uma modernização recente e genuinamente boa. **O código não é ruim — é desigual:** as partes recentes mostram julgamento técnico real, e as falhas graves estavam concentradas em código antigo que ninguém revisitou.

✅ **Os 7 endpoints sem verificação de posse foram fechados** (um na spec 002, seis na [spec 006](../specs/006-ownership-in-data-access/spec.md)), e o escopo passou a ser **exigido na assinatura dos models** — a próxima omissão falha em vez de vazar.

✅ **As 2 funcionalidades quebradas foram corrigidas** na [spec 007](../specs/007-silent-failures-and-input-validation/spec.md): versionamento de perfil técnico e atualização do `technical_profile`. As duas eram incompatibilidade de contrato na fronteira `snake_case` × `camelCase`, escondidas por um `catch` que só escrevia no console.

🔴 **O risco dominante, medido em 2026-08-13, não é nenhum desses:** a chave publicável do Supabase está commitada no git e **lê `users` com `password_hash` e `email` dos 25 usuários**. Ver *Known Issues* item 2.

**Adequado** para o uso atual. Para abrir a usuários que não confiam uns nos outros, o que falta agora **não é mais autorização de aplicação** — é rotacionar as credenciais expostas e fechar o acesso direto ao banco (item 2 abaixo e [spec 008](../specs/008-database-access-lockdown/spec.md)).

---

## Implemented

Funcionalidades verificadas no código e em uso.

### Autenticação e usuários

| Funcionalidade | Notas |
|---|---|
| Login com e-mail e senha | JWT próprio (HS256), `bcrypt` 10 rounds, 7 dias ou 30 com "lembrar-me" |
| Validação de sessão em 3 camadas | `role` lido do banco, `is_active` reconsultado, `token_version` comparado — é a razão de **não existir escalonamento de privilégio** |
| Dois papéis: `admin` e `user` | Sem papel intermediário nem permissão granular |
| Grupos por `tenant_id` | Aponta para o admin-raiz; admin vê o grupo, usuário comum vê só o próprio |
| Painel de administração de usuários | Criar, editar nome/senha, trocar papel, desativar, reativar, excluir |
| Exclusão com decisão explícita | Transferir dados para outro usuário **ou** apagá-los — sem default silencioso |
| Invalidação imediata de sessão | Troca de papel ou desativação derruba os JWTs vivos do usuário |
| Log de auditoria de acesso admin | Inclusive tentativas **negadas** |
| Registro público | **Desabilitado por padrão** (`ALLOW_PUBLIC_REGISTER`) |

### Atletas e adversários

| Funcionalidade | Notas |
|---|---|
| CRUD de atletas e adversários | Entidades estruturalmente idênticas; só `name` é obrigatório |
| Perfil técnico consolidado por IA | `technical_summary`, regenerado ao criar/deletar análise; limpo se sobram zero análises |
| Contagem de análises por pessoa | Agregada na listagem |
| Atribuição de criador | `creator_name` exibido na visão de admin |

### Análise de luta por IA

| Funcionalidade | Notas |
|---|---|
| Análise de vídeo do YouTube | 1 ou N vídeos por análise; **só YouTube** — não há upload de arquivo |
| Fallback de ingestão | URL direta para o Gemini → download local (`yt-dlp`/`ytdl-core`) + Files API |
| Saída estruturada | `responseSchema` garante a forma; sem parsing por regex |
| 5 gráficos comportamentais | Personalidade, Comportamento Inicial, Jogo de Guarda, Jogo de Passagem, Finalizações |
| Estatísticas técnicas | Raspagens, passagens, finalizações, tomadas de costas |
| Contexto rico no prompt | Cor do kimono para identificar a pessoa, resultado da luta, faixa + regras IBJJF |
| Consolidação híbrida | Números por função pura (médias); resumos por IA quando há mais de um vídeo |
| Tolerância a falha parcial | Se um vídeo falha, os demais continuam |
| Listagem e exclusão de análises | Por pessoa ou geral |

### Estratégia

| Funcionalidade | Notas |
|---|---|
| Geração de estratégia atleta × adversário | Uma chamada de IA, com `responseSchema` |
| Regra de porta | **Exige ≥1 análise de cada lado**, com erro dizendo qual falta |
| Regras IBJJF por faixa | **Faixa mais restritiva entre os dois governa**; faixa desconhecida → conjunto de branca |
| Reuso de resumo salvo | Evita reconsolidar via IA — economia deliberada de custo |
| Histórico de estratégias | Listagem com busca, filtro e paginação no backend |
| Versionamento de estratégia | `strategy_versions`, com FK `CASCADE` — o único cascade correto do banco |
| Validação de shape na edição | `validateStrategyField` impede gravar estratégia corrompida |
| Exportação em PDF | ⚠️ implementação com sink de XSS — ver *Known Issues* |

### Chat de refinamento

| Funcionalidade | Notas |
|---|---|
| Chat sobre análise, perfil e estratégia | 3 contextos, 16 endpoints, 4 controllers (divididos na spec 006) |
| Sugestão de edição da IA | Só aplicada quando o usuário aceita |
| Snapshot de contexto | Congela o conteúdo no início da conversa |
| Mitigação de prompt injection | `systemInstruction` fixa; dados como primeiro turno `user` |
| Versionamento de análise | `analysis_versions`, com preservação da versão original |
| Restauração de versão | Análise e estratégia |
| Edição manual | Fora do chat |

### Infraestrutura

| Funcionalidade | Notas |
|---|---|
| Deploy na Vercel | Frontend e backend, separados |
| CI no GitHub Actions | **5 portões bloqueiam** merge: testes de front e back, lint de front e back, build. Mais secrets scanning em workflow separado |
| Testes de backend | 27 suítes Jest / 327 testes — inclui a rede de autorização (004/006), persistência e validação (007), e custo/retry/prompt (009) |
| Testes de frontend | 5 arquivos Vitest |
| Testes E2E | 6 specs Playwright com Page Objects — ⚠️ **nunca rodam no CI** |
| Secrets scanning (TruffleHog) | ✅ **bloqueia** desde a spec 003 (escopo = diff, `--only-verified`) |
| CodeQL, Lighthouse, `npm audit`, coverage | ⚠️ informativos — não bloqueiam (decisão consciente: podem reprovar por causa fora do controle do PR) |
| Rate limiting | ⚠️ `MemoryStore` — **inoperante em serverless**. O gasto de IA tem freio próprio desde a spec 009 (orçamento contado no banco); o limite por IP, não |
| Controle de gasto de IA | ✅ allow-list de modelos, teto de vídeos por requisição e **orçamento mensal por tenant** — todos barram **antes** de gastar (spec 009) |
| Retry e timeout de IA | ✅ políticas distintas por fluxo; nunca repete quota estourada nem conteúdo bloqueado (spec 009) |

---

## Known Issues

Severidade e evidência em `arquivo:linha` na [`../AUDIT.md`](../AUDIT.md). Itens riscados foram corrigidos nas specs 002–007 e 009, e ficam registrados como referência do que era possível.

### CRITICAL

| # | Problema | Onde |
|---|---|---|
| 1 | **Chave da API do Gemini commitada** e presente no histórico do git | `.archived/SUPABASE_SETUP.md:25` |
| 2 | 🔴 **AGRAVADO (medido 2026-08-13)** — a chave publicável versionada **lê 9 das 10 tabelas, incluindo `users` com `password_hash` (bcrypt) e `email` dos 25 usuários**; a escrita também está liberada. É o achado mais grave do projeto | `frontend/.env.production` + estado real do banco |
| ~~3~~ | ✅ **RESOLVIDO (spec 002, 2026-08-13)** — `GET /api/fight-analysis/debug/all` removida | — |
| ~~4~~ | ✅ **RESOLVIDO (spec 006, 2026-08-18)** — os 3 endpoints do chat sem verificação de posse (`manual-edit` escrevia, `versions` lia, `restore-version` revertia em qualquer tenant). Junto deles, AZ-5/AZ-6/AZ-7 e o escopo escalar do chat de perfil. **Os 7 vazamentos de posse estão fechados**, e o escopo passou a ser exigido na assinatura dos models | — |
| **5** | 🆕 **Senha em texto claro de uma conta VIVA, commitada** — `TEST_USER_PASSWORD` de `contateste@teste.com`. Verificado no banco: a conta existe, `role=user`, `is_active=true`. Descoberto na spec 003. ⚠️ O secrets scanning **não pega** isso (senha genérica não casa com detector de padrão) | `playwright/.env.example` |

### HIGH

| # | Problema |
|---|---|
| ~~5~~ | ✅ **RESOLVIDO (spec 007, 2026-08-18)** — histórico de versões de perfil, quebrado desde 2026-01-16 por contrato incompatível entre `versionManager` e `ProfileVersion`. O erro agora propaga em vez de morrer num `console.warn`. Coberto por teste que verifica a **linha no banco**, não o status HTTP |
| ~~6~~ | ✅ **RESOLVIDO (spec 007, 2026-08-18)** — `technical_profile` nunca era atualizado (medido: 0 de 37 atletas). Eram **duas** causas: a chamada com 2 de 3 argumentos e, descoberto ao corrigir, o merge lendo `technical_profile` de um objeto camelCase — que descartaria o perfil existente mesmo com a aridade certa |
| ~~7~~ | ❌ **REFUTADO (medido 2026-08-13)** — o rastreamento de custo **funciona**: 173 linhas, US$ 3,0295, de 2025-12-14 a 2026-08-12. A política RLS não está ativa em produção. Dívida real e menor: **55 das 173 linhas com custo zero** |
| 8 | **Sink de XSS no export de PDF** + JWT em `localStorage` → roubo de sessão válida por 7–30 dias. Escopo da [spec 010](../specs/010-frontend-consolidation/spec.md) |
| 9 | **Rate limiting inoperante em produção** — `MemoryStore` em serverless. ⚠️ O **abuso de IA** ganhou freio efetivo na spec 009 (orçamento por tenant contado em `api_usage`, não em memória); o **brute force no login** e o limite por IP continuam sem valer. Resolver exige infraestrutura — store externo ou limite na borda — e é decisão do proprietário |
| ~~10~~ | ✅ **RESOLVIDO (specs 007 e 009)** — gasto de IA tem três barreiras, todas antes de gastar: teto de 5 vídeos por requisição, allow-list de modelos (a escolha do cliente já não vira o modelo usado) e **orçamento mensal por tenant** (`AI_MONTHLY_BUDGET_USD`, default 50 — ~130× o histórico de US$ 0,38/mês). O orçamento conta o gasto **persistido**, o que faz valer em serverless |
| ~~11~~ | ✅ **RESOLVIDO (specs 006 e 007)** — `athlete-summary` aceitava corpo arbitrário direto no prompt, sem posse nem limite. Passou a receber `athleteId` e carregar os dados no servidor (006); o schema de entrada (007) faz o formato antigo ser removido antes do controller |
| 12 | **Fallback de autenticação abre em falha do banco** — volta a confiar no `role` do token, desligando as 3 proteções de uma vez |
| 13 | **Migrations não são a fonte de verdade** — `users` nunca é criada, falta a `020`, sem runner nem controle de estado. **Impossível reconstruir o banco a partir do repositório** |
| 14 | **Tipos de `user_id` divergentes** — VARCHAR em 3 tabelas, UUID em 5; FKs derrubadas na `008`. Mascara bugs (o de nº 6 passa por causa disso) |
| 15 | **Regra de negócio duplicada e já divergente** — `processPersonAnalyses` no frontend (238 linhas) e no backend (121) |
| 16 | **Trabalho longo de IA em request serverless** — provável timeout **após** consumir tokens |
| 17 | **6 lockfiles para 3 `package.json`** (npm + yarn); `playwright/` sem lockfile |
| ~~18~~ | ✅ **RESOLVIDO (spec 006)** — `updateContextSnapshot` não validava posse e envenenava o contexto de IA da sessão de outro usuário. Os três métodos de escrita de `ChatSession` passaram a exigir o dono |

### MEDIUM (resumo)

Chat é o único caminho de IA sem `responseSchema` (parsing por regex que **escreve no banco**) · ~~`handleError` vaza `error.message`~~ ✅ **resolvido na spec 007** (omitido em produção; o detalhe fica só no log do servidor) · enumeração de usuários no login · PII em log · sem `helmet`/CSP · CORS aceita qualquer `*.vercel.app` · validação de host do YouTube por substring (SSRF limitado) · nenhum validador de schema de entrada · sem `UNIQUE` em nenhuma migration · dois clientes Supabase com divisão arbitrária e fallback silencioso · prompt de produção hardcoded fora de `services/prompts/` · dois padrões de fetch no frontend sem invalidação cruzada · dashboard carrega 3 tabelas para exibir 4 números · sem paginação nas listagens · `athletes` e `opponents` duplicados · migrations com PII e `UPDATE` destrutivo sem `WHERE` · dois destinos de deploy simultâneos.

### LOW (resumo)

6 componentes órfãos · `server/=` (arquivo de 0 bytes rastreado) · scripts de debug na raiz do server · dependências declaradas e não usadas · `chatLimiter` aplicado 2× (preservado no split da spec 006 — corrigir é mudança de comportamento de rate limit) · 11 `alert()` nativos · `bcrypt` 10 rounds · `urlencoded` com limite de 500 MB · sem `.editorconfig`/Prettier/pre-commit · sem recuperação de senha.

---

## Technical Debt

| Categoria | Estado |
|---|---|
| **Tipagem** | **Ausente na aplicação** — 148 arquivos JS, 0 TS. As 3 falhas silenciosas seriam erro de compilação. Decisão de adotar: [ADR-010](./decisions/010-adotar-typescript-incrementalmente.md) (`PLANNED`) |
| **Lint** | ✅ **RESOLVIDO na spec 003** — lint de frontend **e** backend bloqueiam merge. O do backend usa conjunto mínimo (só erro real, não estilo). Dívida remanescente: sem Prettier, `.editorconfig` nem pre-commit; ampliar o conjunto de regras é spec futura |
| **Testes de autorização** | ✅ **EXISTEM desde a spec 004** — 6 testes de vazamento (`test.failing`, vermelho intencional até a spec 006 corrigir) + 5 de baseline (passam hoje, protegem o comportamento de admin). `server/src/__tests__/authorization/`. Rodam contra um **fake de PostgREST em memória** (decisão P2), não banco real — não existe projeto Supabase de teste separado da produção. **Limitação aceita:** prova que o filtro foi *pedido* na chamada, não que a query final restringiria as linhas num Postgres real; revisitar se/quando houver banco de teste dedicado. Desde a spec 005, a regra de escopo em si é testada em `server/src/services/__tests__/authorization.test.js` (sem Express); `utils/__tests__/tenantScope.test.js` cobre só o wrapper `@deprecated` |
| **Testes inertes** | ✅ **RESOLVIDO na spec 003** — `server/tests/` removido (3 scripts com zero `describe`/`it`, confirmados como não alcançados por `jest --listTests`) |
| **Testes E2E** | 6 specs bem construídos, com Page Objects e fixtures — **continuam não executados no CI**. A spec 003 tentou ligá-los e **diferiu**: exigem backend + banco + usuário semeado, que é ambiente de teste, não job de CI. A spec 004 resolveu a decisão de banco de teste (P2) **só para a rede de autorização** — optou por fake de PostgREST, que não serve para o Playwright (ele precisa de um backend de verdade respondendo). O pré-requisito de ambiente real para E2E continua em aberto, sem spec própria ainda |
| **Cobertura de frontend** | 5 arquivos de teste para 79 de código (~6%); 1 teste de componente |
| **Tratamento de erro** | Taxonomia boa (14 classes tipadas). ✅ Os **5 `catch` que engoliam erro** foram auditados na spec 007, cada um com a decisão registrada em comentário: 1 propaga, 4 toleram por motivo explícito e registram via `logToleratedFailure` (localizável por `grep "FALHA TOLERADA"`). Dois endpoints ganharam estado explícito na resposta (`saved`, `savedToHistory`) |
| **Logging** | `console.*` com emoji, sem níveis, sem correlação, sem redação de PII. Log por request em serverless |
| **Dívida de lint documentada em código** | A spec 003 tornou o lint bloqueante sem corrigir o que exige decisão de comportamento. Há `eslint-disable` **com comentário apontando a spec responsável** em: `versionManager` (3× — evidência dos bugs das specs 006/007), `AthleteCard` (4 props nunca renderizadas — F7), `StrategyChatPanel` (callback nunca chamado — cluster F14/F19-F22), `VideoAnalysis` (`addVideo` sem controle na UI), `AuthContext` (`set-state-in-effect` na hidratação de sessão), `Strategy` (loading calculado e nunca renderizado). **Nenhum foi escondido com `_`** — a evidência fica visível |
| **Duplicação** | `processPersonAnalyses` (front × back, divergente) · `AVAILABLE_MODELS` (2 lugares) · `Opponent.js` = cópia de `Athlete.js` · `chatLimiter` 2× |
| **Complexidade** | `StrategySummaryModal.jsx` 1116 · `AiStrategyBox.jsx` 1016 · `Analyses.jsx` 922 (com o PDF inteiro dentro) · `geminiService.js` 845 · `linkController.analyzeLink` 206 linhas numa função. ✅ `chatController.js` (818) foi dividido em 4 na spec 006 |
| **Documentação morta** | ~800 linhas descrevendo o sistema multi-agentes removido — **movidas para [`_legacy/`](./_legacy/) em 2026-08-12**. `.github/copilot-instructions.md` ainda documenta `USE_MULTI_AGENTS`/`OPENAI_API_KEY` — **pendente** |
| **Migrations** | Sem runner, sem controle de estado, com contradições internas, PII e operação destrutiva |
| **Dependências** | 6 lockfiles; `yt-dlp` é dependência de sistema não declarada; deps declaradas e não usadas; stack agressivamente na ponta (React 19, Express 5, Vite 7, Tailwind 4) sem rede de proteção para atualizar |

---

## Current Architecture

Resumo. Detalhe em [`ARCHITECTURE.md`](./ARCHITECTURE.md).

Monólito de duas peças: **SPA React 19 + Vite** e **API Express 5**, ambos na Vercel, sobre **Supabase/PostgreSQL** acessado via PostgREST (**sem ORM**). Autenticação **JWT própria** (não Supabase Auth). IA via **Google Gemini**, isolada atrás de `services/llm.js`.

**Decisão que mais define o sistema:** toda a autorização vive na camada de aplicação. O banco não a reforça — RLS está desligado ou neutralizado em todas as tabelas de domínio. Não há defesa em profundidade: existe exatamente **uma** camada de proteção de dados, o filtro no controller.

**O que não existe:** fila, worker, job assíncrono, WebSocket/SSE, cache de servidor, camada de domínio, ORM, migration runner, feature flags, observabilidade estruturada, upload de arquivo de vídeo.

---

## Planned

> Decidido, **não implementado**. Cada item tem ADR.

| # | Item | ADR |
|---|---|---|
| P1 | **Acesso ao banco exclusivamente por `service_role`** — revogar GRANTs de `anon`; a autorização passa a ser explicitamente 100% da aplicação | [009](./decisions/009-acesso-ao-banco-exclusivamente-por-service-role.md) |
| P2 | **Vercel como único destino de deploy** — remover o workflow do GitHub Pages, a detecção de `github.io` em `App.jsx` e a origem do CORS | [008](./decisions/008-vercel-como-unico-destino-de-deploy.md) |
| P3 | **TypeScript incremental** — `checkJs` + `@ts-check` opt-in primeiro; **não** na mesma rodada das correções de autorização | [010](./decisions/010-adotar-typescript-incrementalmente.md) |
| P4 | **`BELT_RULES` validada contra o regulamento oficial IBJJF**, mantida determinística em código (não RAG) | [005](./decisions/005-belt-rules-como-tabela-deterministica.md) |
| P5 | **Unificar `athletes` e `opponents`** numa entidade com marcação de papel — **última** etapa estrutural, depende de P6 | [007](./decisions/007-unificar-athlete-e-opponent-numa-entidade-com-papel.md) |
| P6 | **Unificar `user_id` em UUID e recriar FKs** para `public.users(id)`; baseline de schema real | — |

### Não planejado — e explicitamente fora do domínio

Histórico completo de lutas · histórico de lesões · acompanhamento médico, nutricional ou físico · contas de médico, nutricionista, preparador físico · compartilhamento entre profissionais.

**Nenhum destes existe** (sem tabela, model, rota ou componente) e **nenhum está planejado nesta etapa**. Ver [`DOMAIN.md`](./DOMAIN.md#6-o-que-não-faz-parte-do-domínio-atual). Se entrarem no roadmap, [ADR-009](./decisions/009-acesso-ao-banco-exclusivamente-por-service-role.md) e o modelo binário `admin`/`user` precisam ser reavaliados **antes** — passariam a existir dados sensíveis cruzando fronteira de organização.

---

## Refactoring

> Arquitetura-alvo, justificativas e análise de risco em **[`../JIU_METRICS_REFACTORING_PLAN.md`](../JIU_METRICS_REFACTORING_PLAN.md)**. **4 de 10 etapas implementadas** (2026-08-18); as demais seguem `Status: Proposed`.

Escopo aprovado em 2026-08-12: **tudo**, na ordem de dependência. Cada etapa tem uma spec própria em [`../specs/`](../specs/).

| Etapa | Spec | Escopo | Status |
|---|---|---|---|
| **0** | [002](../specs/002-verification-baseline/spec.md) | Verificação e contenção — rotacionar a chave do Gemini, confirmar o estado real do banco, remover `/debug/all`. **Não escreve código** | ✅ Implemented (parcial) |
| **1** | [003](../specs/003-quality-gates/spec.md) | Portões de CI — ESLint no backend, secrets scanning bloqueante, Playwright no CI | ✅ Implemented (item 4 diferido) |
| **2** | [004](../specs/004-authorization-safety-net/spec.md) | Rede de testes de autorização — **escritos para falhar** antes da correção | ✅ Implemented |
| **3** | [005](../specs/005-authorization-policy-seam/spec.md) | Seam de política — ponto único de decisão, comportamento idêntico | ✅ Implemented |
| **4** | [006](../specs/006-ownership-in-data-access/spec.md) | **Ownership obrigatório no acesso a dados** — fecha os 6 vazamentos e a classe inteira | Proposed |
| **5** | [007](../specs/007-silent-failures-and-input-validation/spec.md) | Falhas silenciosas e validação de entrada | Proposed |
| **6** | [008](../specs/008-database-access-lockdown/spec.md) | Fechamento do acesso ao banco — revogar `anon` | Proposed |
| **7** | [009](../specs/009-ai-cost-and-reliability/spec.md) | Custo e confiabilidade de IA | Proposed |
| **8** | [010](../specs/010-frontend-consolidation/spec.md) | Consolidação do frontend — XSS, normalização, duplicação | Proposed |
| **9** | [011](../specs/011-schema-integrity/spec.md) | Integridade de schema — **maior risco, menor urgência** | Proposed |

**Princípio que governa a ordem:** verificar antes de corrigir; **ligar os portões antes de mexer no código**. Sem teste de posse, corrigir 6 endpoints de autorização é apostar — e é justamente esse tipo de garantia que já falhou três vezes neste projeto.

A spec [001](../specs/001-refactor-foundation/spec.md) foi **substituída** pelas 002–011: era uma spec única cobrindo 34 itens, impossível de implementar ou revisar como unidade.

**A arquitetura-alvo mantém as camadas atuais** e adiciona exatamente três elementos estruturais — escopo obrigatório no acesso a dados, seam de política e validação de entrada —, cada um justificado por uma falha real. Rewrite, *feature folders*, Clean Architecture e DDD foram avaliados e **rejeitados com motivo** (§3.6 do plano).

### Já documentado em specs anteriores, não implementado

- [`../SPEC-FRONTEND.md`](../SPEC-FRONTEND.md) — verificado em 2026-08-12: **nenhum item implementado** (o commit adicionou a spec, não a implementação). Amostra de 5 achados (F1, F2, F11, F15, F16) confirmada como ainda aberta.
- [`../SPEC-ANALISE-IA.md`](../SPEC-ANALISE-IA.md) — a Fase 1 **foi** implementada ([ADR-006](./decisions/006-camada-unica-de-llm-e-aposentadoria-do-multi-agente.md)). As fases posteriores (event log com timestamps, A3/A4) **não**.

---

## Needs Confirmation

Dependem do proprietário ou de consulta ao banco. **Nada aqui foi presumido na documentação.**

### Bloqueiam decisão de segurança

| # | Pergunta | Estado |
|---|---|---|
| 1 | O repositório é público? | ⏳ **PENDENTE — proprietário.** Determina se as credenciais commitadas são exposição pública. Dado o item 3, é a pergunta mais urgente do projeto |
| 2 | Estado real de RLS e políticas? | ✅ **RESPONDIDO empiricamente (2026-08-13).** 9 de 10 tabelas legíveis pela chave anon; só `profile_versions` protegida. A definição *nominal* das políticas continua pendente (só no SQL Editor), mas **não bloqueia nada** |
| 3 | `anon`/`authenticated` ainda têm GRANT? | 🔴 **SIM — confirmado.** Leitura em 9 tabelas, incl. `users` com `password_hash`. **Escrita também liberada** (o `INSERT` falha por `NOT NULL`, não por permissão) |
| 4 | A chave do Gemini commitada ainda é válida? | ⏳ **PENDENTE — proprietário** (Console do Google Cloud). A rotação também é dele |
| 5 | `SUPABASE_SERVICE_ROLE_KEY` está definida em produção? | ⚠️ **Parcial:** está definida no `.env` local e **funciona** (validado). Em produção (Vercel) permanece pendente |

### Bloqueiam entendimento do estado atual

| # | Pergunta | Estado |
|---|---|---|
| 6 | `api_usage` tem linhas? | ❌ **REFUTA a conclusão da auditoria.** 173 linhas, 2025-12-14 → 2026-08-12, US$ 3,0295. **55 com custo zero** (dívida nova) |
| 7 | `profile_versions` tem linhas? | 🔄 **5 linhas, última 2026-01-15.** Refina o diagnóstico: quebrado **desde 2026-01-16**, não "nunca funcionou" |
| 8 | Quais migrations foram aplicadas? | ⏳ **PENDENTE.** Sem tabela de controle. Mas o estado real de `api_usage` prova que **divergiu** das migrations |
| 9 | `users.email` tem `UNIQUE`? | ⚠️ **Indeterminável** via PostgREST — porém **zero duplicatas hoje**, então a constraint é aplicável sem limpeza |
| 10 | Schema real de `users`? | ✅ **RESPONDIDO.** 12 colunas: `id, name, email, password_hash, role, is_active, created_by, tenant_id, token_version, last_login, created_at, updated_at`. População: 25 usuários, 3 admins, 0 inativos, 2 tenants |
| 11 | Existem órfãos (`user_id IS NULL`)? | ✅ **SIM: 67.** `athletes` 4/37 · `opponents` 1/38 · `fight_analyses` 62/285. **Zero valores não-UUID** → conversão de tipo viável sem perda |
| 12 | Plano da Vercel e `maxDuration` efetivo? | ⏳ **PENDENTE — proprietário** |
| 13 | `VITE_API_URL` está configurado como secret? | ⏳ **PENDENTE — proprietário** |
| 14 | O GitHub Pages está publicado e acessado hoje? | ⏳ **PENDENTE — proprietário** |
| 15 | `uuid@13` é realmente usado? | ⏳ pendente (baixa prioridade) |
| 16 | Os testes passam hoje? | ✅ **SIM.** 16 suítes, **180 testes**, todos verdes (executados em 2026-08-13) |
| 17 | `npm audit` reporta vulnerabilidades? | ⏳ pendente |

**Duplicatas que bloqueariam constraints:** ✅ **nenhuma** — zero e-mails duplicados; zero pares `(analysis_id, version_number)` duplicados em `analysis_versions` (27), `profile_versions` (5) e `strategy_versions` (47). Todas as constraints `UNIQUE` da [spec 011](../specs/011-schema-integrity/spec.md) são aplicáveis sem limpeza.

### Regras de negócio indetermináveis pelo código

| # | Pergunta | Estado |
|---|---|---|
| 18 | Admin pode promover outro membro do tenant a admin? | O código permite. Intenção ou herança? — **UNKNOWN** |
| 19 | Dados de usuário desativado devem seguir visíveis ao grupo? | Implementado deliberadamente e comentado. Confirmar |
| 20 | `tenant_id` deve suportar hierarquia de mais de um nível? | A `021` propaga em 3 níveis, mas `createSubUser` herda só do criador direto e `getGroupUserIds` é plano — **UNKNOWN** |
| 21 | `BELT_RULES` está esportivamente correta? | **Não verificável por código.** Exige revisão humana com o regulamento IBJJF vigente. Quem faz? |
| 22 | Registro público deve seguir desabilitado? | Não documentado no `.env.example`; `/register` continua na SPA |
| 23 | A metodologia dos gráficos (soma 100%) é aceitável, ou deve virar event log? | Decisão de produto — proposta em `SPEC-ANALISE-IA.md` |

**Resolvidas em 2026-08-12:** modelo de acesso ao banco (D1 → [ADR-009](./decisions/009-acesso-ao-banco-exclusivamente-por-service-role.md)) · visibilidade dentro do tenant (D2 → só admin vê o grupo) · destino de deploy (D5 → [ADR-008](./decisions/008-vercel-como-unico-destino-de-deploy.md)) · tipagem (D6 → [ADR-010](./decisions/010-adotar-typescript-incrementalmente.md)) · fonte das regras IBJJF (D7 → [ADR-005](./decisions/005-belt-rules-como-tabela-deterministica.md)) · unificação athlete/opponent (D8 → [ADR-007](./decisions/007-unificar-athlete-e-opponent-numa-entidade-com-papel.md)).

---

## Ver também

- [`../AUDIT.md`](../AUDIT.md) — auditoria forense com evidência em `arquivo:linha`
- [`../CLAUDE.md`](../CLAUDE.md) — manual operacional para agentes de IA
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) · [`DOMAIN.md`](./DOMAIN.md) · [`DATABASE.md`](./DATABASE.md) · [`AUTHORIZATION.md`](./AUTHORIZATION.md) · [`AI.md`](./AI.md)
- [`decisions/`](./decisions/) · [`modules/`](./modules/) · [`../specs/`](../specs/)
