# SPEC-011 — Integridade de schema

**Status: Implemented (parcial, 2026-08-24) — só o item 5 (TypeScript etapa 1); itens 1–4 NÃO iniciados** · Etapa 9 do [plano de refatoração](../../JIU_METRICS_REFACTORING_PLAN.md)
**É a spec de maior risco do plano — e a de menor urgência. Por isso vem por último.**

> ⚠️ **Por que só um item, e não a spec inteira.** Este documento diz explicitamente, em *Technical Considerations*, que a spec "é grande demais para ser executada como uma unidade" e "deve ser quebrada em specs próprias" antes de implementar. Os itens 1–4 são, além disso, trabalho de banco de produção (`pg_dump`, `ALTER TABLE`, backfill, `DROP`/`RENAME`) que exige: (a) um backup **com restauração testada** — gate que só o proprietário pode cumprir, no dashboard do Supabase; e (b) uma credencial de conexão direta ao Postgres, que este ambiente não tem (a única chave disponível fala REST via PostgREST, que não executa DDL). Executá-los sem os dois seria romper a própria regra de risco que a spec define. **O item 5 (TypeScript) não tem nenhuma dessas duas dependências** — é código puro, sem tocar o banco — e por isso foi o único executado.

## Context

O banco do JiuMetrics tem três problemas estruturais, todos herdados da migração de Supabase Auth para JWT próprio ([ADR-001](../../docs/decisions/001-jwt-proprio-em-vez-de-supabase-auth.md)):

1. **As migrations não são a fonte de verdade.** A tabela `users` — central para identidade e para todo o escopo de dados — **nunca é criada por uma migration**; só recebe `ALTER` em `017`, `021` e `023`. Falta a `020`. Não há runner nem controle de estado: as migrations são aplicadas colando SQL no editor do Supabase. **É impossível reconstruir o banco a partir do repositório.**

2. **Tipos divergentes na mesma coluna semântica.** `user_id` é `VARCHAR(255)` em `athletes`, `opponents` e `fight_analyses`; `UUID` nas outras cinco tabelas. A migration `008` derrubou as FKs para `auth.users` e converteu para VARCHAR em vez de reapontá-las para `public.users`.

3. **Quase nenhuma constraint.** Apenas **4 foreign keys reais** existem; **zero `UNIQUE`** em todo o diretório de migrations — incluindo `users.email`. `person_id` é FK polimórfica **sem constraint**.

O efeito colateral mais instrutivo: o bug de `Athlete.updateTechnicalProfile` (chamada com 2 de 3 argumentos) **só passou silencioso porque `user_id` é VARCHAR** — a comparação com a string `'undefined'` devolve zero linhas em vez de estourar erro de tipo.

## Problem

Sem baseline, todo trabalho de schema começa com arqueologia no dashboard, e ninguém sabe o que está aplicado em produção.

Sem tipos consistentes e FKs, o banco não garante nenhuma das invariantes de ownership — e **mascara bugs** em vez de expô-los.

Sem `UNIQUE`, existem race conditions reais: `createUser` checa-depois-insere, e o número de versão é calculado no app (`length + 1`) sem transação, então duas edições simultâneas geram versões com o mesmo número.

## Goal

Tornar o banco reconstruível a partir do repositório e fazer o próprio banco garantir as invariantes de ownership e versionamento.

## Scope

### 1. Baseline e runner

| Item | Detalhe |
|---|---|
| **`pg_dump --schema-only`** commitado | inclui `users`, que nunca foi criada por migration |
| **Runner** (Supabase CLI) | com controle de estado, daí em diante |
| **Marcar as migrations históricas** | `018`, `019`, `022`, `004` são destrutivas ou não idempotentes e **não fazem parte** do caminho de reconstrução |

### 2. Unificação de tipo e FKs

| Item | Detalhe |
|---|---|
| **Limpar órfãos** | `user_id IS NULL` ou `''` — contagem vem da [spec 002](../002-verification-baseline/spec.md) |
| **Converter `user_id` para UUID** em `athletes`, `opponents`, `fight_analyses` | via **dual read**: coluna nova, backfill, leitura das duas, corte |
| **Recriar FKs** para `public.users(id)` | com `ON DELETE` explícito e decidido |
| **`user_id NOT NULL`** | após a limpeza |

### 3. Constraints

| Item | Detalhe |
|---|---|
| `UNIQUE(users.email)` | após verificar duplicatas |
| `UNIQUE(analysis_id, version_number)` | nas três tabelas de versão |
| Índice único parcial em `is_current` | uma versão atual por conteúdo |
| FK real para `person_id` | **depende do item 4** — hoje é polimórfica |

### 4. Unificação de `athletes` e `opponents`

[ADR-007](../../docs/decisions/007-unificar-athlete-e-opponent-numa-entidade-com-papel.md). **Último item de todos.** Via **dual read**: tabela nova, backfill, período de dupla leitura, corte.

### 5. Adoção de TypeScript

[ADR-010](../../docs/decisions/010-adotar-typescript-incrementalmente.md) — etapa 1 apenas: `tsconfig.json` com `checkJs`, `strict: false`, e `// @ts-check` **opt-in por arquivo**, começando por `server/src/models/` e `server/src/utils/`. ✅ **FEITO (2026-08-24)** — o único item desta spec executado.

## Out of Scope

- **Migração completa para TypeScript** — apenas a etapa 1 do ADR-010.
- **Job assíncrono** para análise de vídeo — valioso, mas é mudança de arquitetura de execução e merece spec própria.
- **Papéis profissionais, tabela de vínculos, roles/permissions** — nenhuma tabela por antecipação.
- **Normalizar `strategy_data`/`charts`** — estão em *Do Not Change*: quebraria a leitura de linhas geradas por modelos anteriores.
- **Normalizar os nomes desnormalizados** de `tactical_analyses` — é **feature**, não dívida: preserva o nome de quando a estratégia foi gerada.
- **Reativar RLS** — [ADR-009](../../docs/decisions/009-acesso-ao-banco-exclusivamente-por-service-role.md) decidiu a outra via.
- **Índices de performance** — só quando o volume justificar.

## Requirements

| # | Requisito | Status |
|---|---|---|
| R1 | O schema é reconstruível a partir do repositório | ⚪ não iniciado |
| R2 | Runner em uso, com controle de estado | ⚪ não iniciado |
| R3 | `user_id` é UUID em todas as tabelas, com FK para `public.users(id)` | ⚪ não iniciado |
| R4 | Contagem de linhas **idêntica** antes e depois de cada migration | ⚪ não se aplica ainda |
| R5 | Invariantes 1, 3, 7 e 8 de [`docs/DOMAIN.md`](../../docs/DOMAIN.md) garantidas pelo banco | ⚪ não iniciado |
| R6 | Uma entidade de lutador, com marcação de papel; histórico preservado | ⚪ não iniciado |
| R7 | `checkJs` ativo em `models/` e `utils/` sem erro | ✅ **feito** |
| R8 | Nenhum comportamento de API mudou, exceto o previsto pela unificação | ✅ verificado (suíte verde, único item executado é código puro) |

## Technical Considerations

**⚠️ Este é o único ponto do plano com risco real de perda de dados.** Dois itens não são reversíveis por código — apenas por restauração de backup:

| Item | Por que |
|---|---|
| `user_id` VARCHAR → UUID | valores não-UUID **não convertem**. A migration `019` filtra `user_id <> ''`, o que é evidência de que já houve dado sujo |
| Unificação de entidades | move dados entre tabelas; pode exigir deduplicação |

**Mitigação obrigatória, para cada sub-item:**

1. backup verificado, **com restauração testada** (backup não testado não é backup);
2. execução em **cópia** do banco primeiro;
3. contagem de linhas antes/depois como critério;
4. script de rollback escrito **antes** de executar;
5. uma migration por PR, nunca agrupadas.

**Dual read para a conversão de tipo:**

```
1. ADD COLUMN user_id_uuid UUID          (aditivo, reversível)
2. backfill onde o valor converte; registrar o que não converte
3. resolver manualmente os não conversíveis (decisão caso a caso)
4. código lê das duas colunas, prefere a nova
5. validar em produção por um período
6. cortar: DROP da antiga, RENAME da nova
```

Os passos 1–5 são reversíveis. Só o 6 não é — e só acontece depois de validação.

**A unificação de entidades é a mais perigosa** porque toca as tabelas mais referenciadas e **quase nenhuma referência tem FK** para orientar: `fight_analyses.person_id` + `person_type` (polimórfico), `tactical_analyses.athlete_id`/`opponent_id`, `profile_versions.person_id` + `person_type`. Se o mesmo lutador está cadastrado como atleta **e** adversário, unificar exige decidir se são a mesma pessoa — **nome igual não é prova**, e a decisão não é automatizável.

**`UNIQUE` falha se houver duplicatas.** A [spec 002](../002-verification-baseline/spec.md) conta; a limpeza precisa acontecer antes, e o que fazer com duplicatas de e-mail é **decisão de produto** (qual conta é a válida?).

**TypeScript não pode ir em paralelo com as specs 005–006.** O diff global tornaria a revisão da correção de segurança impraticável. Aqui está seguro — as correções de autorização já terão sido revisadas e mergeadas.

**Esta spec é grande demais para ser executada como uma unidade.** Quando chegar a vez, deve ser **quebrada em specs próprias** (uma por sub-item), com os números reais da spec 002 em mãos. Planejá-la em detalhe agora, com o banco ainda incerto, seria planejar sobre suposição — que é exatamente o que este plano evita.

## Acceptance Criteria

- [ ] `pg_dump --schema-only` commitado; schema reconstruível numa base vazia — **não iniciado**, exige acesso de superusuário ao Postgres para o dump
- [ ] Runner em uso; estado das migrations rastreado — **não iniciado**
- [ ] Migrations destrutivas marcadas como históricas — **não iniciado**
- [ ] Zero órfãos de `user_id` — **não iniciado**, depende da contagem real (spec 002) e é limpeza de dado em produção
- [ ] `user_id` UUID em todas as tabelas, com FK para `public.users(id)` — **não iniciado** (item de maior risco da spec: dual-read + backfill + corte, ver *Technical Considerations*)
- [ ] **Contagem de linhas idêntica** antes/depois de cada migration, registrada no PR — não se aplica ainda; nenhuma migration de dado foi executada
- [ ] `UNIQUE(users.email)` ativo — **não iniciado**
- [ ] `UNIQUE(analysis_id, version_number)` ativo nas três tabelas de versão — **não iniciado**
- [ ] Índice único parcial em `is_current` ativo — **não iniciado**
- [ ] Uma entidade de lutador; `fight_analyses` com FK real; nenhum histórico perdido — **não iniciado** (o item que a própria spec chama de mais perigoso: exige decisão manual de deduplicação, "nome igual não é prova")
- [x] `checkJs` ativo em `models/` e `utils/` sem erro — **feito.** `server/tsconfig.json` + `// @ts-check` nos 10 models e 11 utilitários de topo; `npm run typecheck`. 12 erros de JSDoc-desatualizado corrigidos na primeira passagem (ver ADR-010), zero de lógica
- [x] As suítes de backend verdes (28/28, 331/331) — nenhum arquivo de execução mudou, só comentários e JSDoc; ⚠️ **E2E continua não rodando** (dívida pré-existente)
- [ ] Rollback de cada migration documentado e **testado em cópia** — não se aplica ainda

## Testing Strategy

| Nível | O que |
|---|---|
| **Contagem (obrigatório)** | linhas por tabela antes/depois de cada migration |
| **Integração** | ownership continua funcionando com `user_id` UUID |
| **Integração** | FKs impedem órfão novo |
| **Integração** | `UNIQUE` impede duplicata; erro tratado no app (não 500 cru) |
| **Integração** | após unificação: análises, estratégias e versões continuam ligadas às pessoas corretas |
| **Regressão** | as 16 suítes; os testes de ownership das specs 004/006 |
| **E2E** | fluxos críticos completos |
| **Restauração** | restaurar o backup numa cópia e verificar integridade — **antes** de qualquer migration destrutiva |

## Documentation Impact

| Documento | Mudança |
|---|---|
| `docs/DATABASE.md` | **reescrita substancial** — schema real, tipos, FKs, constraints, novo processo de migration |
| `docs/DOMAIN.md` | entidade unificada; invariantes 1, 3, 7, 8 passam a garantidas |
| `docs/modules/athletes-opponents.md` | **reescrita** — uma entidade com papel |
| `docs/ARCHITECTURE.md` | §4 — migrations com runner; tipagem |
| `docs/decisions/007` | Status → implementado; registrar o resultado da deduplicação |
| `docs/decisions/010` | Status → etapa 1 implementada | ✅ feito |
| `docs/PROJECT_STATUS.md` | *Known Issues* HIGH 13 e 14; *Planned* P5 e P6 |
| `CLAUDE.md` | *Database* regras 1 e 4 — migrations passam a ser fonte de verdade; tipo unificado |
| `server/migrations/README.md` | reescrever com o novo processo |
| `CHANGELOG.md` | **banco** — descrever cada migration e seu rollback |

## Risks

| Risco | Severidade | Mitigação |
|---|---|---|
| **Perda de dados na conversão de tipo** | **Alta** | Dual read; backup com restauração testada; execução em cópia; contagem antes/depois |
| **Perda de dados na unificação de entidades** | **Alta** | Dual read; período de dupla leitura; deduplicação decidida manualmente |
| **Deduplicação incorreta funde pessoas diferentes** | **Alta** | Nome igual **não** é critério; decisão manual, caso a caso, com o proprietário |
| `UNIQUE` falha por duplicatas existentes | Média | Contagem na spec 002; limpeza antes; decisão de produto sobre e-mails duplicados |
| Migration manual aplicada fora de ordem | Média | Runner com controle de estado (item 1) |
| `checkJs` revela muitos erros | Média | ✅ **Materializado, mitigado.** 12 erros na primeira passagem, todos JSDoc desatualizado (nenhum de lógica) — corrigidos, zero erro restante. Ver ADR-010 |
| Contrato de API muda com a unificação | **Alta** | Camada de compatibilidade para `/api/athletes` e `/api/opponents`; período de coexistência |
| Spec grande demais para uma unidade | **Alta** | ✅ **Aplicado nesta própria execução:** só o item 5 (TypeScript, sem risco de dado) foi implementado. Os itens 1–4 permanecem como estavam — precisam virar specs próprias quando chegar a vez, com backup testado e acesso direto ao Postgres como pré-requisitos |

## Dependencies

**Depende de:**
- [spec 002](../002-verification-baseline/spec.md) — contagem de órfãos, valores não-UUID, duplicatas e schema real de `users` (**bloqueio duro**)
- [spec 006](../006-ownership-in-data-access/spec.md) — ownership correto antes de mexer nas colunas que o sustentam
- [spec 008](../008-database-access-lockdown/spec.md) — acesso consolidado
- **Backup verificado com restauração testada** (portão)

**Não pode ir em paralelo com:** specs 005–006 (o item 5, TypeScript, produziria diff global durante a revisão de segurança).

**Última do plano.** Nada depende dela.
