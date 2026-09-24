# SPEC-014 — Identidade: perfil da conta, vínculo conta ↔ ficha e escopo por perfil

**Status: Approved** (2026-09-24, pelo proprietário) · Escrita em 2026-09-24 · Fase 1 do [`docs/ROADMAP.md`](../../docs/ROADMAP.md) (tarefas R-04, R-07, R-08, R-09, R-10, R-13, R-14)

> Primeira spec da evolução "plataforma da equipe". **Não cria nenhuma área nova** (competições, agenda, saúde). Só faz a conta saber *quem* a pessoa é e a autorização saber *o que* isso libera — para que as specs seguintes não precisem varrer controllers de novo.

## Context

Hoje a conta tem um único eixo, `users.role` (`admin` | `user`), e a regra de escopo é binária: admin vê o tenant, usuário comum vê só o próprio `user_id` ([ADR-002](../../docs/decisions/002-rls-desligado-autorizacao-na-aplicacao.md), [ADR-011](../../docs/decisions/011-seam-de-politica-de-autorizacao.md), `services/authorization.js#resolveScope`).

Dois fatos, confirmados pelo proprietário em 2026-09-22, mostram que isso não descreve mais o produto:

1. **A maioria dos ~25 usuários são os próprios atletas**, que cadastraram a si mesmos em `athletes`. Uma ou duas contas são de professores. O [plano de refatoração](../../JIU_METRICS_REFACTORING_PLAN.md) §7 assumia o inverso ("treinador loga, atleta é registro") e alertava: *nunca assumir que `athletes.user_id` é a conta do atleta*. O alerta continua válido — só que agora precisamos de um campo que **diga** qual ficha é de qual conta, porque a convenção implícita não serve para autorização.
2. Vão entrar **profissionais** (fisioterapeuta, nutricionista, preparador físico) e o **professor** precisa ver o time inteiro sem ser necessariamente admin. O modelo escolhido é o de **time de confiança**: staff vê todas as fichas do tenant, sem tabela de vínculo nem consentimento por atleta; atleta vê só a si mesmo. Decisões e matriz completa em [`docs/ROADMAP.md`](../../docs/ROADMAP.md) §1.2.

O protótipo [`Perfis e acessos.dc.html`](https://claude.ai/design/p/6f39984b-2862-4cac-b7e2-8d93de97ffc6?file=Perfis+e+acessos.dc.html) fixou a matriz de acesso e a tela de Usuários; as decisões R-05 (admin é toggle independente do perfil), R-06 (staff de saúde e preparador editam treinos; professor só vê) e R-13 (excluir conta apaga tudo) já estão tomadas.

## Problem

- Não existe como saber, no banco nem na aplicação, **qual conta é de qual atleta**. Toda a área individual planejada (competições, agenda, saúde) depende disso.
- `resolveScope` só conhece `role`. Para um professor ver o time hoje é preciso torná-lo admin, o que também lhe dá gestão de contas.
- `authorize(actor, action, resource)` existe com assinatura estável mas **não avalia `action`**. A matriz de acesso do produto tem permissões por área que não cabem em "está no escopo ou não".
- A exclusão de conta oferece "transferir ou apagar" e **não apaga tudo**: `deleteAllData` ignora `analysis_versions`, `profile_versions`, `ai_chat_sessions` (a doc diz que são descartados; na prática ficam órfãos porque não há FK).
- Não há troca de senha pelo próprio usuário nem troca obrigatória no primeiro acesso; o admin cria a senha e ela fica.

## Goal

Ao fim desta spec:

1. Toda conta tem um `profile` (`atleta` | `professor` | `nutricionista` | `fisioterapeuta` | `preparador_fisico`), independente de `role`.
2. Uma ficha em `athletes` pode apontar para a conta da própria pessoa (`account_user_id`), no máximo uma ficha por conta.
3. `resolveScope` devolve o tenant para admin **ou staff**, e só o próprio id para atleta.
4. `authorize` passa a avaliar uma **tabela de capacidades por perfil**, pronta para as specs de competições, agenda e saúde consumirem.
5. Admin gerencia perfil, permissão, vínculo de ficha e exclusão total pela API.
6. Usuário troca a própria senha; conta criada pelo admin exige troca no primeiro acesso.
7. Os 25 usuários atuais ficam com perfil e ficha vinculada corretos, por procedimento com confirmação manual.

## Scope

### Banco — migration `025-account-profile.sql` (aditiva, aplicada à mão)

| Alteração | Detalhe |
|---|---|
| `users.profile VARCHAR(30) NOT NULL DEFAULT 'atleta'` | `CHECK (profile IN ('atleta','professor','nutricionista','fisioterapeuta','preparador_fisico'))`. Default `atleta` porque é a maioria; os 1–2 professores são ajustados pelo procedimento de migração (abaixo), **nunca por `UPDATE` sem `WHERE`** |
| `users.must_change_password BOOLEAN NOT NULL DEFAULT false` | ligado na criação pelo admin; desligado na primeira troca |
| `athletes.account_user_id UUID NULL UNIQUE REFERENCES users(id) ON DELETE SET NULL` | a conta da própria pessoa. `UNIQUE` garante uma ficha por conta. `athletes.user_id` (VARCHAR, quem gerencia) **não muda de significado** |
| Índice `athletes(account_user_id)` | parcial, `WHERE account_user_id IS NOT NULL` |

Nada é dropado. `opponents` **não** ganha `account_user_id`: adversário não tem conta ([ADR-007](../../docs/decisions/007-unificar-athlete-e-opponent-numa-entidade-com-papel.md) continua valendo para a unificação futura; se ela vier, a coluna migra junto).

### Autorização — `services/authorization.js`

- `actor` passa a ser `{ id, role, profile, tenantId }`. `middleware/auth.js` lê `profile` em `User.getAuthInfo` (junto com `role`, `is_active`, `token_version`) e popula `req.actor.profile`. O fallback sem banco assume `profile: 'atleta'` (o mais restritivo).
- `STAFF_PROFILES = ['professor','nutricionista','fisioterapeuta','preparador_fisico']`.
- `resolveScope(actor)`: `role === 'admin'` **ou** `STAFF_PROFILES.includes(profile)` → `User.getGroupUserIds(actor.id)`; senão `[actor.id]`.
- **Tabela de capacidades** `CAPABILITIES`, avaliada por `authorize(actor, action, resource)` e exposta também como `can(actor, action, resource)` para uso fora de request (testes, scripts). `action` é `'<área>:<verbo>'`; `resource` carrega `userId` (dono/gestor) e, quando fizer sentido, `accountUserId` (a conta do atleta). Regra de leitura: **nada é liberado por omissão** — ação não listada é negada.

| `action` | atleta | professor | fisio · nutri · prep | admin (qualquer perfil) |
|---|---|---|---|---|
| `person:read` | próprio escopo | tenant | tenant | tenant |
| `person:write` | próprio escopo | tenant | tenant | tenant |
| `own-athlete:write` (ficha vinculada) | se `accountUserId === actor.id` | idem | idem | idem |
| `training:read` | própria ficha | tenant | tenant | tenant |
| `training:write` | própria ficha | **negado** em ficha alheia | tenant | como o perfil |
| `schedule:write` (grade do time) | negado | tenant | negado | como o perfil |
| `competition:write` | própria ficha | tenant | negado | como o perfil |
| `competition:team-event:write` | permitido (atleta pode criar evento) | tenant | negado | como o perfil |
| `health:read` / `health:write` | própria ficha | tenant | tenant | como o perfil |
| `users:manage` | negado | negado | negado | **permitido** |

`training`, `schedule`, `competition` e `health` **não têm endpoint nesta spec**; entram aqui para que as specs seguintes só registrem consumidores. A tabela é dado, não código espalhado: um teste percorre todas as combinações perfil × ação e compara com esta matriz (R8).

- `adminMiddleware` continua decidindo por `role`. Permissão de admin **não** muda com o perfil (R-05).

### API

| Método e rota | Mudança |
|---|---|
| `POST /api/auth/login` | resposta ganha `profile` e `mustChangePassword` |
| `GET /api/auth/validate` | resposta ganha `profile` e `mustChangePassword` |
| **`POST /api/auth/change-password`** (novo, autenticado) | `{ currentPassword, newPassword }`; valida a atual, grava a nova, zera `must_change_password`, **incrementa `token_version`** e devolve token novo. Schema zod. Quando `must_change_password` é verdadeiro, `currentPassword` continua obrigatória (é a provisória) |
| `GET /api/admin/users` | cada linha ganha `profile`, `athleteId` e `athleteName` da ficha vinculada, `lastLogin` |
| `POST /api/admin/users` | corpo ganha `profile` (obrigatório), `isAdmin` (bool, vira `role`), `createAthlete` (bool) e, se verdadeiro, `athlete: { belt }` (faixa é obrigatória desde a spec 013; decidido em 2026-09-24 que o diálogo **pede a faixa** quando o toggle de ficha está ligado — o protótipo ainda não a mostra, ver *Documentation Impact*). Cria a ficha com `user_id = <nova conta>` e `account_user_id = <nova conta>`. Sempre grava `must_change_password = true` |
| **`PATCH /api/admin/users/:id/profile`** (novo) | `{ profile }`; mesmo tenant; incrementa `token_version` e evict do cache (o escopo mudou) |
| `PATCH /api/admin/users/:id/role` | inalterado, com duas regras novas: não remover admin de si mesmo; não remover o **último admin ativo** do tenant |
| **`PATCH /api/admin/users/:id/athlete`** (novo) | `{ athleteId }` vincula, `{ athleteId: null }` desvincula. A ficha precisa pertencer ao tenant (`user_id` no escopo) e não estar vinculada a outra conta (409) |
| `DELETE /api/admin/users/:id/permanent` | **corpo sem `transferToUserId`**; se vier, 400. Apaga, nesta ordem e só dentro do tenant: `ai_chat_sessions`; `strategy_versions` (cascata do banco) e `tactical_analyses`; `analysis_versions` e `profile_versions` das análises da conta; `fight_analyses`; `athletes` com `user_id = id` **ou** `account_user_id = id` (e as análises/versões dessas fichas, mesmo que criadas por outra conta do tenant); `opponents`; por fim a linha em `users`. Resposta declara contagens por tabela. Falha no meio **não** é tolerada: a exclusão para e devolve 500 com o que já foi apagado |
| `api_usage` | **não é apagado** (decisão do proprietário, 2026-09-24): é o livro-caixa do tenant e alimenta o orçamento mensal (spec 009) |

Todos os endpoints novos e alterados com corpo ganham schema zod (`schemas/requests/users.js`), mapeando **antes** o payload que o frontend atual envia (`adminService.js`, `AdminUsers.jsx`), pela armadilha registrada no [`CLAUDE.md`](../../CLAUDE.md) (campo não declarado chega `undefined` em silêncio).

### Migração dos usuários atuais — `server/scripts/link-accounts.js`

Procedimento em três passos, sem nenhum `UPDATE` automático de perfil:

1. `--dry-run` (padrão): para cada conta, lista as fichas em `athletes` com `user_id = conta` e propõe o vínculo quando há **exatamente uma** ficha cujo `name` bate com `users.name` (comparação sem acento e sem caixa). Imprime uma tabela: conta, e-mail, fichas encontradas, proposta, motivo quando não há proposta.
2. O proprietário revisa a tabela e edita um arquivo `link-accounts.decisions.json` (em `.ai/`, fora do Git) com `{ userId: { athleteId | null, profile } }` — é aqui que os professores recebem `profile: 'professor'`.
3. `--apply <arquivo>`: grava `account_user_id` e `profile` **só** para as contas presentes no arquivo, uma a uma, e imprime o resultado. Recusa aplicar se alguma `athleteId` já estiver vinculada a outra conta.

O script usa `config/supabase.js` (service role) e roda localmente. Não é migration.

### Frontend — o mínimo para o front atual não quebrar

O front será refeito na fase 2 (R-29 implementa a tela de Usuários do protótipo). Aqui só o que a mudança de contrato exige:

| Item | Arquivo |
|---|---|
| `AuthContext` guarda `profile` e `mustChangePassword`; `ProtectedRoute` redireciona para `/trocar-senha` enquanto `mustChangePassword` for verdadeiro | `contexts/AuthContext.jsx`, `components/routing/ProtectedRoute.jsx` |
| Página mínima `/trocar-senha` (senha atual, nova, confirmação) | `pages/ChangePassword.jsx` |
| `AdminUsers`: coluna de perfil com `<select>`, ação "vincular ficha" com `<select>` das fichas do tenant sem vínculo, criação com perfil e toggle de ficha (com faixa) | `pages/AdminUsers.jsx`, `services/adminService.js` |
| `DeleteUserModal` perde a opção de transferir; o texto lista o que será apagado | `pages/AdminUsers.jsx` |

Sem redesenho. Componentes novos seguem o estilo vizinho até a fase 2.

## Out of Scope

- **Competições, agenda, saúde, nutrição, Início por perfil** — specs próprias (fases 3 a 5). A tabela de capacidades já as prevê, os endpoints não.
- **Registro de acesso à saúde** — não há área de saúde ainda; entra na spec de saúde.
- **Converter `athletes.user_id` para UUID** (R-11) e **unificar `athletes`/`opponents`** (R-12). `account_user_id` nasce UUID com FK real porque `users.id` já é UUID; o `user_id` VARCHAR continua como está.
- **Recuperação de senha por e-mail.** Não existe e-mail no projeto. O fluxo continua sendo "o admin redefine".
- **Redesenho da tela de Usuários** — fase 2, R-29.
- **Logout do próprio usuário ao trocar perfil de outro** — `token_version` já resolve.

## Requirements

| # | Requisito | Verificação |
|---|---|---|
| R1 | Migration `025` é aditiva, idempotente (`IF NOT EXISTS`) e não contém `UPDATE` sem `WHERE` | leitura + `grep -n UPDATE` no arquivo |
| R2 | `getAuthInfo` devolve `profile`; `req.actor.profile` é populado; fallback sem banco é `atleta` | `auth.test.js` |
| R3 | `resolveScope`: admin → tenant; cada um dos 4 perfis de staff com `role=user` → tenant; `atleta` com `role=user` → `[id]` | `authorization/scope.test.js` (novo) |
| R4 | **Atleta não vê outro atleta do mesmo tenant** em nenhum endpoint de leitura já existente (pessoas, análises, estratégias, versões, chat) | `authorization/leaks.test.js` estendido com um segundo atleta por tenant nas fixtures |
| R5 | Staff com `role=user` lê as fichas e análises do tenant e **não** acessa `/api/admin/*` | `authorization/staff.test.js` (novo) |
| R6 | `PATCH .../athlete` recusa ficha de outro tenant (404) e ficha já vinculada (409); `UNIQUE` no banco como segunda barreira | `users.test.js` + migration |
| R7 | `DELETE .../permanent` apaga tudo que a lista do *Scope* enumera, **só dentro do tenant**, e devolve as contagens; `transferToUserId` no corpo é 400 | `authorization/deleteAccount.test.js` (novo, com fakeSupabase) |
| R8 | `can(actor, action, resource)` reproduz a matriz de capacidades para todas as combinações perfil × ação × (próprio/alheio/outro tenant); ação desconhecida é negada | `authorization/capabilities.test.js` (novo) |
| R9 | Não dá para remover admin de si mesmo nem do último admin ativo do tenant | `users.test.js` |
| R10 | `change-password` exige a senha atual, incrementa `token_version`, zera `must_change_password` e o token antigo passa a ser recusado | `auth.test.js` |
| R11 | Conta criada pelo admin nasce com `must_change_password = true`; `createAthlete` cria ficha com `belt` obrigatória e `account_user_id` preenchido | `users.test.js` |
| R12 | Todo endpoint novo/alterado com corpo tem schema zod; payload real do front atual passa | `schemas/users.test.js` |
| R13 | `link-accounts.js --dry-run` não escreve; `--apply` recusa vínculo duplicado e só toca contas listadas | `scripts/__tests__/linkAccounts.test.js` |
| R14 | Nenhum teste existente de autorização regride | suíte `authorization/` verde |

**Ordem de trabalho obrigatória** ([`CLAUDE.md`](../../CLAUDE.md), *Change Process* 5): R3, R4, R5, R7 e R8 são escritos **antes** do código e precisam falhar primeiro.

## Technical Considerations

- **Fixtures.** `support/fixtures.js` ganha, por tenant, um segundo usuário `atleta` com ficha vinculada e um usuário `fisioterapeuta` com `role=user`. O formato de `seedRows` é mantido; os novos campos entram com default para não quebrar as specs 004–006.
- **Fake de PostgREST.** `fakeSupabase.js` precisa entender `.or('user_id.eq.X,account_user_id.eq.X')` para a exclusão — ou a exclusão faz duas consultas. Preferir duas consultas: mais simples e o fake já cobre.
- **Cache do middleware.** `evictAuthCache` já existe; chamar em troca de perfil, de role e de senha. O TTL de 5 min continua sendo a janela máxima de escopo obsoleto em outra instância serverless — mesma dívida de hoje, registrada em `docs/AUTHORIZATION.md`.
- **`getGroupUserIds` é plano** (spec 005). Staff recebe a mesma lista que o admin. Nada muda aí.
- **`athletes.user_id` continua VARCHAR.** Comparações com `account_user_id` (UUID) são sempre por igualdade com o `actor.id` em JavaScript, nunca por JOIN no PostgREST. Não presumir o tipo ([`CLAUDE.md`](../../CLAUDE.md), *Database* 4).
- **`ON DELETE SET NULL` na FK** é rede de segurança; com a exclusão total da conta, a ficha some antes de a FK agir.
- **Sem transação.** PostgREST não expõe transação; a exclusão em cascata é sequencial, e a ordem escolhida deixa o estado consistente se parar no meio (filhos antes dos pais). A resposta de erro diz até onde foi.
- **Padrão bom para copiar:** `controllers/userController.js` e `models/TacticalAnalysis.js`, como manda o [`CLAUDE.md`](../../CLAUDE.md).

## Acceptance Criteria

- [ ] `cd server && npm test` verde, com as 5 suítes novas de autorização
- [ ] `cd server && npm run typecheck` e `npm run lint` sem erro
- [ ] `cd frontend && npm test`, `npm run lint` e `npm run build` verdes
- [ ] Migration `025` revisada pelo proprietário e aplicada no SQL Editor; `link-accounts.js --dry-run` executado e a tabela revisada; `--apply` executado com o arquivo de decisões
- [ ] Documentação da lista abaixo atualizada no mesmo PR

## Documentation Impact

- **ADR-014** (novo): *Dois eixos na conta e modelo de time de confiança* — por que perfil é coluna e não tabela de permissões; por que não há consentimento por atleta; o que reverte isso. Marca ADR-002 e ADR-011 como **complementados**, não substituídos.
- `docs/AUTHORIZATION.md`: nova regra de escopo, tabela de capacidades, `req.actor` com `profile`.
- `docs/DOMAIN.md`: `User.profile`, `Athlete.account_user_id`, regra 9 da entidade User (exclusão) reescrita; §6 e invariante 1.
- `docs/DATABASE.md`: colunas novas, FK real nova (passa de 4 para 5), migration `025` no índice.
- `docs/API.md` e `docs/modules/users-and-admin.md`: endpoints novos e alterados.
- `CLAUDE.md`: tabela de escopo em *Authorization* ganha a linha do staff; regra "excluir transfere ou apaga" vira "excluir apaga tudo".
- `docs/ROADMAP.md`: R-04, R-07, R-08, R-09, R-10, R-13, R-14 → ✅; item novo em §2.3: **o diálogo de novo usuário do protótipo precisa pedir a faixa quando "criar ficha" está ligado** (R-25).
- `CHANGELOG.md`.

## Risks

| Risco | Mitigação |
|---|---|
| Professor fica como `atleta` até o `--apply` e, sem ser admin, deixa de ver o time | Os professores atuais são admin (`role`), então continuam vendo o tenant pelo eixo antigo; o perfil só acrescenta |
| Vínculo errado de ficha dá a um atleta a área individual de outro | Proposta automática só com ficha única e nome igual; **confirmação manual** obrigatória; `UNIQUE` no banco |
| Exclusão total apaga mais do que o admin esperava | Diálogo lista o que será apagado com contagens antes de confirmar; confirmação digitada; resposta declara o que foi apagado |
| Tabela de capacidades cresce sem teste | R8 percorre a matriz inteira; ação nova sem linha na tabela é negada e o teste acusa |
| Campo novo no schema zod não declarado → `undefined` silencioso | R12 testa o payload real do front atual antes de trocar o schema |

## Dependencies

- Nenhuma da fase 0: esta spec não introduz dado de saúde. **Mas** o `REVOKE` (R-02) continua sendo a prioridade do proprietário e pode andar em paralelo.
- Não depende de R-11 nem R-12.
- Spec 013 (faixa obrigatória) já implementada.
