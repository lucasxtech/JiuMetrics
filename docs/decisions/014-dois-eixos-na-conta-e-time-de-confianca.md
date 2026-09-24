# ADR-014 — Dois eixos na conta, e o modelo de time de confiança

## Status

**Accepted — implementado na spec 014 (2026-09-24).**

Este ADR **complementa** [ADR-002](./002-rls-desligado-autorizacao-na-aplicacao.md) e [ADR-011](./011-seam-de-politica-de-autorizacao.md) — **não os substitui**. ADR-002 continua descrevendo por que a autorização vive na aplicação e não no banco; ADR-011 continua descrevendo o seam (`resolveScope`/`authorize`, hoje `can`) desacoplado do Express. O que muda aqui é **o que essas funções avaliam**, não onde vivem nem por que o RLS está desligado.

## Context

Dois fatos, confirmados pelo proprietário em 2026-09-22, mostraram que o modelo binário `admin`/`user` deixou de descrever o produto:

1. **A maioria dos ~25 usuários são os próprios atletas**, que cadastraram a si mesmos em `athletes`. O [`JIU_METRICS_REFACTORING_PLAN.md`](../../JIU_METRICS_REFACTORING_PLAN.md) §7 assumia o inverso ("treinador loga, atleta é registro") e já alertava para nunca presumir que `athletes.user_id` é a conta do atleta — o alerta continua válido, mas faltava um campo que **dissesse** qual ficha é de qual conta, porque a convenção implícita não serve para autorização.
2. Vão entrar **profissionais** (fisioterapeuta, nutricionista, preparador físico) e o **professor** precisa ver o time inteiro sem virar admin — hoje a única forma de um professor ver o grupo é `role: 'admin'`, o que também lhe dá gestão de contas.

Antes desta spec, `resolveScope(actor)` conhecia só `role`, e `authorize(actor, action, resource)` existia com assinatura estável ([ADR-011](./011-seam-de-politica-de-autorizacao.md)) mas **não avaliava `action`** — era um alias de `resolveScope`. A matriz de acesso do produto (competições, agenda, saúde) tem permissões por área que não cabem em "está no escopo ou não".

## Decision

**Dois eixos independentes na conta, e visibilidade de time sem tabela de vínculo.**

1. **`users.profile`** — coluna `VARCHAR(30) NOT NULL DEFAULT 'atleta'`, `CHECK` fechado em `'atleta' | 'professor' | 'nutricionista' | 'fisioterapeuta' | 'preparador_fisico'`. Independente de `role` (`admin`/`user`, que decide gestão de contas — R-05, admin é toggle por conta, qualquer perfil).
2. **`athletes.account_user_id`** — `UUID NULL UNIQUE REFERENCES users(id) ON DELETE SET NULL`. A conta da própria pessoa, no máximo uma ficha por conta. `athletes.user_id` (VARCHAR, quem gerencia a ficha) não muda de significado.
3. **`resolveScope(actor)`**: `role === 'admin'` **ou** `profile` em `STAFF_PROFILES` (`professor`, `nutricionista`, `fisioterapeuta`, `preparador_fisico`) → todos os `user_id` do tenant; senão → `[actor.id]`. "Só admin vê o grupo" vira "admin **ou staff** vê o grupo".
4. **Modelo de time de confiança**: sem tabela de vínculo profissional↔atleta, sem consentimento por atleta. Todo staff vê todas as fichas do tenant, inclusive saúde completa (quando essa área existir). Não há um segundo nível de escopo dentro do tenant.
5. **`CAPABILITIES`** — tabela de dados em `server/src/services/authorization.js`, avaliada por `can(actor, action, resource)` (e por `authorize`, que desde esta spec é um alias direto — nenhum chamador de produção dependia do comportamento antigo "só escopo, ação ignorada", verificado por grep). `action` é `'<área>:<verbo>'`; ação não listada é **negada**, não permitida por omissão.

## Rationale

**Por que coluna e não tabela de papéis/permissões.** O produto tem 5 perfis fixos, decididos pelo dono, para uma academia (~25 usuários). Uma tabela `roles`/`permissions` resolveria um problema de granularidade dinâmica que este produto não tem — perfil novo é `CHECK` novo e linha nova em `CAPABILITIES`, não migration de schema relacional. Mesmo raciocínio de [ADR-005](./005-belt-rules-como-tabela-deterministica.md) para `BELT_RULES`: uma tabela determinística em código é mais barata e mais auditável que um motor de regras quando o conjunto de regras é pequeno e muda raramente.

**Por que time de confiança e não vínculo com consentimento.** É decisão de produto do dono (2026-09-22), não uma limitação técnica: numa academia pequena, o professor e a equipe de saúde já têm, na prática, acesso a todo o time. Modelar consentimento por atleta antes de haver um profissional externo à academia seria complexidade sem uso — ninguém precisaria negar acesso a ninguém. **É reversível**: o gatilho que reabre a decisão é justamente um profissional **externo** à academia (ex.: fisioterapeuta que atende vários times); nesse caso o modelo de "vê o tenant inteiro" deixa de fazer sentido e uma tabela de vínculo entra por cima de `resolveScope`, sem precisar desfazer o que existe — `CAPABILITIES` já modela a decisão por `action`, então trocar "quem está no escopo" não muda a forma da tabela.

**Por que `CAPABILITIES` como tabela de dados, e não `if`/`else` espalhado.** Ação não listada nega por padrão — o mesmo princípio de "falha fechado" que motivou `MissingScopeError` na spec 006. Uma tabela é testável como dado: R8 percorre a matriz inteira (perfil × ação × próprio/alheio/outro tenant) e compara com a matriz da spec, então uma ação nova sem linha correspondente é **acusada pelo teste**, não descoberta em produção.

**Por que `authorize` virou alias de `can`, em vez de duas funções.** `authorize(actor, action, resource)` já existia com essa assinatura desde a spec 005/ADR-011, reservada para o dia em que uma decisão por ação chegasse. Chegou. Manter duas funções com comportamento diferente seria reintroduzir a ambiguidade que o seam existe para evitar.

## Consequences

### Positivas

- **Um ponto único de decisão** para as specs de competições, agenda e saúde: elas registram `action`s novas em `CAPABILITIES`, sem tocar controllers de novo — exatamente o que [ADR-011](./011-seam-de-politica-de-autorizacao.md) previu como Estágio 2.
- **`resolveScope` continua com uma linha de regra** (`role === 'admin' || STAFF_PROFILES.includes(profile)`), fácil de auditar visualmente.
- **Ação nova sem linha na matriz falha fechado** — o mesmo princípio da spec 006 (`MissingScopeError`), agora no nível de `action` em vez de escopo de posse.

### Negativas

- **Staff vê dado de saúde de todos os atletas do tenant**, sem exceção e sem consentimento — é a decisão deliberada acima, mitigada apenas pelo registro de acesso que a spec de saúde (fase 5 do [`ROADMAP.md`](../ROADMAP.md)) vai introduzir (quem abriu a saúde de quem, quando). Até lá, não há prestação de contas nenhuma sobre esse acesso.
- **`CAPABILITIES` cresce por spec** — cada área nova (competição, agenda, saúde) acrescenta linhas. Sem disciplina de teste (R8), a tabela vira a mesma dívida que motivou esta reescrita: regra espalhada e não verificada.
- **`competition:team-event:write` quebra o padrão de `inScope` da tabela** — é a única regra que faz sua própria consulta de tenant (`User.getGroupUserIds`) em vez de usar o escopo padrão, porque um `atleta` (escopo `[id]`) pode criar evento de equipe para qualquer colega. Documentado em comentário no código para não virar padrão copiado sem necessidade.

## Alternatives

**Tabela `roles`/`permissions` relacional.** Rejeitada por ora: resolveria granularidade dinâmica (permissões configuráveis por instalação, múltiplos perfis por conta) que este produto não pede — um dono, uma academia, 5 perfis fixos. Gatilho que reabre: se o produto passar a atender múltiplas academias com políticas de acesso diferentes entre si, ou perfis por conta deixarem de ser mutuamente exclusivos.

**Vínculo profissional↔atleta com consentimento explícito.** Rejeitada por ora — ver *Rationale*. Gatilho que reabre: entrada de um profissional **externo** à academia (ex.: fisioterapeuta autônomo atendendo atletas de times diferentes), onde "vê o tenant inteiro" deixaria de ser a semântica certa.

## Evidence

- `server/src/services/authorization.js` — `PROFILES`, `STAFF_PROFILES`, `HEALTH_STAFF`, `resolveScope`, `CAPABILITIES`, `can`, `authorize`
- `server/src/models/User.js` — `createSubUser`, `getLinkedAthletes`, `linkAthlete`
- `server/migrations/025-account-profile.sql` — `users.profile`, `users.must_change_password`, `athletes.account_user_id`, índice único parcial
- `server/src/__tests__/authorization/capabilities.test.js` — a matriz completa, perfil × ação × (próprio/alheio/outro tenant)
- `server/src/__tests__/authorization/staff.test.js`, `scope.test.js` — staff vê o tenant; atleta não vê outro atleta
- [`specs/014-identity-and-profiles/spec.md`](../../specs/014-identity-and-profiles/spec.md) — Context (os dois fatos de 2026-09-22), matriz completa em *Scope*
- [`docs/ROADMAP.md`](../ROADMAP.md) §1.2 — decisão de produto do time de confiança e a matriz de acesso por área
- [ADR-002](./002-rls-desligado-autorizacao-na-aplicacao.md), [ADR-011](./011-seam-de-politica-de-autorizacao.md) — decisões complementadas, não substituídas
