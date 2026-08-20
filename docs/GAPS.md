# GAPS — o que ficou aberto depois das specs 002–010

> **Atualizado:** 2026-08-20 · **Escopo:** tudo que as specs 002 a 010 **não** resolveram, com o motivo real de cada caso.
>
> Este documento existe porque a alternativa é pior. Um relatório que só lista o que foi feito faz um sistema parecer mais pronto do que está — e neste repositório *parecer pronto* já foi a causa de três funcionalidades quebradas sobreviverem meses. Nada aqui é "TODO futuro": cada item tem uma razão de ainda estar aberto, e a razão importa mais que o item.

## Como ler

| Marca | Significa |
|---|---|
| 🔴 **BLOQUEADO** | não depende de código. Depende de acesso, de infraestrutura ou de uma resposta do proprietário |
| 🟡 **DECLARADO** | escolha consciente registrada na spec correspondente, com o motivo |
| ⚪ **NÃO INICIADO** | fora do escopo executado |

---

## 1. As duas specs que não rodaram

### 🔴 Spec 008 — Fechamento do acesso ao banco

**É o item mais grave do projeto e não foi executado.** A chave publicável do Supabase está num arquivo **rastreado no Git** (`frontend/.env.production`) e, verificado contra produção em 2026-08-13, **lê 9 das 10 tabelas — incluindo `users`, com `email` e `password_hash` dos 25 usuários. A escrita também está liberada.**

Toda a autorização construída nas specs 004–006 protege a porta da frente. Esta é a de trás, e ela está aberta.

**Por que não foi executada:** a spec depende de uma pergunta que só o proprietário responde — **existe algum consumidor externo usando a chave anon?** Sem isso, o `REVOKE` é mudança às cegas: se houver um consumidor não mapeado, ele quebra na hora. O rollback é imediato (`GRANT` de volta), mas a quebra é imediata também.

**O que fazer, na ordem:**
1. responder se existe consumidor externo da chave anon;
2. **rotacionar** a chave publicável do Supabase e a chave do Gemini (esta última está no **histórico** do Git, em `.archived/SUPABASE_SETUP.md` — rotacionar é a única correção possível: o histórico não se apaga sem reescrita);
3. trocar a senha de `contateste@teste.com`;
4. `REVOKE` de `anon`/`authenticated`, unificar o backend em `service_role` e **falhar no boot** sem a chave (hoje há fallback silencioso entre os dois clientes).

> ⚠️ Os passos 2 e 3 **não dependem** do passo 1 e não deveriam esperar por ele.

### ⚪ Spec 011 — Integridade de schema

**Não iniciada, e deliberadamente.** É a spec de maior risco do plano: converter `user_id` de `VARCHAR` para `UUID` em três tabelas, recriar FKs, adicionar `UNIQUE` e, no fim, unificar `athletes` e `opponents`.

Dois motivos concretos para não ter começado:

1. **É trabalho de banco, e migration não se executa sem pedido explícito** (regra deste repositório — a migration `018` contém `UPDATE users SET role='user'` **sem `WHERE`**, e reexecutá-la rebaixa todos os admins).
2. **A própria spec diz que precisa ser dividida.** Fazer baseline + runner é uma coisa; converter tipo de coluna com dual-read é outra; unificar duas entidades é outra ainda. Tratá-las como uma spec só é exatamente o padrão que a spec 001 (`Superseded`) provou não funcionar aqui.

**Efeito colateral que vale registrar:** o bug de `Athlete.updateTechnicalProfile` só passou silencioso **porque `user_id` é VARCHAR** — comparar com a string `'undefined'` devolve zero linhas em vez de estourar erro de tipo. O banco não só deixa de garantir invariantes: ele **mascara bugs**.

---

## 2. Bloqueado por infraestrutura, não por código

### 🔴 Rate limiting continua inoperante em produção

`express-rate-limit` com `MemoryStore` conta por **instância**. Em serverless, cada invocação pode ser uma instância nova, então os limites não valem.

A spec 009 protegeu o **gasto de IA** por outro caminho — orçamento mensal por tenant contado **no banco**, não em memória —, e isso funciona. Mas o limite por IP **não**, e o alvo mais óbvio dele é **brute force no login**.

Resolver exige store externo (Redis/Upstash) ou limite na borda (Vercel/Cloudflare): **decisão de infraestrutura do proprietário**, não refatoração.

### 🔴 Timeout serverless na análise de vídeo

Não há `maxDuration` em nenhum `vercel.json`. Uma análise faz download (até 120s) + upload/polling (até 120s) + inferência, **por vídeo, em série**, até 5 vídeos. O provável é timeout **depois** de os tokens já terem sido consumidos.

Depende de confirmar o **plano da Vercel** (o teto de duração varia por plano) — e a solução de verdade é job assíncrono, que é a Etapa 9.

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
| 🟡 | **4 das 5 páginas seguem com `useEffect` cru** | 010 | `Settings`, `AdminUsers`, `AthleteDetail`, `ModernLogin`. Nenhuma com defeito relatado; migrar sem E2E troca bug conhecido por risco não observável |
| 🟡 | **Validação de schema em 3 endpoints** | 007 | Só os de `/api/ai/*` (os que gastam dinheiro). Há 30 rotas `POST`/`PUT`/`PATCH`. O risco de declarar schema às pressas é real e específico: **campo que o controller usa e o schema não declara chega `undefined` em silêncio** — mapear o payload real do frontend vem antes |
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
| **P6/P9/P11** | Defaults fabricados, unificação `athlete`/`opponent` e ciclo de vida de dado | Registradas no plano. A unificação já tem [ADR-007](./decisions/007-unificar-athlete-e-opponent-numa-entidade-com-papel.md) e é o **último item** da spec 011 |

---

## 5. O estado do trabalho em si

**Nada foi enviado. Não existe PR.** São **36 commits** locais na branch `chore/spec-002-verification-baseline`, cobrindo as specs 002 a 010 — o nome da branch deixou de descrever o conteúdo dela desde a terceira spec.

Portões verdes na última execução: **327 testes de backend**, **67 de frontend**, lint de backend e de frontend sem erro. E2E, como registrado acima, não roda.

**Antes de abrir PR**, duas coisas valem a pena: renomear a branch para algo que descreva o que ela contém, e decidir se 36 commits entram como um PR só (revisão difícil, história completa) ou fatiados por spec (revisão possível, mais trabalho de organização).
