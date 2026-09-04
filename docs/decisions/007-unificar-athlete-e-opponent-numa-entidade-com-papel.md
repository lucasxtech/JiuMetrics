# ADR-007 — Unificar Athlete e Opponent numa entidade com papel

## Status

**Accepted — não implementado** (decidido em 2026-08-12).

⚠️ **O código atual mantém as duas entidades separadas.** Este ADR registra a decisão para que não seja re-litigada; não descreve o sistema como ele está. Ver [`../modules/athletes-opponents.md`](../modules/athletes-opponents.md) para o estado real.

## Context

`athletes` e `opponents` são, no código, **a mesma coisa duplicada**:

- colunas idênticas (migration `001` cria as duas com a mesma definição; toda alteração posterior foi aplicada às duas);
- `models/Opponent.js` é cópia de `models/Athlete.js`;
- o parser é literalmente compartilhado: `parseOpponentFromDB = parseAthleteFromDB`;
- `opponentController.js` é cópia de `athleteController.js`.

A distinção é puramente semântica: **Athlete** = o lutador que o usuário treina; **Opponent** = o lutador a enfrentar.

Motivo original da separação, informado pelo proprietário em 2026-08-12:

> *"usamos dessa forma para poder separar nos lugares quando formos montar uma estratégia por exemplo"*

Ou seja: a separação existe para distinguir os dois lados do confronto na tela de estratégia.

## Decision

**Unificar numa única entidade de lutador, com marcação de papel** — uma tag/flag que identifique quem é adversário.

Palavras do proprietário:

> *"podemos unificar sim, e colocar uma tag de adversário em quem for adversário"*

Escopo da decisão: unificar tabela, model, controller e rotas. A distinção atleta/adversário passa a ser um atributo do registro (ou da relação), não uma tabela separada.

**Execução:** deve ser a **última** etapa do trabalho estrutural. Depende de: (a) unificar o tipo de `user_id` (VARCHAR × UUID) e (b) recriar as foreign keys. Ver [`../../specs/011-schema-integrity/spec.md`](../../specs/011-schema-integrity/spec.md) — é o **último item** dessa spec.

## Rationale

**Custo da duplicação atual, verificado no código:**

- duas tabelas, dois models, dois controllers para manter em sincronia — toda correção precisa ser aplicada duas vezes (e o bug de `updateTechnicalProfile` existe nos dois arquivos);
- `fight_analyses` usa uma **FK polimórfica sem constraint** (`person_id` + `person_type`) só para acomodar as duas tabelas — nada garante que a pessoa exista;
- `tactical_analyses` referencia `athlete_id` e `opponent_id` **separadamente**, também sem FK;
- `profile_versions` repete o par `person_id` + `person_type`;
- **o mesmo lutador aparece duplicado** se for cadastrado nos dois papéis, com **histórico de análises fragmentado** entre as duas cópias — perda real de informação para o produto.

**Por que "papel", e não duas tabelas:** o atleta/adversário é um atributo **da relação** (nesta estratégia, X é o meu atleta e Y é o adversário), não da pessoa. Um lutador pode ser adversário numa estratégia e atleta em outra. Modelar como tabela força a duplicação da pessoa; modelar como papel não.

**Por que a tag resolve o requisito original:** a distinção na tela de estratégia continua possível — vem do papel na relação (`athlete_id` / `opponent_id` em `tactical_analyses`, ou uma marcação no próprio registro), não de estar em tabelas diferentes.

## Consequences

### Positivas

- **Elimina a duplicação de CRUD, escopo e parsing** — um model, um controller, um conjunto de testes.
- **Permite FK real** de `fight_analyses` para a tabela unificada, encerrando a FK polimórfica sem constraint e habilitando `ON DELETE` explícito.
- **Um lutador, um histórico.** Deixa de existir a fragmentação de análises entre duas cópias da mesma pessoa.
- **Reduz a superfície de bug** — hoje toda correção tem que ser feita em dois arquivos, e é fácil esquecer um.

### Negativas / riscos

- **É a migração de maior risco do projeto.** Toca as tabelas mais referenciadas, e **quase nenhuma referência tem FK** para orientar a migração:
  - `fight_analyses.person_id` + `person_type` (polimórfico, sem FK)
  - `tactical_analyses.athlete_id` e `opponent_id` (sem FK)
  - `profile_versions.person_id` + `person_type` (sem FK)
- **Dependência dura:** exige unificar `user_id` em UUID e recriar FKs **antes**, o que por sua vez exige limpar registros órfãos (`user_id IS NULL` ou `''`). **NEEDS_CONFIRMATION:** quantos órfãos existem.
- **Deduplicação de dados existentes.** Se o mesmo lutador está cadastrado como atleta *e* adversário, unificar exige decidir se são a mesma pessoa — o que não é determinável automaticamente (nome igual não é prova). Provável necessidade de intervenção manual.
- **Impacto no frontend:** rotas `/athletes` e `/opponents`, `athleteService`/`opponentService`, `AthleteDetail.jsx` (que já é reaproveitado via `isOpponent`) e a tela de estratégia precisam acompanhar.
- **A API muda** — `/api/athletes` e `/api/opponents` são endpoints públicos do backend consumidos pelo frontend. Requer migração coordenada ou período de compatibilidade.

### Alternativa considerada e não escolhida

Manter as duas tabelas e apenas extrair a lógica comum para um model base compartilhado. Reduziria a duplicação de código sem migração de dados e sem risco. **Rejeitada como solução final** porque não resolve os problemas de modelagem que mais custam: a FK polimórfica sem constraint e a fragmentação do histórico do mesmo lutador.

> **Nota (2026-09-04, [spec 012](../../specs/012-athletes-opponents-consolidation/spec.md)):** essa alternativa foi adotada como **passo intermediário**. `models/personModel.js` e `controllers/personController.js` são a única implementação; `Athlete.js`/`Opponent.js` são wrappers. Isso **não** altera a decisão acima: as duas tabelas continuam existindo, e a unificação de dado segue como último item da spec 011. O que muda é que, quando ela vier, o trabalho é só de banco, rotas e frontend — o código de acesso já é um.

## Evidence

- `server/migrations/001-schema.sql` — as duas tabelas criadas com definição idêntica
- `server/src/models/{Athlete,Opponent}.js` — implementações duplicadas
- `server/src/utils/dbParsers.js` — `parseOpponentFromDB = parseAthleteFromDB`
- `server/src/controllers/{athleteController,opponentController}.js` — duplicados
- `server/migrations/008-corrigir-constraint.sql` — remoção das FKs, origem do problema de tipo
- `server/migrations/{007,013}` — `athlete_id`/`opponent_id` e `person_id`/`person_type` sem FK
- Decisão e motivo original: conversa com o proprietário, 2026-08-12 (registrada em [`../../AUDIT.md`](../../AUDIT.md), seção "Decisões — RESPONDIDAS", D8)
- [`../DATABASE.md`](../DATABASE.md#5-constraints-e-integridade) · [`../modules/athletes-opponents.md`](../modules/athletes-opponents.md)
