# Architecture Decision Records

Registro das decisões arquiteturais do JiuMetrics. Cada ADR captura **o problema, a decisão, o porquê e as consequências** — para que uma decisão não seja desfeita por engano na próxima iteração.

## Índice

| ADR | Título | Status |
|---|---|---|
| [001](./001-jwt-proprio-em-vez-de-supabase-auth.md) | JWT próprio em vez de Supabase Auth | Accepted |
| [002](./002-rls-desligado-autorizacao-na-aplicacao.md) | RLS desligado; autorização na camada de aplicação | **Superseded** por ADR-009 |
| [003](./003-system-instruction-fixa-no-chat.md) | `systemInstruction` fixa no chat (mitigação de prompt injection) | Accepted |
| [004](./004-token-version-para-invalidacao-de-sessao.md) | `token_version` para invalidação imediata de sessão | Accepted |
| [005](./005-belt-rules-como-tabela-deterministica.md) | Regras IBJJF como tabela determinística em código | Accepted |
| [006](./006-camada-unica-de-llm-e-aposentadoria-do-multi-agente.md) | Camada única de LLM + `responseSchema`; multi-agente aposentado | Accepted |
| [007](./007-unificar-athlete-e-opponent-numa-entidade-com-papel.md) | Unificar Athlete e Opponent numa entidade com papel | **Accepted — não implementado** |
| [008](./008-vercel-como-unico-destino-de-deploy.md) | Vercel como único destino de deploy | **Accepted — não implementado** |
| [009](./009-acesso-ao-banco-exclusivamente-por-service-role.md) | Acesso ao banco exclusivamente por `service_role` | **Accepted — não implementado** |
| [010](./010-adotar-typescript-incrementalmente.md) | Adotar TypeScript incrementalmente | **Accepted — não implementado** |

## Convenções

**Status possíveis:** `Proposed` · `Accepted` · `Accepted — não implementado` · `Deprecated` · `Superseded by ADR-NNN`

O status **`Accepted — não implementado`** é usado deliberadamente: registra que a decisão foi tomada e não deve ser re-litigada, deixando explícito que **o código ainda não reflete isso**. Nunca leia um ADR desses como descrição do sistema atual.

**Sobre a motivação histórica:** quando o repositório e o histórico do git não permitem determinar por que uma decisão foi tomada, o ADR diz isso literalmente, em vez de inventar uma justificativa plausível. Um "porquê" inventado é pior que um "porquê" ausente, porque parece confiável.

**Ao alterar o sistema:** se uma mudança invalida um ADR, atualize-o ou crie um que o substitua (`Superseded by`). Não deixe um ADR aceito descrevendo algo que deixou de ser verdade — ver as regras de integridade documental em [`../../CLAUDE.md`](../../CLAUDE.md).
