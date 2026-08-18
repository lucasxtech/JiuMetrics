# Changelog

Mudanças relevantes do JiuMetrics. Baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).

**O que entra aqui:** funcionalidades, mudanças de comportamento, arquitetura, segurança, banco de dados e IA.
**O que não entra:** formatação, renomeações pequenas, refatorações internas sem impacto observável, mudanças cosméticas.

> **Nota sobre o histórico anterior a 2026-08-12:** este changelog começa no estado atual. O histórico do git antes desta data tem mensagens de commit em grande parte genéricas (`fix`, `fix debugs`, `correção`), o que não permite reconstruir com segurança o que mudou e quando. **Nada foi inventado.** As duas entradas históricas abaixo são as únicas reconstruíveis com confiança, a partir de commits descritivos e das specs correspondentes.

---

## [Não lançado]

### Rede de testes de autorização — 2026-08-18 · [spec 004](./specs/004-authorization-safety-net/spec.md)

Nenhuma correção de código (`git diff server/src` vazio). O objetivo desta spec era produzir testes vermelhos **intencionais e documentados** para os 6 endpoints sem verificação de posse — a correção é escopo da spec 006.

#### Adicionado

- **`server/src/__tests__/authorization/`** — 6 testes de vazamento (`leaks.test.js`, um por AZ-2..AZ-7 de [`docs/AUTHORIZATION.md`](./docs/AUTHORIZATION.md)) e 5 de baseline (`baseline.test.js`, comportamento correto de escopo que as specs 005/006 não podem quebrar), rodando via `supertest` sobre o `app` real.
- **Fixtures reutilizáveis** (`support/fixtures.js`) — 2 tenants × 2 usuários (1 admin + 1 comum cada) com atleta, adversário, análise de luta, versão, sessão de chat e estratégia em cada.
- **Fake de PostgREST em memória** (`support/fakeSupabase.js`, `support/supabaseMock.js`) — reproduz `.from().select().eq().in().order().single()`/`.insert()`/`.update()`/`.delete()` sobre um `Map`, sem executar SQL de verdade.
- **`supertest`** como devDependency do backend — única dependência nova (decisão P1, aprovada).
- **Testes de unidade de `getScopeIds`** (`server/src/utils/__tests__/tenantScope.test.js`) — baseline da regra (admin → grupo; usuário → próprio id) para a spec 005 provar equivalência.

#### Decisão de processo

- **P2 — banco de teste:** fake de PostgREST, não Supabase real. Só existe o banco de **produção** configurado; rodar fixtures de 2 tenants contra ele misturaria dado de teste com os 25 usuários reais a cada execução do CI. **Limitação aceita e documentada:** o fake prova que o filtro foi *pedido* na chamada, não que a query final restringiria as linhas num Postgres real.
- **Testes vermelhos via `test.failing()`** (Jest 29), não `skip` — o CI roda, reporta, e sai com código 0 porque a falha é a esperada; se um dia passar sem a spec 006 ter rodado, `test.failing` sinaliza como regressão do sinal.

---

### Portões de qualidade no CI — 2026-08-13 · [spec 003](./specs/003-quality-gates/spec.md)

O CI passa a **recusar** o que antes apenas comentava.

#### Adicionado

- **ESLint no backend** (`server/eslint.config.js`) — 69 arquivos que nunca passaram por análise estática. Conjunto de regras deliberadamente **mínimo**: só erro real (`no-undef`, `no-unused-vars`, `no-unreachable`, `no-dupe-keys`, `no-const-assign`, `no-unsafe-finally`…), **nada de estilo**. Script `npm run lint` e job `Backend Lint` no CI.
- **`eslint`** como `devDependency` do `server` — única dependência nova. Dependências de produção **inalteradas**.

#### Alterado

- **Secrets scanning (TruffleHog) passa a bloquear merge.** Escopo é o **diff** (`base..head`), não o histórico: impede a entrada de segredo **novo**. Com `--only-verified`, só bloqueia segredo confirmado como ativo.
- **Lint do frontend passa a bloquear merge** (era `continue-on-error`).
- **`Integration Check` agora exige os 5 portões** (testes de front e back, lint de front e back, build), não só 2.
- **`react-refresh/only-export-components` rebaixada para `warn`** no frontend — disparava em 3 de 3 contexts porque cada um exporta `XProvider` + `useX` no mesmo arquivo, que é o padrão **idiomático** de React Context. Quando uma regra reprova um padrão correto em 100% dos usos, o problema é a configuração.

#### Removido

- **`server/tests/`** — 3 arquivos com extensão `.test.js` que **nunca rodavam** (`testMatch` do Jest cobre só `__tests__/`) e estavam quebrados: zero `describe`/`it`, dois com `process.exit`, um com `require` de caminho inexistente. Davam falsa impressão de cobertura.

#### Correções pontuais (necessárias para o lint passar)

Código morto comprovado, sem mudança de comportamento: import não usado em `AuthContext` e em um teste; leitura de `localStorage` sem uso em `initAuth`; campo desestruturado e ignorado em `chatController`; 3 variáveis locais mortas em `strategyController`. Em `index.js`, o 4º parâmetro do error handler do Express foi renomeado para `_next` — **a aridade 4 é preservada**, que é o único critério do Express, e isso foi verificado.

#### Dívida documentada em vez de escondida

Onde o lint apontou algo que exige **decisão de comportamento**, a correção **não** foi feita: há `eslint-disable` com comentário nomeando a spec responsável. Nenhum caso foi mascarado com prefixo `_`, porque isso apagaria a evidência do problema. Casos: `versionManager` (3× — evidência direta dos bugs das specs 006/007), `AthleteCard` (4 props nunca renderizadas), `StrategyChatPanel` (callback nunca chamado), `VideoAnalysis` (`addVideo` sem controle na UI), `AuthContext` (`set-state-in-effect` na hidratação de sessão), `Strategy` (loading calculado e nunca renderizado).

#### Diferido

- **E2E (Playwright) no CI.** A spec assumia "adicionar um job"; a inspeção mostrou que exige **backend + banco + usuário semeado** — ambiente de teste, não configuração de job. Depende da mesma decisão que a [spec 004](./specs/004-authorization-safety-net/spec.md) precisa tomar, e passa a ser pré-requisito dela.

#### Segurança — novo achado, ação do proprietário

🔴 **`playwright/.env.example` contém a senha em texto claro de uma conta viva** (`contateste@teste.com` — verificado no banco: existe, `role=user`, `is_active=true`). O arquivo é rastreado pelo git.

⚠️ **O portão desta spec não pega este caso:** o TruffleHog detecta segredo por padrão reconhecível; uma senha genérica em `TEST_USER_PASSWORD=` não casa com nenhum detector. Registrado para não criar falsa confiança no instrumento. **Ação recomendada:** rotacionar essa senha junto da chave do Gemini.

---

### Segurança e verificação — 2026-08-13 · [spec 002](./specs/002-verification-baseline/spec.md)

Primeira etapa executada do plano de refatoração. **Uma alteração de código; o resto é verificação e correção de documentação.**

#### Removido

- **`GET /api/fight-analysis/debug/all`** — devolvia `id`, `person_id`, `person_type`, `user_id` e `created_at` de **todas as análises de todos os tenants**, exigindo apenas autenticação. Estava marcada no próprio código como "DEBUG TEMPORÁRIO". Removida junto com a query de banco que vivia dentro do arquivo de rota.

#### Segurança — achado que exige ação do proprietário

🔴 **A chave publicável do Supabase, commitada em `frontend/.env.production`, lê 9 das 10 tabelas do banco — incluindo `users` com `password_hash` (bcrypt) e `email` dos 25 usuários.** A escrita também está liberada (um `INSERT` é recusado por violação de `NOT NULL`, não por permissão).

É materialmente mais grave do que a auditoria estimou, que havia marcado o RLS de `users` como desconhecido. **Ação recomendada: antecipar a [spec 008](./specs/008-database-access-lockdown/spec.md)** e rotacionar as chaves.

#### Correções de diagnóstico (documentação)

A verificação contra produção **refutou uma conclusão da auditoria e refinou outra**:

- ❌ **O rastreamento de custo de IA funciona.** A auditoria concluiu que `api_usage` nunca gravou, por causa de uma política RLS. **Medição: 173 linhas, de 2025-12-14 a 2026-08-12, US$ 3,0295 acumulados.** A política não está ativa em produção. Dívida real e menor descoberta no lugar: **55 das 173 linhas com custo zero**.
- 🔄 **O versionamento de perfil técnico está quebrado desde 2026-01-16**, não "nunca funcionou". Funcionou por 6 dias em janeiro; quebrou quando `versionManager.saveProfileVersion` foi criado com o contrato de argumentos errado (commit `2b13a64`).
- ✅ **Confirmado:** `technical_profile` do atleta nunca é atualizado — 0 de 37 atletas com o campo preenchido.

#### Efeito no plano

- Item de `api_usage` **removido do escopo** da [spec 007](./specs/007-silent-failures-and-input-validation/spec.md).
- [Spec 009](./specs/009-ai-cost-and-reliability/spec.md) **deixou de depender** da 007 (a visibilidade de custo já existe) e absorveu a dívida das 55 linhas com custo zero.
- [Spec 011](./specs/011-schema-integrity/spec.md) desbloqueada com números reais: **67 registros órfãos** (`user_id` nulo), **zero valores não-UUID** (conversão de tipo viável sem perda) e **zero duplicatas** (constraints `UNIQUE` aplicáveis sem limpeza).

**Pendente de acesso do proprietário:** rotação da chave do Gemini, verificação de consumidores externos da chave anon (bloqueia a spec 008), plano/timeout da Vercel, e estado do GitHub Pages.

---

### Planejamento — 2026-08-12

Definição da arquitetura-alvo e do plano de refatoração. **Nenhuma alteração de código, banco, dependência, prompt ou API.** Nada implementado.

#### Adicionado

- **[`JIU_METRICS_REFACTORING_PLAN.md`](./JIU_METRICS_REFACTORING_PLAN.md)** — arquitetura-alvo, comparação `CURRENT` × `TARGET` por área, modularização, modelo de autorização futuro, análise de viabilidade da evolução para atleta/profissionais, classificação de mudanças de banco (*Required Now* / *Useful Later* / *Do Not Change*), estratégia de testes, dependências (KEEP/REPLACE/REMOVE), plano em 9 etapas, estratégia de migração e de commits, *Implementation Gate*, anti-padrões e autorrevisão crítica.
- **10 specs**, todas `Status: Proposed` — [002](./specs/002-verification-baseline/spec.md) a [011](./specs/011-schema-integrity/spec.md), uma por unidade implementável e revisável.

#### Alterado

- **Spec [001](./specs/001-refactor-foundation/spec.md) → `Superseded`.** Cobria 34 itens em 6 etapas num único documento — o padrão "refatorar tudo numa spec" que o plano identifica como anti-padrão. O escopo aprovado permanece; o que mudou foi o fatiamento.
- **`docs/{ARCHITECTURE,DOMAIN,AUTHORIZATION,AI,DATABASE,PROJECT_STATUS}.md`** — ponteiros para a arquitetura-alvo, com `Current` e `Proposed` explicitamente separados. O conteúdo descritivo do estado atual **não mudou**.
- **`CLAUDE.md`** — seção *Specs* aponta o plano e adverte que a spec 002 (verificação) precede qualquer implementação.

#### Decisões arquiteturais do plano

A arquitetura-alvo **mantém as camadas atuais** e adiciona exatamente três elementos estruturais, cada um justificado por uma falha real da auditoria: escopo obrigatório na camada de acesso a dados, seam de política de autorização e validação de entrada por endpoint.

Rewrite completo, reorganização em *feature folders*, Clean/Hexagonal Architecture, agregados e value objects de DDD, CQRS, event bus e container de DI foram avaliados e **rejeitados com motivo registrado** — nenhum corrigiria as três ausências identificadas.

Para autorização futura, RBAC puro foi avaliado e considerado **insuficiente**: o requisito de profissionais com acesso a atletas específicos exige role + relacionamento + escopo de campo.

#### Correções de precisão na documentação

Revisão cruzada corrigiu cinco imprecisões introduzidas na etapa anterior: contagem de páginas (9 → 11), componentes (~50 → 40), services (13 → 12), chamadas de `getScopeIds` (~20 → 23, verificado) e a afirmação de que `ALLOW_PUBLIC_REGISTER` não estava documentado no `.env.example` — **é**, e com valor `true`, o que significa que copiar o arquivo de exemplo **habilita o cadastro público**, invertendo o default seguro do código. Registrado como problema conhecido.

---

### Documentação — 2026-08-12

Criação da memória técnica permanente do projeto. **Nenhuma alteração de código, banco, dependência, prompt ou comportamento.**

#### Adicionado

- **[`AUDIT.md`](./AUDIT.md)** — auditoria forense completa: stack, arquitetura, domínio, autenticação, autorização, banco, IA, segurança, performance, qualidade, dependências e dívida técnica, com evidência em `arquivo:linha`.
- **[`CLAUDE.md`](./CLAUDE.md)** — manual operacional para agentes de IA e desenvolvedores, incluindo as regras de integridade documental.
- **`docs/`** — documentação permanente:
  - [`ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — arquitetura real, com diagramas Mermaid
  - [`DOMAIN.md`](./docs/DOMAIN.md) — entidades, ownership, ciclo de vida, invariantes
  - [`AUTHORIZATION.md`](./docs/AUTHORIZATION.md) — autenticação, autorização e falhas conhecidas
  - [`AI.md`](./docs/AI.md) — integração com Gemini, fluxos de análise e estratégia
  - [`DATABASE.md`](./docs/DATABASE.md) — tabelas, FKs, RLS, migrations
  - [`PROJECT_STATUS.md`](./docs/PROJECT_STATUS.md) — implementado × planejado × dívida × a confirmar
- **`docs/modules/`** — 6 módulos com fronteira clara: `athletes-opponents`, `fight-analysis`, `strategies`, `chat-and-versions`, `users-and-admin`, `usage-tracking`.
- **`docs/decisions/`** — 10 ADRs. Seis registram decisões já implementadas; quatro registram decisões tomadas em 2026-08-12 e **ainda não implementadas** (007–010).
- **`specs/`** — estrutura oficial de specs versionadas, com `001-refactor-foundation` (depois substituída pelas specs 002–011 — ver a entrada de *Planejamento* acima).
- **`.ai/`** — área de trabalho temporária, ignorada pelo Git.

#### Movido

- 7 documentos obsoletos para **[`docs/_legacy/`](./docs/_legacy/)**, preservados mas marcados como **não fonte de verdade**: `MULTI_AGENTS.md`, `QUICKSTART_MULTI_AGENTS.md` e `IMPLEMENTATION_SUMMARY.md` (descrevem o sistema multi-agentes **removido do código** na Fase 1), `architecture-file-tree.md` (era `docs/architecture.md` — dump de árvore de arquivos de quando o projeto se chamava "projeto analise atletas"), `ESTRATEGIAS.md` (pipeline anterior à Fase 1), `API.md.old` e `CODE_REVIEW.md`.
  **Motivo:** ~800 linhas descrevendo um sistema inexistente são instrução ativa para reintroduzi-lo, num projeto mantido com assistência de IA.

#### Decisões registradas (não implementadas)

- [ADR-007](./docs/decisions/007-unificar-athlete-e-opponent-numa-entidade-com-papel.md) — unificar `Athlete` e `Opponent` numa entidade com marcação de papel
- [ADR-008](./docs/decisions/008-vercel-como-unico-destino-de-deploy.md) — Vercel como único destino de deploy; remover GitHub Pages
- [ADR-009](./docs/decisions/009-acesso-ao-banco-exclusivamente-por-service-role.md) — acesso ao banco exclusivamente por `service_role`; **substitui** ADR-002
- [ADR-010](./docs/decisions/010-adotar-typescript-incrementalmente.md) — adotar TypeScript incrementalmente

#### Notas de segurança

A auditoria identificou problemas que **permanecem abertos**, entre eles: chave da API do Gemini no histórico do git, credenciais do Supabase em arquivo rastreado, RLS desligado com GRANTs de `anon` presumivelmente ativos, 6 endpoints sem verificação de posse (leitura e escrita entre tenants), e 3 funcionalidades que a UI oferece e que nunca funcionaram. Detalhe em [`AUDIT.md`](./AUDIT.md) §9 e plano de correção em [`JIU_METRICS_REFACTORING_PLAN.md`](./JIU_METRICS_REFACTORING_PLAN.md).

**Pendente e recomendado como prioridade:** rotacionar a chave do Gemini e confirmar o estado real de RLS/GRANTs no Supabase.

---

## Histórico reconstruível

### Fase 1 — Modernização da camada de IA — commit `c193c8a`

Guiada por [`SPEC-ANALISE-IA.md`](./SPEC-ANALISE-IA.md). Ver [ADR-006](./docs/decisions/006-camada-unica-de-llm-e-aposentadoria-do-multi-agente.md).

#### Alterado

- Migração para o SDK **`@google/genai`**, com `services/llm.js` como **fronteira única** de acesso — nenhum controller ou model importa o SDK.
- **Saída estruturada obrigatória** via `responseSchema` na análise de vídeo e na estratégia, substituindo "JSON de exemplo no prompt + regex".
- **Temperatura explícita por tarefa** e modelo resolvido por tarefa (`TASK_MODELS`), com a escolha do usuário sempre vencendo.
- Regras IBJJF unificadas em **fonte única** (`config/ai.js#BELT_RULES`), com resolução de alias pt/en centralizada e fallback seguro para a faixa mais restritiva. Ver [ADR-005](./docs/decisions/005-belt-rules-como-tabela-deterministica.md).
- **`systemInstruction` do chat passou a ser constante fixa**, sem interpolar dado do usuário (commit `23b475b`). Ver [ADR-003](./docs/decisions/003-system-instruction-fixa-no-chat.md).

#### Removido

- **Sistema multi-agentes** de análise de vídeo e estratégia (`server/src/services/agents/`) — triplicava o custo de análise sem ganho medido. As variáveis `USE_MULTI_AGENTS`, `OPENAI_API_KEY` e `OPENAI_MODEL` deixaram de ser lidas, eliminando a dependência de OpenAI.
- Caminho morto de análise por frames estáticos (commit `a4f7f37`).
- Código morto de matchup baseado em regras hardcoded (commit `c594a02`).

#### Corrigido

- **O sistema parou de inventar dados quando o parse do JSON da IA falhava** — antes, gráficos 50/50 hardcoded eram salvos como análise real (commit `92ac963`).
- `technical_stats` passou a ser persistido, e a consolidação a ler a chave correta (commits `b3907cf`, `9935489`).
- Correção das regras IBJJF por faixa, que estavam erradas e triplicadas (commit `2dea52b`).
- Eliminação de chamadas de IA desperdiçadas ao buscar stats para estratégia (commits `e69a18e`, `e9a6501`).
- `validateStrategyField` passou a checar conteúdo real, não apenas presença de chave (commit `52bb7d4`).
- Agregação de finalizações deixou de gerar a chave `"[object Object]"` (commit `8013b24`).
- Placeholder `{{MAX_WORDS}}` passou a ser preenchido no prompt de consolidação (commit `0f725bf`).

### Fundação de testes, docs e CI — commits `4842f9e`, `77aed03`

#### Alterado

- **Os testes do backend passaram a bloquear PR no CI.** O `continue-on-error` foi removido deliberadamente — segundo o próprio workflow, era *"o motivo de 10 testes quebrados terem vivido meses no repositório sem ninguém ver"*.
- Suíte do backend reescrita e verde (16 suítes).

> ⚠️ Lint de frontend, `npm audit` e o scanner de segredos **continuam** com `continue-on-error` e não bloqueiam nada. O backend não tem lint. Os testes E2E do Playwright existem e nunca rodam no CI.
