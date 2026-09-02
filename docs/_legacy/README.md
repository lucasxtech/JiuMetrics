# ⚠️ Documentação histórica — NÃO usar como referência

Os arquivos desta pasta descrevem **estados passados** do JiuMetrics. Foram movidos para cá em 2026-08-12, durante a criação da documentação permanente do projeto (ver [AUDIT.md](../../AUDIT.md) §13, item TD-22).

**Nenhum arquivo aqui é fonte de verdade.** Vários descrevem sistemas que **não existem mais no código**. Se você é um agente de IA ou um desenvolvedor novo no projeto: leia [`CLAUDE.md`](../../CLAUDE.md) e a pasta [`docs/`](../) — não esta.

Eles foram preservados (não apagados) porque registram o raciocínio histórico que originou algumas decisões, o que é útil ao escrever ADRs. Podem ser removidos quando essa extração terminar.

## Por que cada arquivo saiu de circulação

| Arquivo | Motivo |
|---|---|
| `MULTI_AGENTS.md` | Descreve o sistema multi-agentes de análise/estratégia, **removido do código** na Fase 1 (commit `c193c8a`). 587 linhas sobre um sistema inexistente. Substituído por [`docs/AI.md`](../AI.md) |
| `QUICKSTART_MULTI_AGENTS.md` | Guia de setup do mesmo sistema removido, incluindo variáveis (`USE_MULTI_AGENTS`, `OPENAI_API_KEY`) que nenhum código lê |
| `IMPLEMENTATION_SUMMARY.md` | Titulado "Sistema Multi-Agentes — Implementação Concluída". Descreve `server/src/services/agents/`, diretório que **não existe mais** |
| `architecture-file-tree.md` | Era `docs/architecture.md`. Não é um documento de arquitetura — é um dump de árvore de arquivos, de uma época em que o projeto se chamava "projeto analise atletas". Substituído por [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md) |
| `ESTRATEGIAS.md` | Descreve o pipeline de estratégia anterior à Fase 1, com referência ao multi-agente. Substituído por [`docs/modules/strategies.md`](../modules/strategies.md) |
| `API.md.old` | Versão anterior de `API.md`, mantida no repo por engano |
| `CODE_REVIEW.md` | Registro pontual de um code review de 2026; o arquivo começa com um typo (`essa # Code Review`) e lista melhorias já incorporadas. Sem valor de referência |

## Nota sobre `docs/API.md`

`docs/API.md` **não** foi movido — permanece em `docs/`. Verificação em 2026-08-12: as rotas que ele documenta ainda existem no código. Ele é, porém, **incompleto** (não cobre `/api/admin`, `/api/debug`, boa parte de `/api/fight-analysis` e `/api/chat`). Trate-o como referência parcial, e o código em `server/src/routes/` como fonte de verdade.
