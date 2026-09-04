# SPEC-013 — Consolidação de atletas e adversários

**Status: Implemented (2026-09-04)** · Fora do plano de refatoração original; nasce do mapeamento do módulo feito em 2026-09-04.

> Esta spec foi escrita **junto** com a implementação, não antes — o proprietário pediu que o mapeamento virasse correção na mesma PR. Fica registrada porque a mudança toca API, validação, models e a responsabilidade do módulo, e o processo exige spec para isso.

## Context

O módulo de atletas e adversários ([`docs/modules/athletes-opponents.md`](../../docs/modules/athletes-opponents.md)) era um CRUD copiado e colado duas vezes em cada camada: 2 rotas, 2 controllers (138 linhas cada, diff só de rótulos), 2 models (196/191 linhas, diff só de nomes), 2 pages de lista (127/124 linhas), 2 services de 42 linhas — e uma página de detalhe de 697 linhas compartilhada via `isOpponent`, com 15 `useState` e `useEffect` cru.

O mapeamento encontrou oito defeitos que nenhum documento do repositório registrava:

| # | Defeito | Onde |
|---|---|---|
| 1 | `POST` devolvia a linha crua do banco (`snake_case`); `GET`/`PUT`/`DELETE` devolviam `camelCase`. Funcionava porque os chamadores só liam `.id` | `Athlete.create` / `Opponent.create` |
| 2 | Lista e Overview mostravam um registro apagado (ou a faixa antiga) por até 5 minutos: a página de detalhe não invalidava `['athletes']` e o `staleTime` é de 5 min | `AthleteDetail.jsx` |
| 3 | Corrida que sobrescrevia o resumo: trocar a faixa enviava `{...athlete, belt}` inteiro, incluindo o `technicalSummary` em memória. Se a regeneração em background tivesse terminado nesse intervalo, o `PUT` gravava o resumo velho por cima do novo | `AthleteDetail.jsx:65`, `AthleteForm.jsx` |
| 4 | Faixa desconhecida **desligava** as regras IBJJF: `getBeltLevel` devolve 5 (preta) e o aviso só é montado para nível < 5. A doc do módulo dizia o contrário ("cai em branca"). Via UI não acontecia; via API qualquer string passava | `geminiService.js:522`, sem validação de `belt` |
| 5 | Contrato `created_at` × `createdAt`: o detalhe lia `analyses[0].created_at`, a API entrega `createdAt` | `AthleteDetail.jsx:557` |
| 6 | Dois vocabulários para o mesmo default: controller `style: 'Guarda'`, cadastro rápido `'Guardeiro'` | `athleteController.js:67`, `VideoAnalysis.jsx:80` |
| 7 | `Number(cardio) \|\| 50` transformava 0 em 50; `age: 'abc'` virava `NaN` e estourava 500 no Postgres | `athleteController.js:64-70` |
| 8 | `analyses_count` contava `fight_analyses` por `person_id` sem filtrar `person_type` | `Athlete.getAll` |

E a causa concreta do "texto enorme" na tela de detalhe: o mesmo `technical_summary` era renderizado em **dois painéis** ("Perfil Técnico Completo" lia `aiSummary`, "Resumo técnico" lia `athlete.technicalSummary` — a mesma string) mais um modal; e o prompt de consolidação pedia 250–400 palavras em 8 seções obrigatórias.

## Goal

Uma implementação por camada, contrato de API consistente, validação na borda, nenhum default fabricado, cache invalidado em toda mutação, e um único painel de resumo — **sem tocar no banco**. A unificação de tabelas do [ADR-007](../../docs/decisions/007-unificar-athlete-e-opponent-numa-entidade-com-papel.md) continua sendo o último item da [spec 011](../011-schema-integrity/spec.md); esta spec é o passo que o ADR listou como alternativa e rejeitou **como solução final** — aceito aqui como passo intermediário, porque remove ~330 linhas duplicadas com risco zero de dado.

## Scope

### Backend

| Item | Arquivo |
|---|---|
| Factory de model (`getAll`, `getById`, `create`, `update`, `delete`, `updateTechnicalProfile`); `Athlete.js` e `Opponent.js` viram 10 linhas cada | `models/personModel.js` |
| Factory de controller; `athleteController.js` e `opponentController.js` viram 5 linhas cada | `controllers/personController.js` |
| Schemas zod para `POST` e `PUT`: `name` obrigatório, `belt` enum **obrigatória no POST**, numéricos coerçados com faixa e `null` quando omitidos, `technicalSummary`/`technicalProfile` **removidos** do corpo (fecha o defeito 3 por construção) | `schemas/requests/person.js`, `routes/{athletes,opponents}.js` |
| `create` devolve `camelCase`; `analyses_count` filtra por `person_type` | `models/personModel.js` |
| Prompt de consolidação: 150–220 palavras, no máximo 2 parágrafos. Golden recapturado pela **mesma substituição de texto** aplicada ao `.txt` — o teste byte a byte continua valendo | `prompts/consolidate-profile.txt`, `__fixtures__/consolidate-profile.golden.txt` |

### Frontend

| Item | Arquivo |
|---|---|
| Vocabulário único: faixas, cores, rótulos, rotas, query keys, `describePerson` | `constants/persons.js` |
| `personService(type)`; `athleteService`/`opponentService` viram fachadas nomeadas | `services/personService.js` |
| `usePersons`, `usePerson`, `usePersonMutations` — toda mutação invalida lista e registro | `hooks/usePersons.js` |
| `PersonList` (substitui as duas listas); hero copy reduzida a uma linha | `pages/PersonList.jsx` |
| `PersonDetail` + `PersonHeader`, `BeltSelect` (`<select>` nativo), `TechnicalSummaryPanel` (**um** painel, recolhido por padrão), `AnalysesSection`, `PersonDetailSkeleton` | `pages/PersonDetail.jsx`, `components/person/` |
| `PersonForm` único (substitui `AthleteForm` e o formulário embutido em `QuickAddModal`); envia só `{ name, belt }`; sem `setTimeout` de 1 s; erros da API (issues do zod) na tela, sem `alert()` | `components/forms/PersonForm.jsx` |
| `QuickAddModal` sobre o `Modal` comum; `VideoAnalysis` usa os hooks e não injeta mais `age/weight/style` | `components/common/QuickAddModal.jsx`, `components/video/VideoAnalysis.jsx` |
| `AthleteCard` perde as 4 props nunca renderizadas (F7) e o `eslint-disable` | `components/common/AthleteCard.jsx` |
| `Strategy` mostra só os atributos informados (sem "N/A" por campo) | `pages/Strategy.jsx` |

## Out of Scope

- **Unificação de tabelas** (ADR-007, spec 011 item 4).
- **`technical_profile`**: continua sendo gravado a cada análise e **ninguém lê** (o único consumidor era uma prop ignorada de `AthleteCard`). Parar de gravar remove uma funcionalidade que a spec 007 documentou como corrigida; é decisão do proprietário, registrada em `docs/GAPS.md`.
- **Fallback de faixa desconhecida em `getBeltLevel`**: o comportamento (nível 5) não mudou. A porta foi fechada na **entrada** (enum), e a doc do módulo foi corrigida para descrever o que o código faz. Registros antigos com faixa fora do enum continuam com o comportamento histórico.
- **Paginação e busca** nas listas.

## Requirements

| # | Requisito | Verificação |
|---|---|---|
| R1 | Uma implementação de model e uma de controller para as duas entidades | `git diff --stat` dos 4 arquivos |
| R2 | `POST` devolve `camelCase` | `persons.test.js` |
| R3 | Campo omitido é `null`; `cardio: 0` é preservado; `age: 'abc'` é 400 | `persons.test.js` |
| R4 | `belt` fora do enum ou omitida no `POST` é 400 | `persons.test.js` |
| R5 | `PUT` com `technicalSummary` não altera o resumo | `persons.test.js` |
| R6 | `analysesCount` filtra por `person_type` | `persons.test.js` |
| R7 | Toda mutação de pessoa invalida `['athletes'|'opponents']` e `['person', type, id]` | `usePersons.test.jsx` |
| R8 | `PersonForm` envia só `{ name, belt }` | `PersonForm.test.jsx` |
| R9 | Nenhum comportamento de autorização mudou | suíte `authorization/` continua verde |
| R10 | Golden do prompt recapturado deliberadamente | `consolidatePrompt.test.js` |

## Acceptance Criteria

- [x] `cd server && npm test` — 32 suítes / 406 testes (após merge com a `main` de 2026-09-03)
- [x] `cd server && npm run typecheck` e `npm run lint`
- [x] `cd frontend && npm test` — 8 suítes / 76 testes
- [x] `cd frontend && npm run lint` (0 erros; os 4 avisos são anteriores) e `npm run build`
- [x] Documentação atualizada no mesmo commit (módulo, API, ARCHITECTURE, DOMAIN, PROJECT_STATUS, GAPS, CHANGELOG, ADR-007, CLAUDE.md)

## Documentation Impact

Ver a lista acima. O ADR-007 recebe uma nota datada dizendo que a implementação compartilhada foi adotada como passo intermediário, **sem** alterar a decisão de unificar as tabelas.
