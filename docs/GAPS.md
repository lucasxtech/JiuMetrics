# GAPS — o que ficou aberto depois das specs 002–011

> **Atualizado:** 2026-09-02 · **Escopo:** tudo que as specs 002 a 011 **não** resolveram — incluindo o que as specs 008 e 011 resolveram só em parte —, com o motivo real de cada caso.
>
> Este documento existe porque a alternativa é pior. Um relatório que só lista o que foi feito faz um sistema parecer mais pronto do que está — e neste repositório *parecer pronto* já foi a causa de três funcionalidades quebradas sobreviverem meses. Nada aqui é "TODO futuro": cada item tem uma razão de ainda estar aberto, e a razão importa mais que o item.

## Como ler

| Marca | Significa |
|---|---|
| 🔴 **BLOQUEADO** | não depende de código. Depende de acesso, de infraestrutura ou de uma resposta do proprietário |
| 🟡 **DECLARADO** | escolha consciente registrada na spec correspondente, com o motivo |
| ⚪ **NÃO INICIADO** | fora do escopo executado |

---

## 1. O que ainda falta nas duas últimas specs do plano

### 🟡 Spec 008 — Fechamento do acesso ao banco (parcial)

**A pergunta que bloqueava esta spec foi respondida em 2026-08-24: não existe consumidor externo da chave anon.** Isso destravou a execução, mas a execução em si tem dois lados, e só um deles é código.

**✅ O lado do código está feito** (ver [`specs/008-database-access-lockdown/spec.md`](../specs/008-database-access-lockdown/spec.md)): o backend passou a ter um **único** cliente Supabase (`service_role`), sem o fallback silencioso que antes caía para o cliente anon quando a chave de serviço faltava; o processo agora **falha no boot** sem `SUPABASE_SERVICE_ROLE_KEY`; e `frontend/.env.production` — o arquivo rastreado no Git que carregava a chave publicável — foi retirado do controle de versão, com o `.gitignore` corrigido (o padrão antigo, só `.env`, nunca cobriu `.env.production`; é a causa raiz do vazamento).

**🔴 O lado do banco continua aberto, e é o que importa de fato.** A chave publicável do Supabase, verificada contra produção em 2026-08-13, **lê 9 das 10 tabelas — incluindo `users`, com `email` e `password_hash` dos 25 usuários. A escrita também está liberada.** Toda a autorização construída nas specs 004–006 protege a porta da frente; esta é a de trás, e **ela continua aberta até alguém executar o `REVOKE`.**

O `REVOKE` está escrito — [`server/migrations/024-revoke-anon-access.sql`](../server/migrations/024-revoke-anon-access.sql), com o comando de rollback (`GRANT` de volta) comentado no mesmo arquivo — mas **não foi executado**. O motivo não é falta de autorização: é falta de ferramenta. Este ambiente tem a chave `service_role`, que fala com o banco via PostgREST (REST), e PostgREST não executa DCL (`REVOKE`/`GRANT`). Rodar esse script exige uma credencial de conexão direta ao Postgres (senha do usuário `postgres`, ausente de qualquer `.env`) ou o SQL Editor do próprio dashboard do Supabase — os dois fora do alcance deste ambiente.

> 🔴 **O repositório é PÚBLICO** — confirmado em 2026-09-02 (`gh repo view`: `visibility: PUBLIC`). Isso era a pergunta nº 1 de [`PROJECT_STATUS.md`](./PROJECT_STATUS.md), marcada como "a mais urgente do projeto", e a resposta é a pior possível: a chave publicável do Supabase esteve **legível por qualquer pessoa na internet** enquanto `frontend/.env.production` estava rastreado, e a chave do Gemini está no histórico de 4 commits públicos. Chave em repo público é raspada por bot — trate as duas como **comprometidas**, não como "expostas em teoria".

**O que fazer, na ordem:**
1. 🔴 **Rotacionar** a chave publicável do Supabase e a chave do Gemini. **Primeiro, e independente de tudo o resto** — é contenção de credencial comprometida, não higiene. Sair do Git não invalida chave já exposta, e o histórico público não se apaga sem reescrita.
2. Trocar a senha de `contateste@teste.com`.
3. **Configurar `SUPABASE_SERVICE_ROLE_KEY` na Vercel** (produção, backend) → **mergear e deployar** o código da spec 008 → **validar em produção** → **só então** colar [`024-revoke-anon-access.sql`](../server/migrations/024-revoke-anon-access.sql) no SQL Editor.

> 🔴 **A ordem do passo 3 não é negociável, e isso foi verificado da pior maneira.** Em 2026-09-02 o `REVOKE` foi executado antes do deploy e **o login caiu em produção**: o código em `main` lê `users` com o cliente **anon** (`models/User.js#findByEmail`), que acabara de perder o GRANT. O rollback funcionou na primeira tentativa — o que também confirmou, na prática, que a rede de segurança desta spec existe. Sequência completa em [`specs/008-database-access-lockdown/spec.md`](../specs/008-database-access-lockdown/spec.md).

### 🟡 Spec 011 — Integridade de schema (parcial: 1 de 5 itens)

**Só o item sem risco de dado foi executado.** A spec cobre cinco frentes: (1) baseline de schema + runner, (2) converter `user_id` de `VARCHAR` para `UUID` em três tabelas + recriar FKs, (3) adicionar `UNIQUE`/índices, (4) unificar `athletes` e `opponents`, (5) adotar TypeScript incrementalmente (etapa 1 do [ADR-010](../docs/decisions/010-adotar-typescript-incrementalmente.md)).

**✅ Item 5 — feito (2026-08-24).** `server/tsconfig.json` + `// @ts-check` nos 10 models e nos 11 utilitários de topo de `server/src/utils/` (21 arquivos, zero erro; `npm run typecheck`). Achado real: `tsc` encontrou **12 divergências entre JSDoc e código** na primeira passagem — nenhuma de lógica, todas contrato desatualizado (parâmetro renomeado sem atualizar o `@param`, `@returns` de função `async` sem `Promise<...>`). Corrigidas.

**⚪ Itens 1–4 — não iniciados.** Dois motivos concretos, os mesmos que bloqueiam o `REVOKE` da spec 008:

1. **É trabalho de banco de produção**, e a própria spec exige, para qualquer sub-item destrutivo: backup **com restauração testada** (gate que só o proprietário cumpre no dashboard do Supabase) e execução em cópia antes de produção. Nenhuma ferramenta disponível aqui tem credencial de conexão direta ao Postgres — só a chave `service_role`, que fala REST via PostgREST e não executa DDL/backfill.
2. **A própria spec diz que precisa ser dividida.** Fazer baseline + runner é uma coisa; converter tipo de coluna com dual-read é outra; unificar duas entidades é outra ainda. Tratá-las como uma spec só é exatamente o padrão que a spec 001 (`Superseded`) provou não funcionar aqui.

**Efeito colateral que vale registrar:** o bug de `Athlete.updateTechnicalProfile` só passou silencioso **porque `user_id` é VARCHAR** — comparar com a string `'undefined'` devolve zero linhas em vez de estourar erro de tipo. O banco não só deixa de garantir invariantes: ele **mascara bugs**. Isto continua verdade até o item 2 ser executado.

---

## 2. Bloqueado por infraestrutura, não por código

### 🔴 Rate limiting continua inoperante em produção

`express-rate-limit` com `MemoryStore` conta por **instância**. Em serverless, cada invocação pode ser uma instância nova, então os limites não valem.

A spec 009 protegeu o **gasto de IA** por outro caminho — orçamento mensal por tenant contado **no banco**, não em memória —, e isso funciona. Mas o limite por IP **não**, e o alvo mais óbvio dele é **brute force no login**.

Resolver exige store externo (Redis/Upstash) ou limite na borda (Vercel/Cloudflare): **decisão de infraestrutura do proprietário**, não refatoração.

### 🔴 Timeout serverless na análise de vídeo

Não há `maxDuration` em nenhum `vercel.json`. Uma análise faz download (até 120s) + upload/polling (até 120s) + inferência, **por vídeo, em série**, até 5 vídeos. O provável é timeout **depois** de os tokens já terem sido consumidos.

Depende de confirmar o **plano da Vercel** (o teto de duração varia por plano) — e a solução de verdade é job assíncrono, que a própria spec 011 lista como **fora do seu escopo** ("valioso, mas é mudança de arquitetura de execução e merece spec própria"). Sem spec numerada ainda.

### 🔴 O timeout de IA não cancela a inferência

O `withTimeout` da spec 009 interrompe **a nossa espera**, não o trabalho do provedor. Sem cancelamento no SDK, o custo pode já ter sido incorrido quando desistimos. É limite do SDK, não do nosso código.

### 🔴 E2E nunca roda

Existem 6 specs de Playwright em TypeScript. **Nenhuma executa no CI**, e nenhuma foi executada durante as specs 002–010.

Isso não é detalhe de cobertura: é o que fez três itens da spec 010 ficarem em "verificado por teste, não na tela". Sem navegador, não há como comparar o PDF antes/depois, nem confirmar que a CSP não quebra o estilo, nem observar race conditions ao migrar `useEffect` → React Query.

---

## 3. Escolhas declaradas nas specs

| # | Gap | Spec | Por que ficou assim |
|---|---|---|---|
| 🟡 | **O `innerHTML` do export de PDF continua lá** | 010 | A **vulnerabilidade** está fechada: o conteúdo é escapado na fonte, com 16 testes que verificam **no DOM** que nenhum nó executável é construído. O **padrão** não. Reescrever ~230 linhas de template sem poder olhar o PDF resultante trocaria uma falha de segurança por regressão de layout silenciosa |
| 🟡 | **CSP em Report-Only** | 010 | Virar bloqueante exige observar se a política quebra Tailwind ou estilo inline — verificação de navegador |
| 🟡 | **3 das 5 páginas seguem com `useEffect` cru** | 010 | `Settings`, `AdminUsers`, `ModernLogin`. `AthleteDetail` migrou na [spec 012](../specs/012-athletes-opponents-consolidation/spec.md) — e tinha defeito (lista obsoleta por 5 min). Nas restantes nenhum foi relatado |
| 🟡 | **Validação de schema em 7 endpoints** | 007, 012 | Os 3 de `/api/ai/*` (007) e os 4 de escrita de atletas/adversários (012).  Só os de `/api/ai/*` (os que gastam dinheiro). Há 30 rotas `POST`/`PUT`/`PATCH`. O risco de declarar schema às pressas é real e específico: **campo que o controller usa e o schema não declara chega `undefined` em silêncio** — mapear o payload real do frontend vem antes |
| 🟡 | **Validação de host por substring no backend** | 010 | `linkController.js:13` ainda faz `hostname.includes('youtube.com')`, e `youtube.com.attacker.net` passa. O frontend foi corrigido; **é o backend que decide** |
| 🟡 | **JWT continua em `localStorage`** | 010 | O que mudou é não haver mais caminho conhecido de XSS até ele. Mover para cookie `httpOnly` é mudança de contrato de autenticação inteira |
| 🟡 | **55 linhas de `api_usage` com custo zero não foram recalculadas** | 009 | Seria migração de dado. A spec impede que volte a acontecer. ⚠️ E corrige o registro: a causa **não** era a que a auditoria afirmava (modelo desconhecido era precificado como flash, não como zero — o zero vem de `!modelName` ou de contagem zero de tokens) |
| 🟡 | **Versão de prompt só no fluxo de estratégia** | 009 | `metadata.promptVersions` não cobre análise de vídeo nem chat |
| 🟡 | **Reprodutibilidade tem teto** | 009 | Saber prompt e modelo dá **auditabilidade**, não replay bit-a-bit: LLM não é determinístico e o provedor deprecia modelos. Ver [ADR-013](./decisions/013-versionamento-de-prompt-por-hash.md) |
| 🟡 | **Testes rodam contra um PostgREST falso** | 004 | Decisão do proprietário: não rodar contra o banco real. O fake **não reforça `NOT NULL`** nem tipos, então uma classe de defeito (a que o schema pegaria) passa por ele. Registrado aqui porque é o limite mais importante do harness |
| 🟡 | **`InlineDiff` duplicado nos dois modais** | 010 | O arquivo órfão saiu; cada modal ainda declara a própria cópia local |
| 🟡 | **Login loga o e-mail do usuário** | — | PII em log, dívida conhecida, nunca entrou no escopo de nenhuma spec |
| 🟡 | **PII em migrations** (`017`, `019`, `022`) | — | E-mails reais versionados. Corrigir exige reescrever histórico |

---

## 4. Decisões de produto que continuam sem resposta

Nenhuma destas é técnica. Todas mudam o que o usuário vê, e por isso não foram decididas por conta própria.

| # | Pergunta | Consequência de continuar sem resposta |
|---|---|---|
| **P7** | Qual das duas versões de `processPersonAnalyses` refletia a intenção? | A duplicação foi removida **por um fato, não por uma decisão**: nenhuma das duas cópias tinha chamador de produção. A sobrevivente (`server/src/utils/athleteStatsUtils.js`) também não tem — é código sem consumidor. Ligá-la a um é escolher os números que a UI e a IA passam a ver, e é aí que P7 volta a valer. Enquanto isso, `attributes` fica **fora** do prompt de `athlete-summary` |
| ~~**P6**~~ | ✅ Defaults fabricados — resolvido na [spec 012](../specs/012-athletes-opponents-consolidation/spec.md): campo omitido é `null`, `belt` é enum obrigatória | — |
| **P9/P11** | Unificação `athlete`/`opponent` (de **tabelas**; o código já é um só desde a spec 012) e ciclo de vida de dado | A unificação tem [ADR-007](./decisions/007-unificar-athlete-e-opponent-numa-entidade-com-papel.md) e é o **último item** da spec 011 |
| **P12** | `technical_profile` é gravado a cada análise e **ninguém lê** | A spec 007 corrigiu a escrita; a spec 012 removeu o único "leitor" (uma prop ignorada de `AthleteCard`). Parar de gravar economiza uma query por análise mas remove uma funcionalidade documentada como corrigida — decisão do proprietário |

---

## 5. O estado do trabalho em si

**Nada foi enviado. Não existe PR.** São **39 commits** locais na branch `chore/spec-002-verification-baseline`, cobrindo as specs 002 a 011 (008 e 011 parciais, como registrado acima) — o nome da branch deixou de descrever o conteúdo dela desde a terceira spec.

Portões verdes na última execução: **331 testes de backend** (28 suítes), **67 de frontend** (28 suítes), lint de backend e de frontend sem erro, `npm run typecheck` (novo, `server/`) sem erro. E2E, como registrado acima, não roda.

**Antes de abrir PR**, duas coisas valem a pena: renomear a branch para algo que descreva o que ela contém, e decidir se 39 commits entram como um PR só (revisão difícil, história completa) ou fatiados por spec (revisão possível, mais trabalho de organização).
