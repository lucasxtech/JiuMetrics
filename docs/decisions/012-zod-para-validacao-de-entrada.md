# ADR-012 — zod para validação de entrada

## Status

**Accepted — implementado parcialmente** (spec 007, 2026-08-18).

Aplicado aos **3 endpoints de IA**. Os demais endpoints que recebem corpo continuam sem schema — pendência declarada, não esquecida (ver *Consequences*).

## Context

Até a spec 007, **nenhum endpoint do JiuMetrics validava schema de entrada.** A validação era `if (!campo)` ad hoc dentro de cada controller, e duas falhas HIGH da auditoria são exatamente a mesma ausência:

| Falha | O que o corpo não validado permitia |
|---|---|
| **AZ-7** — `POST /api/ai/athlete-summary` | `athleteData` inteiro aceito do corpo e serializado direto no prompt: abuso de custo de IA e prompt injection direta |
| **R8 / gasto sem teto** — `POST /api/ai/analyze-link` | `videos[]` sem limite, iterado num laço onde **cada item é uma chamada de IA paga**. Um corpo com 500 URLs eram 500 chamadas |

Há também a classe "campo inesperado no body" (AZ-17): nada impedia um cliente de enviar campos que o controller não espera. O único ponto do sistema com validação de shape era `utils/strategyFieldSchema.js` — escrito à mão, específico para uma seção de estratégia, e não reaproveitável como validador de requisição.

A decisão foi registrada como pendente **P3** no [plano de refatoração](../../JIU_METRICS_REFACTORING_PLAN.md) §14, com três opções: zod, joi ou validação manual.

## Decision

**Adotar `zod` como validador de entrada, aplicado por middleware na borda.**

Duas propriedades do desenho importam mais que a escolha da biblioteca:

1. **`req.body` é substituído pelo dado validado.** O zod remove campos não declarados (`strip`, padrão para objetos), então nada que o schema não conheça alcança o controller. É o que fecha AZ-17 de forma estrutural, não por vigilância.
2. **A resposta de erro devolve campo e mensagem, nunca interno.** `{ campo, mensagem }` por problema — sem stack, sem detalhe de banco. Coerente com a decisão de parar de vazar `error.message` (spec 007, R9).

Arquivos: `server/src/middleware/validate.js` (o middleware) e `server/src/schemas/requests/ai.js` (os schemas).

⚠️ **Convenção de nomes a preservar:** `schemas/*.js` são `responseSchema` do Gemini — contrato de **saída** da IA. `schemas/requests/*.js` são contrato de **entrada** HTTP. São coisas diferentes no mesmo diretório, e confundi-las produziria bug difícil de ver.

## Rationale

**Por que um validador, e não validação manual.** Manual foi descartada pelo mesmo argumento que o plano registra em §12: *"mais código, menos garantia, tende a divergir"*. E há evidência local disso — a duplicação de `processPersonAnalyses` entre frontend e backend já divergiu, e `Opponent.js`, descrito na documentação como cópia de `Athlete.js`, também. Este repositório tem histórico concreto de lógica escrita à mão em dois lugares divergindo; um validador caseiro seria o terceiro caso.

**Por que zod e não joi.** Duas razões concretas:

- **Converge com o [ADR-010](./010-adotar-typescript-incrementalmente.md)** (adotar TypeScript incrementalmente, `Accepted`). Um schema zod gera o tipo via `z.infer` sem nenhum retrabalho, então a validação que se escreve hoje em JavaScript vira tipagem de graça quando o TS chegar. Com joi seria preciso escrever o tipo à mão, em paralelo ao schema — a mesma classe de duplicação que a decisão evita.
- **Zero dependências transitivas.** `npm ls zod` mostra uma única entrada. Num projeto que já tem 6 lockfiles para 3 pacotes e uma stack agressivamente na ponta, não ampliar a árvore importa.

**Por que dependência de produção e não de desenvolvimento.** A validação roda em cada request. Diferente do `supertest` (spec 004), que é infraestrutura de teste.

**Por que só os 3 endpoints de IA.** São os únicos onde um corpo não validado custa **dinheiro**. Estender a todos os endpoints exige mapear o payload real de cada tela antes — a própria spec 007 nomeia esse risco (*"um schema estrito demais quebra a tela"*), e um campo que o controller usa mas o schema não declara vira `undefined` **em silêncio**, que é exatamente a classe de falha que a spec existe para eliminar. Cobrir 3 endpoints com o payload verificado é melhor que cobrir 15 no escuro.

**Por que schemas permissivos nos campos opcionais.** O payload real do frontend foi mapeado antes de escrever cada schema (`components/video/VideoAnalysis.jsx`, `services/videoAnalysisService.js`, `services/aiService.js`). Os campos opcionais aceitam `null` e ausência, e os limites de tamanho são folgados. O único limite apertado é deliberado: **5 vídeos por análise**, folgado em relação ao que a UI produz hoje (1 vídeo — o botão de adicionar não está ligado, dívida da spec 010) e restritivo o suficiente para que o laço de IA tenha teto.

## Consequences

### Positivas

- **O teto de `videos[]` existe e é verificado antes de qualquer chamada de IA** — um pedido inválido não queima mais tokens pagos. Coberto por teste que afirma que a IA **não foi chamada**, não apenas o status 400.
- **O formato antigo de `athlete-summary` deixou de ser possível estruturalmente**: `athleteData` é campo não declarado, então é removido antes do controller — não depende de o controller lembrar de ignorá-lo.
- **Mensagens de erro por campo**, em pt-BR, sem vazar interno.
- **Caminho aberto para tipagem** sem reescrever a validação (ADR-010).

### Negativas

- **Nova dependência de produção.** É a segunda dependência que a refatoração adiciona (a primeira foi `supertest`, devDep).
- **Cobertura parcial e assimétrica.** 3 de ~15 endpoints que recebem corpo têm schema. Enquanto durar, "tem validação" não é uma afirmação verdadeira sobre a API como um todo — só sobre os endpoints de IA. Isso está declarado na spec 007 e em `docs/ARCHITECTURE.md`, e não deve ser lido como "resolvido".
- **Um schema incompleto é uma nova forma de falha silenciosa.** Se um campo usado pelo controller não for declarado, ele chega `undefined` sem erro. Mitigação atual: mapear o payload real antes de cada schema, e o comentário de advertência em `middleware/validate.js`. Não há proteção automática contra isso.
- **Mensagens padrão do zod são em inglês.** Onde a regra importa, a mensagem foi escrita em pt-BR explicitamente; erros de tipo genéricos ainda podem aparecer em inglês.
- **Não substitui autorização.** Um corpo válido continua podendo apontar para recurso alheio — quem barra isso é o escopo de posse ([ADR-011](./011-seam-de-politica-de-autorizacao.md) e spec 006), não o schema.

## Evidence

- `server/src/middleware/validate.js` — o middleware, com a advertência sobre campo não declarado
- `server/src/schemas/requests/ai.js` — os 3 schemas e `MAX_VIDEOS_POR_ANALISE`
- `server/src/routes/ai.js` — os 3 endpoints com `validateBody(...)`
- `server/src/__tests__/validation.test.js` — 8 casos, incluindo "rejeita acima do teto **sem chamar a IA**" e "campo desconhecido não chega ao controller"
- [JIU_METRICS_REFACTORING_PLAN.md §12 e §14 (P3)](../../JIU_METRICS_REFACTORING_PLAN.md) — a recomendação original
- [specs/007-silent-failures-and-input-validation/spec.md](../../specs/007-silent-failures-and-input-validation/spec.md) — item 4, R7, R8
- `npm ls zod` — zod@4.4.3, sem dependências transitivas
