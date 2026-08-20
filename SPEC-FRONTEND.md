# SPEC — Refatoração do Frontend (JiuMetrics)

> Auditoria estática completa de `frontend/src` (9 páginas, ~40 componentes, 13 services, 3 contexts, utils), validada cruzando com o backend real e com a `SPEC-ANALISE-IA.md`. Os 5 achados mais críticos foram verificados manualmente no código (5/5 confirmados).
>
> Data: 2026-07-25. Prioridades: **P0** = dado enganoso, perda de trabalho do usuário ou crash; **P1** = fricção real; **P2** = polish/manutenção.

---

## Sumário executivo

1. **O fluxo de estratégia perde trabalho do usuário.** Edições feitas no modal da página Strategy nunca são persistidas (o backend já salva a estratégia e devolve `analysisId`, mas o modal ignora), o "histórico de versões" dali é um estado local que morre ao fechar, e existem **três semânticas diferentes de merge** para a mesma edição dependendo de onde o usuário clica (F14, F19–F22).
2. **Dados enganosos em várias telas**: estatísticas técnicas que nunca renderizam por mismatch de chave (`technical_stats` vs `technicalStats`), pontos/probabilidades da estratégia exibidos como métrica quando são invenção do modelo, peso/estilo fabricados pelo QuickAdd, contagens erradas no Overview (F1, F4–F10).
3. **Promessas falsas**: Vimeo/Drive na copy e na validação quando só YouTube funciona; barra de progresso 100% teatral com etapas fictícias (F11–F13).
4. **Robustez**: a página Analyses **crasha** no estado de erro (renderiza objeto `Error` como JSX), 10× `alert()` nativo, erros engolidos sem feedback, `setTimeout` mágico como sincronização (F15–F18).
5. **Arquitetura**: 3 padrões de fetch coexistindo, invalidations ausentes, 8 módulos órfãos, 4 sistemas de estilo simultâneos (F26–F39).

**Decisão estrutural:** os itens F19–F23 formam um cluster — *unificar o pipeline de estratégia (render + edição + persistência + versões) em um caminho só* — e devem ser executados **antes** da adaptação ao event log da Fase 2 do backend, para não portar a duplicação para o novo formato.

---

## Fases propostas

| Fase | Escopo | Depende de |
|---|---|---|
| **FE-0** | P0s de dados/persistência/crash (F1, F2, F4, F5, F6, F11, F12, F15, F39) | nada |
| **FE-1** | Unificação do pipeline de estratégia (F14, F19, F20, F21, F22, F23) | FE-0 |
| **FE-2** | Confiabilidade e consistência (F16, F17, F18, F24–F33) | FE-0 |
| **FE-3** | Adaptação ao event log + progresso real (mapa da seção 9) | Backend Fase 2 |
| **FE-4** | Polish visual/a11y (F34–F43) | qualquer momento |

---

## 1. Dados enganosos/quebrados (P0/P1)

### ~~F1 (P0)~~ ✅ **RESOLVIDO na [spec 010](./specs/010-frontend-consolidation/spec.md)** — Estatísticas técnicas do histórico nunca renderizavam (mismatch de chave)
Análises persistidas passam por `parseAnalysisFromDB` e chegam como **`technicalStats`** (camelCase), mas os componentes de histórico leem **`analysis.technical_stats`**: [VideoAnalysisCard.jsx:21-28](frontend/src/components/video/VideoAnalysisCard.jsx#L21), [AnalysisDetailModal.jsx:146,444-546](frontend/src/components/analysis/AnalysisDetailModal.jsx#L146). Só a resposta imediata do POST `/ai/analyze-link` (snake_case) renderiza — os pills "X raspagens" e o grid "Estatísticas Técnicas" jamais apareceram para dados do banco. **Correção:** normalizador único `normalizeAnalysis()` na borda (`fightAnalysisService.js`) + teste de contrato com fixture do shape real.

### ~~F2 (P0)~~ ✅ **RESOLVIDO na spec 010** — "+ Nova análise" navegava para rota inexistente
[AthleteDetail.jsx:242](frontend/src/pages/AthleteDetail.jsx#L242) navega para `/video-analysis`, mas a rota é `/analyze-video` ([App.jsx:64](frontend/src/App.jsx#L64)). O catch-all `*`→Overview mascara: usuário clica e cai no dashboard sem erro. **Correção:** corrigir o path e trocar o catch-all por página 404 real.

### F4 (P0) — Pontos/probabilidade da estratégia exibidos como fato
`+X pts` e `probabilidade` são invenção do modelo (a estratégia nunca recebeu números — SPEC B1/B2), mas a UI renderiza como badge quantitativo: [StrategySummaryModal.jsx:900-906](frontend/src/components/analysis/StrategySummaryModal.jsx#L900), AiStrategyBox, PDF em [Analyses.jsx:433](frontend/src/pages/Analyses.jsx#L433). **Correção:** rotular como "estimativa da IA" agora; religar como métrica real na FE-3 (event log).

### F5 (P0) — Charts com `%` hardcoded, fallback `_warning` nunca exibido, `||` engole zero
[PieChartSection.jsx:43,84](frontend/src/components/charts/PieChartSection.jsx#L43) (`%` incondicional), `:9-12` (`item.score || item.value` — 0 vira undefined). Nenhum componente lê `_warning`. **Correção:** `??` em vez de `||`; banner quando `_warning` presente; unidade explícita na FE-3.

### F6 (P0) — QuickAdd fabrica idade 25 / 75kg / "Guardeiro"
[VideoAnalysis.jsx:79-84](frontend/src/components/video/VideoAnalysis.jsx#L79) injeta defaults inventados, exibidos como fato em [Strategy.jsx:100,150](frontend/src/pages/Strategy.jsx#L100) e potencialmente enviados à IA. **Correção:** enviar só `name`/`belt` (tornar campos nullable no backend se preciso); exibir "não informado".

### F3/F7–F10 (P1)
- **F3**: badges "N frames" são artefato do caminho morto de frames (VideoAnalysisCard:24, AnalysisDetailModal:291, Overview:227) — remover; na FE-3 vira "N eventos".
- **F7**: `AthleteForm` só tem nome+faixa, mas Strategy exibe peso/cardio/estilo (sempre "N/A") — adicionar campos ou remover as menções.
- **F8**: card "Análises" do Overview conta `/fight-analysis` mas linka para `/analyses` (análises táticas) — fontes diferentes.
- **F9**: "Todas as análises (N)" com `limit: 20` fixo e sem paginação ([Analyses.jsx:28-33](frontend/src/pages/Analyses.jsx#L28)); o `total` do backend é descartado em `analysisService.js:23`.
- **F10**: `utils/athleteStats.js` (espelho do util quebrado do server, B12) está **órfão** — deletar junto com os 3 charts órfãos antes que alguém "religue".

---

## 2. Promessas falsas (P0/P1)

### ~~F11 (P0)~~ ✅ **RESOLVIDO na spec 010** — Vimeo/Drive eram prometidos e só YouTube funcionava; a validação passou a aceitar apenas hosts exatos do YouTube
Copy em [VideoAnalysis.jsx:159,265](frontend/src/components/video/VideoAnalysis.jsx#L159); `isValidVideoUrl` ([videoAnalysisService.js:40-49](frontend/src/services/videoAnalysisService.js#L40)) aceita vimeo, drive e **qualquer URL contendo "video"** (e `includes('youtube.com')` deixa `youtube.com.evil.io` passar). **Correção:** validação por host exato YouTube + ajustar toda a copy.

### F12 (P0) — Progresso 100% teatral
[AnalysisProgressContext.jsx:23-39](frontend/src/contexts/AnalysisProgressContext.jsx#L23): `setInterval` +2%/s até 90, etapas trocadas por `setTimeout(500)` fixos; os cards "Download ✓ / Upload ✓" ([VideoAnalysis.jsx:553-575](frontend/src/components/video/VideoAnalysis.jsx#L553)) ligam em limiares do percentual fake. **Correção curta:** spinner indeterminado + texto honesto. **Definitiva (FE-3):** job real `202 {jobId}` + polling.

### F13/F14 (P1/P0)
- **F13**: "cerca de 1 minuto" e "2-5 minutos" visíveis simultaneamente na mesma tela.
- **F14 (P0)**: "Versões são salvas automaticamente" no modal da Strategy ([StrategySummaryModal.jsx:1104-1108](frontend/src/components/analysis/StrategySummaryModal.jsx#L1104)) — as versões vivem em `useState` e morrem ao fechar. Resolver junto com F20.

---

## 3. Estados de erro/vazio/loading (P0/P1)

### ~~F15 (P0)~~ ✅ **RESOLVIDO na spec 010** — o estado de erro da página Analyses crashava a página
[Analyses.jsx:610](frontend/src/pages/Analyses.jsx#L610) renderiza `{error}` (objeto `Error`) como filho JSX → "Objects are not valid as a React child" → tela branca exatamente quando a API falha. **Correção:** `{error.message}` + ErrorBoundary de rota no App.

### F16–F18 (P1)
- **F16**: 10× `alert()`/1× `confirm()` nativos (Analyses:69,188,230,538; AthleteDetail:154; Strategy:48; AiStrategyBox:144; ProfileSummaryModal:181; StrategyVersionHistoryPanel:343,367; ProfileVersionHistoryPanel:291). O AdminUsers já tem toast artesanal — extrair para `common/Toast` + contexto.
- **F17**: erros engolidos com efeito real: troca de faixa silenciosamente falha (AthleteDetail:71), edição via chat "salva" mas não salvou (Analyses:884), Overview mostra zeros como dados quando tudo falhou (Promise.allSettled ignorando rejeições, Overview:103), Settings mostra "Nenhum uso registrado" em caso de erro (Settings:57).
- **F18**: `setTimeout` mágico como sincronização: refetch 1s/3s após salvar/deletar análise (AthleteDetail:121,229), delay artificial de 1s no form (AthleteForm:98). Backend deve sinalizar conclusão (ou job da Fase 2).

---

## 4. Pipeline de estratégia — o cluster FE-1 (P0)

### F19 — Três semânticas de merge para a MESMA edição
1. [Analyses.jsx:94-192](frontend/src/pages/Analyses.jsx#L94) `handleAcceptEdit`: persiste via PATCH; `tese_da_vitoria` sincroniza `resumo_rapido.como_vencer`; seções-objeto substituídas inteiras.
2. [StrategySummaryModal.jsx:118-166](frontend/src/components/analysis/StrategySummaryModal.jsx#L118) `handleAcceptEdit`: **não persiste**; `analise_de_matchup` substituído seco.
3. [StrategyContext.jsx:30-52](frontend/src/contexts/StrategyContext.jsx#L30) `updateStrategy`: spread-merge; não sincroniza `como_vencer`; **descarta** `analysisId`/`athlete`/`opponent` do retorno do backend.

**Correção:** um único `applyStrategySuggestion(strategyData, suggestion)` em `utils/strategyUtils.js`, testado por campo, usado pelos três chamadores.

### F20 — Refinamentos da página Strategy nunca persistem
O backend salva `TacticalAnalysis` + versão inicial e devolve `analysisId` (strategyController:53-66,120), mas o fluxo do modal ignora o id — nada de PATCH. Usuário refina 20 min, fecha, perde tudo; abre `/analyses` e vê a versão original. **Correção:** propagar `analysisId` para o modal e usar o mesmo caminho de persistência da página Analyses (resolve F14 junto).

### F21 — Edição de cronologia grava numa chave e exibe outra
Salvar escreve `cronologia_inteligente.inicio/meio/final` ([StrategySummaryModal.jsx:230-235](frontend/src/components/analysis/StrategySummaryModal.jsx#L230)); a renderização prefere `primeiro_minuto/minutos_2_a_4/minutos_finais` (:783+). Edição aceita fica invisível.

### F22 — Edição manual do plano tático corrompe o strategy_data persistido
`AiStrategyBox` emite `plano_em_pe/plano_passagem/plano_guarda` com valor **string achatada** (`formatObjectToText`); [strategyUtils.js:103-111](frontend/src/utils/strategyUtils.js#L103) grava `plano_tatico_faseado.em_pe/.passagem/.guarda` — chaves que **não existem** no schema (`em_pe_standup`, `jogo_de_passagem_top`, `jogo_de_guarda_bottom`). O PATCH persiste objeto corrompido com versão e a seção editada não muda na tela. **Correção:** mapear para as chaves reais e editar sub-campos estruturados.

### F23 — ~1.700 linhas duplicadas entre os dois caminhos de exibição
`StrategySummaryModal` (1116L) reimplementa o que `AiStrategyBox` (1016L) faz; `Analyses.jsx:725-908` reimplementa o shell do modal; `InlineDiff` existe em 4 variações; `formatMarkdown` copiado em 4 arquivos. **Correção:** um único `<StrategyModal>` composto por `AiStrategyBox` + painéis, parametrizado por `{persisted, analysisId}`.

---

## 5. Arquitetura/estado (P1/P2)

- **F24 (P1)**: dois services exportam `getAllAnalyses`/`deleteAnalysis` com mesmos nomes para recursos diferentes (analysisService=táticas, fightAnalysisService=vídeo) — já causou F8. Renomear.
- **F25 (P1)**: `<a href="/strategy">` e `window.location.href='/login'` quebram SPA e o basename do GitHub Pages (Analyses:566,629; api.js:54). Usar `<Link>`/evento `auth:logout`.
- **F26 (P1)**: 3 padrões de fetch coexistindo — React Query (Athletes/Opponents/Strategy/Analyses) vs useState/useEffect manual (Overview/AthleteDetail/VideoAnalysis/Settings/AdminUsers). Migrar tudo para `useQuery` com keys canônicas.
- **F27 (P1)**: zero invalidation após criar análise (`['athletes']`, `['fight-analyses', personId]` ficam 5 min velhos; AthleteDetail usa hack de timeout).
- **F28 (P2)**: `cacheTime` (API v4) ignorado no React Query v5 instalado — renomear para `gcTime` ([queryClient.js:7](frontend/src/lib/queryClient.js#L7)).
- **F29 (P2)**: init de auth duplicada (utils/initAuth.js + authService auto-init) com resultado de validação ignorado.
- **F30 (P1)**: logout do Settings chama `authService.logout()` direto — não limpa contexto nem cache do React Query ([Settings.jsx:72-75](frontend/src/pages/Settings.jsx#L72)).
- **F31 (P2)**: AnalysisProgressContext/StrategyContext são mutations disfarçadas de estado global — somem na FE-3.

## 6. Código morto (P1/P2)

- **F32 (P1)**: 8 módulos órfãos: `utils/athleteStats.js` (+teste), `StatsBarChart/StatsLineChart/StatsRadarChart`, `common/Button.jsx`, `Card.jsx`, `InlineDiff.jsx`, `LoadingSpinner.jsx`. Deletar (ou adotar — são exatamente os compartilhados que resolveriam F16/F23/F37).
- **F33 (P2)**: exports de services nunca usados (aiService.generateAthleteSummary, fightAnalysisService.createAnalysis, chatService.get/delete session, authService.getToken); **Settings duplica a lista de modelos hardcoded** em vez de importar de `aiConfig` — e as listas já divergem (este item vira P1 na Fase 1 do backend, que muda os modelos).
- **F34 (P2)**: vestígio `file: null` do caminho de upload morto (VideoAnalysis:105).

## 7. Visual/a11y (P1/P2)

- **F35 (P2)**: 4 sistemas de estilo simultâneos (Tailwind + 3 CSS Modules de 349-855L + inline styles + element-selectors globais em index.css:83-100 que brigam com as classes).
- **F36 (P2)**: sintaxe `!important` do Tailwind v3 (`!py-8`) usada com Tailwind v4 instalado — metade dos paddings não aplica (Analyses:644, Athletes:77, Opponents:76 vs sintaxe v4 correta em Analyses:580).
- **F37 (P2)**: mesmo spinner SVG copiado 10+ vezes; lucide-react já instalado.
- **F38 (P2)**: cores de faixa definidas 3× com paletas diferentes; `formatCost` duplicado.
- **F39 (P1)**: `html { font-size: 85% }` global encolhe todos os rem (text-xs → ~10px reais) e sobrescreve preferência do usuário; `a:hover { translateY(-1px) }` global faz qualquer link "pular" ([index.css:33,73](frontend/src/index.css#L33)).
- **F40 (P1)**: modais sem `role="dialog"`/focus trap/ESC (4 implementações ad-hoc).
- **F41 (P1)**: CustomSelect sem navegação por teclado; dropdown de faixa do AthleteDetail é segunda implementação ad-hoc.
- **F42 (P1)**: grid fixo `1fr 1fr` no PieChartSection quebra em 375px; painéis laterais `w-96` empurram modal para fora da viewport <1200px.
- **F43 (P2)**: contraste `text-white/50` sobre `#0c1524` ~3.4:1 (abaixo de AA).

---

## 8. FE-3 — Mapa de adaptação ao event log (Fase 2 do backend)

| Área | Arquivos | Mudança |
|---|---|---|
| Progresso real | AnalysisProgressContext (substituir), VideoAnalysis:503-591 | `POST → 202 {jobId}` + `useQuery(['job', id], {refetchInterval})`; etapas ligadas a `job.stage` real |
| Resultado da análise | VideoAnalysis:333-501 | Timeline de eventos com timestamps clicáveis (`youtube.com/watch?v=…&t=MMSS` — `extractYoutubeId` órfão volta a ter uso) |
| Histórico | VideoAnalysisCard, AnalysisDetailModal | Pills de contagens do event log; aba "Eventos"; charts derivados (contagens absolutas, não % forçado) |
| Perfil | AthleteDetail | Agregados reais com peso por recência; deletar athleteStats.js ANTES |
| Estratégia | AiStrategyBox, StrategySummaryModal, PDF | pts/probabilidade religados como métrica real "baseado em N eventos"; consolidar F23 ANTES |
| Chat | StrategyChatPanel, AiChatPanel, ProfileChatPanel | Exibir erro de validação da API (hoje vira console.error) |

---

## Top 10 por impacto

1. **F20+F14** — edições da página Strategy nunca persistem; "histórico" mente.
2. **F15** — estado de erro crasha a página Analyses.
3. **F2** — "+ Nova análise" cai silenciosamente no dashboard.
4. **F1** — stats técnicos do histórico nunca renderizaram (chave errada).
5. **F22** — edição manual corrompe `strategy_data` persistido.
6. **F19** — três merges diferentes para a mesma edição.
7. **F12+F13** — progresso fake + promessas de tempo contraditórias.
8. **F11** — Vimeo/Drive prometidos sem suporte.
9. **F4+F5+F6** — números decorativos exibidos como dado.
10. **F21** — edição de cronologia aceita e invisível.
