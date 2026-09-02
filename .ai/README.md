# .ai/ — área de trabalho temporária

**Esta pasta é ignorada pelo Git.** Nada aqui é permanente ou confiável.

## Para quê

Rascunhos · prompts temporários · análises intermediárias · contexto de trabalho em andamento · artefatos descartáveis · saídas de exploração.

## Onde as coisas moram

| Pasta | Conteúdo | Versionado? |
|---|---|---|
| `docs/` | **conhecimento permanente** do projeto | ✅ |
| `specs/` | **histórico versionado** de mudanças planejadas | ✅ |
| `CLAUDE.md` | **regras permanentes** para agentes | ✅ |
| `AUDIT.md` | auditoria forense com evidência | ✅ |
| **`.ai/`** | **material temporário e descartável** | ❌ |

## Regras

1. **Nunca ponha conhecimento permanente aqui.** Se uma descoberta importa daqui a seis meses, ela pertence a `docs/`.
2. **Nunca ponha decisão aqui.** Decisão vira ADR em `docs/decisions/`; mudança planejada vira spec em `specs/`.
3. **Assuma que qualquer coisa aqui pode desaparecer** — não referencie arquivos desta pasta em documentação versionada.
4. **Não commite o conteúdo desta pasta.** Só este `README.md` é rastreado, como marcador.

---

Ver as regras de integridade documental em [`../CLAUDE.md`](../CLAUDE.md#documentation-integrity).
