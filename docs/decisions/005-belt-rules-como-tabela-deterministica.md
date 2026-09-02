# ADR-005 — Regras IBJJF como tabela determinística em código

## Status

**Accepted** — implementado (commits `2dea52b`, `83319f9`, `69a78a0`).

⚠️ A **estrutura** está decidida e implementada. A **validação do conteúdo** contra o regulamento oficial IBJJF é `PLANNED` — ver *Consequences*.

## Context

O JiuMetrics sugere técnicas para uma luta. Técnicas de perna (toe hold, kneebar, heel hook, calf slicer) e wrist lock são **liberadas por faixa** no regulamento IBJJF, e sugerir uma técnica ilegal para a faixa do competidor tem consequência real em competição: desclassificação.

As regras estavam **triplicadas** em três lugares independentes do código, e divergiam entre si. Os comentários registram os erros concretos:

> *"foi exatamente essa duplicação que causou divergências: toe hold sendo listado como permitido para roxa, quando na verdade só é liberado a partir de marrom; wrist lock sendo proibido para azul, quando é permitido desde essa faixa"*

E, sobre a resolução de aliases pt/en:

> *"antes desta unificação, StrategyRulesAgent.js e getBeltLevel tinham cada um seu próprio mapa de alias independente, arriscando divergir silenciosamente de BELT_RULES"*

## Decision

Manter as regras como **uma única tabela determinística em código**, `config/ai.js#BELT_RULES`, com:

- `allowed`, `forbidden` e `extraRules` por faixa canônica em português;
- **aliases pt/en** (`white → branca`, `blue → azul`, …) resolvidos por `resolveBeltKey`, fonte única de resolução;
- `BELT_LEVELS` (1 = branca … 5 = preta) e `getBeltLevel` para determinar a faixa mais restritiva entre dois competidores;
- `formatBeltRules` como **única** função de formatação, consumida tanto pelo contexto de análise de vídeo quanto pelo prompt de estratégia;
- **fallback para o conjunto mais restritivo (branca)** quando a faixa é vazia ou desconhecida.

Decisão reafirmada em 2026-08-12, ao definir a origem do conteúdo: extrair do regulamento oficial IBJJF, mas **manter a tabela determinística em código — não transformar em base de conhecimento / RAG**.

## Rationale

**Sobre unificar** — a motivação está documentada no código: três fontes divergiram e produziram sugestão de técnica ilegal. Fonte única elimina a classe do problema.

**Sobre o fallback seguro** — comentado explicitamente:

> *"Faixa não informada ou desconhecida: nunca deixar o consumidor sem NENHUMA orientação — aplicar o conjunto mais restritivo (branca) como fallback seguro, já que assumir uma faixa mais permissiva arriscaria sugerir/validar técnica ilegal."*

**Sobre não usar RAG** — decisão de 2026-08-12, com este raciocínio: `BELT_RULES` **não é apenas texto de prompt**. `getBeltLevel` alimenta lógica de decisão em `generateTacticalStrategy` (comparar dois competidores e escolher o regime mais restritivo). Transformar isso em consulta semântica tornaria a legalidade de uma técnica por faixa **probabilística** — inaceitável para uma regra cujo erro tem consequência em competição. Uma tabela em código é verificável por teste; uma recuperação vetorial não é.

## Consequences

### Positivas

- **Uma fonte de verdade**, com aliases resolvidos num lugar só.
- **A faixa mais restritiva entre os dois competidores governa a estratégia** — se atleta é marrom e adversário é azul, valem as restrições de azul. Regra correta para o contexto real de competição.
- **Fallback conservador**: faixa desconhecida nunca resulta em sugestão mais permissiva.
- **Testável** — coberto por `server/src/services/__tests__/beltRules.test.js`, incluindo o caso de faixa vazia.
- **Comentários preservam o raciocínio e os erros concretos que motivaram a mudança**, o que impede a regressão de ser reintroduzida por engano.

### Negativas

- **⚠️ A correção esportiva do conteúdo é `NEEDS_CONFIRMATION`.** A estrutura está certa e a tabela é aplicada corretamente, mas **os valores nunca foram validados contra o regulamento IBJJF vigente**. Isso não é verificável por código, e não deve ser alterado por quem não tem o regulamento em mãos. Requer revisão humana.
- **Manutenção manual** — quando a IBJJF muda o regulamento, alguém precisa perceber e editar a tabela. Não há mecanismo de expiração ou alerta. Mitigação decidida: citar a fonte e a data de revisão no próprio arquivo (`PLANNED`).
- **Escopo limitado.** A tabela cobre **adulto, gi**. Não modela: no-gi (mencionado apenas em `extraRules` de marrom/preta), categorias infantis/juvenis, master, nem regras de outras federações (ADCC, IBJJF Kids). Se o produto atender competição juvenil, a tabela está incompleta — e o fallback conservador não cobre esse caso, porque a faixa *é* conhecida.
- **Domínio misturado com infraestrutura.** `config/ai.js` guarda, no mesmo arquivo: regras esportivas IBJJF, nomes de modelos de IA, temperaturas, limites de download de vídeo, rate limits e labels de gráfico. As regras de negócio deveriam ter módulo próprio.
- **A garantia é de prompt, não de código.** As regras são injetadas no prompt e o modelo é *instruído* a respeitá-las. **Não existe validação pós-resposta** que rejeite uma estratégia contendo técnica ilegal para a faixa. Se o modelo ignorar a instrução, nada barra.

## Evidence

- `server/src/config/ai.js` — `BELT_RULES`, `BELT_LEVELS`, `resolveBeltKey`, `resolveBeltRules`, `getBeltLevel`, com os comentários que registram as divergências históricas
- `server/src/services/geminiService.js` — `formatBeltRules`, `getBeltRulesText`, `formatBeltRulesForStrategy` (todas derivadas da mesma fonte) e a lógica da faixa mais restritiva em `generateTacticalStrategy`
- `server/src/services/__tests__/beltRules.test.js` — cobertura, incl. faixa vazia
- Commits `2dea52b` (*"corrigir regras IBJJF por faixa e unificar em fonte única"*), `83319f9` (*"unificar resolução de alias de faixa"*), `69a78a0` (*"fallback seguro de belt rules"*)
- [`../../SPEC-ANALISE-IA.md`](../../SPEC-ANALISE-IA.md) — itens C1/C2, que documentaram o problema original
- Decisão sobre RAG: conversa com o proprietário, 2026-08-12 (registrada em [`../../AUDIT.md`](../../AUDIT.md), seção "Decisões — RESPONDIDAS", D7)
