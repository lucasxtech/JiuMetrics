# SPEC-012 — Ingestão de vídeo sem cookies do YouTube

**Status: Proposed (2026-09-03)** · Não faz parte do [plano de refatoração](../../JIU_METRICS_REFACTORING_PLAN.md) original — nasceu de um incidente em produção.

## Context

Um usuário tentou analisar uma luta e recebeu na tela:

> "O YouTube bloqueou o download mesmo com cookies configurados — os cookies podem ter expirado. Atualize a variável `YOUTUBE_COOKIES` no servidor."

A mensagem está errada, e o caminho que leva até ela é o problema.

`analyzeFrame` ([`geminiService.js:209-227`](../../server/src/services/geminiService.js)) tem duas tentativas:

1. **URL do YouTube direto para o Gemini** (`fileData.fileUri`). Sem download, sem cookie, sem dependência de sistema. É o caminho principal e o correto.
2. **Fallback**: baixar o vídeo com `ytdl-core`, subir via File API. É aqui que o YouTube bloqueia por detecção de bot e onde `YOUTUBE_COOKIES` entra.

O erro da tentativa 1 é engolido por um `console.warn` na [linha 217](../../server/src/services/geminiService.js) e **o fallback dispara para qualquer falha**. Na investigação de 2026-09-02, a tentativa 1 estava falhando com:

```
403 PERMISSION_DENIED
"Lightning dunning decision is deny for project: projects/118045395678"
```

— suspensão da API do Gemini por faturamento. Baixar o vídeo jamais resolveria isso. Mas o usuário só via a mensagem do fallback, e a ação sugerida (renovar cookies) não tinha relação alguma com a causa. Reproduzido também numa chamada de **texto puro, sem vídeo**, o que confirma que a causa não era o YouTube.

Isto é o padrão de falha dominante deste repositório na sua forma mais cara: não é um `catch` que só loga, é um `catch` que **substitui a causa real por outra causa plausível e acionável — e errada**.

## Problem

**Dois defeitos independentes, um dentro do outro:**

1. **O diagnóstico é destruído.** Qualquer erro da tentativa 1 — billing, quota, chave inválida, indisponibilidade do provedor — vira "atualize os cookies". Quem opera o sistema é mandado para o lugar errado. Foi o que aconteceu.

2. **A dependência de cookies não deveria existir.** `YOUTUBE_COOKIES` exige que alguém exporte cookies de uma conta pessoal do YouTube e cole numa variável de ambiente do servidor. Eles **expiram**, exigem renovação manual sem aviso prévio, e são usados a partir de IP de datacenter (Vercel) — uso que arrisca sinalização da conta que os originou. O próprio [`docs/AI.md`](../../docs/AI.md) já classifica `yt-dlp` e `@distube/ytdl-core` como "as dependências mais frágeis do projeto", e registra que **`yt-dlp` sequer existe em produção** (Vercel), então o caminho real ali é sempre `ytdl-core`.

O fallback existe para cobrir vídeo que o Gemini recusa. Segundo a documentação do Gemini (consultada em 2026-09-02), a ingestão por URL cobre **vídeo público**, com limite de 8h/dia no free tier e sem limite de duração no tier pago. Vídeo privado e com restrição de idade não são cobertos — mas **o download com cookie também não os resolve de forma confiável**, e é justamente neles que ele mais quebra.

`NEEDS_CONFIRMATION`: se a ingestão por URL cobre vídeo **não-listado**. É o único caso em que o fallback teria utilidade real. Precisa de uma chamada de verificação — que não pôde ser feita porque a API está suspensa por faturamento. **Resolver antes de implementar R3.**

## Goals

1. Erro de IA chega ao usuário e ao log **com a sua causa real**, nunca substituído pela causa de um fallback.
2. Operar o sistema deixa de exigir manutenção manual de credencial que expira.
3. A superfície de dependência frágil (`ytdl-core`, `yt-dlp`, `YOUTUBE_COOKIES`) sai do código.

## Out of Scope

- **Upload de arquivo de vídeo.** Não existe hoje e o [`CLAUDE.md`](../../CLAUDE.md) proíbe implementar sem pedido explícito. Se a cobertura por URL se mostrar insuficiente, é outra spec.
- **Mudar prompt, schema, modelo ou qualquer coisa sobre a qualidade da análise.** Esta spec é sobre **como o vídeo entra**, não sobre o que a IA faz com ele. A qualidade é tratada separadamente.
- **Job assíncrono / fila** para análise de vídeo — etapa 9 do plano.
- **Suporte a Vimeo ou Google Drive**, que a UI promete e o backend nunca teve (`E7` da [`SPEC-ANALISE-IA.md`](../../SPEC-ANALISE-IA.md)).

## Requirements

| # | Requisito |
|---|---|
| R1 | O erro da ingestão direta é **classificado**, não engolido: billing, quota, chave ausente e conteúdo bloqueado **falham ali**, com a mensagem real |
| R2 | Nenhuma mensagem ao usuário atribui a cookies uma falha que não é de cookies |
| R3 | Ingestão por URL direta é o **único** caminho para YouTube |
| R4 | `YOUTUBE_COOKIES` sai do código, do `.env.example` e da documentação |
| R5 | `videoDownloader.js`, `@distube/ytdl-core` e as referências a `yt-dlp` são removidos |
| R6 | Vídeo que o Gemini recusa produz mensagem **acionável** ("o vídeo precisa estar público no YouTube"), não silêncio nem instrução errada |
| R7 | A documentação afetada é atualizada no mesmo PR |

## Technical Considerations

**A ordem certa é R1 antes de R3.** Classificar o erro é o que torna a remoção do fallback segura: sem isso, um vídeo que o Gemini recusa por motivo legítimo passa a falhar sem explicação. Feito na ordem inversa, troca-se uma mensagem errada por nenhuma mensagem.

**A taxonomia de erro já existe e deve ser reusada.** `utils/errors.js` tem `GeminiQuotaExceededError`, `GeminiContentBlockedError`, `GeminiApiKeyMissingError` e `isTransientError`. O que falta é uma classe para **recusa de mídia** (o Gemini não conseguiu buscar o vídeo) distinta de **falha da API** — hoje as duas chegam iguais em `analyzeFrame`.

**Erro de billing não tem classe própria hoje.** O 403 `PERMISSION_DENIED` observado cai em `GeminiProcessingError` genérico, com `statusCode: 500`. Merece classificação: é acionável (regularizar pagamento), não é transitório e **não deve ser repetido** — cada retry é outra inferência que vai falhar igual.

**Remover `ytdl-core` muda o `package-lock.json`.** O repositório tem **6 lockfiles** (npm + yarn) para 3 pacotes — dívida conhecida. Atualizar o lockfile que o CI usa (`npm ci`) e verificar que o build da Vercel continua passando.

**`frames_analyzed` continua existindo no banco.** É resquício de um caminho já removido, e a UI ainda exibe "N frames". Não é escopo desta spec, mas ao mexer no `videoDownloader` o vínculo fica visível — registrar em [`docs/GAPS.md`](../../docs/GAPS.md), não corrigir de carona.

**Risco de regressão silenciosa:** se hoje algum vídeo em produção só funciona pelo fallback, ele passa a falhar. Não há como medir isso a partir dos dados — `fight_analyses` não registra qual caminho foi usado. **Mitigação:** implementar R1 primeiro, deixar em produção com o fallback ainda ativo e logando qual caminho serviu; só então remover. Se isso for considerado excesso de zelo, a alternativa honesta é remover direto e aceitar que a evidência não existe — mas a decisão precisa ser explícita.

## Acceptance Criteria

- [ ] Erro de billing/quota/chave na ingestão direta chega ao usuário com a sua própria mensagem, e o teste afirma que o download **não foi tentado**
- [ ] Nenhuma string do código sugere renovar cookies
- [ ] Vídeo recusado pelo Gemini produz mensagem acionável sobre visibilidade do vídeo
- [ ] `grep -r YOUTUBE_COOKIES` não retorna nada em `server/`, `docs/` ou `.env.example`
- [ ] `@distube/ytdl-core` fora do `package.json` e do lockfile do CI
- [ ] `server/npm test`, `npm run lint` e `npm run typecheck` verdes
- [ ] [`docs/AI.md`](../../docs/AI.md), [`docs/modules/fight-analysis.md`](../../docs/modules/fight-analysis.md), [`docs/SETUP.md`](../../docs/SETUP.md), [`docs/DEPLOY.md`](../../docs/DEPLOY.md) e [`CLAUDE.md`](../../CLAUDE.md) atualizados no mesmo PR
- [ ] `NEEDS_CONFIRMATION` sobre vídeo não-listado resolvido — ou registrado em [`docs/GAPS.md`](../../docs/GAPS.md) como limite aceito conscientemente

## Notes

O incidente que originou esta spec **não era um problema de YouTube**: era a API do Gemini suspensa por faturamento. O sistema levou o operador a mexer em cookies durante um tempo até que a causa real fosse encontrada por reprodução direta. Esse custo — de atenção, não de dinheiro — é o que R1 evita.
