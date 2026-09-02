# ADR-013 — Versionamento de prompt por hash, e o limite honesto da reprodutibilidade

## Status

**Accepted — implementado** (spec 009, 2026-08-18). Aplicado ao fluxo de estratégia; os demais fluxos ainda não registram versão de prompt.

## Context

`tactical_analyses.metadata` guardava o modelo e os tokens de cada estratégia gerada, mas **não a instrução**. Consequência prática: dada uma estratégia de três meses atrás, não havia como saber com que prompt ela foi produzida — e os prompts mudam.

Isso importa mais neste produto que na média, por dois motivos:

1. **A saída alimenta decisão de treino real.** Se um atleta seguiu um plano tático que hoje o sistema não geraria mais, entender *por quê* exige saber qual instrução gerou aquilo.
2. **`BELT_RULES` entra no prompt de estratégia.** Uma mudança nas regras IBJJF embutidas altera o que é sugerido como técnica legal — e [ADR-005](./005-belt-rules-como-tabela-deterministica.md) registra que isso tem consequência em competição.

## Decision

**Registrar, em `metadata.promptVersions`, um hash curto (sha256, 12 caracteres) do conteúdo de cada template usado.**

```js
// services/prompts/index.js
getPromptVersion('tactical-strategy')  // → 'a1b2c3d4e5f6'
```

O identificador é **derivado do conteúdo**, não declarado à mão. Consequência deliberada: não existe versão para alguém esquecer de incrementar — editar o `.txt` muda o hash automaticamente.

O campo é **aditivo**: linhas antigas de `tactical_analyses` ficam sem ele, e isso é correto. Preencher retroativamente exigiria inventar qual prompt foi usado.

## Rationale

**Por que hash e não versão semântica manual.** Versão manual depende de disciplina, e este repositório tem histórico documentado de contratos que divergiram porque ninguém atualizou os dois lados (`processPersonAnalyses`, `Opponent.js` × `Athlete.js`). Um identificador que ninguém precisa manter não pode ficar desatualizado.

**Por que 12 caracteres.** Suficiente para distinguir versões de um punhado de arquivos sem poluir o `metadata`. Não é criptografia — é etiqueta.

**Por que não construir gestão de prompts.** O requisito é saber *qual texto* gerou *qual saída*. Um registry de prompts com histórico, diff e rollback resolveria um problema que este produto não tem: os prompts mudam raramente e vivem no git, que já é o histórico.

**Por que só o fluxo de estratégia, por enquanto.** É o fluxo cuja saída é consultada meses depois (o histórico de `/analyses`). Uma análise de vídeo é revisitada como conteúdo, não como decisão auditável. Estender é barato quando houver motivo.

## O limite honesto — parte da decisão, não ressalva

**Isto entrega auditabilidade, não reprodutibilidade.**

Saber o prompt e o modelo permite responder *"com que instrução e com que modelo isso foi gerado?"*. **Não** permite regerar a mesma saída:

- LLM não é determinístico. Mesma instrução, mesmo modelo, mesma temperatura → saídas diferentes.
- O provedor deprecia e substitui modelos. `gemini-2.5-pro` de hoje pode não existir, ou não ser o mesmo peso, em um ano.
- A temperatura registrada é a pedida, não garantia do que o provedor aplicou.

Este limite está escrito aqui, e em `docs/AI.md`, deliberadamente: uma expectativa falsa de "replay" seria pior que a ausência do recurso, porque alguém decidiria com base nela.

## Consequences

### Positivas

- **Auditabilidade das estratégias novas** sem infraestrutura nova: um campo no JSONB que já existia.
- **Impossível ficar desatualizado** — o hash vem do conteúdo.
- **Combina com o teste byte a byte** do prompt movido (spec 009, R9): se o hash muda, o texto mudou; se o texto muda sem intenção, o teste do golden quebra primeiro.

### Negativas

- **Hash não é legível.** `a1b2c3d4e5f6` não diz o que mudou — só que mudou. Para saber o quê, é preciso o git. Aceito: o git é a fonte de verdade do texto.
- **Cobertura parcial.** Só o fluxo de estratégia registra. Análise de vídeo, chat e resumo de atleta não — declarado, não esquecido.
- **Não resolve a pergunta "por que esta estratégia é assim?"** de forma completa, porque o `technical_summary` que entrou no prompt também muda com o tempo e não é versionado. O hash cobre a instrução, não todo o input.
- **Um `.txt` editado invalida a comparação com o histórico** — duas estratégias com hashes diferentes não são comparáveis como "mesmo método". Isso é informação, não defeito.

## Evidence

- `server/src/services/prompts/index.js#getPromptVersion`
- `server/src/services/strategyService.js` — `metadata.promptVersions`
- `server/src/services/__tests__/consolidatePrompt.test.js` — o teste byte a byte que protege o conteúdo
- [specs/009-ai-cost-and-reliability/spec.md](../../specs/009-ai-cost-and-reliability/spec.md) — R8, e a nota de *Technical Considerations* sobre "reprodutibilidade tem limite honesto"
- [ADR-005](./005-belt-rules-como-tabela-deterministica.md) — por que o conteúdo do prompt de estratégia tem consequência fora do software
