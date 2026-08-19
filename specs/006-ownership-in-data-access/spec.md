# SPEC-006 — Ownership obrigatório no acesso a dados

**Status: Implemented (2026-08-18)** · Etapa 4 do [plano de refatoração](../../JIU_METRICS_REFACTORING_PLAN.md)
**Era a spec mais importante do plano — e a mais arriscada.**

## Context

A auditoria encontrou 6 endpoints sem verificação de posse, com leitura **e escrita** cross-tenant. A causa imediata é que cada um esqueceu de chamar a regra de escopo. A causa estrutural é outra:

```js
// models/FightAnalysis.js — aceita QUALQUER id
static async update(id, analysisData) { ... .eq('id', id) ... }
static async delete(id) { ... .eq('id', id) ... }
```

**A posse do dado é uma convenção de chamada, não um requisito de assinatura.** O sistema é seguro apenas enquanto todo controller lembrar de filtrar. Nenhum método de `AnalysisVersion` filtra — e a tabela `analysis_versions` **não tem coluna `user_id`**, então não há como filtrar sem decidir de onde vem a autorização.

Existe no próprio repositório um contraexemplo do padrão correto: `models/TacticalAnalysis.js` filtra `.in('user_id', ids)` em **todos** os métodos.

E há a contraprova de que a disciplina não basta: `chatController.applyEdit` verifica posse **corretamente** para a análise, e poucas linhas depois chama `updateContextSnapshot(sessionId)` com um ID do `req.body` **sem validar nada**. O mesmo autor, no mesmo arquivo, no mesmo handler.

## Problem

Corrigir apenas os 6 endpoints deixa a armadilha armada. O 7º endpoint que precisar atualizar uma análise vai chamar `FightAnalysis.update(id, dados)` — a assinatura permite, o linter não reclama, o teste (que mocka o model) passa.

Adicionalmente, a [spec 008](../008-database-access-lockdown/spec.md) vai remover a última rede possível ao revogar os GRANTs de `anon`: depois dela, um endpoint sem filtro **não tem nenhuma defesa abaixo dele**. Isso transforma esta correção de "importante" em "pré-requisito".

## Goal

Fechar os 6 vazamentos **e** tornar a próxima omissão um erro em tempo de execução em vez de um vazamento silencioso.

## Scope

### 1. Escopo obrigatório nos models

| Model | Mudança |
|---|---|
| `FightAnalysis.update`, `.delete` | passam a exigir escopo; **lançam** se ausente |
| `FightAnalysis.getById` | avaliar remoção — existe `getByIdAndUser`; `getById` é a variante insegura que `manual-edit` usa |
| `ChatSession.addMessage`, `.addMessages`, `.updateContextSnapshot` | passam a exigir escopo |
| `AnalysisVersion` (todos os métodos) | autorização derivada da análise pai (ver item 3) |

A exigência é de **assinatura + verificação em runtime**: chamada sem escopo lança erro tipado, não devolve `null` nem lista vazia. Um erro é visível; uma lista vazia parece "não achou".

### 2. Correção dos 6 endpoints

| # | Endpoint | Correção |
|---|---|---|
| 1 | `POST /api/chat/manual-edit` | `resolveScope` + `getByIdAndUser` (padrão de `applyEdit`) |
| 2 | `GET /api/chat/versions/:analysisId` | autorizar pela análise pai |
| 3 | `POST /api/chat/restore-version` | validar posse antes de `update` e `setAsCurrent` |
| 4 | `updateContextSnapshot` em `apply-edit` | validar posse da sessão |
| 5 | `POST /api/ai/analyze-link` | validar posse de `personId` (replicar o que `createAnalysis` já faz) |
| 6 | `POST /api/ai/athlete-summary` | receber `athleteId` e carregar server-side |

### 3. Autorização de `analysis_versions`

✅ **P4 DECIDIDO (2026-08-18): derivar da análise pai, verificando em duas etapas na aplicação.** Sem migration, sem backfill, reversível sem tocar em dado.

⚠️ **Correção de rumo:** o plano descrevia esta opção como "`JOIN` com `fight_analyses`". **O JOIN do PostgREST é inviável aqui** — `analysis_id` é polimórfico (aponta para `fight_analyses` **ou** `tactical_analyses`, conforme `analysis_type`) e **não tem foreign key**; o PostgREST só embeda relação declarada. Confirmado na migration `010`, que cria a tabela sem FK e com `CHECK (analysis_type IN ('fight','tactical'))`.

A coluna `user_id` denormalizada foi descartada por dois motivos: exige migration + backfill, e cria uma **segunda fonte de verdade de posse**, que pode divergir da análise pai.

Custo aceito: **uma query extra por chamada**. Quem decide o status HTTP é o controller (via `AnalysisVersion.isAnalysisInScope` → 404); o model repete a verificação como rede para um chamador futuro que esqueça.

### 4. Escopo escalar nos caminhos de perfil

`createProfileSession`, `saveProfileSummary` e `restoreProfileVersion` passam o `userId` escalar em vez do escopo resolvido → **admin perde acesso ao grupo** nesses três caminhos. Corrigir para usar o módulo de política.

### 5. Split de `chatController.js`

818 linhas, 16 handlers, 3 subdomínios — e é onde estavam 4 dos 6 vazamentos. **Mecânico, sem mudança de comportamento**, em commit separado das correções de segurança para não misturar movimentação de código com mudança de lógica.

✅ **Feito em 4 arquivos, não 3.** A spec pedia `analysis`/`profile`/`strategy` **e** "cada um < 350 linhas", e os dois requisitos são incompatíveis: o módulo de análise sozinho passaria de 420 linhas, e mais ainda depois das correções. O subdomínio de análise foi dividido em **sessão** (genérica, usada pelos três) e **edição/versionamento**:

| Arquivo | Linhas |
|---|---|
| `chatSessionController.js` | 204 |
| `chatAnalysisController.js` | 243 |
| `chatProfileController.js` | 271 |
| `chatStrategyController.js` | 139 |

## Out of Scope

- **`REVOKE` de GRANTs** (spec 008).
- **Mudança de schema** além do que a decisão P4 exigir.
- **Validação genérica de entrada** (spec 007) — aqui só o `athleteId` de `athlete-summary`.
- **Roles, relacionamentos, escopo de campo.**
- **Aplicar o mesmo rigor a models que já filtram corretamente** (`TacticalAnalysis`, `Athlete`, `Opponent`, `ProfileVersion`, `StrategyVersion`) — não tocar no que funciona.
- **Corrigir as falhas silenciosas** (spec 007).
- **Paginação** nas listagens.

## Requirements

| # | Requisito |
|---|---|
| R1 | Os 6 testes de vazamento da spec 004 **passam** |
| R2 | Os 5 testes de baseline (B1–B5) **continuam passando**, em especial B4 (admin escreve sobre dado do grupo) |
| R3 | `FightAnalysis.update/delete` **lançam** quando chamados sem escopo |
| R4 | `ChatSession.addMessage/addMessages/updateContextSnapshot` **lançam** sem escopo |
| R5 | `analysis_versions` só devolve versões de análises no escopo do ator |
| R6 | Admin recupera acesso ao grupo nos 3 caminhos de chat de perfil |
| R7 | Recurso fora do escopo devolve **404** |
| R8 | O contrato novo de `athlete-summary` está coordenado com o frontend |
| R9 | `chatController.js` dividido, sem mudança de comportamento |

## Technical Considerations

**Por que lançar e não devolver `null`:** `null` é indistinguível de "não encontrado" e seria engolido pelo mesmo padrão de `catch` que já esconde três funcionalidades neste repositório. Um erro tipado (`AuthorizationError` ou similar) aparece no log e falha o teste.

**⚠️ `athlete-summary` quebra o contrato da API.** Hoje o frontend envia `athleteData` inteiro. Duas estratégias:

| Estratégia | Prós | Contras |
|---|---|---|
| **Camada de compatibilidade** — aceitar os dois formatos por um período | frontend e backend independentes | dois caminhos temporários; o inseguro continua vivo |
| **Mudança coordenada** — backend e frontend no mesmo deploy | um caminho só | exige sincronia |

**Recomendação: camada de compatibilidade**, mas com o caminho antigo **rejeitando corpo com `analyses`** (que é o vetor de custo/injeção), aceitando apenas os campos inócuos. Fecha o risco imediatamente sem quebrar a tela.

**Risco de quebrar o admin — o mais provável desta spec.** O padrão atual usa duas informações diferentes: o **escopo** (quem o ator alcança) para *ler*, e o **owner real do registro** para *escrever*:

```js
const recurso = await Model.getByIdAndUser(id, escopo);   // escopo → leitura
await Model.update(id, dados, recurso.userId);            // owner real → escrita
```

Se a implementação passar o escopo onde deveria passar o owner, o admin **perde** a capacidade de editar dado de membro do grupo. B4 é o teste que pega isso.

**Ordem interna sugerida** (PRs independentes):

1. `refactor` — split de `chatController` (sem mudança de comportamento)
2. `refactor` — models passam a exigir escopo (com os call sites existentes ajustados)
3. `fix(security)` — um PR por endpoint (5 PRs)
4. `refactor(api)` — compatibilidade de `athlete-summary`
5. `fix` — escopo escalar nos 3 caminhos de perfil
6. `docs` — mover os AZ de *Known Issues* para *Current*

O split vem primeiro porque mover 818 linhas **junto** de mudança de lógica torna a revisão impraticável.

**`FightAnalysis.getById` sem escopo:** avaliar remoção. Se algum caminho legítimo precisar (ex.: uso interno após posse já verificada), manter com nome explícito (`getByIdUnscoped`) e comentário — nome que denuncia o risco a quem for chamá-lo.

## Acceptance Criteria

- [x] Os 6 testes de vazamento da spec 004 **passam** (cada `test.failing` invertido no mesmo commit da sua correção)
- [x] B1–B5 continuam passando; **B4 verificado explicitamente** em cada etapa
- [x] Teste de unidade: cada model afetado **lança** sem escopo — `models.test.js`, 63 casos, incluindo `[undefined]`
- [x] `analysis_versions` autorizada pela análise pai; teste comprova (inclusive o caminho `tactical`)
- [x] Admin edita dado de membro do grupo em atleta, adversário, análise e estratégia — e os 2 testes novos de perfil foram **verificados falhando** com o bug reintroduzido
- [x] `athlete-summary` não aceita `analyses` arbitrário — corpo antigo devolve 400, e um teste prova que `athleteData` enviado junto **não alcança o prompt**
- [x] `chatController.js` dividido, cada arquivo < 350 linhas (4 arquivos em vez de 3 — ver escopo item 5)
- [x] Suítes de backend verdes: **23 suítes / 274 testes**
- [ ] ⚠️ **E2E dos fluxos críticos: NÃO executado.** O Playwright continua sem rodar (exige backend + banco + usuário semeado — pendência herdada da spec 003, sem spec própria ainda). Declarado, não silenciado
- [x] Nenhum método de model de domínio aceita ID sem escopo — `getById` sem filtro foi **removido**, e nenhum *unscoped* foi criado

## Testing Strategy

| Nível | O que |
|---|---|
| **API (spec 004)** | os 6 vazamentos fechados; baseline preservado |
| **Unidade (novo)** | model lança sem escopo — um teste por método alterado |
| **Regressão (crítico)** | **B4** — admin escreve sobre dado do grupo. É o comportamento que esta spec mais pode quebrar |
| **Integração** | `analysis_versions` filtra pela análise pai |
| **E2E** | login → criar atleta → analisar (IA mockada) → gerar estratégia → refinar no chat |
| **Contrato** | `athlete-summary` com os dois formatos durante a compatibilidade |

## Documentation Impact

| Documento | Mudança |
|---|---|
| `docs/AUTHORIZATION.md` | **substancial** — mover AZ-1..AZ-7 de *Known Issues* para *Current Implementation*; atualizar a tabela de proteção por camada |
| `docs/DATABASE.md` | §7 — tabela de ownership por model |
| `docs/modules/chat-and-versions.md` | remover os 4 vazamentos; refletir o split |
| `docs/modules/fight-analysis.md` | remover AZ-6 |
| `docs/modules/athletes-opponents.md` | remover AZ-10 (escopo escalar) |
| `docs/ARCHITECTURE.md` | §3 — o model deixa de confiar no controller |
| `CLAUDE.md` | *Authorization* — remover "armadilha ativa"; atualizar o padrão obrigatório |
| `docs/PROJECT_STATUS.md` | *Known Issues* CRITICAL e HIGH |
| `docs/decisions/009` | registrar que o pré-requisito foi cumprido |
| `CHANGELOG.md` | **segurança** — descrever o que era possível e deixou de ser |

## Risks

| Risco | Severidade | Mitigação |
|---|---|---|
| **Admin perde acesso ao dado do grupo** | **Alta** | B4 é critério de aceitação; distinguir escopo (leitura) de owner real (escrita) |
| Mudança de contrato de `athlete-summary` quebra o frontend | **Alta** | Camada de compatibilidade; coordenar |
| Split de `chatController` introduz erro de movimentação | Média | PR separado, sem mudança de lógica; suíte verde antes e depois |
| Model lançando quebra caminho interno legítimo | Média | Auditar todos os call sites antes; nomear explicitamente os *unscoped* |
| Decisão P4 pendente bloqueia o item 3 | Média | Recomendação (`JOIN`) já registrada; decidir no portão |
| Correção incompleta — um 7º caminho não mapeado | Média | Exigência na assinatura torna o caminho não mapeado **falhar**, não vazar |
| `catch` existente engole o novo erro lançado | **Média** | Auditar os `catch` nos caminhos afetados — sobreposição com a spec 007 |

## Dependencies

**Depende de:**
- [spec 004](../004-authorization-safety-net/spec.md) — os testes vermelhos são a prova da correção; B1–B5 são a prova de não-regressão
- [spec 005](../005-authorization-policy-seam/spec.md) — consome o escopo do módulo de política
- ~~**Decisão P4**~~ — ✅ decidida nesta spec (ver escopo item 3)

**Bloqueia:** [spec 008](../008-database-access-lockdown/spec.md) — fechar o banco antes de a aplicação estar correta cria uma janela em que nada protege.
