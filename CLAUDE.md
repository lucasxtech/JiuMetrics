# CLAUDE.md — Manual operacional do JiuMetrics

> **Para agentes de IA e desenvolvedores trabalhando neste repositório.** Leia isto antes de alterar qualquer coisa.
>
> **Atualizado:** 2026-09-04 · **Baseline:** `main` (`895066f`) + specs [002](./specs/002-verification-baseline/spec.md) a [007](./specs/007-silent-failures-and-input-validation/spec.md), [009](./specs/009-ai-cost-and-reliability/spec.md), [010](./specs/010-frontend-consolidation/spec.md) e [013](./specs/013-athletes-opponents-consolidation/spec.md) executadas · [008](./specs/008-database-access-lockdown/spec.md) parcialmente executada (código pronto, `REVOKE` pendente de execução manual)

---

## Project Overview

JiuMetrics analisa vídeos de luta de Jiu-Jitsu com IA para produzir um perfil técnico de cada lutador e, cruzando dois perfis, gerar um plano tático de como vencer um adversário específico.

**Stack real** (confirmada no código, não inferida): SPA **React 19 + Vite** · API **Express 5** (CommonJS) · **Supabase/PostgreSQL** via PostgREST, **sem ORM** · autenticação **JWT própria** (não Supabase Auth) · IA via **Google Gemini** (`@google/genai`) · deploy na **Vercel** · **0 arquivos `.ts`/`.tsx` na aplicação** (TS pleno só em `playwright/`), mas desde a spec 011 (etapa 1, [ADR-010](./docs/decisions/010-adotar-typescript-incrementalmente.md)) `server/src/models/` e `server/src/utils/` são checados por `tsc` via `// @ts-check` por arquivo (`npm run typecheck` em `server/`) — JSDoc vira contrato verificado, sem migrar nenhum arquivo para `.ts`.

```
frontend/    SPA React (12 páginas, 38 componentes, 14 services)
server/      API Express (10 rotas, 13 controllers, 10 models, 23 migrations)
playwright/  6 specs E2E em TypeScript (nunca rodam no CI)
docs/        documentação permanente ← comece aqui
specs/       histórico versionado de mudanças planejadas
```

## Current Product

**O que existe** (`IMPLEMENTED`): autenticação · usuários admin e comuns · atletas · adversários · análise de luta por IA a partir de vídeo do YouTube · estratégia cruzando atleta × adversário · histórico de análises e estratégias · chat de refinamento com versionamento.

**O que NÃO existe** — não invente, não documente como existente, não implemente sem pedido explícito:

> histórico completo de lutas · histórico de lesões · acompanhamento médico, nutricional ou físico · contas de médico, nutricionista ou preparador físico · compartilhamento de informação entre profissionais · upload de arquivo de vídeo (só URL do YouTube) · recuperação de senha · fila, worker ou job assíncrono · WebSocket/SSE · cache de servidor.

✅ **As duas funcionalidades quebradas foram corrigidas na [spec 007](./specs/007-silent-failures-and-input-validation/spec.md)** (2026-08-18): histórico de versões de perfil técnico e atualização do `technical_profile`. Ficam registradas aqui porque a **causa** delas é o risco que continua vivo neste repositório:

1. As duas eram **incompatibilidade de contrato** na fronteira `snake_case` (banco) × `camelCase` (aplicação) — não erro de lógica.
2. As duas sobreviveram meses porque falhavam dentro de um `catch` que só escrevia no console.
3. Uma delas tinha **duas** causas independentes, e a segunda só apareceu ao corrigir a primeira.

⚠️ **Correção de rumo:** a auditoria listava o **rastreamento de custo de IA** como terceira funcionalidade quebrada. **Está errado — ele funciona** (173 linhas, US$ 3,03, última em 2026-08-12). A política RLS que supostamente o bloqueava não está ativa em produção.

### ⚠️ Vocabulário: "análise" significa três coisas

Confirme sempre de qual se trata antes de mexer:

| Termo | É | Tabela |
|---|---|---|
| "Fight Analysis" / "Análise" | análise de vídeo de **uma** pessoa | `fight_analyses` |
| "Strategy" / "Estratégia" | plano tático atleta × adversário | **`tactical_analyses`** |
| Tela "Análises" (`/analyses`) | lista de **estratégias** | `tactical_analyses` |

## Architecture

**[`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)** — arquitetura real, com diagramas, camadas, endpoints, infraestrutura e problemas conhecidos.

Decisão que mais define o sistema: **toda a autorização vive na camada de aplicação.** O banco não a reforça (RLS desligado ou neutralizado em todas as tabelas de domínio) — **não há nenhuma defesa abaixo da aplicação**. Dentro dela existem duas camadas desde a spec 006: o controller resolve o escopo e o model o **exige**.

## Domain

**[`docs/DOMAIN.md`](./docs/DOMAIN.md)** — entidades reais, ownership, ciclo de vida, regras de negócio e invariantes (com marcação de quais o código garante e quais não).

Regra de porta do produto: **não é possível gerar estratégia sem ≥1 análise de luta de cada lado.** A estratégia é derivada de vídeo analisado, não de atributos cadastrados.

## Security

**Leia [`docs/AUTHORIZATION.md`](./docs/AUTHORIZATION.md) antes de tocar em qualquer endpoint.**

Regras não negociáveis:

1. **Nunca commite segredo.** Já aconteceu, e o dano é real e medido: há uma chave da API do Gemini no histórico do git (`.archived/SUPABASE_SETUP.md` — **rotação pendente**, expurgar do histórico é operação separada, de maior risco) e havia a chave publicável do Supabase em `frontend/.env.production`, arquivo rastreado — **removido do controle de versão na spec 008**, mas ela **precisa ser rotacionada**: sair do Git não invalida uma chave já exposta. O scanner do CI só passou a bloquear na spec 003, e mesmo assim **cobre apenas o diff** — não expurga o que já está no histórico, e não pega senha genérica (ver o achado em `playwright/.env.example`).
   > 🔴 **O repositório é PÚBLICO** (confirmado 2026-09-02). As duas chaves acima estiveram legíveis por qualquer pessoa na internet — trate-as como **comprometidas** e rotacione antes de qualquer outra coisa.
   > 🔴 **Verificado em 2026-08-13, ainda o achado mais grave do projeto:** essa chave publicável **lê 9 das 10 tabelas, incluindo `users` com `password_hash` (bcrypt) e `email` dos 25 usuários** — e a escrita também está liberada. A spec 008 fechou o lado do código (cliente único `service_role`) e escreveu o `REVOKE` que fecha o acesso (`server/migrations/024-revoke-anon-access.sql`), mas **não o executou** — falta o proprietário rodá-lo no SQL Editor do Supabase, e só depois disso a chave antiga para de funcionar de fato. Ver [`docs/DATABASE.md`](./docs/DATABASE.md) §4.
2. **Nunca devolva `error.message` ao cliente** em produção. ✅ Resolvido na spec 007: use `errorDetails(error)` de `utils/errorHandler.js`, que omite o detalhe quando `NODE_ENV === 'production'` e o mantém no log do servidor. Não volte a escrever `details: error.message` à mão.
3. **Nunca logue PII.** O login loga o e-mail do usuário em toda tentativa — dívida conhecida.
4. **Nunca construa HTML por string com conteúdo de LLM.** O sink conhecido (`pages/Analyses.jsx` → `innerHTML` com saída de IA) foi **fechado na spec 010**: o conteúdo passa por `escapeDeep` em `utils/strategyReportHtml.js` antes de entrar no HTML. ⚠️ O template-string **continua existindo** — ao editar aquele arquivo, leia dados só do objeto já escapado (`a`), nunca do cru. O JWT segue em `localStorage`, então um novo sink volta a valer sessão.
5. **`ProtectedRoute` no frontend é UX, não segurança.** `isAdmin` vem do `localStorage`. A decisão real é sempre do backend.
6. **Não confie em rate limiting.** `MemoryStore` em serverless: os limites não valem em produção. ⚠️ Isto **continua verdade** depois da spec 009 — ela resolveu o gasto de IA por outro caminho (orçamento contado no banco, não em memória), mas o limite por IP segue inoperante. Resolver depende de infraestrutura (store externo ou limite na borda).
7. **Endpoint que recebe corpo e chama IA precisa de schema.** Os 3 de `/api/ai/*` e os 4 de escrita de atletas/adversários validam com zod (`middleware/validate.js`, [ADR-012](./docs/decisions/012-zod-para-validacao-de-entrada.md), `schemas/requests/`); os outros ~8 endpoints com corpo **ainda não**. Ao declarar um schema, cuidado: campo que o controller usa e o schema não declara chega `undefined` **em silêncio** — mapeie o payload real do frontend antes.

## Authorization

**Regra de escopo — decorada:**

| Papel | Vê |
|---|---|
| `admin` | todos os `user_id` do mesmo `tenant_id` |
| `user` | **apenas o próprio `user_id`** |

**O padrão obrigatório** em qualquer endpoint que toque dado de usuário:

```js
const allowedUserIds = await resolveScope(req.actor);   // services/authorization.js — spec 005
const recurso = await Model.getByIdAndUser(req.params.id, allowedUserIds);
if (!recurso) return res.status(404).json({ error: 'não encontrado' });
await Model.update(id, dados, recurso.userId);   // owner REAL, não o requisitante
```

Dois detalhes: **404, não 403** (não vaza existência); e a escrita usa o `userId` **do registro**, permitindo admin editar dado de membro do grupo.

`utils/tenantScope.js#getScopeIds` ainda existe, mas é **wrapper `@deprecated`** delegando a `resolveScope` — não use em código novo. `req.actor` (`{ id, role, tenantId }`) é populado pelo `authMiddleware`; `services/authorization.js` nunca importa Express nem lê `req` diretamente, o que o torna testável sem HTTP (ver [ADR-011](./docs/decisions/011-seam-de-politica-de-autorizacao.md)).

**O escopo é OBRIGATÓRIO no model** (spec 006). Todo método de model de domínio exige o escopo de posse na assinatura e lança `MissingScopeError` sem ele — `utils/scopeGuard.js#requireScope`. Ao criar um método novo, siga isso: **nunca aceite um `id` sem escopo.** A armadilha antiga (`FightAnalysis.update()`/`.delete()` aceitando qualquer ID, `AnalysisVersion` sem filtro nenhum) produziu 6 IDORs; hoje o mesmo esquecimento falha em vez de vazar.

`analysis_versions` **não tem coluna `user_id`**: a autorização deriva da análise pai, verificada na aplicação (decisão P4 — PostgREST não faz JOIN aqui, porque `analysis_id` é polimórfico e sem FK). Referências de model bem feito: `models/TacticalAnalysis.js` e `models/FightAnalysis.js`.

## AI

**[`docs/AI.md`](./docs/AI.md)** — provedor, modelos, prompts, schemas, fluxos de análise e estratégia, limitações.

Regras:

1. **Nunca importe `@google/genai` fora de `services/llm.js`.** É a fronteira única com o SDK; os testes mockam esse módulo.
2. **Toda nova chamada de IA usa `responseSchema`.** Nada de regex sobre texto livre — foi a causa-raiz de uma família de bugs já corrigida ([ADR-006](./docs/decisions/006-camada-unica-de-llm-e-aposentadoria-do-multi-agente.md)). O chat é a última exceção e é dívida conhecida, **não** modelo a copiar.
3. **Prompts vivem em `server/src/services/prompts/*.txt`**, nunca inline no código. ✅ A última exceção (`strategyService.js`) saiu na spec 009 — **não abra outra**. Ao editar um `.txt`, saiba que `consolidate-profile.txt` tem teste de comparação **byte a byte**: se ele quebrar, a pergunta é se a mudança de texto foi intencional, não como fazer o teste passar.
4. **Nunca coloque dado influenciável pelo usuário na `systemInstruction`.** Ver [ADR-003](./docs/decisions/003-system-instruction-fixa-no-chat.md).
5. **Nunca altere `config/ai.js#BELT_RULES` sem o regulamento IBJJF em mãos.** Não é só texto de prompt — `getBeltLevel` alimenta lógica de decisão, e sugerir técnica ilegal para uma faixa tem consequência real em competição. Ver [ADR-005](./docs/decisions/005-belt-rules-como-tabela-deterministica.md).
6. **Toda chamada de IA custa dinheiro, e agora existe teto.** O registro de custo **funciona** (173 linhas, US$ 3,03 medidos). Desde a spec 009 há três barreiras antes de gastar: allow-list de modelos (`resolveModel`), teto de vídeos por requisição (schema zod) e **orçamento mensal por tenant** (`services/costGuard.js`, `AI_MONTHLY_BUDGET_USD`, default 50). Ao adicionar um fluxo de IA novo: declare o `task` na chamada a `llm.js` (define retry/timeout) e ponha `requireBudget` na rota. Chamada em laço sem limite continua proibida.
7. **Nunca repita uma chamada de IA que não vai melhorar.** `isTransientError` (`utils/errors.js`) é quem decide: quota estourada, conteúdo bloqueado e JSON malformado **não** são repetidos, porque cada retry é outra inferência paga.
8. **Antes de mudar prompt, schema ou modelo, MEÇA.** Existem duas ferramentas, e usá-las é obrigatório para qualquer afirmação sobre qualidade: `scripts/audit-analysis-quality.js` (regras determinísticas sobre o que já está no banco — custo zero, roda sempre) e `scripts/eval-video-analysis.js` (variância entre execuções, concordância entre modelos, leitura do placar — **gasta inferência paga**, roda sob demanda, nunca no CI). Sem uma delas, "melhorou" é opinião. As regras vivem em `utils/analysisQuality.js` e medem **coerência e contrato, não acerto** — nenhuma delas sabe se a análise descreve o vídeo corretamente.
9. **Cuidado com o fallback que troca a causa do erro.** Em `analyzeFrame`, a falha da ingestão direta é engolida e o fallback de download reporta "atualize os cookies" — o que já mandou o operador para o lugar errado durante uma suspensão de faturamento do Gemini. Ao escrever fallback, **preserve o erro original**; ver [spec 012](./specs/012-youtube-ingestion-lockdown/spec.md).

## Database

**[`docs/DATABASE.md`](./docs/DATABASE.md)** — tabelas, campos, FKs, índices, constraints, estado de RLS por tabela, índice das migrations.

Regras:

1. **As migrations NÃO são a fonte de verdade.** A tabela `users` nunca é criada por uma; falta a `020`; não há runner nem controle de estado. **Antes de qualquer trabalho de schema, verifique o estado real no dashboard do Supabase.**
   > Isto não é teórico: em 2026-08-13 a verificação contra produção **refutou uma conclusão da auditoria** que derivava das migrations (o registro de custo, que as migrations diziam estar bloqueado por RLS, funciona há 8 meses). Ver [`docs/DATABASE.md`](./docs/DATABASE.md) §4.
2. **Nunca execute migration sem pedido explícito.** Elas são aplicadas à mão, e a `018` contém `UPDATE users SET role='user'` **sem `WHERE`** — reexecutá-la rebaixa todos os admins.
3. **Nunca versione PII em migration.** As `017`, `019` e `022` contêm e-mails reais — dívida conhecida, não padrão.
4. **`user_id` tem tipos divergentes**: `VARCHAR(255)` em `athletes`/`opponents`/`fight_analyses`, `UUID` nas demais. Não presuma o tipo.
5. **Apenas 4 foreign keys reais existem** em todo o banco. Não presuma integridade referencial — `person_id` é polimórfico sem constraint.
6. ✅ **RESOLVIDO na [spec 008](./specs/008-database-access-lockdown/spec.md)** — os dois clientes viraram um (`supabase`, `service_role`), sem fallback: `config/supabase.js` lança no boot sem `SUPABASE_SERVICE_ROLE_KEY`. ⚠️ **O `REVOKE` de `anon`/`authenticated` está escrito (`server/migrations/024-revoke-anon-access.sql`) e não executado** — pendente de o proprietário colar no SQL Editor do Supabase. Até lá, a chave anon publicada continua com GRANT nas tabelas de produção.

## Documentation

| Preciso saber… | Leia |
|---|---|
| Como o sistema é construído | [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) |
| O que cada entidade significa e suas regras | [`docs/DOMAIN.md`](./docs/DOMAIN.md) |
| Como autenticação e autorização funcionam | [`docs/AUTHORIZATION.md`](./docs/AUTHORIZATION.md) |
| Como a IA funciona | [`docs/AI.md`](./docs/AI.md) |
| Tabelas, FKs, RLS, migrations | [`docs/DATABASE.md`](./docs/DATABASE.md) |
| Em que estado o projeto está | [`docs/PROJECT_STATUS.md`](./docs/PROJECT_STATUS.md) |
| **O que ficou aberto e por quê** | [`docs/GAPS.md`](./docs/GAPS.md) |
| Por que uma decisão foi tomada | [`docs/decisions/`](./docs/decisions/) |
| Detalhe de um módulo | [`docs/modules/`](./docs/modules/) |
| Evidência de um problema, em `arquivo:linha` | [`AUDIT.md`](./AUDIT.md) |
| API HTTP | [`docs/API.md`](./docs/API.md) — **parcial**; `server/src/routes/` é a fonte de verdade |
| Setup, deploy, contribuição | [`docs/SETUP.md`](./docs/SETUP.md), [`docs/DEPLOY.md`](./docs/DEPLOY.md), [`docs/DEVELOPMENT.md`](./docs/DEVELOPMENT.md), [`docs/CONTRIBUTING.md`](./docs/CONTRIBUTING.md) |

**Módulos documentados:** [`athletes-opponents`](./docs/modules/athletes-opponents.md) · [`fight-analysis`](./docs/modules/fight-analysis.md) · [`strategies`](./docs/modules/strategies.md) · [`chat-and-versions`](./docs/modules/chat-and-versions.md) · [`users-and-admin`](./docs/modules/users-and-admin.md) · [`usage-tracking`](./docs/modules/usage-tracking.md)

⚠️ **[`docs/_legacy/`](./docs/_legacy/) NÃO é fonte de verdade.** Contém documentação histórica, incluindo ~800 linhas descrevendo um sistema multi-agentes que **não existe mais no código**. Nunca use como referência.

⚠️ **`.github/copilot-instructions.md` está parcialmente obsoleto** — ainda documenta variáveis (`USE_MULTI_AGENTS`, `OPENAI_API_KEY`) do sistema removido. Este arquivo (`CLAUDE.md`) tem precedência.

## Specs

Mudanças relevantes têm spec **antes** da implementação, em `specs/NNN-nome/spec.md`. Specs são **parte oficial do histórico e ficam no Git** — nunca no `.gitignore`.

**A refatoração está planejada e não iniciada.** Arquitetura-alvo e plano: **[`JIU_METRICS_REFACTORING_PLAN.md`](./JIU_METRICS_REFACTORING_PLAN.md)**. Dez specs, **todas `Proposed`** — índice e grafo de dependências em [`specs/README.md`](./specs/README.md).

> ⚠️ **Antes de implementar qualquer coisa das specs 003–011, a [spec 002](./specs/002-verification-baseline/spec.md) precisa ter sido executada.** Ela não escreve código: confirma o estado real do banco. Três conclusões estruturais do plano dependem de fatos não verificados, e ao menos uma pode ser **refutada** por uma consulta de um minuto.

A spec [001](./specs/001-refactor-foundation/spec.md) está `Superseded` — era uma spec única cobrindo 34 itens, o padrão "refatorar tudo" que o plano evita.

**Specs anteriores, na raiz** (formato antigo, mantidas por serem boas e ainda válidas): [`SPEC-ANALISE-IA.md`](./SPEC-ANALISE-IA.md) — auditoria do pipeline de IA; Fase 1 implementada, fases posteriores não. [`SPEC-FRONTEND.md`](./SPEC-FRONTEND.md) — auditoria do frontend; **F1, F2, F11 e F15 implementados na spec 010**; o resto (polish, componentes gigantes, 4 sistemas de estilo, progresso teatral) continua aberto.

**Uma spec é obrigatória quando** a mudança toca arquitetura, domínio, banco, autorização, API, IA, ou responsabilidade de um módulo. Correção pontual de bug, ajuste de texto e mudança de estilo não precisam.

## Change Process

1. **Leia a documentação do módulo** que vai alterar (`docs/modules/`) e os ADRs relacionados.
2. **Verifique se o comportamento que você acha que existe realmente existe.** Três funcionalidades da UI nunca funcionaram; várias falham dentro de um `catch` silencioso.
3. **Se a mudança é relevante** (ver *Specs*), escreva a spec primeiro e obtenha aprovação.
4. **Implemente**, seguindo os padrões deste arquivo — em especial o padrão de autorização.
5. **Teste.** Se a mudança toca autorização, **escreva o teste de posse primeiro** (deve falhar antes, passar depois). Desde a [spec 004](./specs/004-authorization-safety-net/spec.md) existe `server/src/__tests__/authorization/` — fixtures de 2 tenants × 2 usuários (`support/fixtures.js`) e um fake de PostgREST em memória (`support/fakeSupabase.js`, `support/supabaseMock.js`) prontos para reuso. Reaproveite-os em vez de recriar fixtures; não mocke `models/*` nem `services/authorization` nesses testes — é exatamente o que os testes de controller existentes já fazem, e por isso nunca provariam ownership.
6. **Atualize a documentação na mesma tarefa** (ver *Documentation Integrity*).
7. **Atualize o [`CHANGELOG.md`](./CHANGELOG.md)** se a mudança é relevante para quem usa ou opera o sistema.
8. **Nunca commite direto em `main`.** Trabalhe em branch e abra PR.

### Comandos

```bash
cd server && npm test          # Jest — 29 suítes / 359 testes (bloqueia merge no CI)
```

```bash
cd frontend && npm test        # Vitest — 8 suítes / 76 testes (bloqueia merge no CI)
```

```bash
cd frontend && npm run lint    # ESLint (bloqueia merge no CI)
```

```bash
cd server && npm run lint      # ESLint (bloqueia merge no CI) — spec 003
```

Fora do CI, sob demanda — qualidade da saída de IA (ver regra 8 de *AI*):

```bash
cd server && node scripts/audit-analysis-quality.js --por-mes
```

```bash
cd server && node scripts/eval-video-analysis.js --modo variancia --dry-run
```

⚠️ O `eval-video-analysis.js` **sem** `--dry-run` gasta inferência paga — a rodada padrão custa ≈ US$ 3,37, mais que todo o gasto histórico do projeto. Ele estima e pede confirmação antes; não o coloque no CI.

**Portões que bloqueiam merge:** testes de frontend e backend, lint de frontend e backend, build, e **secrets scanning**. Informativos (não bloqueiam): coverage, `npm audit`, CodeQL, Lighthouse. **E2E não roda no CI** — ver [spec 003](./specs/003-quality-gates/spec.md).

O lint do backend cobre **só erro real, não estilo** (`server/eslint.config.js`). Onde uma dívida conhecida dispara o lint, há um `eslint-disable` **com comentário apontando a spec que vai resolver** — não prefixe com `_` nem remova o parâmetro: isso apagaria a evidência do problema.

⚠️ `npm ci` é o instalador do CI (`package-lock.json`). Existem **6 lockfiles** (npm + yarn) para 3 pacotes — rodar `yarn install` resolve uma árvore diferente da testada. Dívida conhecida.

---

## Documentation Integrity

**Code and documentation must remain consistent.**

Estas regras são obrigatórias, não sugestões:

1. **Antes de alterar um módulo relevante, consulte sua documentação** em `docs/modules/` e os ADRs relacionados.
2. **Se uma alteração modificar arquitetura, domínio, comportamento, API, banco, autorização, IA ou a responsabilidade de um módulo, atualize a documentação correspondente na mesma tarefa.** Não deixe para depois: documentação que descreve um sistema que deixou de existir é pior que documentação ausente, porque parece confiável. Este repositório já viveu isso — ~800 linhas descrevendo um sistema removido sobreviveram meses.
3. **Nunca altere comportamento documentado silenciosamente.** Se o comportamento muda, o documento muda no mesmo commit.
4. **Se uma mudança invalidar uma decisão arquitetural documentada, atualize ou substitua o ADR correspondente** (`Superseded by ADR-NNN`). Não deixe um ADR aceito descrevendo algo que deixou de ser verdade.
5. **Não documente comportamento futuro como comportamento atual.** Use `IMPLEMENTED` / `PLANNED`. O status `Accepted — não implementado` existe nos ADRs exatamente para isso.
6. **Se houver dúvida sobre uma regra de negócio, não invente — marque `NEEDS_CONFIRMATION`** e pergunte. Um "porquê" inventado é pior que um ausente, porque parece confiável. O mesmo vale para motivação histórica: se o repositório e o git não permitem determinar por que algo foi feito, escreva isso literalmente.
7. **Alterações relevantes devem ter spec antes da implementação.**
8. **Specs ficam no Git**, com numeração sequencial. Nunca no `.gitignore`.
9. **Material temporário de trabalho fica em `.ai/`**, que é ignorado pelo Git — nunca misturado à documentação oficial.

### Onde cada coisa mora

| Pasta | Conteúdo | Versionado? |
|---|---|---|
| `docs/` | **conhecimento permanente** do projeto | ✅ |
| `specs/` | **histórico versionado** de mudanças planejadas | ✅ |
| `CLAUDE.md` | **regras permanentes** para agentes | ✅ |
| `AUDIT.md` | auditoria forense com evidência | ✅ |
| `docs/_legacy/` | documentação histórica — **não é fonte de verdade** | ✅ |
| `.ai/` | rascunhos, prompts temporários, análises intermediárias, artefatos descartáveis | ❌ **ignorado** |

---

## Se você é um agente de IA lendo isto pela primeira vez

Quatro coisas que vão te economizar tempo e evitar dano:

1. **Este projeto foi construído com muita assistência de IA, e isso deixou marcas.** Há documentação morta, instruções de Copilot obsoletas, e funcionalidades que parecem implementadas e não estão. **Verifique no código antes de confiar em qualquer descrição** — inclusive nesta.
2. **A qualidade é desigual, e existe um padrão bom para copiar.** `services/llm.js`, `models/TacticalAnalysis.js`, `utils/errors.js` e `controllers/userController.js` são bem feitos. Use-os como referência em vez de imitar o código vizinho ao que você está mexendo.
3. **Cuidado com `catch` que só loga.** Foi o padrão de falha dominante deste repo — duas funcionalidades sobreviveram meses quebradas por isso (corrigidas na spec 007). Ao escrever código novo, **propague o erro**. Se tolerar a falha for a decisão certa, registre o **motivo em comentário** e use `logToleratedFailure` (`utils/errorHandler.js`) em vez de `console.warn` — e devolva **estado explícito** ao cliente quando a operação parecer ter dado certo sem ter dado.
4. **Ao investigar "X não funciona", suspeite primeiro de contrato, não de lógica.** A fronteira `snake_case` (banco) × `camelCase` (aplicação) só é traduzida em `utils/dbParsers.js`, e só para 3 dos 10 models. Aridade de argumento e nome de chave já causaram três bugs silenciosos.
