# ADR-010 — Adotar TypeScript incrementalmente

## Status

**Accepted — etapa 1 implementada** (decidido em 2026-08-12; etapa 1 executada na [spec 011](../../specs/011-schema-integrity/spec.md), 2026-08-24).

✅ **Etapa 1:** `server/tsconfig.json` (`allowJs`, `strict: false`, sem `checkJs` global) + `// @ts-check` em todos os 10 models e nos 11 utilitários de topo de `server/src/utils/` (21 arquivos, zero erro). `npm run typecheck` em `server/` roda `tsc --noEmit`. Nenhum arquivo virou `.ts` — a etapa é JSDoc-como-contrato, não migração.

⚠️ **Etapas 2 e 3 (arquivo novo nasce `.ts`; migração módulo a módulo) continuam não implementadas.** O código da aplicação segue 100% `.js`/`.jsx` — 0 arquivos `.ts`/`.tsx` em `frontend/src` e `server/src`.

## Context

A aplicação é escrita inteiramente em JavaScript: 79 arquivos `.js/.jsx` no frontend, 69 `.js` no backend. TypeScript existe apenas em `playwright/` (22 arquivos de teste E2E).

Situação enganosa no `frontend/package.json`: `typescript`, `@types/react`, `@types/node` e `@types/react-dom` estão declarados em `devDependencies` — sinalizando uma intenção que nunca foi executada.

A auditoria encontrou **três falhas silenciosas** que compartilham a mesma natureza: **não são erros de lógica, são incompatibilidades de contrato**.

| Falha | Natureza |
|---|---|
| Histórico de versões de perfil **nunca funcionou** | `versionManager.saveProfileVersion` passa `{person_id, summary, created_by}` (snake_case) para uma função que desestrutura `{personId, content, userId}` (camelCase) → todos os campos ficam `undefined` |
| `technical_profile` do atleta **nunca é atualizado** | `Athlete.updateTechnicalProfile(id, dados)` chamada com **2 de 3 argumentos** |
| Versões salvas **perdem as estatísticas técnicas** | `versionManager` lê `currentData.technical_stats` num objeto que tem `technicalStats` |

As três seriam **erro de compilação** com tipagem. E as três sobreviveram porque cada uma falha dentro de um `catch` que só escreve no console.

Fator agravante estrutural: a fronteira `snake_case` (banco) × `camelCase` (aplicação) é traduzida em `utils/dbParsers.js` **apenas para 3 dos 10 models** — os outros expõem `snake_case` cru, cada um com sua convenção. É exatamente o tipo de fronteira que tipagem torna explícita.

## Decision

**Adotar TypeScript, incrementalmente, e não na mesma rodada das correções de autorização.**

Ordem decidida:

1. ✅ **Passo imediato, custo quase zero — FEITO.** `tsconfig.json` com `allowJs`/`strict: false` (sem `checkJs` global — é isso que torna `// @ts-check` opt-in de verdade: com `checkJs: true` a exceção seria o inverso, `@ts-nocheck`) e **`// @ts-check` em todo arquivo de `server/src/models/` e `server/src/utils/`** (topo do diretório; `__tests__/` excluído do `tsconfig.json` de propósito, para não exigir tipos de Jest). Zero erro nos 21 arquivos, sem migrar nada, sem renomear nada.
2. **Arquivo novo nasce `.ts`.**
3. **Migração módulo a módulo**, depois de o trabalho estrutural de autorização estar concluído.

Confirmado pelo proprietário em 2026-08-12 (*"adotar é o melhor caminho"*), com a ressalva de sequenciamento acordada na mesma conversa.

## Rationale

**Por que adotar:** as três falhas silenciosas mais graves do sistema são erros de contrato, não de lógica. Tipagem é o instrumento que pega essa classe exata — e nenhuma outra rede de proteção do projeto a pega hoje (não há lint no backend, não há teste de contrato, não há validador de schema de entrada).

**Por que não agora, junto com as correções de autorização:** uma migração de TypeScript toca todos os arquivos. Isso produziria um diff global no mesmo momento em que 6 endpoints de autorização estão sendo corrigidos — e o ruído da migração tornaria a revisão da correção de segurança impraticável. Um esconderia o outro. Risco de regressão silenciosa numa base que já tem 6 falhas de autorização conhecidas e zero teste de posse.

**Por que `checkJs` + `@ts-check` primeiro:** captura as três falhas **hoje**, sem migração e sem tocar em código de aplicação. `// @ts-check` é opt-in por arquivo, então não gera as centenas de erros que habilitar `checkJs` global produziria numa base não tipada. O JSDoc existente no projeto é de boa qualidade e já é consumível pelo compilador — o retorno é imediato.

**Limitação reconhecida da etapa 1:** JSDoc é verboso, nada obriga o código novo a ser tipado, e a cobertura degrada com o tempo. É por isso que é etapa 1 de três, não a solução.

## Consequences

### Positivas

- **Pega a classe de bug que mais custou a este projeto** — três funcionalidades que a UI oferece e que nunca funcionaram.
- **Torna explícita a fronteira `snake_case` × `camelCase`**, hoje a causa-raiz de uma família de bugs (incluindo o das estatísticas técnicas que nunca aparecem no histórico).
- **Etapa 1 tem custo quase zero e retorno imediato** — sem migração, sem risco, reversível.
- **Contratos de model documentados pelo compilador**, não por convenção de chamada.
- **Resolve a inconsistência das dependências** — `typescript` e os `@types/*` passam a ser usados de fato.

### Negativas

- **Migração completa é trabalho significativo** — 148 arquivos, com componentes de até 1116 linhas.
- **`checkJs` numa base não tipada produz muitos erros** se habilitado globalmente. Mitigado pelo opt-in por arquivo — mas isso significa que a cobertura inicial é parcial e depende de disciplina.
- **Estado misto por um período longo** — `.js` e `.ts` coexistindo, com o compilador aplicado a uma fração dos arquivos. Confuso enquanto durar.
- **Não substitui teste.** Tipagem não pega as falhas de autorização (passar o ID errado é type-correct), nem regras de negócio erradas. As três falhas capturadas são de contrato; as 6 de autorização exigem teste.
- **`playwright/` já é TS com seu próprio `tsconfig.json`** — atenção para não criar configurações conflitantes.

### Restrição de sequenciamento

**Não executar a migração em paralelo com o trabalho de autorização.** Esta é parte da decisão, não uma recomendação solta — ver *Rationale*.

## Evidence

- `frontend/package.json` — `typescript` e 3 `@types/*` em `devDependencies`, sem uso na aplicação
- Contagem verificada em 2026-08-12: 0 `.ts`/`.tsx` em `frontend/src` e `server/src`; 22 em `playwright/`
- `server/src/utils/versionManager.js` × `server/src/models/ProfileVersion.js` — o contrato incompatível
- `server/src/controllers/fightAnalysisController.js` × `server/src/models/Athlete.js` — a chamada com argumento faltando
- `server/src/utils/dbParsers.js` — a fronteira de nomes traduzida para apenas 3 dos 10 models
- `playwright/tsconfig.json` — a configuração TS existente
- Decisão: conversa com o proprietário, 2026-08-12 (registrada em [`../../AUDIT.md`](../../AUDIT.md), seção "Decisões — RESPONDIDAS", D6)
- [`../PROJECT_STATUS.md`](../PROJECT_STATUS.md#known-issues) — as três falhas silenciosas

**Etapa 1 (spec 011, 2026-08-24):** `tsc --noEmit` sobre os 21 arquivos encontrou **12 erros reais em 5 arquivos** na primeira passagem — todos divergência entre JSDoc e código, nenhum bug de lógica:
- `ApiUsage.js` e `TacticalAnalysis.js` (6×): `@param` documentava `userId`, a assinatura real (desde as specs 005–006) é `userIdOrIds`/escopo — doc não acompanhou o refactor de autorização
- `errorHandler.js`: `handleError` lê `error.statusCode`, propriedade que só existe em `AppError`, não em `Error` — o tipo documentado era mais estreito que o uso real
- `errors.js`: `VideoDownloadError` documentava `debugInfo.method`/`.url`/`.technicalError` como obrigatórios, mas o construtor já os tratava como opcionais (`|| 'desconhecido'` etc.) — a documentação era mais rígida que o código
- `versionManager.js` (3×): três funções `async` documentadas com `@returns {number}`/`{Object|null}` em vez de `Promise<...>` — o erro que `checkJs` existe para pegar

Nenhuma correção mudou comportamento — só o texto do JSDoc, para bater com o que o código já fazia.
