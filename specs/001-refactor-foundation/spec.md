# SPEC-001 — Refatoração de fundação

## Title

Refatoração de fundação: isolamento entre tenants, portões de qualidade e controle de custo de IA.

## Status

**Superseded** pelas specs [002](../002-verification-baseline/spec.md)–[011](../011-schema-integrity/spec.md) (2026-08-12). Implementação nunca iniciada.

**Motivo da substituição:** esta spec cobria 34 itens em 6 etapas num único documento — o que a torna impossível de implementar ou revisar como uma unidade. É exatamente o padrão "refatorar tudo numa spec" que o [plano de refatoração](../../JIU_METRICS_REFACTORING_PLAN.md) identifica como anti-padrão.

O **escopo aprovado permanece o mesmo** (tudo, na ordem de dependência); o que mudou foi o fatiamento. O conteúdo abaixo é preservado como registro histórico e porque a análise de dependências e o inventário de arquivos afetados continuam válidos — as specs 002–011 os herdam.

## Context

A auditoria forense de 2026-08-12 ([`../../AUDIT.md`](../../AUDIT.md)) mapeou o estado real do JiuMetrics. As decisões arquiteturais que dela decorreram estão registradas em [`../../docs/decisions/`](../../docs/decisions/) (ADR-007 a ADR-010).

Três fatos da auditoria estruturam esta spec:

1. **O isolamento entre usuários é inconsistente por endpoint, não por arquitetura.** Existe um helper correto (`utils/tenantScope.js#getScopeIds`) usado em ~20 endpoints e ausente em 6. `FightAnalysis.update()`/`delete()` não filtram `user_id` no model, então a posse é responsabilidade exclusiva do controller — e três controllers não a verificam.
2. **Três funcionalidades que a UI oferece nunca funcionaram**, cada uma escondida por um `catch` que só escreve no console: versionamento de perfil técnico, atualização de `technical_profile`, e registro de custo de IA.
3. **Não existem portões automáticos de qualidade.** Lint só no frontend e com `continue-on-error`; backend sem lint; nenhum teste de autorização; E2E existente mas nunca executado no CI. Foi por isso que uma chave de API commitada nunca foi bloqueada e que as três falhas acima sobreviveram.

Escopo aprovado: **tudo**, na ordem de dependência definida abaixo.

## Problem

**O sistema não é seguro para múltiplos tenants que não confiam uns nos outros**, e não há como corrigir isso com confiança porque nenhuma rede de proteção detectaria uma regressão.

Especificamente:

- Qualquer usuário autenticado **lê e sobrescreve** dados de qualquer outro (6 endpoints).
- Uma rota de debug expõe todas as análises de todos os tenants e fornece os IDs para explorar os demais.
- Com RLS desligado e credenciais versionadas, o banco é alcançável **sem passar pela aplicação**.
- O gasto de IA é ilimitado por usuário e **invisível** no painel.
- Corrigir qualquer um dos itens acima hoje é apostar: não há teste que prove que a correção funcionou nem que ela não quebrou outra coisa.

## Goal

Levar o JiuMetrics de "seguro enquanto os usuários confiam uns nos outros" para "seguro por construção", **com prova automatizada** de que cada garantia vale.

Três resultados verificáveis:

1. Nenhum endpoint alcança dado fora do escopo do requisitante, e uma tentativa de fazê-lo **falha em teste** antes de chegar a produção.
2. As três funcionalidades quebradas funcionam, ou são removidas da UI — nenhuma permanece oferecendo algo que não faz.
3. O gasto de IA é visível e limitado.

## Scope

### Etapa 0 — Verificação e contenção

Sem alteração de código, exceto o item 4.

1. **Rotacionar a chave da API do Gemini** no Google Cloud (está no histórico do git — remover o arquivo não resolve).
2. **Confirmar o estado real do banco** — as 5 perguntas bloqueantes de [`../../docs/PROJECT_STATUS.md`](../../docs/PROJECT_STATUS.md#needs-confirmation): RLS por tabela, políticas, GRANTs de `anon`/`authenticated`, e se `SUPABASE_SERVICE_ROLE_KEY` está definida em produção.
3. **Confirmar as três falhas silenciosas** com consulta direta: `SELECT count(*) FROM api_usage;`, `SELECT count(*) FROM profile_versions;` (esperado 0), e contagem de órfãos `user_id IS NULL OR user_id = ''`.
4. **Remover `GET /api/fight-analysis/debug/all`** — deleção isolada, sem dependência.

### Etapa 1 — Portões de qualidade

Precede as correções, deliberadamente.

5. Remover `continue-on-error` do job de **secrets scanning**.
6. **ESLint no backend** (69 arquivos hoje sem análise estática).
7. **Testes de posse** para os 6 endpoints, escritos **antes** da correção — devem falhar agora e passar depois.
8. **Playwright no CI** (a suíte já existe e está pronta).

### Etapa 2 — Isolamento entre tenants

9. Corrigir os 6 endpoints, aplicando `getScopeIds` + `getByIdAndUser`: `chat/manual-edit`, `chat/versions/:analysisId`, `chat/restore-version`, `updateContextSnapshot` em `apply-edit`, `ai/analyze-link` (posse de `personId`), `ai/athlete-summary` (passar a receber `athleteId`).
10. **Empurrar a garantia de posse para os models** — `FightAnalysis.update/delete` passam a exigir escopo. **Esta é a correção estrutural; os 6 endpoints são o sintoma.**
11. **Resolver a autorização de `analysis_versions`** — a tabela não tem `user_id`; decidir entre `JOIN` com a `fight_analysis` pai ou coluna denormalizada.
12. Corrigir o **escopo escalar** em `createProfileSession`, `saveProfileSummary` e `restoreProfileVersion` (admin perde acesso ao grupo nesses caminhos).
13. **Revogar GRANTs de `anon`/`authenticated`**; unificar o backend em `service_role`; **falhar no boot** se a chave faltar; remover as variáveis de Supabase de `frontend/.env.production` e rotacionar as chaves ([ADR-009](../../docs/decisions/009-acesso-ao-banco-exclusivamente-por-service-role.md)).

### Etapa 3 — Controle financeiro

14. **Corrigir o registro de custo primeiro** — sem visibilidade, impor limites é às cegas.
15. Limite explícito em `videos[]`.
16. Allow-list de modelos em `resolveModel`.
17. Quota por usuário/tenant, persistida.
18. Rate limiting com store externo ou na borda.

### Etapa 4 — Falhas silenciosas

19. Corrigir o contrato de `saveProfileVersion` ↔ `ProfileVersion.create`, e **propagar o erro** em vez de engolir.
20. Corrigir `updateTechnicalProfile` (argumento faltando) e fazer a função lançar em vez de retornar `null`.
21. Corrigir o sink de XSS em `Analyses.jsx` (`createElement`/`textContent`); adicionar CSP e `helmet`.
22. **Falhar fechado** no fallback do `authMiddleware`.
23. Condicionar `details: error.message` a `NODE_ENV !== 'production'`.
24. Corrigir `versionManager` lendo `technical_stats` onde o objeto tem `technicalStats`.

### Etapa 5 — Limpeza

25. Remover GitHub Pages: `deploy.yml`, `isGitHubPages`/`basename` em `App.jsx`, origem do CORS ([ADR-008](../../docs/decisions/008-vercel-como-unico-destino-de-deploy.md)).
26. **Atualizar `.github/copilot-instructions.md`** — remove referências a `USE_MULTI_AGENTS`/`OPENAI_API_KEY`.
27. Consolidar lockfiles (escolher npm ou yarn; adicionar lockfile a `playwright/`).
28. Remover `server/=`, scripts de debug da raiz do server, `server/tests/` (3 arquivos quebrados que nunca rodam), 6 componentes órfãos, dependências não usadas.
29. Eliminar a duplicação de `processPersonAnalyses` (backend como fonte única).

### Etapa 6 — Estrutural

30. **Baseline de schema real** (`pg_dump --schema-only`) commitado; adotar Supabase CLI como runner.
31. Unificar `user_id` em **UUID**; recriar FKs para `public.users(id)`; adicionar as constraints `UNIQUE` faltantes.
32. **Unificar `athletes` e `opponents`** com marcação de papel ([ADR-007](../../docs/decisions/007-unificar-athlete-e-opponent-numa-entidade-com-papel.md)) — **última** etapa; depende de 31.
33. **TypeScript incremental** ([ADR-010](../../docs/decisions/010-adotar-typescript-incrementalmente.md)) — `checkJs` + `@ts-check` opt-in em `models/` e `utils/`. **Não** em paralelo com a Etapa 2.
34. **Job assíncrono** para análise de vídeo (`202 {jobId}` + polling), que também habilita progresso real na UI.

## Out of Scope

- **Funcionalidades novas** de qualquer tipo. Em particular: histórico completo de lutas, lesões, acompanhamento médico/nutricional/físico, contas de profissionais, compartilhamento entre profissionais. Ver [`../../docs/DOMAIN.md`](../../docs/DOMAIN.md#6-o-que-não-faz-parte-do-domínio-atual).
- **Itens da [`../../SPEC-FRONTEND.md`](../../SPEC-FRONTEND.md)** — exceto o sink de XSS (item 21), que é segurança. O resto é escopo próprio.
- **Event log com timestamps** para os gráficos ([`../../SPEC-ANALISE-IA.md`](../../SPEC-ANALISE-IA.md) A3/A4) — decisão de produto ainda aberta.
- **Estender `responseSchema` ao chat** — dívida conhecida, escopo próprio.
- **Validação esportiva das regras IBJJF** — exige revisão humana com o regulamento; não é trabalho de código.
- **Redesign de UI**, refatoração dos componentes gigantes, unificação dos 4 sistemas de estilo.
- **Migração completa para TypeScript** — apenas a etapa 1 de [ADR-010](../../docs/decisions/010-adotar-typescript-incrementalmente.md) está no escopo.

## Requirements

### Funcionais

| # | Requisito |
|---|---|
| R1 | Nenhum endpoint retorna ou modifica dado fora do escopo do requisitante (`admin` → tenant; `user` → só o próprio) |
| R2 | Tentativa de acessar recurso fora do escopo retorna **404**, não 403 (não vaza existência) |
| R3 | Escrita usa o `userId` **do registro**, permitindo admin operar sobre dado de membro do grupo |
| R4 | O histórico de versões de perfil técnico grava e é recuperável — **ou** o recurso é removido da UI |
| R5 | `technical_profile` do atleta é atualizado ao criar análise |
| R6 | Todo consumo de IA é registrado e visível nas telas de custo |
| R7 | Requisição excedendo o limite de vídeos ou a quota é rejeitada **antes** de qualquer chamada de IA |
| R8 | Modelo de IA fora da allow-list é rejeitado |

### Não funcionais

| # | Requisito |
|---|---|
| R9 | Um endpoint novo que esqueça a verificação de posse **falha em teste**, não em produção |
| R10 | Nenhum `catch` no caminho de persistência transforma erro em `null` silencioso |
| R11 | O backend falha no boot se `SUPABASE_SERVICE_ROLE_KEY` não estiver definida |
| R12 | Nenhuma resposta de produção contém `error.message` interno |
| R13 | Lint bloqueia merge no backend e no frontend |
| R14 | O scanner de segredos bloqueia merge |
| R15 | O schema do banco é reconstruível a partir do repositório |

## Technical Considerations

**A ordem importa mais que o conteúdo.** Três dependências duras:

1. **Portões (Etapa 1) antes das correções (Etapa 2).** Sem teste de posse, corrigir 6 endpoints de autorização é confiança, não verificação — e é justamente esse tipo de garantia que já falhou três vezes neste projeto.
2. **Registro de custo (item 14) antes dos limites (15–17).** Impor quota sem visibilidade é às cegas.
3. **TypeScript (33) não em paralelo com a Etapa 2.** Uma migração de tipos toca todos os arquivos; o diff global tornaria a revisão da correção de segurança impraticável. Um esconderia o outro.

**Revogar `anon` remove a última rede de segurança.** Hoje o banco não protege nada, mas depois do item 13 isso passa a ser **decisão explícita**. É o que torna o item 10 (garantia no model) obrigatório, não opcional.

**A tabela `analysis_versions` não tem `user_id`** — o item 11 é uma decisão de schema, não uma correção de controller. `JOIN` mantém normalização e custa uma query; coluna denormalizada é mais rápida e exige backfill. Decidir antes de codar.

**Migrations são aplicadas à mão e a `018` é destrutiva** (`UPDATE users SET role='user'` sem `WHERE`). Qualquer trabalho de schema começa pelo item 30.

**Risco de dado sujo** — a migration `019` filtra `user_id <> ''`, evidência de que já houve. O item 31 exige limpeza antes, e o item 32 pode exigir deduplicação manual de lutadores cadastrados nos dois papéis (nome igual não é prova de mesma pessoa).

**`user_id` em VARCHAR mascara erros** — a comparação com a string `'undefined'` retorna zero linhas em silêncio em vez de estourar. Depois do item 31, esse tipo de bug passa a falhar visivelmente. Esperar que erros latentes apareçam.

## Decisions

| # | Decisão | Origem |
|---|---|---|
| D1 | Backend acessa o banco **exclusivamente por `service_role`**; GRANTs de `anon` revogados | [ADR-009](../../docs/decisions/009-acesso-ao-banco-exclusivamente-por-service-role.md) |
| D2 | Usuário comum vê **apenas os próprios dados**; só admin vê o grupo | Proprietário, 2026-08-12 |
| D3 | **Portões antes das correções** | Proprietário, 2026-08-12 |
| D4 | Escopo: **tudo**, na ordem de dependência | Proprietário, 2026-08-12 |
| D5 | **Vercel** é o único destino de deploy | [ADR-008](../../docs/decisions/008-vercel-como-unico-destino-de-deploy.md) |
| D6 | **TypeScript incremental**, começando por `checkJs` + `@ts-check` | [ADR-010](../../docs/decisions/010-adotar-typescript-incrementalmente.md) |
| D7 | `BELT_RULES` **determinística em código**, não RAG; conteúdo do regulamento oficial | [ADR-005](../../docs/decisions/005-belt-rules-como-tabela-deterministica.md) |
| D8 | **Unificar** `athletes` e `opponents` com marcação de papel | [ADR-007](../../docs/decisions/007-unificar-athlete-e-opponent-numa-entidade-com-papel.md) |

**Ainda aberto** (não bloqueia as Etapas 0–2): `analysis_versions` — `JOIN` ou `user_id` denormalizado? · o recurso de versionamento de perfil deve ser corrigido ou removido da UI? · quota de IA por usuário ou por tenant?

## Acceptance Criteria

### Etapa 0
- [ ] Chave do Gemini rotacionada e a antiga revogada
- [ ] Estado de RLS, políticas e GRANTs documentado em `docs/DATABASE.md`, substituindo os `NEEDS_CONFIRMATION`
- [ ] As três falhas silenciosas confirmadas ou refutadas por consulta
- [ ] `GET /api/fight-analysis/debug/all` não existe

### Etapa 1
- [ ] ESLint roda no backend e **bloqueia** merge
- [ ] Secrets scanning **bloqueia** merge
- [ ] Existe teste que **falha** ao tentar ler/escrever dado de outro tenant, para cada um dos 6 endpoints
- [ ] Playwright roda no CI

### Etapa 2
- [ ] Os 6 testes da Etapa 1 **passam**
- [ ] `FightAnalysis.update()`/`delete()` **rejeitam** chamada sem escopo (teste de unidade)
- [ ] `analysis_versions` só retorna versões de análises do escopo do requisitante
- [ ] Admin recupera acesso ao grupo nos três caminhos de chat de perfil
- [ ] Uma chamada ao PostgREST com a chave `anon` **falha** para todas as tabelas de `public`
- [ ] Backend **não inicia** sem `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `frontend/.env.production` não contém credencial de Supabase

### Etapa 3
- [ ] `SELECT count(*) FROM api_usage` cresce após uma operação de IA
- [ ] Telas de custo mostram valor real
- [ ] Requisição com mais vídeos que o limite é rejeitada **sem** chamar a IA
- [ ] Modelo fora da allow-list é rejeitado
- [ ] Quota excedida é rejeitada antes da chamada

### Etapa 4
- [ ] `profile_versions` grava e o histórico aparece na UI (**ou** o recurso foi removido)
- [ ] `technical_profile` muda após criar análise
- [ ] O PDF não usa `innerHTML`; CSP presente
- [ ] Falha do banco no `authMiddleware` resulta em 401/503, **nunca** em sessão autorizada pelo token
- [ ] Resposta de produção não contém `error.message`

### Etapa 5
- [ ] Nenhuma referência a GitHub Pages no repositório
- [ ] `copilot-instructions.md` sem referências ao multi-agente
- [ ] Um lockfile por pacote
- [ ] Órfãos e scripts de debug removidos
- [ ] `processPersonAnalyses` existe em um lugar só

### Etapa 6
- [ ] `docs/DATABASE.md` reflete o schema real, com baseline commitado
- [ ] `user_id` é UUID em todas as tabelas, com FK para `public.users(id)`
- [ ] Uma entidade de lutador, com marcação de papel
- [ ] `checkJs` ativo em `models/` e `utils/`, sem erro
- [ ] Análise de vídeo retorna `202 {jobId}`; UI mostra progresso real

## Testing Strategy

**O teste de autorização é o entregável mais importante desta spec** — mais que qualquer correção individual, porque é o que impede a próxima regressão.

| Camada | O que cobrir |
|---|---|
| **Autorização (novo)** | Para cada endpoint que toca dado de usuário: usuário A **não** lê nem escreve dado de B; admin **lê** dado do próprio tenant; admin **não** lê de outro tenant; resposta é **404**, não 403 |
| **Model (novo)** | `FightAnalysis.update/delete` rejeitam chamada sem escopo; `AnalysisVersion` só devolve versões do escopo |
| **Contrato (novo)** | `saveProfileVersion` → `ProfileVersion.create` com fixture do shape real; `parseAnalysisFromDB` × leitores de `technical_stats` |
| **Regressão das falhas silenciosas** | Teste de integração que **verifica a linha no banco**, não só a resposta HTTP — as três falhas passariam num teste que só checa o status code |
| **Custo** | `logUsage` grava; `calculateCost` por modelo e faixa; modelo desconhecido **rejeitado**, não silenciosamente reprecificado |
| **Limites** | `videos[]` acima do limite rejeitado antes de chamar IA; quota excedida idem |
| **E2E (existente)** | Ligar no CI; adicionar cenário de tentativa de acesso cross-tenant |
| **Preservar** | As 16 suítes de backend passam sem alteração (exceto onde o comportamento mudou de propósito) |

**Padrão obrigatório para a Etapa 1:** cada teste de posse é escrito e **verificado falhando** antes da correção. Um teste que nunca falhou não prova nada.

## Files / Modules Affected

| Módulo | Arquivos principais | Etapas |
|---|---|---|
| [`chat-and-versions`](../../docs/modules/chat-and-versions.md) | `controllers/chatController.js`, `models/{AnalysisVersion,ChatSession,ProfileVersion}.js`, `utils/versionManager.js` | 1, 2, 4 |
| [`fight-analysis`](../../docs/modules/fight-analysis.md) | `controllers/{linkController,fightAnalysisController}.js`, `models/FightAnalysis.js`, `routes/fightAnalysis.js` | 0, 1, 2, 3, 6 |
| [`usage-tracking`](../../docs/modules/usage-tracking.md) | `models/ApiUsage.js`, `utils/apiUsageLogger.js`, `config/ai.js` | 3 |
| [`athletes-opponents`](../../docs/modules/athletes-opponents.md) | `models/{Athlete,Opponent}.js`, `controllers/{athleteController,opponentController}.js`, `utils/athleteStatsUtils.js` | 4, 5, 6 |
| [`users-and-admin`](../../docs/modules/users-and-admin.md) | `middleware/auth.js`, `config/supabase.js` | 2, 4 |
| [`strategies`](../../docs/modules/strategies.md) | `pages/Analyses.jsx` (XSS) | 4 |
| Transversal | `utils/{errorHandler,tenantScope}.js`, `index.js`, `server/migrations/`, `.github/workflows/`, `frontend/src/App.jsx`, `frontend/.env.production` | todas |

**Documentação a atualizar na mesma tarefa** (regra 2 de [`../../CLAUDE.md`](../../CLAUDE.md#documentation-integrity)): `docs/DATABASE.md` (RLS, constraints, baseline) · `docs/AUTHORIZATION.md` (mover itens de *Known Issues* para *Current Implementation*) · `docs/PROJECT_STATUS.md` · `docs/AI.md` (limites, custo) · os módulos afetados · ADRs 007–010 (status `Accepted` → implementado) · [`../../CHANGELOG.md`](../../CHANGELOG.md).

## Implementation Notes

**Referências de qualidade dentro do próprio repositório** — copie estes padrões em vez de imitar o código vizinho:

| Padrão | Onde |
|---|---|
| Ownership consistente em todos os métodos | `models/TacticalAnalysis.js` |
| Verificação de posse em controller | `chatController.applyEdit` (a parte da análise), `athleteController` |
| Fronteira única com dependência externa | `services/llm.js` |
| Erro tipado e propagado | `utils/errors.js`, `versionManager.ensureOriginalVersion` |
| Operação admin com auditoria e escopo | `controllers/userController.js` |

**Anti-padrões presentes no código — não replicar:** `catch` que só loga e retorna `null` · `handleError` com `details: error.message` · query de banco dentro de `routes/` · prompt inline em service · escopo escalar onde o resto usa array.

**Cuidados operacionais:**

- **Nunca reexecutar a migration `018`** (`UPDATE users SET role='user'` sem `WHERE`).
- **Nunca commitar em `main`** — branch + PR.
- **Não instalar nem atualizar dependência** sem necessidade explícita: a stack está agressivamente na ponta (React 19, Express 5, Vite 7, Tailwind 4) e não há rede de proteção para atualizar.
- **`yt-dlp` é dependência de sistema não declarada.** Existe na máquina do dev, não na Vercel. Comportamento difere entre ambientes.
- **Trabalho *fire-and-forget* após `res.json()` é frágil em serverless** — a instância pode congelar antes de terminar. Relevante para os itens 5 e 34.

---

**Referências:** [`../../AUDIT.md`](../../AUDIT.md) (evidência em `arquivo:linha`) · [`../../docs/PROJECT_STATUS.md`](../../docs/PROJECT_STATUS.md) · [`../../docs/decisions/`](../../docs/decisions/) · [`../../CLAUDE.md`](../../CLAUDE.md)
