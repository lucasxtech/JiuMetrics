# SPEC-010 — Consolidação do frontend

**Status: Proposed** · Etapa 8 do [plano de refatoração](../../JIU_METRICS_REFACTORING_PLAN.md)

## Context

O frontend do JiuMetrics é uma SPA React 19 + Vite, 11 páginas e 40 componentes, sem TypeScript. Existe uma auditoria anterior dedicada a ele — [`SPEC-FRONTEND.md`](../../SPEC-FRONTEND.md) — e **nenhum item dela foi implementado** (verificado em 2026-08-12: os achados F1, F2, F11, F15 e F16 continuam abertos).

Esta spec não substitui aquela. Recorta dela **o que é segurança, o que corrompe dado exibido e o que duplica regra de negócio** — deixando polish, redesign e a refatoração dos componentes gigantes para depois.

Quatro problemas concretos:

1. **Sink de XSS.** `pages/Analyses.jsx` monta o relatório PDF como template string de HTML, interpolando conteúdo de estratégia gerado por IA, e faz `tempDiv.innerHTML = content` + `appendChild(document.body)`. `innerHTML` não executa `<script>`, mas **executa handlers** (`<img onerror>`). Com o JWT em `localStorage`, é roubo de sessão válida por 7–30 dias. E o conteúdo vem de LLM sobre **vídeo de terceiros** — não é totalmente controlado pelo usuário.
2. **Nenhuma normalização na fronteira.** Os 12 services são wrappers finos de axios, **sem uma única transformação** (verificado). Resultado: a resposta imediata de `analyze-link` traz `technical_stats` (snake), o banco devolve `technicalStats` (camel), e os componentes de histórico leem `technical_stats` — **as estatísticas técnicas nunca aparecem no histórico**.
3. **Dois padrões de fetch.** React Query em 4 páginas, `useEffect` cru em 5. Mutação num padrão não invalida o cache do outro: criar um atleta não atualiza o `Overview`.
4. **Regra de negócio duplicada e já divergente.** `processPersonAnalyses` existe em `frontend/src/utils/athleteStats.js` (238 linhas) e `server/src/utils/athleteStatsUtils.js` (121 linhas), com o comentário *"Versão backend - espelhando a lógica do frontend"* — e **já divergiram**: o retorno quando `person` é falsy difere.

## Problem

O sink de XSS é a única falha de segurança **do frontend** com caminho plausível de exploração, e o token em `localStorage` amplifica a consequência.

A ausência de normalização faz o produto **esconder dado que possui**: o usuário analisou o vídeo, os números foram extraídos e salvos, e a tela de histórico não os mostra.

E duas fontes de verdade para o mesmo número significam que o valor exibido depende de por qual caminho a tela chegou.

## Goal

Remover o sink de XSS, fazer o dado salvo aparecer, e eliminar a duplicação de regra — sem redesign e sem tocar nos componentes de 1000+ linhas.

## Scope

### 1. Segurança

| Item | Detalhe |
|---|---|
| **Remover o `innerHTML`** | construir o DOM do PDF com `createElement`/`textContent`. **Conteúdo do relatório preservado** (B16 do plano) |
| **CSP** | adicionar Content-Security-Policy |
| **`helmet`** no backend | headers de segurança (hoje inexistentes) |

### 2. Normalização na fronteira

Introduzir transformação nos services — hoje eles não fazem nenhuma, o que dá a esta mudança uma casa natural e um escopo pequeno. Um normalizador por recurso, garantindo shape único independente da origem (resposta imediata de IA × leitura do banco).

### 3. Um padrão de fetch

Migrar as 5 páginas com `useEffect` cru para React Query (`Overview`, `Settings`, `AdminUsers`, `AthleteDetail`, `ModernLogin` — avaliar se login precisa). Adicionar invalidações entre telas.

### 4. Eliminar duplicação

Remover `frontend/src/utils/athleteStats.js`; backend como fonte única. ⚠️ **Decisão P7:** as duas versões divergiram e é preciso decidir **qual está correta** antes de apagar uma.

### 5. Correções de robustez pontuais

| Item | Origem |
|---|---|
| `pages/Analyses.jsx` renderiza `{error}` (objeto `Error`) como filho JSX → **tela branca** exatamente quando a API falha | F15 |
| `AthleteDetail.jsx` navega para `/video-analysis`, rota que **não existe** (a rota é `/analyze-video`); o catch-all mascara | F2 |
| `isValidVideoUrl` aceita Vimeo, Drive e **qualquer URL contendo "video"** | F11 |
| Remover os 6 componentes órfãos | — |
| `html2pdf.js` com import dinâmico | — |

## Out of Scope

- **Redesign visual.**
- **Refatorar os componentes de 1000+ linhas** (`StrategySummaryModal` 1116, `AiStrategyBox` 1016, `Analyses` 922).
- **Unificar os 4 sistemas de estilo** (Tailwind, CSS Modules, CSS global, inline).
- **Substituir os 11 `alert()`/`confirm()` nativos** por toast.
- **Progresso real de análise** — depende do job assíncrono (etapa 9).
- **Mover a geração de PDF para fora do componente** — desejável, mas aqui só o **sink** é removido; mover é refatoração maior.
- **Remover os defaults fabricados do QuickAdd** — decisão de produto **P6**.
- **Rotular `+X pts`/`probabilidade` como estimativa** — decisão de produto; F4 da SPEC-FRONTEND.
- **Adoção de TypeScript** — etapa 9.
- **Demais itens da [`SPEC-FRONTEND.md`](../../SPEC-FRONTEND.md).**

## Requirements

| # | Requisito |
|---|---|
| R1 | O PDF é gerado sem `innerHTML`; conteúdo e layout preservados |
| R2 | CSP ativo; `helmet` no backend |
| R3 | Estatísticas técnicas aparecem **no histórico** de análises |
| R4 | Um único padrão de fetch; invalidação funciona entre telas |
| R5 | `processPersonAnalyses` existe em **um** lugar |
| R6 | Erro na tela `Analyses` não derruba a página |
| R7 | Nenhum link para rota inexistente |
| R8 | Validação de URL de vídeo aceita **apenas** hosts exatos do YouTube |
| R9 | 6 componentes órfãos removidos; `html2pdf.js` fora do bundle inicial |

## Technical Considerations

**⚠️ Normalizar vai mudar o que as telas renderizam** — e isso é o **objetivo** (hoje não renderizam), mas exige verificação visual de cada tela afetada. É o oposto do risco usual: aqui o "antes" está errado.

**⚠️ Decisão P7 é bloqueante e não é técnica.** As duas implementações de `processPersonAnalyses` divergem no comportamento quando `person` é falsy, e possivelmente em mais pontos. Apagar a errada exige saber qual reflete a intenção — **precisa do proprietário**. Se a versão do frontend estiver certa e a do backend errada, mover para o backend **muda números exibidos**.

**Migrar `useEffect` → React Query muda o momento do fetch** e pode expor race conditions latentes (hoje mascaradas por `setTimeout` mágico em alguns fluxos). Migrar **uma página por PR**.

**O PDF é a parte mais delicada.** O template atual tem centenas de linhas de HTML com estilos inline e condicionais aninhados. Reconstruir com `createElement` é verboso e fácil de errar. Duas alternativas a considerar antes de escolher:

| Abordagem | Prós | Contras |
|---|---|---|
| `createElement`/`textContent` | remove o sink; sem dependência | verboso; propenso a divergir do layout |
| Sanitizar o HTML antes do `innerHTML` | mudança mínima | nova dependência; mantém o padrão perigoso |
| Renderizar via componente React e capturar | reusa o que já existe | mudança maior |

**Recomendação:** `createElement`, com verificação visual comparando o PDF antes/depois. É a única que remove o padrão em vez de mitigá-lo — e `CLAUDE.md` já proíbe construir HTML por string com conteúdo de LLM.

**Ordem sugerida** (PRs independentes):

1. `fix(security)` — sink de XSS + CSP + helmet (**maior valor, independente de tudo**)
2. `fix` — erro que derruba a tela, rota inexistente, validação de URL
3. `refactor` — normalização por service (um PR por recurso)
4. `refactor` — React Query, uma página por PR
5. `refactor` — remover a duplicação (**depois de P7**)
6. `chore` — órfãos, import dinâmico

## Acceptance Criteria

- [ ] PDF gerado sem `innerHTML`; comparação visual antes/depois sem diferença
- [ ] `<img src=x onerror=alert(1)>` num campo de estratégia **não executa** ao exportar
- [ ] CSP presente; `helmet` ativo
- [ ] Estatísticas técnicas visíveis no histórico (verificação manual + teste)
- [ ] Criar atleta atualiza o `Overview` sem recarregar
- [ ] `grep processPersonAnalyses` retorna um único arquivo
- [ ] Erro simulado na API de `Analyses` mostra mensagem, não tela branca
- [ ] Nenhum `navigate()` para rota inexistente
- [ ] URL `youtube.com.evil.net` **rejeitada**
- [ ] Órfãos removidos; bundle inicial sem `html2pdf.js`
- [ ] Suíte de frontend verde; E2E verde

## Testing Strategy

| Nível | O que |
|---|---|
| **Unidade (novo)** | normalizador: mesmo shape a partir de payload snake e camel, com fixture **real** dos dois |
| **Unidade (novo)** | `isValidVideoUrl` rejeita `youtube.com.evil.net`, aceita hosts exatos |
| **Componente** | `Analyses` em estado de erro renderiza mensagem, não crasha |
| **E2E (Playwright)** | histórico exibe estatísticas técnicas; criar atleta reflete no Overview; exportar PDF não executa script |
| **Manual (obrigatório)** | comparação visual do PDF antes/depois — é o item com maior risco de regressão silenciosa |
| **Regressão** | 5 suítes de frontend verdes |

## Documentation Impact

| Documento | Mudança |
|---|---|
| `docs/ARCHITECTURE.md` | §2 — um padrão de fetch; normalização na borda; órfãos removidos; §8 — fronteira de nomes resolvida no cliente |
| `docs/modules/strategies.md` | XSS resolvido |
| `docs/modules/fight-analysis.md` | estatísticas aparecem no histórico |
| `docs/modules/athletes-opponents.md` | duplicação eliminada |
| `docs/AUTHORIZATION.md` | AZ-15/AZ-16 (headers, XSS) resolvidos |
| `docs/PROJECT_STATUS.md` | *Known Issues* HIGH 8 e 15 |
| `SPEC-FRONTEND.md` | marcar F1, F2, F10, F11, F15 como implementados |
| `CLAUDE.md` | *Security* regra 4 — atualizar |
| `CHANGELOG.md` | segurança (XSS, CSP) e correção (estatísticas no histórico) |

## Risks

| Risco | Severidade | Mitigação |
|---|---|---|
| **Reconstruir o PDF altera o layout** | **Alta** | Comparação visual obrigatória; PR isolado |
| **P7 não decidida → apagar a versão errada muda números** | **Alta** | Bloqueio duro; decisão do proprietário antes do item 4 |
| Normalização muda o que as telas mostram | Média | É o objetivo; verificação visual de cada tela |
| React Query expõe race condition latente | Média | Uma página por PR; E2E cobrindo cada uma |
| CSP quebra recurso legítimo (inline style, Tailwind) | **Média** | Começar em `report-only`, observar, depois aplicar |
| Remover órfão que alguém pretendia usar | Baixa | Verificado: nenhum import. Git preserva |
| Import dinâmico de `html2pdf.js` quebra o export | Baixa | E2E cobrindo exportação |

## Dependencies

**Depende de:**
- [spec 007](../007-silent-failures-and-input-validation/spec.md) — a normalização precisa saber qual é o shape correto
- **Decisão P7** — qual versão de `processPersonAnalyses` está correta (bloqueio duro para o item 4)

**Independente das specs de backend a partir da 007** — os itens 1, 2 e 5 podem começar assim que a 007 definir o shape.

**Bloqueada parcialmente por:** o progresso real de análise depende do job assíncrono (etapa 9), e está fora do escopo aqui.
