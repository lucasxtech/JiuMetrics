# AUDIT.md — Auditoria Forense do JiuMetrics

> **Escopo:** auditoria estática somente-leitura de todo o repositório em `main` (`895066f`), realizada em 2026-08-12.
> **Nenhum código, banco, dependência, prompt ou comportamento foi alterado.** Nenhum commit foi feito.
>
> **Método:** leitura integral de `server/src` (69 arquivos `.js`), `frontend/src` (79 arquivos `.js/.jsx`), 22 migrations SQL, 4 workflows de CI, configs de deploy e a documentação. As afirmações abaixo são ancoradas em `arquivo:linha`. Onde o código não permite concluir, está marcado **UNKNOWN** ou **NEEDS_CONFIRMATION** — não há suposição preenchendo lacuna.
>
> **Limitação importante:** `node_modules` não está instalado em nenhum pacote. As suítes de teste **não foram executadas** (instalar dependências estava fora do escopo autorizado). Toda a análise de testes é estática. Igualmente, o estado real das políticas RLS **em produção** não foi consultado — as conclusões sobre RLS derivam das migrations versionadas, e os pontos que dependem do estado real estão marcados como NEEDS_CONFIRMATION.

---

## ⚠️ ADENDO — Verificação contra produção (2026-08-13)

> A [spec 002](./specs/002-verification-baseline/spec.md) executou a verificação que esta auditoria não pôde fazer. **Duas conclusões foram refutadas, uma foi refinada e uma foi agravada.** Os testes também foram executados: **16 suítes, 180 testes, todos passando.**
>
> As afirmações originais abaixo foram corrigidas nos pontos afetados, mas este adendo fica no topo porque **quem leu a versão anterior deste documento precisa saber o que mudou.**

### ❌ REFUTADO — o rastreamento de custo de IA funciona

A auditoria concluiu (§7 DB-2, §9 HIGH-7) que `api_usage` provavelmente nunca gravou, porque o model usa o cliente anon contra uma política RLS `auth.uid() = user_id`.

**Medição real:** `api_usage` tem **173 linhas**, de **2025-12-14 até 2026-08-12**, com **US$ 3,0295** de custo acumulado — inclusive registros do sistema multi-agentes já removido (`multi-agents (gpt-5.4)`, `gpt-4-turbo-preview`, `gpt-4.1`).

**Por que a conclusão estava errada:** a política RLS de `api_usage` **não está ativa em produção** — a chave anon lê a tabela sem restrição. As migrations `004`/`006` a criam, mas o estado real do banco divergiu delas. Era exatamente o risco que a própria auditoria apontou ao dizer que "as migrations não são a fonte de verdade" — e aqui isso invalidou uma conclusão minha.

**Dívida real que permanece (menor):** **55 das 173 linhas têm `estimated_cost_usd = 0`**, e há um `operation_type` (`strategy_chat`) fora da lista documentada. São problemas de qualidade de dado, não de persistência.

### 🔄 REFINADO — o versionamento de perfil funcionou por 6 dias

A auditoria concluiu que `profile_versions` **nunca** gravou. **Medição real: 5 linhas, a última em 2026-01-15.**

O `git log` explica com precisão:

| Data | Evento |
|---|---|
| 2026-01-09 (`f185831`) | `ProfileVersion.create` criado, esperando **camelCase** |
| 2026-01-09 a 01-15 | **5 versões gravadas** — chamadas diretas e corretas |
| **2026-01-16** (`2b13a64`) | `versionManager.saveProfileVersion` criado passando **snake_case** → contrato incompatível desde o nascimento do wrapper |
| desde 2026-01-16 | **nenhuma linha nova** |

O diagnóstico do mecanismo estava certo; o "nunca funcionou" estava errado. **A formulação correta é: está quebrado desde 2026-01-16**, e as 5 linhas existentes são do período em que funcionava.

### ✅ CONFIRMADO — `technical_profile` é no-op

**0 de 37 atletas** têm `technical_profile` preenchido. A chamada com 2 de 3 argumentos nunca escreveu nada.

### 🔴 AGRAVADO — a chave anon expõe hashes de senha

A auditoria marcou o RLS de `users` como **UNKNOWN** e estimou o risco pelas tabelas de domínio. A medição é pior:

**A chave `anon` — que está commitada em `frontend/.env.production` — lê 9 das 10 tabelas, incluindo `users` com `password_hash` e `email` de todos os 25 usuários.** Hash `bcrypt` (`$2b$`, 60 chars) legível.

| Tabela | anon lê? | Linhas expostas |
|---|---|---|
| `users` | ⚠️ **SIM** | **25 — com `password_hash` e `email`** |
| `athletes` | ⚠️ SIM | 37 |
| `opponents` | ⚠️ SIM | 38 |
| `fight_analyses` | ⚠️ SIM | 285 |
| `tactical_analyses` | ⚠️ SIM | 41 |
| `ai_chat_sessions` | ⚠️ SIM | 285 |
| `analysis_versions` | ⚠️ SIM | 27 |
| `strategy_versions` | ⚠️ SIM | 47 |
| `api_usage` | ⚠️ SIM | 173 |
| `profile_versions` | ✅ **não** | — (única protegida) |

**Escrita também está liberada:** um `INSERT` com a chave anon é recusado por violação de `NOT NULL`, **não** por permissão — ou seja, com dados válidos seria aceito.

**Consequência prática:** 25 hashes bcrypt offline, sem rate limit, contra uma política de senha de mínimo 6 caracteres e sem requisito de complexidade. Isto eleva a prioridade da [spec 008](./specs/008-database-access-lockdown/spec.md) acima do que o plano previa — ver *Recommended Next Steps*.

### 📊 Fatos que desbloqueiam a spec 011

| Medição | Resultado | Efeito |
|---|---|---|
| **Órfãos de `user_id`** | `athletes` 4/37 · `opponents` 1/38 · **`fight_analyses` 62/285** | 67 registros invisíveis a todos os usuários |
| **Valores não-UUID em `user_id`** | **zero** | ✅ conversão VARCHAR→UUID é viável **sem perda** |
| **E-mails duplicados** | **zero** | ✅ `UNIQUE(users.email)` aplicável |
| **Versões duplicadas** | **zero** nas 3 tabelas | ✅ `UNIQUE(analysis_id, version_number)` aplicável |
| **Colunas reais de `users`** | `id, name, email, password_hash, role, is_active, created_by, tenant_id, token_version, last_login, created_at, updated_at` | schema deixa de ser UNKNOWN |
| **População** | 25 usuários · 3 admins · **0 inativos** · 2 tenants | — |

---

## 1. Executive Summary

O JiuMetrics é um monólito de duas peças (SPA React + API Express) sobre Supabase/PostgreSQL, com autenticação JWT **própria** (não Supabase Auth) e um pipeline de IA sobre o Google Gemini. O produto funciona e a camada de IA passou por uma modernização recente e genuinamente boa (`services/llm.js`, `responseSchema`, taxonomia de erros). O problema não é a "casca": é que **as garantias de isolamento entre usuários existem em alguns caminhos e simplesmente não existem em outros**, e várias funcionalidades visíveis na UI estão quebradas de forma silenciosa.

Os cinco fatos que mais importam:

1. **O isolamento multi-tenant é inconsistente por endpoint, não por arquitetura.** Existe um helper correto (`utils/tenantScope.js`) usado em ~20 endpoints, mas 5 endpoints do chat/versões **não o usam** e operam com IDs vindos direto do `req.body`. Qualquer usuário autenticado pode ler e **sobrescrever** análises de qualquer outro tenant. Isso não é uma falha teórica: `FightAnalysis.update()` e `.delete()` não filtram `user_id` no nível do model ([FightAnalysis.js:132,166](server/src/models/FightAnalysis.js#L132)), então a checagem de posse é 100% responsabilidade do controller — e três controllers não a fazem.

2. **Há uma rota de debug em produção que devolve todas as análises de todos os tenants** ([fightAnalysis.js:15-45](server/src/routes/fightAnalysis.js#L15)), marcada no próprio código como "⚠️ DEBUG TEMPORÁRIO".

3. **O banco não protege nada por conta própria.** As migrations `008` e `009` **desligam RLS** em `athletes`, `opponents` e `fight_analyses`; `tactical_analyses`, `ai_chat_sessions` e `analysis_versions` têm RLS ligado mas com políticas `USING (true)`. A segurança inteira depende do backend acertar o filtro. Combinado com o item 4, isso significa que o banco é alcançável sem passar pelo backend.

4. **Segredos versionados.** Uma chave da API do Gemini em formato válido está commitada em [.archived/SUPABASE_SETUP.md:25](.archived/SUPABASE_SETUP.md#L25), e a URL do projeto Supabase + chave publicável estão em [frontend/.env.production](frontend/.env.production) (arquivo rastreado pelo git). O scanner de secrets no CI existe mas roda com `continue-on-error: true` ([code-quality.yml](.github/workflows/code-quality.yml)), então nunca bloqueou nada.

5. **Funcionalidades que a UI oferece e que nunca funcionaram.** O histórico de versões de perfil técnico está quebrado por um contrato de argumentos incompatível entre `versionManager.saveProfileVersion` e `ProfileVersion.create` — **todos os campos chegam `undefined`** e o insert viola `NOT NULL`, com o erro engolido por um `console.warn` ([versionManager.js:96-122](server/src/utils/versionManager.js#L96)). O `technical_profile` do atleta nunca é atualizado após uma análise, por chamada com argumento faltando ([fightAnalysisController.js:140](server/src/controllers/fightAnalysisController.js#L140)).

**Contexto que muda a leitura desta auditoria:** o repositório **já contém duas auditorias anteriores muito boas** — [SPEC-ANALISE-IA.md](SPEC-ANALISE-IA.md) (458 linhas, pipeline de IA) e [SPEC-FRONTEND.md](SPEC-FRONTEND.md) (163 linhas, frontend). Elas são precisas. Verifiquei uma amostra dos achados do frontend (F1, F2, F11, F15, F16) e **todos os 5 continuam abertos** — o commit `f8c4029` adicionou a spec, não a implementação. Este relatório evita reescrever aquele trabalho: ele foca no que as specs **não** cobrem (autenticação, autorização, banco, segredos, dependências, infra) e sinaliza o que já está documentado.

**Veredito de risco:** o sistema é adequado para o uso atual (poucos tenants, provavelmente confiáveis entre si) e **não** é adequado para abrir a usuários que não confiam uns nos outros. A distância entre os dois estados é de aproximadamente 6 correções pontuais, não de uma reescrita.

---

## 2. Stack

Confirmada por leitura de `package.json`, imports reais e configs — não por inferência.

| Camada | Tecnologia | Versão | Evidência |
|---|---|---|---|
| Linguagem (app) | **JavaScript puro** — 0 arquivos TS/TSX em `frontend/src` e `server/src` | ES2020+ | 79 `.js/.jsx` no front, 69 `.js` no server |
| Frontend | React + Vite | 19.2 / 7.2 | [frontend/package.json](frontend/package.json) |
| Roteamento | react-router-dom | 6.30 | [App.jsx:3](frontend/src/App.jsx#L3) |
| Estilo | TailwindCSS 4 + CSS Modules + CSS global + estilos inline | 4.1 | `index.css`, `*.module.css`, `style=` inline |
| Estado servidor | @tanstack/react-query | 5.90 | usado em **4** de 9 páginas |
| Gráficos | recharts | 2.15 | 4 arquivos |
| Ícones | lucide-react | 0.556 | 16 arquivos |
| HTTP client | axios | 1.13 | [services/api.js](frontend/src/services/api.js) |
| PDF | html2pdf.js | 0.12 | [Analyses.jsx](frontend/src/pages/Analyses.jsx) (1 arquivo) |
| Backend | Node.js + Express (CommonJS) | Express 5.1 | [server/index.js](server/index.js) |
| Banco | **Supabase / PostgreSQL** — projeto `ikjudbypwfvdywlgzsjr` | — | [config/supabase.js](server/src/config/supabase.js) |
| Acesso a dados | **@supabase/supabase-js (PostgREST query builder)** — **não há ORM nem query builder SQL** | 2.86 | todos os models |
| Autenticação | **JWT próprio** (`jsonwebtoken`) + `bcrypt` (10 rounds). **Não usa Supabase Auth.** | 9.0 / 6.0 | [middleware/auth.js](server/src/middleware/auth.js), [authController.js](server/src/controllers/authController.js) |
| IA | **Google Gemini** via `@google/genai` | 2.13 | [services/llm.js:18](server/src/services/llm.js#L18) |
| Vídeo | `@distube/ytdl-core` + binário `yt-dlp` (fallback) | 4.16 | [videoDownloader.js](server/src/services/videoDownloader.js) |
| Rate limiting | express-rate-limit (**MemoryStore**) | 8.2 | [middleware/rateLimiter.js](server/src/middleware/rateLimiter.js) |
| Testes backend | Jest — **16 suítes** em `src/**/__tests__/` | 29.7 | [jest.config.js](server/jest.config.js) |
| Testes frontend | Vitest + Testing Library — **5 arquivos** | 2.1 | [vitest.config.js](frontend/vitest.config.js) |
| Testes E2E | Playwright (TypeScript) — 6 specs, Page Objects | 1.57 | `playwright/` |
| CI | GitHub Actions — `ci`, `code-quality`, `deploy`, `performance` | — | `.github/workflows/` |
| Deploy | **Vercel** (front + back, separados) **e** **GitHub Pages** (front) — dois destinos simultâneos | — | `*/vercel.json` + [deploy.yml](.github/workflows/deploy.yml) |
| Lint | ESLint 9 flat config — **somente frontend**. Backend não tem lint. | 9.39 | [frontend/eslint.config.js](frontend/eslint.config.js) |

**Serviços externos:** Google Gemini API (análise, estratégia, chat, consolidação), Supabase (Postgres + PostgREST), YouTube (download de vídeo), Vercel + GitHub Pages (hospedagem).

**Observações de stack que são dívida, não escolha:**

- `typescript` e `@types/react`, `@types/node`, `@types/react-dom` estão em `devDependencies` do frontend, mas **nenhum arquivo da aplicação é TypeScript**. São dependências que sinalizam uma intenção nunca executada.
- `@tanstack/react-query-devtools` está declarado e é referenciado em **0 arquivos**.
- O `package.json` da raiz declara `@supabase/supabase-js` como dependência de produção, e nada na raiz usa Supabase.

---

## 3. Architecture

### 3.1 Fluxo real

```
┌─────────────────────────────────────────────────────────────────────────┐
│  NAVEGADOR — SPA React (Vite)                                           │
│                                                                          │
│  main.jsx → App.jsx (BrowserRouter)                                     │
│    └─ AuthProvider  ─────────────► user + role lidos de localStorage     │
│         └─ AnalysisProgressProvider (progresso SIMULADO — ver §10)      │
│              └─ StrategyProvider                                        │
│                   └─ ProtectedRoute ──► 9 páginas (lazy)                │
│                                                                          │
│  Estado do servidor: DOIS padrões coexistindo                           │
│    • React Query  → Analyses, Athletes, Opponents, Strategy             │
│    • useEffect+useState cru → Overview, Settings, AdminUsers,           │
│                               AthleteDetail, ModernLogin                │
│                                                                          │
│  13 services (axios) ──► Authorization: Bearer <JWT de localStorage>    │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │ HTTPS  (CORS: localhost, *.vercel.app,
                                    │         lucasxtech.github.io)
┌───────────────────────────────────▼─────────────────────────────────────┐
│  API Express — server/index.js  (function serverless na Vercel)         │
│                                                                          │
│  rateLimiter (MemoryStore — INEFICAZ em serverless, §9)                 │
│       ▼                                                                  │
│  authMiddleware  ── verifica JWT ── consulta users (cache 5min, LRU)    │
│       │              role vem do BANCO, não do token  ← boa decisão     │
│       ▼                                                                  │
│  [adminMiddleware]  (só /api/admin e /api/debug)                        │
│       ▼                                                                  │
│  10 routers ──► 10 controllers ──► 10 models ──► supabase-js            │
│                       │                                                  │
│                       └──► services/ ──► llm.js ──► @google/genai       │
│                                └──► videoDownloader ──► yt-dlp/ytdl     │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
              ┌─────────────────────┴──────────────────────┐
              ▼                                            ▼
   ┌──────────────────────────┐              ┌──────────────────────────┐
   │ Supabase / PostgreSQL    │              │  Google Gemini API       │
   │                          │              │                          │
   │ DOIS clientes:           │              │  • generateJson (schema) │
   │  • supabase (anon)       │              │  • generateText          │
   │    RLS aplica            │              │  • chats.create          │
   │  • supabaseAdmin         │              │  • files.upload          │
   │    (service_role)        │              │                          │
   │    RLS ignorado          │              └──────────────────────────┘
   │  ⚠ fallback silencioso   │
   │    admin→anon se a chave │
   │    não existir           │
   └──────────────────────────┘
```

### 3.2 Camadas e onde elas vazam

A intenção arquitetural é limpa: `routes → controllers → models → supabase` com `services` para IA. Onde ela não se sustenta:

**Responsabilidades misturadas**

- **Rota contendo acesso a banco.** [fightAnalysis.js:15-45](server/src/routes/fightAnalysis.js#L15) importa `config/supabase` e executa a query dentro do arquivo de rota — pulando controller e model. É exatamente o endpoint que vaza dados entre tenants (§6).
- **Controller orquestrando IA + persistência + efeitos colaterais.** [linkController.js:30-236](server/src/controllers/linkController.js#L30) faz: validação de URL → loop de N chamadas de IA → consolidação → log de custo → persistência → consolidação de perfil → update do atleta. 206 linhas numa função.
- **`geminiService.js` (845 linhas) acumula três papéis:** montagem de prompt, regras de domínio IBJJF (`formatBeltRules`) e parsing de resposta (`extractEditSuggestion`). A camada de SDK foi corretamente extraída para `llm.js`, mas o domínio não foi.

**Lógica de negócio dentro da UI**

- [Analyses.jsx:~400-540](frontend/src/pages/Analyses.jsx#L400) monta o **relatório PDF inteiro** — layout, seções, semântica da estratégia — como template string de HTML dentro do componente de página. É a regra de apresentação do produto vivendo num handler de clique (e é o sink de XSS do §9).
- [utils/athleteStats.js](frontend/src/utils/athleteStats.js) (238 linhas) calcula atributos do atleta no cliente.

**Duplicação atravessando a fronteira cliente/servidor**

`processPersonAnalyses` existe **duas vezes**, e o próprio código admite: `"Versão backend - espelhando a lógica do frontend"` ([athleteStatsUtils.js:3](server/src/utils/athleteStatsUtils.js#L3)). São 238 linhas no front contra 121 no back — **já divergiram**: quando `person` é falsy o frontend retorna `radarData` com defaults, o backend retorna outra estrutura. Duas fontes de verdade para o mesmo número exibido ao usuário.

A lista de modelos de IA também está duplicada: [config/ai.js:115-121](server/src/config/ai.js#L115) e [frontend/src/utils/aiConfig.js:12-41](frontend/src/utils/aiConfig.js#L12).

**Infraestrutura misturada com domínio**

- [config/ai.js](server/src/config/ai.js) mistura, num único módulo: regras esportivas IBJJF (`BELT_RULES`), nomes de modelos de IA, temperaturas, limites de download de vídeo, rate limits e labels de gráfico. Conhecimento de domínio e configuração de infra no mesmo arquivo.
- `models/` não são entidades de domínio — são *data mappers* PostgREST. Não há camada de domínio; as invariantes de negócio moram espalhadas nos controllers.

**Acoplamento**

- **Nenhuma dependência circular** foi encontrada (verificado nos grafos de import de `server/src` e `frontend/src`) — vale registrar como ponto positivo.
- Acoplamento real: `getScopeIds(req, User)` recebe o `req` do Express **e** o model `User` ([tenantScope.js:10](server/src/utils/tenantScope.js#L10)), amarrando a regra de escopo ao transporte HTTP. Funciona, mas impede testar/reusar a regra fora de um request.
- O contrato de nomes é ambíguo por design: o banco fala `snake_case`, a aplicação fala `camelCase`, e a tradução acontece em `utils/dbParsers.js` **apenas para Athlete/Opponent/FightAnalysis**. Os demais models expõem `snake_case` cru. Essa fronteira inconsistente é a causa-raiz de uma classe inteira de bugs (§8.3, e B2 da SPEC).

**Pontos frágeis (fragilidade estrutural, não bug pontual)**

1. **A posse do dado é verificada no controller, nunca no model.** `FightAnalysis.update/delete` e todos os métodos de `AnalysisVersion` aceitam qualquer ID. O sistema é seguro só enquanto todo controller lembrar de checar — e três não lembraram. Isso é uma armadilha, não um descuido.
2. **`supabaseAdmin` cai silenciosamente para `supabase`** quando `SUPABASE_SERVICE_ROLE_KEY` não está definida ([config/supabase.js:21-28](server/src/config/supabase.js#L21)). O mesmo código roda com dois níveis de privilégio diferentes sem aviso.
3. **Trabalho longo de IA dentro de request HTTP síncrono.** Download de vídeo (até 120 s) + upload para File API (até 120 s) + inferência em `gemini-2.5-pro` acontecem no mesmo request, numa function serverless (§10).
4. **Divisão arbitrária entre os dois clientes Supabase** — sem regra documentada (§7.4).

---

## 4. Domain

Entidades **realmente existentes** no código (nenhuma inventada). O produto **não possui** histórico completo de lutas, lesões, acompanhamento médico/nutricional/físico, contas de profissionais nem compartilhamento entre profissionais — confirmado por ausência total de tabela, model, rota ou componente.

### 4.1 User

- **Responsabilidade:** identidade, credencial (`password_hash`), papel (`role`), pertencimento a grupo (`tenant_id`), estado (`is_active`) e invalidação de sessão (`token_version`).
- **Model:** [models/User.js](server/src/models/User.js) · **Tabela:** `users` — ⚠️ **sem migration de criação** (§7.1).
- **Relacionamentos:** `created_by → users.id` (auto-referência, FK declarada em `017`), `tenant_id → users.id` (FK em `021`). É o dono (`user_id`) de todas as outras entidades — mas **sem FK** em nenhuma delas.
- **Ownership:** raiz de tudo. `tenant_id` aponta para o admin-raiz do grupo.
- **Onde é usado:** `authMiddleware`, `tenantScope.getScopeIds`, `userController` (CRUD admin), `AdminUsers.jsx`.
- **Regras de negócio identificadas:**
  - Dois papéis apenas: `'admin'` e `'user'` ([userController.js:185](server/src/controllers/userController.js#L185)).
  - Usuário criado por admin herda o `tenant_id` do criador e nasce sempre `role: 'user'` ([User.js:52-88](server/src/models/User.js#L52)).
  - Usuário criado por registro público é **seu próprio tenant** (`tenant_id = id`, [User.js:37](server/src/models/User.js#L37)).
  - Registro público **desabilitado por padrão** (`ALLOW_PUBLIC_REGISTER`, [authController.js:13](server/src/controllers/authController.js#L13)).
  - Admin não pode desativar, excluir nem alterar o próprio papel ([userController.js:138,181,221](server/src/controllers/userController.js#L138)).
  - Toda operação admin sobre outro usuário exige mesmo tenant (`assertSameTenant`, [userController.js:11-31](server/src/controllers/userController.js#L11)).
  - Desativação e troca de papel incrementam `token_version` → invalidam JWTs vivos ([User.js:288,348](server/src/models/User.js#L288)).
  - Exclusão permanente exige decisão explícita: transferir dados para outro usuário **ou** apagar tudo ([userController.js:216-246](server/src/controllers/userController.js#L216)).
  - Dados de usuário desativado permanecem visíveis ao grupo — decisão explícita e comentada ([User.js:123](server/src/models/User.js#L123)).
- **NEEDS_CONFIRMATION:** existe constraint `UNIQUE` em `users.email`? Nenhuma migration cria uma (§7.1). Sem ela, `createUser` tem race condition (checa-depois-insere) e `findByEmail().single()` passa a lançar erro com e-mail duplicado.
- **UNKNOWN:** um admin pode promover outro membro do tenant a admin ([userController.js:176-209](server/src/controllers/userController.js#L176)). O código permite; se é intenção de produto ou herança de migração, não é determinável.

### 4.2 Athlete

- **Responsabilidade:** o lutador que o usuário treina/representa. Atributos físico-técnicos + perfil consolidado por IA.
- **Model:** [models/Athlete.js](server/src/models/Athlete.js) · **Tabela:** `athletes` (migration `001`, colunas adicionadas em `002`, `012`).
- **Campos:** `name`(NOT NULL), `belt`, `weight`, `height`, `age`, `style`, `strong_attacks`, `weaknesses`, `video_url`, `cardio`, `technical_profile`(JSONB), `technical_summary`(TEXT), `technical_summary_updated_at`, `user_id`(VARCHAR 255).
- **Relacionamentos:** `user_id` → dono (sem FK). Referenciado por `fight_analyses.person_id` e `tactical_analyses.athlete_id` — **ambos sem FK**.
- **Ownership:** `athletes.user_id`. Leitura via `.in('user_id', allowedUserIds)`; escrita via `.eq('user_id', userId)`.
- **Onde é usado:** `athleteController`, `strategyController`, `aiController`, `chatController`, `linkController`, `fightAnalysisController`; front: `Athletes.jsx`, `AthleteDetail.jsx`, `Strategy.jsx`, `AthleteForm.jsx`.
- **Regras identificadas:**
  - Só `name` é obrigatório ([athleteController.js:56](server/src/controllers/athleteController.js#L56)).
  - **Defaults inventados na criação:** `age: 25`, `weight: 75`, `belt: 'Branca'`, `style: 'Guarda'`, `cardio: 50` ([athleteController.js:63-73](server/src/controllers/athleteController.js#L63)). Dado fabricado exibido depois como fato (= F6 da SPEC-FRONTEND).
  - `update` faz allow-list explícita de campos ([Athlete.js:111-127](server/src/models/Athlete.js#L111)) — **sem mass assignment**, apesar de o controller passar `req.body` inteiro. Boa defesa em profundidade.
  - `Opponent` é **estruturalmente idêntico** — mesma tabela-espelho, mesmo parser (`parseOpponentFromDB = parseAthleteFromDB`, [dbParsers.js:71](server/src/utils/dbParsers.js#L71)).

### 4.3 Opponent

- Idem Athlete em todos os aspectos: mesmas colunas, mesmo model (`models/Opponent.js`, cópia de `Athlete.js`), mesmo parser, mesmas regras. **Distinção puramente semântica**: `Athlete` = quem eu treino; `Opponent` = quem vou enfrentar.
- `fight_analyses.person_type ∈ {'athlete','opponent'}` é o discriminador polimórfico ([001-schema.sql:41](server/migrations/001-schema.sql#L41)).
- **Observação de modelagem:** duas tabelas idênticas + dois models idênticos onde uma tabela com um discriminador (ou um papel na relação) resolveria. Duplica toda a lógica de CRUD, escopo e parsing. Ver §13 (MEDIUM).

### 4.4 Fight Analysis

- **Responsabilidade:** resultado da análise de **um ou mais vídeos** de luta de uma pessoa pela IA.
- **Model:** [models/FightAnalysis.js](server/src/models/FightAnalysis.js) · **Tabela:** `fight_analyses` (`001`, alterada em `002`, `010`, `011`).
- **Campos:** `person_id`+`person_type` (FK polimórfica, sem constraint), `video_url`, `charts`(JSONB), `summary`, `technical_profile`, `technical_stats`(JSONB, migration `011`), `frames_analyzed`, `current_version`, `is_edited`, `original_summary`, `original_charts`, `user_id`(VARCHAR).
- **Ownership:** `fight_analyses.user_id`. ⚠️ **Aplicado só na leitura.** `update()` e `delete()` no model **não filtram** `user_id` ([FightAnalysis.js:132,166](server/src/models/FightAnalysis.js#L132)).
- **Onde é usado:** `fightAnalysisController`, `linkController`, `chatController`, `strategyService`; front: `VideoAnalysis.jsx`, `AnalysisDetailModal.jsx`, `VideoAnalysisCard.jsx`, `Overview.jsx`.
- **Regras identificadas:**
  - `person_type` restrito a `athlete|opponent`, validado no controller ([fightAnalysisController.js:99-105](server/src/controllers/fightAnalysisController.js#L99)) **e** por CHECK no banco. Mas **`linkController` não valida** antes de inserir ([linkController.js:178-190](server/src/controllers/linkController.js#L178)) — depende do CHECK, e o erro é engolido.
  - A pessoa precisa existir e pertencer ao escopo do usuário — **só em `fightAnalysisController.createAnalysis`** ([:108-119](server/src/controllers/fightAnalysisController.js#L108)). `linkController` **não faz essa verificação**.
  - Após criar/deletar análise, o resumo técnico da pessoa é regenerado (`refreshTechnicalSummary`, [fightAnalysisController.js:14-41](server/src/controllers/fightAnalysisController.js#L14)); se sobra zero análise, o resumo é limpo ([:182-193](server/src/controllers/fightAnalysisController.js#L182)).
  - Gráficos são normalizados para somar 100% ([geminiService.js:341-352](server/src/services/geminiService.js#L341)) — A3 da SPEC-ANALISE-IA critica isso como metodologia não auditável, e a crítica procede.
- **🐛 Bug confirmado:** `Athlete.updateTechnicalProfile(personId, technicalProfile)` é chamado com **2 argumentos** ([fightAnalysisController.js:140,142](server/src/controllers/fightAnalysisController.js#L140)) mas a assinatura exige 3 (`id, analysisData, userId`, [Athlete.js:159](server/src/models/Athlete.js#L159)). Com `userId === undefined`, o `getById` interno filtra `.in('user_id', [undefined])`, não acha nada e retorna `null` → **a função é um no-op silencioso**. O campo `technical_profile` nunca é atualizado por esse caminho.

### 4.5 Strategy / Tactical Analysis

Aqui há uma armadilha de nomenclatura que precisa ser explicitada: **"Strategy" e "Analysis" nomeiam coisas diferentes em camadas diferentes.**

- **Entidade persistida:** `tactical_analyses` (migration `007`), model `models/TacticalAnalysis.js`.
- **Campos:** `user_id`(UUID), `athlete_id`, `athlete_name`(desnormalizado), `opponent_id`, `opponent_name`(desnormalizado), `strategy_data`(JSONB — a estratégia inteira), `metadata`(JSONB — modelo, tokens, contagens).
- **Responsabilidade:** cruzar Athlete × Opponent e produzir um plano tático via IA.
- **Ownership:** `tactical_analyses.user_id`, aplicado com `.in('user_id', ids)` em **todos** os métodos do model (`getAll`, `getById`, `delete`, `update`, `count`, `getRecent`) — **este model é o mais consistente do projeto**.
- **Onde é usado:** `strategyController`, `strategyVersionController`, `StrategyService`; front: `Strategy.jsx`, `Analyses.jsx`, `AiStrategyBox.jsx`, `StrategySummaryModal.jsx`.
- **Regras identificadas:**
  - Atleta **e** adversário precisam existir no escopo do grupo ([strategyController.js:33-43](server/src/controllers/strategyController.js#L33)).
  - **Ambos precisam ter ≥ 1 análise de luta**, com mensagem de erro específica por lado ([strategyService.js:507-513](server/src/services/strategyService.js#L507)).
  - Se existe `technical_summary` salvo, ele é reutilizado em vez de reconsolidar via IA — otimização explícita de custo ([strategyService.js:520-539](server/src/services/strategyService.js#L520)).
  - **A faixa mais restritiva entre os dois competidores governa as técnicas sugeridas** ([geminiService.js:515-524](server/src/services/geminiService.js#L515)); faixa desconhecida cai no conjunto mais restritivo (branca) como fallback seguro ([geminiService.js:91-104](server/src/services/geminiService.js#L91)). Boa regra, bem implementada.
  - Falha ao salvar no histórico **não derruba** a geração da estratégia ([strategyController.js:68-73](server/src/controllers/strategyController.js#L68)).
  - Edição de estratégia valida o shape da seção antes de persistir (`validateStrategyField`, [strategyController.js:241-247](server/src/controllers/strategyController.js#L241)).

### 4.6 Análises (o que a UI chama de "Analyses")

Não é uma entidade — é uma **tela** (`pages/Analyses.jsx`) que lista `tactical_analyses`. Enquanto o card "Análises" do Overview conta `fight_analyses` e linka para `/analyses`, que mostra `tactical_analyses`: duas fontes diferentes sob o mesmo rótulo (= F8 da SPEC-FRONTEND, ainda aberto).

### 4.7 Entidades de suporte

| Entidade | Tabela | Model | Ownership | Estado |
|---|---|---|---|---|
| ChatSession | `ai_chat_sessions` (`010`,`013`,`014`) | `ChatSession.js` | `user_id` — aplicado em `getById`/`getByContext`/`delete`, **ausente** em `addMessage`, `addMessages`, `updateContextSnapshot` | funcional; `updateContextSnapshot` é IDOR (§6) |
| AnalysisVersion | `analysis_versions` (`010`) | `AnalysisVersion.js` | **NENHUM** — a tabela **não tem coluna `user_id`** | funcional e globalmente exposto (§6) |
| ProfileVersion | `profile_versions` (`013`) | `ProfileVersion.js` | `user_id` em todos os métodos | **QUEBRADO** — nunca grava (§9 HIGH-6) |
| StrategyVersion | `strategy_versions` (`016`) | `StrategyVersion.js` | `user_id` em todos os métodos | funcional |
| ApiUsage | `api_usage` (`003`,`004`,`006`) | `ApiUsage.js` | `user_id` | provavelmente bloqueado por RLS (§7.3) |

**Tipos de contexto de chat** (`context_type`): `analysis`, `strategy`, `profile` (CHECK, migration `013`). `context_id` é nullable desde `014` para estratégias não persistidas.

---

## 5. Authentication

### 5.1 Como funciona

**Login** — [authController.js:78-128](server/src/controllers/authController.js#L78)

1. `POST /api/auth/login` `{email, password, rememberMe}`, atrás de `authLimiter` (20 req / 15 min / IP).
2. `User.findByEmail(email)` — normaliza `.toLowerCase().trim()`.
3. Se não existe → 401 genérico.
4. **Se `is_active === false` → 403 (antes de verificar a senha).** ← vetor de enumeração (§9 MEDIUM-2).
5. `bcrypt.compare` → 401 genérico se falhar.
6. `generateToken(user.id, role, rememberMe, token_version)` → JWT HS256 com `{userId, role, tokenVersion}`, expiração **7 d** ou **30 d** com `rememberMe`.
7. `updateLastLogin`, devolve `{user:{id,name,email,role}, token}` — **sem `password_hash`** (correto).

**Registro** — [authController.js:33-76](server/src/controllers/authController.js#L33): desabilitado por padrão. A checagem de `ALLOW_PUBLIC_REGISTER` acontece **antes** de `findByEmail` (ordem correta: não vaza existência de e-mail quando desligado). Senha mínima 6 caracteres; e-mail validado com `/^\S+@\S+\.\S+$/` e limite de 254 chars — regex deliberadamente sem aninhamento para evitar ReDoS, com comentário explicando ([userController.js:61-63](server/src/controllers/userController.js#L61)). Boa decisão.

**Sessão / token** — [middleware/auth.js:46-111](server/src/middleware/auth.js#L46)

Stateless. `Authorization: Bearer <jwt>`. Nenhum cookie → **CSRF não se aplica** (§9). Sem refresh token e **sem revogação individual** além do `token_version`.

A validação por request faz três coisas que merecem crédito:

1. **O `role` vem do banco, não do token** ([auth.js:96](server/src/middleware/auth.js#L96)) — um JWT com `role` alterado ou obsoleto não escala privilégio.
2. **`is_active` é reconsultado** → conta desativada é rejeitada mesmo com token válido.
3. **`token_version` do token é comparado com o do banco** → troca de papel/desativação invalida sessões vivas imediatamente.

Cache em memória `Map` com TTL de 5 min e teto de 5000 entradas (evicção FIFO) para não consultar o banco a cada request; `evictAuthCache(userId)` é chamado em toda mutação sensível ([userController.js:145,163,194,240](server/src/controllers/userController.js#L145)).

**Identificação do usuário:** `req.user = {id, role}` e `req.userId` ([auth.js:96-97](server/src/middleware/auth.js#L96)).
**Identificação de admin:** `req.user.role === 'admin'`, verificado por `adminMiddleware` ([adminMiddleware.js:7](server/src/middleware/adminMiddleware.js#L7)), aplicado em `/api/admin/*` e `/api/debug/env-check`.

**Frontend:** JWT e objeto do usuário em `localStorage` (`jiumetrics_token`, `jiumetrics_user`); interceptor do axios injeta o header e, em 401, limpa o storage, emite `auth:logout` e redireciona ([api.js:33-60](frontend/src/services/api.js#L33)). `AuthProvider` limpa o cache do React Query em login e logout ([AuthContext.jsx:32-43](frontend/src/contexts/AuthContext.jsx#L32)) — evita vazamento de dados entre contas na mesma aba. Boa decisão.

### 5.2 Problemas de autenticação

| # | Problema | Arquivo / função | Impacto | Severidade | Recomendação |
|---|---|---|---|---|---|
| A-1 | **Fallback abre a porta quando o banco falha.** Se `User.getAuthInfo` lançar, o middleware segue com `role` **do token** | [auth.js:99-105](server/src/middleware/auth.js#L99) `authMiddleware` | Uma indisponibilidade do Supabase reabilita todas as três proteções desligadas: token de conta desativada volta a valer, `token_version` deixa de ser checado, e o `role` do token volta a ser aceito. Um atacante com JWT antigo de admin só precisa que o banco fique instável | **HIGH** | Falhar fechado (401/503). Se disponibilidade é requisito, servir do cache expirado — nunca do token |
| A-2 | **Enumeração de usuários.** 403 "Sua conta está desativada" é retornado antes do `bcrypt.compare` | [authController.js:96-99](server/src/controllers/authController.js#L96) `login` | Descobre quais e-mails existem como conta desativada sem saber a senha. Também dá um oráculo de timing (não passa por bcrypt) | **MEDIUM** | Verificar a senha primeiro; só então diferenciar a resposta |
| A-3 | **PII e ruído em log por request.** E-mail logado em toda tentativa de login; presença de header + path logados em **todo** request autenticado | [authController.js:81,89,113](server/src/controllers/authController.js#L81) · [auth.js:50-53](server/src/middleware/auth.js#L50) | E-mails em texto claro nos logs da Vercel (retidos, acessíveis a quem tem o projeto). Relevante para LGPD. Além disso, um `console.log` por request em serverless custa e polui | **MEDIUM** | Remover PII; condicionar logs de auth a `NODE_ENV !== 'production'` |
| A-4 | **Sem rotação nem revogação seletiva.** Token de 30 dias com `rememberMe`, sem refresh | `generateToken` [authController.js:25-31](server/src/controllers/authController.js#L25) | Token vazado vale até 30 dias. A única revogação é `token_version`, que derruba **todas** as sessões do usuário | **MEDIUM** | Access token curto + refresh token; ou reduzir os 30 d |
| A-5 | **Sem recuperação de senha.** Não há rota de reset/forgot | `routes/auth.js` | Usuário que esquece a senha depende de um admin. Não é bug, é lacuna de produto que gera ticket | **LOW** | Decisão de produto |
| A-6 | **`/register` acessível na SPA com registro desligado no servidor** | [App.jsx:57](frontend/src/App.jsx#L57) · [authController.js:49](server/src/controllers/authController.js#L49) | Usuário preenche o formulário e recebe 403. `ALLOW_PUBLIC_REGISTER` nem está documentado no `.env.example` | **LOW** | Esconder a rota quando desabilitado; documentar a variável |

---

## 6. Authorization

### 6.1 O modelo pretendido

Um helper de 8 linhas define todo o escopo de dados ([tenantScope.js:10-15](server/src/utils/tenantScope.js#L10)):

```js
async function getScopeIds(req, User) {
  if (req.user?.role === 'admin') return User.getGroupUserIds(req.userId); // todos do tenant
  return [req.userId];                                                     // só o próprio
}
```

Isso implementa corretamente o requisito de produto **"usuário comum vê apenas as próprias análises"**, e admin vê o grupo inteiro (mesmo `tenant_id`). Padrão certo, helper único, fácil de auditar. O problema é que **não é obrigatório**.

Aplicado corretamente em: `athleteController` (5/5 métodos), `opponentController` (5/5), `fightAnalysisController` (5/5), `strategyController` (5/5), `usageController`, `aiController.consolidateProfile`, `chatController.createSession`, `chatController.applyEdit`.

### 6.2 Falhas de autorização

Cada item abaixo foi confirmado seguindo a cadeia controller → model até a query.

---

**AZ-1 · CRITICAL · Rota de debug expõe as análises de todos os tenants**

- **Arquivo/endpoint:** [server/src/routes/fightAnalysis.js:15-45](server/src/routes/fightAnalysis.js#L15) — `GET /api/fight-analysis/debug/all`
- **Problema:** query direto no arquivo de rota, `.select('*')` em `fight_analyses` **sem nenhum filtro de `user_id`**. Exige apenas autenticação — qualquer usuário comum serve. O código está marcado `// ⚠️ DEBUG TEMPORÁRIO - Buscar análises SEM filtro de usuário`.
- **Impacto:** vazamento completo entre tenants: `id`, `person_id`, `person_type`, `user_id` e `created_at` de **todas** as análises do sistema. Os `user_id` e `id` colhidos aqui alimentam diretamente os IDORs AZ-2/3/4.
- **Recomendação:** remover a rota. Se o diagnóstico é necessário, exigir `adminMiddleware` **e** escopo de tenant.

---

**AZ-2 · CRITICAL · Escrita cross-tenant em `manual-edit` (sem verificação de posse)**

- **Arquivo/função:** [chatController.js:274-330](server/src/controllers/chatController.js#L274) — `exports.manualEdit`, `POST /api/chat/manual-edit`
- **Problema:** usa `FightAnalysis.getById(analysisId)` ([:287](server/src/controllers/chatController.js#L287)) — a variante **sem** filtro de usuário ([FightAnalysis.js:68-77](server/src/models/FightAnalysis.js#L68)) — e depois `FightAnalysis.update(analysisId, updateData)`, cujo model também **não filtra `user_id`** ([FightAnalysis.js:151-155](server/src/models/FightAnalysis.js#L151)). O `analysisId` vem cru do `req.body`. Compare com `applyEdit` ([:203-204](server/src/controllers/chatController.js#L203)), que faz a checagem certa — a inconsistência é dentro do mesmo arquivo.
- **Impacto:** qualquer usuário autenticado sobrescreve `summary`, `charts` ou `technical_stats` de **qualquer análise de qualquer tenant**. Corrupção silenciosa de dados de terceiros — a vítima não tem sinal algum.
- **Recomendação:** `getScopeIds` + `getByIdAndUser`, como em `applyEdit`.

---

**AZ-3 · CRITICAL · Leitura cross-tenant do histórico de versões**

- **Arquivo/função:** [chatController.js:336-351](server/src/controllers/chatController.js#L336) — `exports.getVersions`, `GET /api/chat/versions/:analysisId`
- **Problema:** `AnalysisVersion.getByAnalysisId(analysisId, type)` sem qualquer noção de usuário. **Nenhum** método de `AnalysisVersion` filtra por usuário — e a tabela `analysis_versions` **não tem coluna `user_id`** ([010-ai-chat-sessions.sql](server/migrations/010-ai-chat-sessions.sql)), então não há como filtrar sem alterar o schema.
- **Impacto:** leitura do conteúdo **completo** (`content` JSONB: summary, charts, stats) de todas as versões de qualquer análise. O `type` do query string também vai cru para a query, sem validação.
- **Recomendação:** validar a posse da análise-pai antes de listar versões (a autorização precisa vir de `fight_analyses`, não de `analysis_versions`).

---

**AZ-4 · CRITICAL · Escrita cross-tenant em `restore-version`**

- **Arquivo/função:** [chatController.js:357-414](server/src/controllers/chatController.js#L357) — `exports.restoreVersion`, `POST /api/chat/restore-version`
- **Problema:** nenhuma verificação de posse em nenhum ponto. Busca a versão por `(analysisId, versionNumber)` do `req.body`, faz `FightAnalysis.update(analysisId, ...)` ([:395](server/src/controllers/chatController.js#L395)) e `AnalysisVersion.setAsCurrent` ([:402](server/src/controllers/chatController.js#L402)).
- **Impacto:** reverte a análise de outro tenant para uma versão arbitrária **e** altera o ponteiro `is_current` do histórico dele. Destrutivo e persistente.
- **Recomendação:** mesma correção de AZ-2.

---

**AZ-5 · HIGH · Escrita cross-tenant no snapshot de sessão de chat**

- **Arquivo/função:** [chatController.js:254-256](server/src/controllers/chatController.js#L254) — dentro de `applyEdit`
- **Problema:** `if (sessionId) { await ChatSession.updateContextSnapshot(sessionId, updatedAnalysis); }`. O `sessionId` vem do `req.body` e **nunca é validado**; `updateContextSnapshot` filtra só por `.eq('id', sessionId)` ([ChatSession.js:169-179](server/src/models/ChatSession.js#L169)) e usa **`supabaseAdmin`** (RLS ignorado). Ironicamente, o mesmo handler valida corretamente a posse da *análise* logo acima.
- **Impacto:** sobrescreve o `context_snapshot` da sessão de chat de qualquer usuário — envenenando o contexto que a IA daquele usuário recebe nos turnos seguintes (o snapshot é o primeiro turno da conversa, [geminiService.js:769-782](server/src/services/geminiService.js#L769)).
- **Recomendação:** filtrar por `user_id` em `updateContextSnapshot`, ou validar a sessão antes.

---

**AZ-6 · HIGH · Análise pode ser vinculada a pessoa de outro tenant**

- **Arquivo/função:** [linkController.js:178-190](server/src/controllers/linkController.js#L178) — `analyzeLink`, `POST /api/ai/analyze-link`
- **Problema:** `personId`/`personType` vêm do `req.body` e a análise é criada **sem verificar** que a pessoa existe e pertence ao usuário. O caminho equivalente em `fightAnalysisController.createAnalysis` **faz** essa verificação ([:108-119](server/src/controllers/fightAnalysisController.js#L108)) — mesma operação, dois níveis de rigor.
- **Impacto:** cria registros vinculados a `person_id` de outro tenant. Não vaza leitura (a listagem filtra por `user_id`), mas corrompe a integridade referencial e envenena as consolidações de perfil daquela pessoa, que agregam por `person_id`.
- **Recomendação:** replicar a validação de `createAnalysis`; validar `personType` antes de confiar no CHECK do banco.

---

**AZ-7 · HIGH · Corpo arbitrário enviado à IA sem posse nem validação**

- **Arquivo/função:** [aiController.js:27-55](server/src/controllers/aiController.js#L27) — `generateAthleteSummary`, `POST /api/ai/athlete-summary`
- **Problema:** `athleteData` é aceito **inteiro do `req.body`** e serializado direto no prompt (`JSON.stringify(analyses)`, [geminiService.js:573](server/src/services/geminiService.js#L573)). Sem validação de schema, sem limite de tamanho (teto é o `express.json({limit:'10mb'})`), sem verificar que o atleta pertence a alguém.
- **Impacto:** três problemas em um: (a) abuso de custo — qualquer usuário manda 10 MB de texto arbitrário para o Gemini na conta da organização; (b) prompt injection direta, sem nenhuma mitigação nesse caminho; (c) o endpoint não tem relação nenhuma com o `user_id` do chamador.
- **Recomendação:** aceitar `athleteId` e carregar os dados server-side sob escopo de tenant.

---

**AZ-8 · MEDIUM · Passagem de escopo inconsistente no chat de perfil**

- **Arquivo/função:** [chatController.js:458,581,664](server/src/controllers/chatController.js#L458) — `createProfileSession`, `saveProfileSummary`, `restoreProfileVersion`
- **Problema:** chamam `Model.getById(personId, userId)` com o `userId` **escalar**, enquanto o resto do sistema passa o array `allowedUserIds` de `getScopeIds`. O model absorve os dois (`Array.isArray(...) ? ... : [x]`, [Athlete.js:65](server/src/models/Athlete.js#L65)), então não quebra — mas **admin perde o acesso ao grupo** nesses três caminhos (comportamento divergente do resto), e a intenção de escopo deixa de ser legível.
- **Impacto:** inconsistência funcional para admin + fragilidade: o próximo leitor não sabe qual é o contrato.
- **Recomendação:** usar `getScopeIds` uniformemente.

---

**AZ-9 · MEDIUM · Autorização no frontend é apenas cosmética (e isso está correto — mas frágil)**

- **Arquivo:** [ProtectedRoute.jsx:16-18](frontend/src/components/routing/ProtectedRoute.jsx#L16) · [AuthContext.jsx:45](frontend/src/contexts/AuthContext.jsx#L45)
- **Problema:** `isAdmin` deriva de `user.role` lido do **`localStorage`**. Um usuário pode editar `jiumetrics_user` e liberar a rota `/admin/users` na UI.
- **Impacto:** **limitado a UI** — o backend reconsulta o `role` no banco ([auth.js:96](server/src/middleware/auth.js#L96)) e `adminMiddleware` bloqueia. **Não há escalonamento real de privilégio.** O risco é o usuário ver telas que não deveria e a equipe confundir controle de UI com controle de acesso no futuro.
- **Recomendação:** manter o backend como fonte de verdade (já é) e documentar que `ProtectedRoute` é UX, não segurança.

---

**Escalonamento de privilégio — resultado da busca:** **nenhum caminho encontrado.** Verifiquei: `role` do token não é confiado; `createSubUser` força `role: 'user'` ([User.js:72](server/src/models/User.js#L72)); `changeRole` valida enum, proíbe auto-alteração e exige mesmo tenant; `User.update` recebe apenas objetos montados explicitamente pelo controller (sem mass assignment de `role`). Esta parte foi bem feita.

**Dados retornados em excesso:** `password_hash` **nunca** é serializado numa resposta (verificado em todos os `res.json` e `.select()`) — `findByEmail` o inclui, mas só para o `bcrypt.compare`. Os excessos reais são: (a) AZ-1 devolvendo `user_id` de todos os tenants; (b) `getVersions` (AZ-3) devolvendo `content` completo; (c) `strategyVersionController.getVersions` devolvendo `content` **inteiro** de cada versão junto com o preview ([strategyVersionController.js:26](server/src/controllers/strategyVersionController.js#L26)) — payload desnecessariamente grande, mas com escopo de usuário correto.

---

## 7. Database

**Plataforma:** Supabase/PostgreSQL, projeto `ikjudbypwfvdywlgzsjr` (região informada como São Paulo em `.archived/SUPABASE_SETUP.md`). Acesso exclusivamente via PostgREST (`supabase-js`). **Sem ORM, sem migration runner, sem schema declarativo.**

### 7.1 Tabelas

| Tabela | Criada em | Colunas-chave | RLS (nas migrations) |
|---|---|---|---|
| `users` | ⚠️ **NENHUMA MIGRATION** — só `ALTER` em `017`/`021`/`023` | `id`, `name`, `email`, `password_hash`, `role`, `created_by`→users, `is_active`, `tenant_id`→users, `token_version`, `last_login` | **UNKNOWN** |
| `athletes` | `001` | `id`, `name`, `belt`, `weight`, `height`, `age`, `style`, `strong_attacks`, `weaknesses`, `video_url`, `cardio`, `technical_profile`(JSONB), `technical_summary`(`012`), `user_id` VARCHAR(255)(`002`) | **DESLIGADO** (`008`,`009`) |
| `opponents` | `001` | idêntico a `athletes` | **DESLIGADO** (`008`,`009`) |
| `fight_analyses` | `001` | `person_id`, `person_type` CHECK, `video_url`, `charts`(JSONB), `summary`, `technical_profile`, `technical_stats`(JSONB,`011`), `frames_analyzed`, `current_version`/`is_edited`/`original_*`(`010`), `user_id` VARCHAR(255) | **DESLIGADO** (`008`,`009`) |
| `tactical_analyses` | `007` | `user_id` UUID, `athlete_id`, `athlete_name`, `opponent_id`, `opponent_name`, `strategy_data`(JSONB), `metadata`(JSONB) | ligado, políticas `USING (true)` (`007`,`015`) |
| `ai_chat_sessions` | `010` | `user_id` UUID, `context_type` CHECK(`013`), `context_id` (nullable `014`), `context_snapshot`(JSONB), `messages`(JSONB), `title`, `is_active` | ligado, `USING (true)` |
| `analysis_versions` | `010` | `analysis_id`, `analysis_type` CHECK, `version_number`, `content`(JSONB), `edited_by` CHECK, `edit_reason`, `is_current`, `chat_session_id`→ai_chat_sessions **(única FK real do domínio)**. **SEM `user_id`** | ligado, `USING (true)` (só SELECT/INSERT) |
| `profile_versions` | `013` | `person_id`, `person_type` CHECK, `user_id` UUID, `version_number`, `content` TEXT, `edited_by` CHECK, `is_current` | ligado, `auth.uid() = user_id` |
| `strategy_versions` | `016` | `analysis_id`→**tactical_analyses ON DELETE CASCADE**, `user_id` UUID, `version_number`, `content`(JSONB), `edited_field`, `edited_by` CHECK, `is_current` | ligado, `auth.uid() = user_id` |
| `api_usage` | `003`→`004`→`006` | `user_id` UUID, `model_name`, `operation_type`, `prompt_tokens`, `completion_tokens`, `total_tokens`, `estimated_cost_usd` DECIMAL(10,6), `metadata`(JSONB) | ligado, `auth.uid() = user_id` |

### 7.2 Índices, constraints e FKs

**Índices** (todos declarados nas migrations): `fight_analyses(person_id, person_type)`, `fight_analyses(created_at DESC)`, `fight_analyses(user_id)`, `athletes(name)`, `athletes(user_id)`, `opponents(name)`, `opponents(user_id)`, `api_usage(user_id|created_at|model_name)`, `tactical_analyses(user_id|athlete_id|opponent_id|created_at DESC)`, `ai_chat_sessions(user_id|context|created_at)`, `analysis_versions(analysis+type|current parcial|created_at)`, `profile_versions(person|user|version)`, `strategy_versions(analysis|user|version|current parcial)`, `users(role|is_active|tenant_id)`. **A cobertura de índices é boa** — as colunas de filtro quente estão indexadas, incluindo dois índices parciais bem colocados em `is_current`.

**Foreign keys existentes:** apenas 4 — `users.created_by→users`, `users.tenant_id→users`, `analysis_versions.chat_session_id→ai_chat_sessions`, `strategy_versions.analysis_id→tactical_analyses (CASCADE)`.

**Foreign keys ausentes (deliberadamente removidas):** a migration `008` **derruba** `athletes_user_id_fkey`, `opponents_user_id_fkey`, `fight_analyses_user_id_fkey` e converte `user_id` de UUID para `VARCHAR(255)`. O motivo está escrito na migration: as FKs apontavam para `auth.users` (Supabase Auth), que o projeto abandonou em favor do JWT próprio. A correção foi remover a FK em vez de reapontá-la para `public.users`.

**Constraints `UNIQUE`: ZERO em todo o diretório de migrations** — incluindo `users.email`.

### 7.3 Problemas do banco

**DB-1 · CRITICAL · RLS desligado + chave anon publicada = banco alcançável sem o backend**

- **Evidência:** [008-corrigir-constraint.sql:16-18](server/migrations/008-corrigir-constraint.sql#L16) e [009-execute-este.sql:14-16](server/migrations/009-execute-este.sql#L14) executam `ALTER TABLE ... DISABLE ROW LEVEL SECURITY` em `athletes`, `opponents`, `fight_analyses`. [004-api-usage-final.sql:69](server/migrations/004-api-usage-final.sql#L69) faz `GRANT ALL ON public.api_usage TO anon, authenticated`. A URL do projeto e a chave publicável estão em [frontend/.env.production](frontend/.env.production), **arquivo rastreado pelo git**.
- **Problema:** com RLS desligado e os GRANTs default do Supabase para o papel `anon`, quem tiver a chave publicável fala com o PostgREST direto (`/rest/v1/athletes?select=*`) — **sem JWT da aplicação, sem rate limit, sem os filtros de tenant**. Toda a autorização do §6 é contornável. As tabelas com `USING (true)` (`tactical_analyses`, `ai_chat_sessions`, `analysis_versions`) estão no mesmo barco: RLS ligado mas sem efeito.
- **Impacto:** leitura e escrita de todos os atletas, adversários, análises, estratégias e sessões de chat de todos os tenants.
- **NEEDS_CONFIRMATION:** (a) o repositório `lucasxtech/JiuMetrics` é público? (b) os GRANTs de `anon` foram revogados manualmente no dashboard? (c) o estado atual de RLS confere com as migrations? Nada disso é determinável pelo código — **verificar no dashboard do Supabase é o primeiro item da próxima etapa**.
- **Recomendação:** decidir explicitamente o modelo — (i) revogar todo acesso de `anon`/`authenticated` às tabelas e falar só via `service_role` no backend, **ou** (ii) reativar RLS com políticas reais. A opção (i) é coerente com a arquitetura atual (JWT próprio) e é bem menos trabalho. Rotacionar a chave de qualquer forma.

**DB-2 · HIGH · `api_usage` provavelmente nunca gravou nada**

- **Evidência:** as políticas exigem `auth.uid() = user_id` ([004](server/migrations/004-api-usage-final.sql#L57), [006](server/migrations/006-fix-api-usage-policy.sql#L38)) para SELECT e INSERT. Mas `models/ApiUsage.js` usa o cliente **`supabase` (anon)** ([ApiUsage.js:1](server/src/models/ApiUsage.js#L1)), e o projeto **não usa Supabase Auth** — `auth.uid()` é `NULL` para a chave anon. `NULL = user_id` nunca é verdadeiro.
- **Problema:** o INSERT é rejeitado pela política; o erro é capturado e transformado em `console.warn` ([apiUsageLogger.js:29,56](server/src/utils/apiUsageLogger.js#L29)) — falha 100% silenciosa. O SELECT de `getUsageStats` retorna vazio pelo mesmo motivo.
- **Impacto:** **o rastreamento de custo de IA — o único controle financeiro do produto — não funciona.** A tela `Settings` e o card de custo do `Overview` mostram zero como se fosse dado real. Sem visibilidade de gasto, os riscos de abuso de custo do §9 são invisíveis.
- **NEEDS_CONFIRMATION:** RLS de `api_usage` pode ter sido desligado manualmente no dashboard. Consulta de 1 minuto: `SELECT count(*) FROM api_usage;` — se houver linhas recentes, minha conclusão está errada e o problema é outro.
- **Recomendação:** usar `supabaseAdmin` neste model (é escrita de sistema, não de usuário) ou ajustar a política.

**DB-3 · HIGH · O diretório de migrations não é a fonte de verdade do schema**

- `users` — a tabela central de identidade — **nunca é criada por uma migration**. Só recebe `ALTER` em `017`, `021`, `023`. Foi criada à mão no dashboard.
- **Falta a migration `020`** (a sequência é 001–019, 021–023).
- **Não há runner nem controle de estado.** O [migrations/README.md](server/migrations/README.md) instrui a colar SQL no editor do Supabase, na ordem, à mão. Não existe tabela de migrations aplicadas.
- **O README está desatualizado:** documenta até a `009` e diz "Execute sempre na ordem numérica (001 → 009)", ignorando 13 migrations posteriores.
- **Migrations sobrepostas e contraditórias:** `001` cria políticas permissivas → `002` derruba e desliga RLS → `005` recria `USING (true)` → `008`/`009` desligam de novo. `003` → `004` (`DROP TABLE ... CASCADE`) → `006` recriam `api_usage` três vezes com políticas diferentes.
- **Impacto:** **é impossível reconstruir o banco a partir do repositório**, e impossível saber o que está aplicado em produção. Qualquer trabalho de schema começa com arqueologia no dashboard.
- **Recomendação:** extrair o schema real (`pg_dump --schema-only`) e commitá-lo como baseline; adotar um runner (Supabase CLI) daí para frente.

**DB-4 · HIGH · Tipos de `user_id` divergentes na mesma coluna semântica**

- `athletes.user_id`, `opponents.user_id`, `fight_analyses.user_id` → **VARCHAR(255)** (`008`).
- `tactical_analyses.user_id`, `ai_chat_sessions.user_id`, `profile_versions.user_id`, `strategy_versions.user_id`, `api_usage.user_id` → **UUID**.
- **Impacto:** (a) `.in('user_id', ids)` compara string com string nas três primeiras — funciona, mas aceita **qualquer string**, então um `user_id` inválido nunca é rejeitado pelo banco; (b) a migration `019` precisa de casts explícitos (`user_id::UUID = ANY(...)`, [019:41](server/migrations/019-consolidate-data-to-owner.sql#L41)) e só funciona filtrando `user_id <> ''` — evidência de que já houve dado sujo; (c) nenhuma FK possível sem unificar o tipo primeiro; (d) o no-op silencioso do §4.4 (`user_id = 'undefined'` como texto) só passa despercebido **porque** a coluna é VARCHAR — com UUID teria estourado erro e o bug apareceria.
- **Recomendação:** unificar em UUID e recriar as FKs para `public.users(id)`. Requer limpeza de dados antes.

**DB-5 · MEDIUM · Ausência de constraints permite estados inválidos**

- **Sem `UNIQUE` em `users.email`** → `createUser`/`register` checam existência e depois inserem ([userController.js:67](server/src/controllers/userController.js#L67)): race condition em requests concorrentes. Com e-mail duplicado, `findByEmail().single()` passa a lançar erro em **todo login** daquele e-mail.
- **Sem `UNIQUE(analysis_id, version_number)`** em `analysis_versions`/`strategy_versions`/`profile_versions`, e o número da próxima versão é calculado em duas etapas no app (`length + 1` em [versionManager.js:37](server/src/utils/versionManager.js#L37), `MAX + 1` em [StrategyVersion.js:11-21](server/src/models/StrategyVersion.js#L11)) → duas edições simultâneas geram versões com o mesmo número.
- **Sem `UNIQUE` parcial em `is_current`** → nada impede duas versões "atuais" (`setAsCurrent` faz update-todas-depois-marca-uma, sem transação — [AnalysisVersion.js:132-145](server/src/models/AnalysisVersion.js#L132)).
- **`person_id` sem FK e polimórfico** → análise pode apontar para pessoa inexistente (é exatamente o que AZ-6 permite).
- **`user_id` nullable** em `athletes`/`opponents`/`fight_analyses` (`002` só faz `ADD COLUMN`) → registro órfão fica invisível a todos, porque toda leitura filtra por `user_id`. Os arquivos `FIX_USER_ID.sql` e `DEBUG_ANALYSES.sql` na raiz do server existem justamente para caçar esses órfãos.
- **NEEDS_CONFIRMATION:** essas constraints podem existir em produção, criadas via dashboard.

**DB-6 · MEDIUM · Migrations com PII e operação destrutiva de dados**

- [017-add-user-roles.sql:23-32](server/migrations/017-add-user-roles.sql#L23) versiona **8 e-mails pessoais reais** (incluindo gmails de terceiros) para promover admins.
- [018-fix-admin-roles.sql:5](server/migrations/018-fix-admin-roles.sql#L5) executa `UPDATE users SET role = 'user';` — **rebaixa todo mundo sem WHERE** — e depois repromove um e-mail hardcoded. Reexecutar essa migration em produção rebaixa todos os admins criados desde então.
- `019` e `022` também têm e-mails hardcoded e movem dados entre contas.
- [FIX_USER_ID.sql:53](server/FIX_USER_ID.sql#L53) referencia o nome de uma pessoa real ("Pablo Oliveira") — dado de produção num script commitado. O mesmo arquivo consulta `auth.users`, tabela que o projeto não usa: fóssil da confusão Supabase-Auth × JWT-próprio.
- **Impacto:** PII no controle de versão (LGPD); migrations não idempotentes e destrutivas ao lado de migrations idempotentes, sem distinção visível.
- **Recomendação:** e-mails via parâmetro/variável; separar "migração de schema" de "correção pontual de dados".

**DB-7 · MEDIUM · Divisão arbitrária entre os dois clientes Supabase**

| Cliente | Models |
|---|---|
| `supabase` (anon, RLS aplica) | Athlete, Opponent, FightAnalysis, TacticalAnalysis, AnalysisVersion, ApiUsage, userController |
| `supabaseAdmin` (service_role, RLS ignorado) | ProfileVersion, StrategyVersion, ChatSession, e 3 métodos de User |

Não há regra documentada para a escolha, e `supabaseAdmin` **cai para `supabase`** se `SUPABASE_SERVICE_ROLE_KEY` não estiver definida ([config/supabase.js:21-28](server/src/config/supabase.js#L21)). Em ambiente sem a chave, ChatSession/ProfileVersion/StrategyVersion passam a bater em RLS `auth.uid() = user_id` e **param de funcionar** — sem erro claro. Recomendação: uma regra explícita (ex.: "todo acesso é `service_role`, autorização é responsabilidade do controller") e falhar no boot se a chave faltar.

### 7.4 Queries principais e riscos

- **SQL injection: não encontrada.** Todo acesso passa pelo query builder do `supabase-js`, que parametriza. Não há SQL cru concatenado em nenhum ponto do runtime (os `.sql` são scripts manuais). Este risco está efetivamente fechado.
- **Query mais perigosa:** [routes/fightAnalysis.js:19-22](server/src/routes/fightAnalysis.js#L19) — `select('*')` sem filtro nem paginação em `fight_analyses` (AZ-1 + varredura de tabela inteira).
- **Sem paginação:** `Athlete.getAll`, `Opponent.getAll`, `FightAnalysis.getAll` trazem todas as linhas do escopo. `TacticalAnalysis.getAll` aceita `limit`/`offset` — o único com paginação, e o frontend descarta o `total` que ele devolve.
- **Escrita sem escopo no model:** `FightAnalysis.update/delete` (raiz de AZ-2/AZ-4).
- **Padrão de agregação de 3 queries** em `Athlete.getAll` ([:21-48](server/src/models/Athlete.js#L21)): atletas + nomes de criadores + contagem de análises, paralelizado com `Promise.all` e resolvido em memória. **Não é N+1** — é uma escolha consciente e razoável dado que o PostgREST não faz `GROUP BY` facilmente. Mas o `.in('person_id', [todos os ids])` cresce linearmente e não escala indefinidamente.

---

## 8. AI

### 8.1 Arquitetura da camada de IA

Esta é a parte mais bem trabalhada do sistema, resultado da "Fase 1" (`c193c8a`). A separação é real:

```
controllers ──► services/geminiService.js  (prompts + domínio + parsing)
                services/strategyService.js (consolidação + orquestração)
                        │
                        ▼
                services/llm.js  ◄── ÚNICA fronteira com o SDK
                        │
                        ▼
                @google/genai (GoogleGenAI)
```

**Provedor:** Google Gemini, `@google/genai` 2.13. **Chave:** `GEMINI_API_KEY`. Cliente nulo se a chave faltar, com erro tipado `GeminiApiKeyMissingError` no uso ([llm.js:21-33](server/src/services/llm.js#L21)) — degradação explícita, não crash no boot.

**Modelos por tarefa** ([config/ai.js:91-108](server/src/config/ai.js#L91)):

| Tarefa | Default | Temperatura |
|---|---|---|
| `VIDEO_ANALYSIS` | `gemini-2.5-pro` | 0.2 |
| `STRATEGY` | `gemini-2.5-pro` | 0.3 |
| `TEXT` (consolidação/resumo) | `gemini-2.5-flash` | 0.4 |
| `CHAT` | `gemini-2.5-flash` | 0.7 |

`resolveModel(task, userModel)` — **a escolha do usuário sempre vence** ([:105-108](server/src/config/ai.js#L105)). Ver AI-2 sobre a falta de validação.

**Chamadas expostas por `llm.js`:** `generateJson` (com `responseSchema`), `generateText`, `sendChatMessage`, `uploadVideo`, `deleteFile`. Toda chamada devolve `usage` normalizado (`{modelName, promptTokens, completionTokens, totalTokens}`).

**Prompts:** 7 arquivos `.txt` em `services/prompts/`, carregados com cache e substituição `{{PLACEHOLDER}}` ([prompts/index.js](server/src/services/prompts/index.js)): `video-analysis`, `tactical-strategy`, `athlete-summary`, `consolidate-summaries`, `chat-analysis`, `chat-profile`, `chat-strategy`. `fillPrompt` usa `split().join()` em vez de `String.replace` — imune aos padrões `$&`/`$1` de replacement. Detalhe pequeno e correto.

**Saída estruturada:** `schemas/videoAnalysis.js` (`VIDEO_ANALYSIS_SCHEMA`) e `schemas/strategy.js` (`STRATEGY_SCHEMA`) em formato OpenAPI do Gemini, passados como `responseSchema` com `responseMimeType: 'application/json'`. Isso eliminou a classe de bugs de parsing por regex da Fase 0 (B4/B5 da SPEC) — a correção foi na causa-raiz, não no sintoma.

**Tratamento de erro:** taxonomia dedicada em `utils/errors.js` — 12 classes, incluindo `GeminiQuotaExceededError`, `GeminiContentBlockedError`, `GeminiApiKeyMissingError`, `GeminiParseError`, `VideoDownloadError`, com `parseGeminiError` normalizando o erro do SDK. `videoDownloader.classifyDownloadError` traduz 10 modos de falha do YouTube em mensagens acionáveis em pt-BR ([videoDownloader.js:315-355](server/src/services/videoDownloader.js#L315)). É um trabalho de qualidade acima da média do resto do repositório.

**Timeouts:** File API 120 s com polling progressivo 2→5 s ([llm.js:158-187](server/src/services/llm.js#L158)); download 120 s; limite de 200 MB / 720p. **Nenhum timeout nas chamadas de inferência** (`generateContent`/`sendMessage`) — dependem do default do SDK.

**Retry:** **não existe retry de inferência.** O único fallback é de *ingestão*: URL do YouTube direto → download local + File API ([geminiService.js:210-227](server/src/services/geminiService.js#L210)). Falha de quota ou 5xx transitório aborta a operação.

**Custos:** `models/ApiUsage.js` tem tabela `PRICING` por modelo, com pricing em faixas (tiered) para os `3-pro-preview`. Cálculo em `calculateCost`. **Mas o registro provavelmente não persiste (DB-2).**

### 8.2 Fluxo 1 — Análise de luta

```
VideoAnalysis.jsx  (atleta/adversário + cor do kimono + resultado + faixa + N URLs)
   │  POST /api/ai/analyze-link
   ▼
routes/ai.js ── heavyLimiter (30/15min) ── authMiddleware
   ▼
linkController.analyzeLink
   │  1. valida cada URL via extractYouTubeId (⚠ ver AI-5)
   │  2. LOOP SERIAL sobre N vídeos (⚠ sem limite — ver AI-3):
   │        geminiService.analyzeFrame(url, ctx, model)
   │           ├─ getPrompt('video-analysis') + buildVideoAnalysisContext
   │           │     (nome, faixa+regras IBJJF, kimono, resultado da luta)
   │           ├─ tenta  fileData:{fileUri: youtubeUrl}  ──► Gemini
   │           └─ se falhar: downloadYouTubeVideo (yt-dlp → ytdl-core)
   │                          → llm.uploadVideo (File API, espera ACTIVE)
   │                          → fileData:{fileUri, mimeType}
   │           └─ llm.generateJson(VIDEO_ANALYSIS_SCHEMA, temp 0.2)
   │           └─ normalizeAnalysisCharts → força soma 100%, descarta vazios
   │           └─ finally: cleanup do arquivo local + delete na File API
   │  3. consolidateAnalyses(analyses)  ← função PURA, sem IA (médias)
   │  4. se >1 summary: consolidateSummariesWithAI (2ª chamada, modelo TEXT)
   │  5. ApiUsage.logUsage (⚠ provavelmente falha — DB-2)
   │  6. se personId: FightAnalysis.create (⚠ sem checar posse — AZ-6)
   │  7. StrategyService.consolidateAnalyses → grava technical_summary
   ▼
resposta: { charts, technical_stats, summary, videosAnalyzed }
```

Observação: o resultado imediato do POST volta em `snake_case` (`technical_stats`), enquanto o mesmo dado lido do banco volta em `camelCase` (`technicalStats`, via `parseAnalysisFromDB`). O frontend lê `technical_stats` — daí F1 da SPEC-FRONTEND (estatísticas só aparecem logo após analisar, nunca no histórico). **Confirmei que continua aberto** ([VideoAnalysisCard.jsx:21-28](frontend/src/components/video/VideoAnalysisCard.jsx#L21)).

### 8.3 Fluxo 2 — Estratégia (atleta × adversário)

```
Strategy.jsx (seleciona atleta + adversário)
   │  POST /api/strategy/compare {athleteId, opponentId, model}
   ▼
strategyController.compareAndStrategy
   │  getScopeIds → Athlete.getById + Opponent.getById  (✓ posse verificada)
   ▼
StrategyService.generateStrategy(athleteId, opponentId, allowedUserIds, model)
   │  busca as análises de cada lado UMA vez (Promise.all)   ← otimização real
   │  exige ≥1 análise de cada lado, senão erro específico
   │  para cada lado:
   │     technical_summary salvo?  SIM → reusa + consolidateTechnicalStats (sem IA)
   │                               NÃO → consolidateAnalyses (1 chamada de IA)
   ▼
geminiService.generateTacticalStrategy(athleteData, opponentData, model)
   │  formatTechnicalStats (omite zeros)
   │  formatBeltRulesForStrategy p/ cada faixa
   │  faixa MAIS RESTRITIVA governa → BELT_WARNING no prompt
   │  getPrompt('tactical-strategy', {...9 placeholders})
   │  llm.generateJson(STRATEGY_SCHEMA, temp 0.3)     ← 1 chamada
   ▼
strategyController: TacticalAnalysis.create + StrategyVersion.createInitial
                    + ApiUsage.logUsage (⚠ DB-2)
   ▼
resposta { strategy, athlete{analysesCount}, opponent{...}, analysisId }
```

O caminho de estratégia é o melhor construído do sistema: posse verificada, dados carregados uma vez, cache de resumo para poupar IA, regra de faixa aplicada com fallback seguro, saída validada por schema, versão inicial criada, e falha de persistência não derruba a geração.

### 8.4 Problemas da camada de IA

**AI-1 · HIGH · O chat — caminho mais usado — é o único que não usa saída estruturada**

`llm.js` documenta como princípio: *"Saída estruturada SEMPRE via responseSchema (nada de regex sobre texto livre — a causa raiz dos bugs de parse da Fase 0)"* ([llm.js:9-10](server/src/services/llm.js#L9)). Mas `sendChatMessage` **não aceita schema**, e `extractEditSuggestion` ([geminiService.js:646-702](server/src/services/geminiService.js#L646)) volta exatamente ao padrão que a Fase 1 aboliu: `match(/---EDIT_SUGGESTION---([\s\S]*?)---END_SUGGESTION---/)`, com fallback para `match(/\{[\s\S]*?"field"[\s\S]*?\}/)`, limpeza de cercas markdown, e três formatos legados aceitos (`data`, `newSummary`, `newValue.content`). **Impacto:** as sugestões de edição da IA — que **escrevem no banco** via `applyEdit` — dependem de regex frágil. Quando o parse falha, `cleanResponseText` devolve "Preparei uma sugestão de alteração para você revisar" e a sugestão é perdida silenciosamente. Há uma mitigação parcial: `validateStrategyField` valida o shape antes de persistir estratégia ([strategyController.js:241](server/src/controllers/strategyController.js#L241)) — mas não existe equivalente para `manual-edit`/`apply-edit` de análise.

**AI-2 · HIGH · `model` do usuário vai cru para o SDK, sem validação**

`resolveModel(task, userModel)` retorna `userModel` sem conferir contra `AVAILABLE_MODELS` ([config/ai.js:105-108](server/src/config/ai.js#L105)). O valor vem do `req.body.model` em `analyzeLink`, `compareAndStrategy`, `athlete-summary`, `consolidate-profile` e nos 3 endpoints de chat — sempre do `localStorage` do cliente ([aiConfig.js:getSelectedModel](frontend/src/utils/aiConfig.js)). **Impacto:** (a) usuário força o modelo mais caro em toda tarefa (inclusive chat, hoje em `flash`); (b) string arbitrária vai ao SDK; (c) **a contabilidade de custo quebra em silêncio** — `calculateCost` cai no pricing de `gemini-2.5-flash` para modelo desconhecido ([ApiUsage.js:61](server/src/models/ApiUsage.js#L61)), registrando um custo que não tem relação com o cobrado. Recomendação: validar contra allow-list e rejeitar o resto.

**AI-3 · HIGH · Nenhum limite na quantidade de vídeos por request**

`analyzeLink` itera `videos[]` do body sem teto ([linkController.js:95-116](server/src/controllers/linkController.js#L95)). Cada item é uma inferência de vídeo em `gemini-2.5-pro` — a operação mais cara do sistema. Com `heavyLimiter` em 30 requests/15 min e (na prática) **ineficaz em serverless** (§9 HIGH-2), um único usuário dispara centenas de análises de vídeo. Somado a DB-2 (custo não registrado) e AI-2 (pode escolher o modelo mais caro), **não existe nenhum controle efetivo de gasto de IA no sistema.** Recomendação: limite explícito (ex.: 5), validado no schema de entrada.

**AI-4 · MEDIUM · Prompt de consolidação hardcoded fora do sistema de prompts**

53 linhas de prompt embutidas em [strategyService.js:252-304](server/src/services/strategyService.js#L252), enquanto os outros 7 prompts vivem em `services/prompts/*.txt` — e existe até um `consolidate-summaries.txt` para uma tarefa parecida. **Impacto:** um prompt de produção fora do lugar onde todo mundo (e todo Copilot) procura; não versionado junto com os demais; não coberto por `prompts.test.js`.

**AI-5 · MEDIUM · Validação de host do YouTube por substring**

[linkController.js:13-23](server/src/controllers/linkController.js#L13): `u.hostname.includes('youtube.com')`. `https://youtube.com.attacker.net/watch?v=1` **passa** — `includes` não ancora no fim. A URL segue para `yt-dlp`/`ytdl-core` (servidor busca host arbitrário) e para o Gemini como `fileData.fileUri`. O mesmo defeito existe no frontend ([videoAnalysisService.js:40-49](frontend/src/services/videoAnalysisService.js#L40)), que ainda aceita `url.includes('video')` — qualquer URL contendo a palavra "video" (= F11 da SPEC-FRONTEND, aberto). **Impacto:** SSRF limitado (o servidor faz request a host controlado pelo atacante). Mitigado por `execFile` sem shell (sem command injection) e pelos limites de tamanho/timeout. Recomendação: comparar hostname exato contra `{'youtube.com','www.youtube.com','youtu.be','m.youtube.com'}`.

**AI-6 · MEDIUM · Prompt injection: mitigado no chat, ausente nos outros caminhos**

O chat foi **corretamente endurecido** (commit `23b475b`): a `systemInstruction` é uma constante fixa que **nunca** interpola dados do usuário, e os dados de contexto entram como primeiro turno `user` com aviso explícito de que são dados, não comandos ([geminiService.js:740-782](server/src/services/geminiService.js#L740)). O comentário cita o padrão do CodeQL. Excelente decisão, bem documentada.

Os outros caminhos não têm equivalente:
- `athleteName`, `matchResult`, `belt` entram crus no prompt de análise ([geminiService.js:29-77](server/src/services/geminiService.js#L29)).
- `athleteData` inteiro do `req.body` vai serializado no prompt (AZ-7).
- `technical_summary` — **gerado a partir do conteúdo de um vídeo do YouTube de terceiros** — é reinjetado no prompt de estratégia ([strategyService.js:520-539](server/src/services/strategyService.js#L520)). Esse é o vetor mais interessante: **injeção indireta**, onde o payload vem do vídeo analisado, não do usuário.
- **Impacto atual: baixo** (dado majoritariamente auto-fornecido, saída não executa nada, `responseSchema` limita a forma da resposta). Sobe para relevante se o produto abrir para múltiplos tenants não confiáveis ou compartilhamento entre profissionais.

**AI-7 · MEDIUM · Sem retry e sem timeout de inferência**

Nenhuma chamada a `generateContent`/`sendMessage` tem timeout próprio ou retry. Uma quota estourada ou 5xx transitório do Gemini perde a operação inteira — inclusive depois de o vídeo já ter sido baixado e enviado à File API (o trabalho caro já foi pago). O `finally` faz cleanup corretamente, mas o custo foi consumido.

**AI-8 · MEDIUM · Fallbacks que silenciosamente degradam a qualidade do dado**

Quando `consolidateSummariesWithAI` falha, o retorno é `summaries.join(' ')` ([geminiService.js:426](server/src/services/geminiService.js#L426)); quando `consolidateAnalyses` falha, `summaries.join(' ') + narrativas` ([strategyService.js:327](server/src/services/strategyService.js#L327)). Uma concatenação bruta é persistida em `technical_summary` e **indistinguível de um resumo consolidado de verdade** — e depois alimenta a estratégia. É a mesma família do B4 da SPEC (dado sintético apresentado como real), em forma mais branda. Recomendação: marcar a origem degradada no registro.

**AI-9 · LOW · Facilidade de troca de provedor: boa, mas não completa**

`llm.js` é uma fronteira real e o resto do código nunca importa o SDK. Mas dois vazamentos permanecem: os `schemas/*.js` importam `Type` de `@google/genai` e usam o dialeto OpenAPI do Gemini; e `uploadVideo`/File API é um conceito específico do Gemini exposto na interface. Trocar de provedor exigiria reescrever os schemas e repensar a ingestão de vídeo — mas nada nos controllers. Para o propósito de "trocar de modelo", está resolvido; para "trocar de provedor", está 70% do caminho.

**AI-10 · LOW · Conhecimento de domínio IBJJF: agora unificado, e vale preservar**

`BELT_RULES` em [config/ai.js:12-43](server/src/config/ai.js#L12) é hoje **fonte única**, com `resolveBeltKey`/`resolveBeltRules`/`getBeltLevel` e aliases pt/en. Os comentários registram exatamente quais divergências existiam antes (toe hold liberado para roxa; wrist lock proibido para azul) — é documentação de decisão de qualidade, resolvendo C1/C2 da SPEC. Coberto por `beltRules.test.js`.
**NEEDS_CONFIRMATION:** a **correção esportiva** da tabela frente ao regulamento IBJJF vigente não é verificável por código. Precisa de revisão por alguém com o regulamento em mãos.

---

## 9. Security

CSRF, SQL injection e escalonamento de privilégio foram investigados e **não** representam risco (justificativa em §6 e §7.4). O que segue é o que de fato existe.

### CRITICAL

**SEC-C1 · Chave da API do Gemini commitada no repositório**

- [.archived/SUPABASE_SETUP.md:25](.archived/SUPABASE_SETUP.md#L25) — `GEMINI_API_KEY=AIzaSyC...djx8` (39 chars, formato válido de chave Google API). Arquivo **rastreado** pelo git, presente em `HEAD`, introduzido no commit `aa40116`.
- **Impacto:** uso da chave por terceiros na conta de faturamento do projeto. Está no histórico do git, então **remover o arquivo não resolve** — a chave precisa ser rotacionada.
- **Agravante:** o job `secrets-scan` (TruffleHog) roda com `continue-on-error: true` ([code-quality.yml](.github/workflows/code-quality.yml)) — o scanner existe e nunca bloqueou nada.
- **Recomendação:** **rotacionar a chave no Google Cloud imediatamente** (ação #1 de tudo neste relatório), depois expurgar do histórico, depois remover o `continue-on-error`.

**SEC-C2 · Credenciais do Supabase em arquivo rastreado + RLS desligado**

- [frontend/.env.production](frontend/.env.production) contém `SUPABASE_URL=https://ikjudbypwfvdywlgzsjr.supabase.co` e `SUPABASE_ANON_KEY=sb_publishable_...`. `.gitignore` cobre `.env` e `.env.local`, mas **não** `.env.production`.
- Uma chave *publishable* é, por definição, pública — o problema não é ela existir, é **ela existir num banco sem RLS** (DB-1). Juntas, formam acesso direto de leitura/escrita a `athletes`, `opponents`, `fight_analyses`, `tactical_analyses`, `ai_chat_sessions` e `analysis_versions`.
- **Agravante:** essas variáveis são **inúteis no frontend** — não há uma única referência a Supabase em `frontend/src` (verificado). Estão publicadas sem servir a nada.
- Mais ocorrências: `.archived/docs/setup/SETUP_SUPABASE.md:34-35` (URL + prefixo da chave antiga).
- **Recomendação:** remover as variáveis do frontend, resolver DB-1, rotacionar as chaves, adicionar `.env.production` ao `.gitignore`.

**SEC-C3 · IDORs de leitura e escrita entre tenants**

AZ-1 (leitura global via `/debug/all`), AZ-2 (escrita via `manual-edit`), AZ-3 (leitura de versões), AZ-4 (escrita via `restore-version`). Detalhes completos em §6. Agrupados aqui porque são a exposição mais séria da camada de aplicação: **qualquer usuário autenticado lê e corrompe dados de qualquer outro**, e AZ-1 fornece os IDs necessários para explorar os outros três.

### HIGH

**SEC-H1 · XSS via DOM sink na exportação de PDF**

- [Analyses.jsx:~400-525](frontend/src/pages/Analyses.jsx#L400) monta uma string HTML interpolando conteúdo de estratégia gerado pela IA (`checklistTatico.se_estiver_perdendo`, `cronologia`, nomes de atleta/adversário) e faz `tempDiv.innerHTML = content` seguido de `document.body.appendChild(tempDiv)` ([:522-524](frontend/src/pages/Allises.jsx#L522)). Nenhum escape.
- **Impacto:** `innerHTML` não executa `<script>`, mas **executa handlers** (`<img src=x onerror=...>`). O elemento é anexado ao `body`, então o payload roda no contexto da aplicação. Com o JWT em `localStorage` ([api.js:15](frontend/src/services/api.js#L15)), XSS = roubo de sessão (7–30 dias de validade). O conteúdo vem de saída de LLM derivada de **vídeo de terceiros** — não é totalmente controlado pelo usuário, o que torna o vetor plausível sem cúmplice interno.
- **Recomendação:** construir o DOM com `createElement`/`textContent`, ou sanitizar. Considerar mover o token para cookie `httpOnly`.

**SEC-H2 · Rate limiting inoperante no ambiente de deploy real**

- `express-rate-limit` usa `MemoryStore` (default — nenhum store configurado, [rateLimiter.js](server/src/middleware/rateLimiter.js)). O backend roda como **function serverless na Vercel** ([server/vercel.json](server/vercel.json)).
- **Impacto:** cada instância tem seu próprio contador, e instâncias são criadas/descartadas por demanda. Os limites (`authLimiter` 20/15min contra brute force, `heavyLimiter` 30/15min contra abuso de IA) **não valem na prática em produção**. Isso enfraquece diretamente: proteção de brute force no login (§5), teto de custo de IA (AI-3), e o limitador de `/api/admin`.
- **Recomendação:** store externo (Redis/Upstash) ou rate limiting na borda (Vercel/WAF).

**SEC-H3 · Detalhes internos vazados nas respostas de erro**

- `handleError` devolve `details: error.message` ao cliente em toda falha ([errorHandler.js:20](server/src/utils/errorHandler.js#L20)), usado em ~30 handlers. `strategyController.updateAnalysis` ([:289](server/src/controllers/strategyController.js#L289)), `strategyVersionController` (2×) e `linkController` ([:233](server/src/controllers/linkController.js#L233)) fazem o mesmo diretamente.
- **Impacto:** mensagens do PostgREST/Postgres (nome de coluna, constraint violada, código de erro) e do SDK do Gemini chegam ao cliente — mapa gratuito do schema e da stack para um atacante.
- **Nota:** [.github/copilot-instructions.md:33](.github/copilot-instructions.md#L33) **proíbe explicitamente** esse padrão (*"NUNCA usar `res.status(500).json({ error: error.message })` diretamente"*). O código viola a própria regra documentada — sinal de que as instruções não são verificadas por nada automático.
- **Recomendação:** `details` só quando `NODE_ENV !== 'production'`.

**SEC-H4 · Abuso de custo de IA sem teto nem visibilidade**

Composição de quatro achados que isolados parecem médios: AI-3 (sem limite de vídeos/request) × AI-2 (usuário escolhe o modelo mais caro) × SEC-H2 (rate limit inoperante) × DB-2 (custo não é registrado). **Resultado: um usuário autenticado pode gerar gasto ilimitado de API e ninguém vê no painel.** Não há alerta, quota por usuário nem circuit breaker. Recomendação: quota por usuário/tenant persistida no banco + corrigir DB-2 para haver visibilidade.

**SEC-H5 · Fallback de autenticação abre em caso de falha do banco**

Ver A-1 (§5.2). Repetido aqui por ser exposição de segurança, não só de autenticação: quando o Supabase falha, três controles somem de uma vez (conta desativada, `token_version`, `role` do banco).

### MEDIUM

| # | Problema | Evidência | Impacto |
|---|---|---|---|
| SEC-M1 | **Sem headers de segurança.** `helmet` não está instalado; nenhum CSP, `X-Frame-Options`, `HSTS` ou `X-Content-Type-Options` | [server/index.js](server/index.js) — nada entre `cors` e as rotas | Aumenta o alcance de SEC-H1 (um CSP mitigaria); permite clickjacking |
| SEC-M2 | **PII em log.** E-mail em toda tentativa de login; log por request no middleware de auth | [authController.js:81,89,113](server/src/controllers/authController.js#L81) · [auth.js:50](server/src/middleware/auth.js#L50) | E-mails em texto claro nos logs da Vercel; relevante para LGPD |
| SEC-M3 | **Enumeração de usuários** por 403 antes da verificação de senha | [authController.js:96](server/src/controllers/authController.js#L96) | Descoberta de contas existentes sem credencial |
| SEC-M4 | **`urlencoded` com limite de 500 MB** (contra 10 MB do `json`) | [index.js:49](server/index.js#L49) | DoS por memória; a assimetria não tem justificativa aparente no código |
| SEC-M5 | **CORS aceita qualquer subdomínio `*.vercel.app`** | [index.js:33](server/index.js#L33) | Qualquer deploy na Vercel — inclusive de terceiros — pode chamar a API com credenciais do usuário. Combinado com token em `localStorage`, amplia o impacto de um XSS em qualquer app `*.vercel.app` |
| SEC-M6 | **SSRF limitado** por validação de host via substring (frontend e backend) | AI-5 | Servidor busca URL de host controlado pelo atacante |
| SEC-M7 | **Sem validação de entrada estruturada em nenhum endpoint** | todos os controllers | Nenhum schema validator (zod/joi/yup) no backend. Validação é `if (!campo)` ad hoc. Habilita AZ-7, AI-3 e a classe inteira de "campo inesperado no body" |
| SEC-M8 | **Segredos em documentação versionada** | `docs/DEPLOY.md:288`, `docs/SETUP.md:60`, `.archived/**` | Chaves truncadas (`eyJ...`) e URL real do projeto; contamina o histórico e treina o próximo dev/Copilot a colar credenciais em docs |

### LOW

- **`/api/debug/env-check`** ([routes/debug.js:20-27](server/src/routes/debug.js#L20)) — exige admin e devolve só booleanos + `NODE_ENV`. Bem construído; ainda assim, superfície desnecessária em produção.
- **Cache de auth em memória sem invalidação distribuída** — `evictAuthCache` limpa a instância local. Em serverless multi-instância, uma desativação pode levar até 5 min para valer em outras instâncias. Mitigado por `token_version` ser reconsultado quando o cache expira.
- **`bcrypt` com 10 rounds** — aceitável hoje, abaixo do recomendado atual (12).
- **Senha mínima de 6 caracteres**, sem requisito de complexidade nem checagem contra listas de senhas vazadas.

---

## 10. Performance

**PERF-1 · HIGH · Trabalho longo de IA dentro de request HTTP em serverless**

`POST /api/ai/analyze-link` pode executar, dentro de um único request: download de vídeo (até 120 s) + upload para File API com polling (até 120 s) + inferência em `gemini-2.5-pro` sobre vídeo (dezenas de segundos) — **multiplicado por N vídeos, em série** ([linkController.js:95-116](server/src/controllers/linkController.js#L95)) — e depois a consolidação de perfil, também síncrona ([:193-212](server/src/controllers/linkController.js#L193)), com o comentário *"o usuário já esperou a análise — segundos extras não fazem diferença"*.

O destino de deploy é uma function serverless ([server/vercel.json](server/vercel.json)), onde o limite de duração é da ordem de 10–60 s (dependendo do plano) e **não é configurável no `vercel.json` atual** (não há `maxDuration`). **Impacto:** a operação principal do produto provavelmente é encerrada pelo runtime antes de terminar, após já ter consumido tokens do Gemini. O trabalho pago é perdido e o usuário vê erro de timeout.
Isso também explica por que a barra de progresso é simulada: sem job assíncrono, não há progresso real a reportar. **NEEDS_CONFIRMATION:** qual plano da Vercel e qual o `maxDuration` efetivo. **Recomendação:** job assíncrono (`202 {jobId}` + polling), como a própria SPEC-FRONTEND propõe em FE-3.

**PERF-2 · MEDIUM · Overview carrega três tabelas inteiras para exibir contagens**

[Overview.jsx:69-105](frontend/src/pages/Overview.jsx#L69) busca **todos** os atletas, **todos** os adversários e **todas** as análises para mostrar 4 números e as 5 análises mais recentes. Nenhum endpoint de `count`, nenhuma paginação. Cresce linearmente com o uso, no dashboard que é a primeira tela após o login.

**PERF-3 · MEDIUM · Ausência de paginação nas listagens principais**

`Athlete.getAll`, `Opponent.getAll` e `FightAnalysis.getAll` não aceitam `limit`/`offset`. `TacticalAnalysis.getAll` aceita — e o frontend **descarta o `total` que o backend devolve** ([analysisService.js:23](frontend/src/services/analysisService.js#L23)), usando `limit: 20` fixo (= F9 da SPEC-FRONTEND). Nenhuma tela tem "carregar mais".

**PERF-4 · MEDIUM · Duas consolidações de perfil disparadas por análise criada**

Ao criar análise via `POST /api/fight-analysis`, `refreshTechnicalSummary` roda em *fire-and-forget* ([fightAnalysisController.js:152](server/src/controllers/fightAnalysisController.js#L152)) — e chama `StrategyService.consolidateAnalyses`, que **faz uma chamada de IA** quando há mais de uma análise. Ao deletar, o mesmo acontece ([:195](server/src/controllers/fightAnalysisController.js#L195)). Como `linkController` **também** consolida no seu próprio caminho ([:197](server/src/controllers/linkController.js#L197)), o fluxo "analisar vídeo → salvar análise" pode consolidar o mesmo perfil duas vezes, com duas chamadas de IA. Em serverless, o *fire-and-forget* após `res.json()` corre risco adicional: a instância pode ser congelada antes de o trabalho terminar.

**PERF-5 · MEDIUM · Cache de dados sem invalidação consistente**

React Query em 4 páginas, `useEffect` cru em 5 ([Overview](frontend/src/pages/Overview.jsx), [Settings](frontend/src/pages/Settings.jsx), [AdminUsers](frontend/src/pages/AdminUsers.jsx), [AthleteDetail](frontend/src/pages/AthleteDetail.jsx), [ModernLogin](frontend/src/pages/ModernLogin.jsx)). Mutações num padrão não invalidam o cache do outro: criar um atleta na página gerenciada por React Query não atualiza o Overview, que só refaz fetch em mount. Nenhum cache no backend (nem para `technical_summary`, o candidato natural).

**PERF-6 · LOW · Renders e bundle**

- Nenhum `React.memo`, `useMemo` ou `useCallback` nos componentes grandes ([StrategySummaryModal.jsx](frontend/src/components/analysis/StrategySummaryModal.jsx) 1116 linhas, [AiStrategyBox.jsx](frontend/src/components/analysis/AiStrategyBox.jsx) 1016, [Analyses.jsx](frontend/src/pages/Analyses.jsx) 922). Filtro de busca recalculado a cada tecla sobre a lista completa ([Analyses.jsx:545](frontend/src/pages/Analyses.jsx#L545)).
- `html2pdf.js` (que empacota jsPDF + html2canvas) é importado estaticamente, então entra no bundle de quem nunca exporta PDF.
- **Do lado positivo:** rotas usam `lazy()` com `Suspense`, há preload deliberado das páginas mais usadas ([App.jsx:30-37](frontend/src/App.jsx#L30)), e existe `PrefetchLink`. A estratégia de code splitting foi pensada.

**Consultas ao banco — avaliação:** **não encontrei N+1 real.** `Athlete.getAll`/`Opponent.getAll` usam 3 queries paralelas com agregação em memória ([Athlete.js:21-48](server/src/models/Athlete.js#L21)) e `FightAnalysis.getAll` busca nomes de criadores em lote e **apenas quando o grupo tem mais de um membro** ([FightAnalysis.js:23](server/src/models/FightAnalysis.js#L23)). São otimizações conscientes. A duplicação de query mais recente (`getAnalysesCount` + `getConsolidatedStats` buscando as mesmas linhas) **já foi corrigida** em `e9a6501`, com o raciocínio registrado em comentário ([strategyService.js:493-497](server/src/services/strategyService.js#L493)).

---

## 11. Code Quality

**Tipagem — ausente.** 0 arquivos TypeScript em `frontend/src` e `server/src` (148 arquivos JS). `typescript` e três pacotes `@types/*` estão em `devDependencies` do frontend sem uso. Só `playwright/` (22 arquivos) é TS. **Consequência concreta e verificável:** as três falhas silenciosas mais graves deste relatório seriam erros de compilação com tipos — `saveProfileVersion` passando `{person_id, summary, created_by}` para uma função que desestrutura `{personId, content, userId}` (§9 HIGH-6); `updateTechnicalProfile` chamada com 2 de 3 argumentos (§4.4); `versionManager` lendo `currentData.technical_stats` num objeto que tem `technicalStats`. A ausência de tipagem não é preferência de estilo aqui — é a causa mecânica dos bugs. O uso do JSDoc é bom e consistente, mas nada o verifica.

**Tratamento de erros — taxonomia boa, aplicação inconsistente.** `utils/errors.js` define 12 classes com `statusCode` e `parseGeminiError` normaliza erros do SDK: trabalho de qualidade. Mas: `handleError` vaza `error.message` (SEC-H3); há **três** padrões de resposta de erro coexistindo (`handleError`, `res.status().json()` manual, `throw` para o handler global); e o handler global do Express ([index.js:82-85](server/index.js#L82)) captura tudo em 500 genérico. O padrão mais perigoso é o **catch que engole**: `saveProfileVersion` transforma um erro real de banco em `console.warn` + `return null` ([versionManager.js:120-122](server/src/utils/versionManager.js#L120)) — motivo de o HIGH-6 ter sobrevivido; `linkController` engole falha de persistência (*"Não retornar erro, apenas logar"*, [:215](server/src/controllers/linkController.js#L215)); `strategyController` engole falha de versionamento com `// Log silencioso` ([:273](server/src/controllers/strategyController.js#L273)). Vale registrar o contraponto: `versionManager.ensureOriginalVersion` **propaga** o erro, com comentário explicando a escolha ([:41](server/src/utils/versionManager.js#L41)) — alguém corrigiu esse padrão em um lugar e não nos outros.

**Logging — não estruturado.** `console.log`/`warn`/`error` com emoji em todo o backend, sem níveis, sem correlação de request, sem redação de PII (SEC-M2). Em serverless, cada log é custo e não há como filtrar por severidade. O middleware de auth loga em **todo** request ([auth.js:50](server/src/middleware/auth.js#L50)).

**Testes — assimétricos e parcialmente inertes.**

- **Backend:** 16 suítes em `src/**/__tests__/`, com boa qualidade — `strategyService.test.js` verifica que o resumo salvo evita chamada de IA; `beltRules.test.js` cobre o fallback de faixa vazia; `errors.test.js` cobre a taxonomia; `prompts.test.js` (360 linhas) valida os templates. O CI **removeu deliberadamente** o `continue-on-error` dos testes de backend, com o motivo no próprio YAML: *"o `continue-on-error` antigo é o motivo de 10 testes quebrados terem vivido meses no repositório sem ninguém ver"* ([ci.yml](.github/workflows/ci.yml)). Correção de processo bem feita.
- **⚠️ `server/tests/` (3 arquivos) nunca executa.** `jest.config.js` tem `testMatch: ['**/__tests__/**/*.test.js']` e esses arquivos estão em `tests/`, não `__tests__/`. Pior: são **scripts, não testes** — `supabase.test.js` chama `process.exit(1)`, e `integration.test.js` faz `require('./src/models/User')` de dentro de `server/tests/`, caminho que não existe. São 3 arquivos com extensão `.test.js` que dão a impressão de cobertura e nunca rodaram.
- **Cobertura ausente onde o risco está:** nenhum teste de autorização/ownership. Nenhuma das 6 falhas do §6 seria detectada. Não há teste de `middleware/auth.js`, `adminMiddleware`, `tenantScope`, `chatController` nem de nenhum model.
- **Frontend:** 5 arquivos de teste para 79 de código (~6%). Um único teste de componente (`ProtectedRoute.test.jsx`).
- **E2E:** 6 specs Playwright bem estruturados (Page Objects, fixtures, `TestDataBuilder`) que **nunca rodam no CI** — nenhum workflow os invoca.

**Lint/formatting.** ESLint 9 flat config apenas no frontend, com uma única regra customizada. **O backend não tem lint nenhum.** No CI, `frontend-lint` roda com `continue-on-error: true` — então **nenhum lint bloqueia merge em nenhum dos dois pacotes**. Não há Prettier nem `.editorconfig`; o estilo é heterogêneo (aspas simples/duplas, ponto-e-vírgula inconsistente). Nenhum hook de pre-commit.

**Naming.** Boa nomeação de funções em geral, mas três colisões de vocabulário que atrapalham raciocinar sobre o sistema: (1) **"Analysis"** significa `fight_analyses`, `tactical_analyses` e a tela `Analyses.jsx` — três coisas; (2) **"Strategy"** é `tactical_analyses`, `strategyService`, `StrategyVersion` e `StrategyContext`; (3) `snake_case` × `camelCase` traduzido em `dbParsers.js` apenas para 3 dos 10 models. `services/prompts/consolidate-summaries.txt` versus o prompt inline de consolidação (AI-4) é a mesma confusão em outra camada.

**Organização.** A estrutura do backend (`routes/controllers/models/services/utils/schemas/config`) é convencional e legível; a do frontend (`pages/components/{analysis,chat,charts,common,forms,routing,video}/services/contexts/utils`) também. Ambas funcionam. As exceções: query de banco dentro de `routes/` (AZ-1), prompt dentro de `services/strategyService.js` (AI-4) e geração de PDF dentro de uma página (§3.2).

**Duplicação.** (a) `processPersonAnalyses` em front e back, **já divergente** (§3.2); (b) `AVAILABLE_MODELS` em dois lugares; (c) `models/Opponent.js` é cópia de `models/Athlete.js`; (d) `formatChartsAsNarrative`/`formatStatsAsNarrative` em `strategyService` sobrepõem-se a `formatTechnicalStats` em `geminiService`; (e) `chatLimiter` aplicado **duas vezes** no mesmo router ([chatRoutes.js:11,15](server/src/routes/chatRoutes.js#L11)).

**Código morto.**

- 6 componentes órfãos, nunca importados: `StatsRadarChart.jsx`, `StatsLineChart.jsx`, `StatsBarChart.jsx`, `LoadingSpinner.jsx`, `Button.jsx`, `InlineDiff.jsx`.
- `frontend/src/utils/athleteStats.js` — espelho do util do backend, sem consumidor útil (F10 da SPEC).
- `server/=` — arquivo **de 0 bytes**, rastreado pelo git (erro de redirecionamento de shell commitado).
- Scripts de debug rastreados na raiz do server: `check-analysis.js`, `debug-analyses.js`, `test-connection.js`, `DEBUG_ANALYSES.sql`, `FIX_USER_ID.sql`.
- Rota comentada em [ai.js:12-14](server/src/routes/ai.js#L12); `analyzeVideo` que só retorna 400 "Rota descontinuada" ([aiController.js:14-19](server/src/controllers/aiController.js#L14)); `apiUsageLogger.logApiUsage` (a variante sem `operationType`) sem chamadores; `docs/API.md.old`.
- **Documentação morta:** `docs/MULTI_AGENTS.md` (587 linhas) e `QUICKSTART_MULTI_AGENTS.md` (221 linhas) descrevem o sistema multi-agentes **removido** na Fase 1. Confirmei que o código se foi (só restam comentários). São ~800 linhas descrevendo um sistema inexistente, na raiz e em `docs/`.
- **Instruções de Copilot desatualizadas:** [.github/copilot-instructions.md:253](.github/copilot-instructions.md#L253) ainda documenta as variáveis `USE_MULTI_AGENTS`/`OPENAI_API_KEY` do sistema aposentado. **Isso é ativamente prejudicial num projeto mantido com Copilot** — a próxima geração de código será orientada por um mapa errado.

**Abstrações.** As boas: `llm.js` (fronteira de SDK), `prompts/index.js` (carregador com cache), `schemas/*` (contratos de saída), `errors.js` (taxonomia), `tenantScope.js` (regra de escopo), `dbParsers.js` (tradução de fronteira). A que falta: **nenhuma abstração obriga a verificação de posse** — é justamente onde o sistema falha 6 vezes. A que sobra: `versionManager` é uma camada finíssima sobre os models que, em vez de simplificar, introduziu o bug de contrato do HIGH-6.

**Complexidade.** Os maiores ofensores: `linkController.analyzeLink` (206 linhas, ~8 caminhos de erro), `geminiService.js` (845 linhas, 3 responsabilidades), `chatController.js` (818 linhas, 15 handlers), `StrategySummaryModal.jsx` (1116 linhas), `AiStrategyBox.jsx` (1016), `Analyses.jsx` (922 linhas com toda a geração de PDF embutida).

---

## 12. Dependencies

**Nenhuma dependência foi atualizada, instalada ou modificada.** Análise a partir dos manifestos e dos imports reais.

### DEP-1 · HIGH · Lockfiles duplicados em três pacotes

```
package-lock.json          +  yarn.lock          (raiz)
server/package-lock.json   +  server/yarn.lock
frontend/package-lock.json +  frontend/yarn.lock
```

Seis lockfiles para três `package.json`. O CI usa `npm ci` com `cache-dependency-path: */package-lock.json` ([ci.yml](.github/workflows/ci.yml)), então os `yarn.lock` estão obsoletos mas presentes — e um dev que rode `yarn install` resolve uma árvore de dependências **diferente** da que o CI testa e a Vercel builda. É a receita clássica de "funciona na minha máquina". `playwright/package.json` **não tem lockfile nenhum** — instalação não reprodutível.
**Recomendação:** escolher um gerenciador, apagar os lockfiles do outro, adicionar lockfile ao `playwright/`.

### DEP-2 · MEDIUM · Dependências declaradas e não usadas

| Pacote | Onde | Situação |
|---|---|---|
| `@supabase/supabase-js` | `package.json` da **raiz** | Nada na raiz usa Supabase — a raiz é só um proxy de scripts para `playwright/` |
| `@tanstack/react-query-devtools` | `frontend` | **0 referências** no código |
| `typescript`, `@types/react`, `@types/node`, `@types/react-dom` | `frontend` devDeps | **0 arquivos TS** na aplicação |
| `date-fns` | `frontend` | 1 arquivo — a formatação de data é feita majoritariamente com `Intl`/`toLocaleDateString` nativo |

### DEP-3 · MEDIUM · Duas bibliotecas para a mesma tarefa (download de vídeo)

`@distube/ytdl-core` (npm) **e** o binário `yt-dlp` (dependência **de sistema, não declarada em lugar nenhum**), com fallback em runtime entre os dois ([videoDownloader.js:257-311](server/src/services/videoDownloader.js#L257)). É defensável — `yt-dlp` é mais robusto, `ytdl-core` funciona onde não há binário (Vercel). Mas: a dependência de sistema não está documentada em nenhum manifesto, então o comportamento **muda silenciosamente** entre a máquina do dev (com `yt-dlp`) e produção (sem). Ambas as bibliotecas quebram rotineiramente quando o YouTube muda — são as dependências mais frágeis do projeto por natureza, e o produto inteiro depende delas.

### DEP-4 · MEDIUM · Risco de atualização concentrado em pacotes recém-lançados

O projeto está agressivamente na ponta: React **19.2**, Express **5.1**, Vite **7.2**, Tailwind **4.1**, `@google/genai` **2.13**, `uuid` **13**, `bcrypt` **6**, `express-rate-limit` **8.2**, ESLint **9** (flat config). Todos com major recente. Consequências práticas: Express 5 mudou o tratamento de erro assíncrono e o matching de rotas (relevante porque o código depende de ordenação de rotas — ver o comentário *"ROTAS ESPECÍFICAS DEVEM VIR ANTES DAS ROTAS DINÂMICAS"* em [fightAnalysis.js:48](server/src/routes/fightAnalysis.js#L48)); Tailwind 4 mudou o pipeline de configuração; `@google/genai` é um SDK novo em evolução rápida. **Sem lint no backend e sem testes de autorização, o custo de qualquer atualização é alto** — não há rede de proteção que detecte regressão.

### DEP-5 · MEDIUM · `uuid` declarado e não usado no runtime

`uuid@13` está em `dependencies` do server, mas o código gera IDs via `gen_random_uuid()` no Postgres e `crypto.randomBytes` para nomes de arquivo ([videoDownloader.js:81](server/src/services/videoDownloader.js#L81)). **NEEDS_CONFIRMATION** — não localizei um `require('uuid')` em `server/src`; pode haver uso indireto.

### DEP-6 · LOW · Peso no cliente

`html2pdf.js` (empacota jsPDF + html2canvas), `recharts` e `lucide-react` são as três maiores contribuições ao bundle. `html2pdf.js` serve **uma** funcionalidade (exportar PDF em `Analyses.jsx`) e é importado estaticamente.

**Auditoria de vulnerabilidades:** `npm audit --production` existe no CI mas com `continue-on-error: true` ([ci.yml](.github/workflows/ci.yml)) — nunca bloqueou nada. **Não executei `npm audit`** (exigiria instalar dependências). Rodá-lo é item da próxima etapa.

---

## 13. Technical Debt

Priorizado por risco real, com dependências de correção explícitas. Nada aqui foi corrigido.

### CRITICAL

| # | Localização | Problema | Impacto | Risco | Recomendação | Depende de |
|---|---|---|---|---|---|---|
| **TD-1** | [.archived/SUPABASE_SETUP.md:25](.archived/SUPABASE_SETUP.md#L25) | Chave da API do Gemini commitada e presente no histórico | Uso de terceiros na conta de faturamento | Está no git há vários commits; pode já ter sido colhida | **Rotacionar a chave** no Google Cloud; expurgar do histórico; remover `continue-on-error` do TruffleHog | nada — fazer primeiro |
| **TD-2** | migrations [008](server/migrations/008-corrigir-constraint.sql#L16)/[009](server/migrations/009-execute-este.sql#L14) + [frontend/.env.production](frontend/.env.production) | RLS desligado em 3 tabelas + `USING (true)` em outras 3, com credenciais do projeto versionadas | Banco alcançável sem passar pelo backend: leitura e escrita de todos os tenants | Contorna **toda** a autorização da aplicação | Verificar estado real no dashboard; revogar GRANTs de `anon` **ou** implementar RLS real; remover as vars do frontend; rotacionar chaves | verificação no Supabase |
| **TD-3** | [routes/fightAnalysis.js:15-45](server/src/routes/fightAnalysis.js#L15) | `GET /debug/all` devolve análises de todos os tenants | Vazamento cross-tenant + fornece os IDs para explorar TD-4 | Explorável por qualquer usuário autenticado | Remover a rota | nada — remoção isolada |
| **TD-4** | [chatController.js:274,336,357](server/src/controllers/chatController.js#L274) | 3 endpoints sem verificação de posse (`manual-edit`, `versions`, `restore-version`) | Leitura e **escrita** em análises de qualquer tenant | Corrupção silenciosa de dados de terceiros | Aplicar `getScopeIds` + `getByIdAndUser` (padrão de `applyEdit`); para `versions`, autorizar pela análise-pai | nada; testes de ownership deveriam vir junto |

### HIGH

| # | Localização | Problema | Impacto | Risco | Recomendação | Depende de |
|---|---|---|---|---|---|---|
| **TD-5** | [versionManager.js:96-122](server/src/utils/versionManager.js#L96) vs [ProfileVersion.js:9](server/src/models/ProfileVersion.js#L9) | Contrato de argumentos incompatível: todos os campos chegam `undefined`, insert viola `NOT NULL`, erro engolido por `console.warn` | **Histórico de versões de perfil nunca funcionou.** UI oferece o recurso e ele não existe | Usuário confia num histórico vazio; perda de trabalho | Alinhar o contrato; propagar o erro; teste de integração | nada |
| **TD-6** | [fightAnalysisController.js:140,142](server/src/controllers/fightAnalysisController.js#L140) | `updateTechnicalProfile` chamada com 2 de 3 argumentos → no-op silencioso | `technical_profile` do atleta nunca atualiza pelo fluxo de criação de análise | Dado estagnado exibido como atual | Passar o `userId`; fazer a função lançar em vez de retornar `null` | nada |
| **TD-7** | [ApiUsage.js:1](server/src/models/ApiUsage.js#L1) + políticas RLS de `api_usage` | Cliente anon contra política `auth.uid() = user_id` → provável falha silenciosa de todo o registro de custo | **Único controle financeiro do produto não funciona**; telas mostram zero como dado real | Gasto de IA invisível | Confirmar no banco; usar `supabaseAdmin` | verificação no Supabase |
| **TD-8** | [Analyses.jsx:522](frontend/src/pages/Analyses.jsx#L522) | `innerHTML` com conteúdo de LLM + JWT em `localStorage` | XSS → roubo de sessão (token de 7–30 dias) | Conteúdo vem de vídeo de terceiros | `createElement`/`textContent`; considerar cookie `httpOnly`; adicionar CSP | nada |
| **TD-9** | [rateLimiter.js](server/src/middleware/rateLimiter.js) + [server/vercel.json](server/vercel.json) | `MemoryStore` em serverless → rate limiting ineficaz | Brute force no login e abuso de IA sem freio efetivo | Controle de segurança que parece existir e não existe | Store externo (Redis/Upstash) ou rate limit na borda | provisionar Redis |
| **TD-10** | AI-3 + AI-2 + TD-9 + TD-7 | Sem limite de vídeos/request, modelo escolhido pelo cliente sem validação, sem quota, sem visibilidade | Gasto ilimitado de API por usuário autenticado, invisível | Financeiro direto | Limite de `videos[]`; allow-list de modelos; quota por tenant | TD-7 (para ter visibilidade) |
| **TD-11** | [aiController.js:27-55](server/src/controllers/aiController.js#L27) | `athleteData` arbitrário do body direto no prompt, sem posse nem limite | Abuso de custo + prompt injection | Endpoint sem relação com o `user_id` do chamador | Aceitar `athleteId` e carregar server-side | nada |
| **TD-12** | [auth.js:99-105](server/src/middleware/auth.js#L99) | Fallback usa `role` do token quando o banco falha | Falha do Supabase desliga 3 controles de acesso ao mesmo tempo | JWT antigo de admin volta a valer sob instabilidade | Falhar fechado; se preciso, servir do cache expirado | nada |
| **TD-13** | `server/migrations/` (sem `CREATE TABLE users`, sem `020`, sem runner) | Migrations não são a fonte de verdade; README desatualizado; aplicação manual sem controle de estado | Impossível reconstruir o banco ou saber o que está em produção | Todo trabalho de schema começa com arqueologia | `pg_dump --schema-only` como baseline; adotar Supabase CLI | acesso ao banco |
| **TD-14** | `athletes/opponents/fight_analyses.user_id` VARCHAR vs UUID nas demais | Tipo divergente na mesma coluna semântica; FKs derrubadas em `008` | Sem integridade referencial; mascara bugs (TD-6 passa por causa disso); migrations precisam de cast | Dados órfãos invisíveis | Unificar em UUID; recriar FKs para `public.users` | TD-13 + limpeza de dados |
| **TD-15** | [athleteStats.js](frontend/src/utils/athleteStats.js) (238) vs [athleteStatsUtils.js](server/src/utils/athleteStatsUtils.js) (121) | Mesma regra de negócio duas vezes, **já divergente** | Números diferentes para o mesmo atleta conforme o caminho | Divergência silenciosa em dado exibido | Uma fonte só (backend); front consome | nada |
| **TD-16** | `linkController` + `server/vercel.json` | Trabalho de IA longo em request síncrono em serverless | Operação principal do produto provavelmente estoura o timeout **após** gastar tokens | Perda de trabalho pago + má UX | Job assíncrono (`202 {jobId}` + polling) | decisão de arquitetura; habilita FE-3 da SPEC-FRONTEND |
| **TD-17** | 6 lockfiles para 3 `package.json`; `playwright/` sem lockfile | Instalações não determinísticas | Dev e CI resolvem árvores diferentes | Bug que só aparece em produção | Escolher um gerenciador; apagar o resto | nada |

### MEDIUM

| # | Localização | Problema | Impacto | Recomendação |
|---|---|---|---|---|
| TD-18 | `jest.config.js` + `server/tests/` | 3 arquivos `.test.js` que nunca rodam e estão quebrados | Falsa sensação de cobertura | Apagar ou converter em testes reais |
| TD-19 | `ci.yml`, `code-quality.yml` | `continue-on-error: true` em lint, `npm audit` e TruffleHog | Nenhum desses portões bloqueia nada — foi por isso que TD-1 passou | Remover o flag, começando pelo scanner de secrets |
| TD-20 | ausência de lint no backend | 69 arquivos sem análise estática | Erros triviais (TD-5, TD-6) chegam a produção | ESLint no server + regra de `no-unused-vars`/`no-undef` |
| TD-21 | [errorHandler.js:20](server/src/utils/errorHandler.js#L20) | `details: error.message` para o cliente; viola a própria [copilot-instruction:33](.github/copilot-instructions.md#L33) | Vaza schema e stack | Condicionar a `NODE_ENV !== 'production'` |
| TD-22 | `docs/MULTI_AGENTS.md`, `QUICKSTART_MULTI_AGENTS.md`, `docs/API.md.old`, [copilot-instructions.md:253](.github/copilot-instructions.md#L253) | ~800 linhas documentando sistema removido + instruções de Copilot obsoletas | **Orienta erradamente humanos e IA** — risco de reintrodução | Apagar/arquivar; atualizar as instruções de Copilot |
| TD-23 | migrations [017](server/migrations/017-add-user-roles.sql#L23), [018](server/migrations/018-fix-admin-roles.sql#L5), `019`, `022`, [FIX_USER_ID.sql](server/FIX_USER_ID.sql) | PII (8 e-mails, 1 nome) versionada; `018` faz `UPDATE users SET role='user'` sem WHERE | LGPD; reexecução rebaixa todos os admins | Parametrizar; separar schema de correção de dados |
| TD-24 | `geminiService.chat` + [:646](server/src/services/geminiService.js#L646) | Chat é o único caminho sem `responseSchema`; parsing por regex escreve no banco | Sugestões de edição perdidas em silêncio | Migrar para saída estruturada |
| TD-25 | [strategyService.js:252-304](server/src/services/strategyService.js#L252) | Prompt de produção hardcoded fora de `services/prompts/` | Prompt invisível para quem procura no lugar certo | Mover para `.txt` |
| TD-26 | [linkController.js:13](server/src/controllers/linkController.js#L13), [videoAnalysisService.js:40](frontend/src/services/videoAnalysisService.js#L40) | Validação de host por `includes` | SSRF limitado; `youtube.com.evil.net` passa | Comparação exata de hostname |
| TD-27 | todos os controllers | Nenhum validador de schema de entrada no backend | Habilita TD-10, TD-11; validação ad hoc | Adotar zod/joi na borda |
| TD-28 | `Overview.jsx`, `Athlete.getAll`, `FightAnalysis.getAll` | Sem paginação; dashboard carrega 3 tabelas para 4 números | Degrada linearmente com o uso | Endpoints de count + paginação |
| TD-29 | 4 páginas React Query × 5 páginas `useEffect` | Dois padrões de fetch, invalidação cruzada ausente | Dados obsoletos entre telas | Padronizar em React Query |
| TD-30 | `athletes` e `opponents` | Duas tabelas e dois models idênticos | Toda lógica de CRUD/escopo/parsing duplicada | Avaliar unificação com discriminador |
| TD-31 | `users.email`, `*_versions` | Zero constraints `UNIQUE`; numeração de versão calculada no app sem transação | Contas duplicadas; versões com número repetido; dois `is_current` | Adicionar `UNIQUE`; usar sequência/transação |
| TD-32 | [config/supabase.js:21-28](server/src/config/supabase.js#L21) | `supabaseAdmin` cai silenciosamente para anon; divisão dos dois clientes sem regra | Mesmo código com dois níveis de privilégio | Regra explícita; falhar no boot se faltar a chave |
| TD-33 | `deploy.yml` (GitHub Pages) + `vercel.json` (Vercel) | Dois destinos de deploy simultâneos; `VITE_API_URL` cai para `localhost` se o secret não existir | Ambiguidade sobre qual é produção; build apontando para localhost | Escolher um destino; falhar o build sem a variável |
| TD-34 | `playwright/tests/e2e/` | 6 specs bem feitos, nunca executados no CI | Investimento parado | Job de CI (nightly ou por PR) |
| TD-35 | [index.js:33](server/index.js#L33), ausência de `helmet` | CORS aceita qualquer `*.vercel.app`; sem headers de segurança | Amplia XSS e clickjacking | Allow-list explícita; `helmet` |

### LOW

| # | Item |
|---|---|
| TD-36 | 6 componentes órfãos: `StatsRadarChart`, `StatsLineChart`, `StatsBarChart`, `LoadingSpinner`, `Button`, `InlineDiff` |
| TD-37 | `server/=` (0 bytes, rastreado) + `check-analysis.js`, `debug-analyses.js`, `test-connection.js`, `DEBUG_ANALYSES.sql`, `FIX_USER_ID.sql` na raiz do server |
| TD-38 | Deps não usadas: `@supabase/supabase-js` (raiz), `@tanstack/react-query-devtools`, `typescript` + 3 `@types/*`, provavelmente `uuid` |
| TD-39 | `chatLimiter` aplicado 2× no mesmo router ([chatRoutes.js:11,15](server/src/routes/chatRoutes.js#L11)) |
| TD-40 | Rota comentada em [ai.js:12](server/src/routes/ai.js#L12); `analyzeVideo` que só retorna 400; `apiUsageLogger.logApiUsage` sem chamadores |
| TD-41 | 11 `alert()`/`confirm()` nativos no frontend (F16 da SPEC, aberto) |
| TD-42 | `bcrypt` 10 rounds (recomendado ≥12); senha mínima de 6 chars sem complexidade |
| TD-43 | `express.urlencoded({limit:'500mb'})` contra 10 MB do `json` |
| TD-44 | Sem `.editorconfig`, Prettier ou hooks de pre-commit |
| TD-45 | Ausência de fluxo de recuperação de senha; `/register` acessível com registro desabilitado |

---

## 14. Good Parts

O que **não** deve ser refatorado por estética, e as decisões que merecem ser preservadas e imitadas.

**1. `services/llm.js` — a abstração mais valiosa do projeto.** Fronteira única e real com o SDK de IA. Nenhum controller ou model importa `@google/genai`; os testes mockam este módulo em vez do SDK. Cada princípio está documentado com o *motivo* ([llm.js:8-14](server/src/services/llm.js#L8)). **Preservar como está** — é o que torna a evolução da camada de IA tratável.

**2. Saída estruturada por `responseSchema`.** `schemas/videoAnalysis.js` e `schemas/strategy.js` como contrato único, em vez de "JSON de exemplo no prompt + regex". Corrigiu a causa-raiz de uma família inteira de bugs (B4/B5 da SPEC), não o sintoma. **Estender ao chat** (TD-24), não reverter.

**3. Mitigação de prompt injection no chat.** `CHAT_SYSTEM_INSTRUCTION` é constante e **nunca** interpola dado do usuário; o contexto entra como primeiro turno `user` com aviso explícito ([geminiService.js:740-782](server/src/services/geminiService.js#L740)). O comentário explica por que o papel "system" carrega mais autoridade e cita o padrão do CodeQL. **É o melhor comentário do repositório** — preserva o raciocínio, não só a decisão. Replicar o padrão nos outros caminhos.

**4. Validação de sessão em três camadas no `authMiddleware`.** `role` lido do **banco** e não do token, `is_active` reconsultado, `token_version` comparado ([auth.js:86-97](server/src/middleware/auth.js#L86)). É por isso que **não existe escalonamento de privilégio** neste sistema, apesar de todo o resto. O cache de 5 min com teto e evicção é a otimização certa para viabilizar isso. Corrigir apenas o fallback (TD-12) — o desenho está certo.

**5. `utils/errors.js` + `parseGeminiError` + `classifyDownloadError`.** 12 classes de erro tipadas com `statusCode`, e 10 modos de falha do YouTube traduzidos em mensagens acionáveis em pt-BR ([videoDownloader.js:315-355](server/src/services/videoDownloader.js#L315)). Qualidade acima da média do repositório. Preservar e **usar mais** — o problema é adoção incompleta, não o desenho.

**6. `BELT_RULES` como fonte única de regra IBJJF, com a faixa mais restritiva governando.** [config/ai.js:12-43](server/src/config/ai.js#L12) + [geminiService.js:515-524](server/src/services/geminiService.js#L515). Resolveu a triplicação (C1/C2 da SPEC), e o fallback para o conjunto mais restritivo quando a faixa é desconhecida ([:91-104](server/src/services/geminiService.js#L91)) é a escolha segura correta — assumir faixa mais permissiva arriscaria sugerir técnica ilegal. Os comentários registram exatamente quais divergências existiam antes. **Não mexer** (só validar a correção esportiva com o regulamento).

**7. `utils/tenantScope.js` — o helper certo, com o problema certo.** Oito linhas que expressam a regra de negócio de escopo com precisão. O problema **não é o helper** — é ele não ser obrigatório. A correção é fazer os 6 pontos faltantes usarem-no (e idealmente empurrar a garantia para os models), **não** substituí-lo.

**8. `models/TacticalAnalysis.js` — o model exemplar.** Filtro `.in('user_id', ids)` em **todos** os métodos, aceita escalar ou array, é o único com `limit`/`offset`. **É o padrão que `FightAnalysis` deveria seguir** — use-o como referência ao corrigir TD-4.

**9. `services/prompts/` com carregador cacheado.** Prompts como arquivos `.txt` versionados, fora do código, com substituição `{{PLACEHOLDER}}`. `fillPrompt` usa `split().join()` em vez de `String.replace` — imune aos padrões `$&`/`$1`. Detalhe pequeno, correto, e coberto por `prompts.test.js` (360 linhas). Preservar; trazer o prompt órfão de AI-4 para dentro.

**10. `SPEC-ANALISE-IA.md` e `SPEC-FRONTEND.md`.** Duas auditorias técnicas honestas, com evidência em `arquivo:linha`, priorização explícita (P0/P1/P2), fases com dependências declaradas e — o mais raro — **admissão do que está errado sem eufemismo** ("o sistema INVENTA dados"). Verifiquei uma amostra do frontend e a precisão se confirmou (5/5 achados ainda abertos, todos descritos corretamente). **São o ativo de manutenção mais valioso do repositório depois do código.** Não deixar apodrecer: manter status por item.

**11. Comentários que preservam o *porquê*, não o *o quê*.** Vários registram a decisão e a alternativa rejeitada: por que o multi-agente foi aposentado ([strategyService.js:556](server/src/services/strategyService.js#L556)), por que o regex de e-mail evita aninhamento ([userController.js:61](server/src/controllers/userController.js#L61)), por que `is_active` não filtra na visão de grupo ([User.js:123](server/src/models/User.js#L123)), por que as análises são buscadas uma vez ([strategyService.js:493-497](server/src/services/strategyService.js#L493)), por que o `continue-on-error` foi removido do CI ([ci.yml](.github/workflows/ci.yml)). Num projeto assistido por IA, esse tipo de comentário é o que impede que uma correção seja desfeita na próxima iteração. **Preservar em qualquer refatoração.**

**12. Decisões de produto implementadas com cuidado.** Soft delete de usuário com preservação de dados; exclusão permanente exigindo escolha explícita entre transferir ou apagar ([userController.js:216-246](server/src/controllers/userController.js#L216)); `assertSameTenant` numa única query em vez de duas ([:11-31](server/src/controllers/userController.js#L11)); `evictAuthCache` em toda mutação sensível; log de auditoria em toda operação admin ([adminMiddleware.js:8,11](server/src/middleware/adminMiddleware.js#L8)). Este módulo é o mais maduro do backend.

**13. Otimização consciente de custo de IA.** Reutilizar `technical_summary` salvo em vez de reconsolidar ([strategyService.js:520-539](server/src/services/strategyService.js#L520)) e consolidar por função pura antes de recorrer à IA ([geminiService.js:250](server/src/services/geminiService.js#L250)) são decisões corretas e deliberadas. Preservar.

**14. Ausência de dependências circulares** em `server/src` e `frontend/src` — em base deste tamanho, com esse histórico de assistência por IA, não é acidente trivial.

**15. Code splitting pensado no frontend.** `lazy()` + `Suspense` por rota, preload deliberado das páginas mais usadas ([App.jsx:30-37](frontend/src/App.jsx#L30)), `PrefetchLink`, componentes de skeleton. A estratégia de carregamento foi projetada, não improvisada.

**16. Estrutura dos testes E2E.** `playwright/` com Page Objects (9 páginas), fixtures, `TestDataBuilder`, `Logger` e helper de API. Arquitetura de teste madura — o problema é só não rodar no CI (TD-34). **Não reescrever; ligar.**

---

## 15. Risks

Riscos agregados — o que pode dar errado, não apenas o que está errado.

| # | Risco | Probabilidade | Impacto | Composto por | Mitigação |
|---|---|---|---|---|---|
| **R-1** | **Vazamento/manipulação de dados entre tenants em produção** | **Alta** — explorável hoje por qualquer usuário autenticado, sem ferramenta especial | Alto — dados de análise de atletas de clientes distintos | TD-2, TD-3, TD-4 | Remover `/debug/all`; corrigir os 3 endpoints; resolver RLS |
| **R-2** | **Acesso ao banco contornando a aplicação inteira** | **Média** — depende de o repositório ser público e dos GRANTs reais (NEEDS_CONFIRMATION) | Crítico — leitura e escrita irrestritas | TD-1, TD-2 | Verificar no dashboard **antes de qualquer outra coisa**; rotacionar chaves |
| **R-3** | **Fatura de IA descontrolada e invisível** | **Média** — não requer má-fé; um loop de retry no cliente basta | Alto — financeiro direto, sem alerta | TD-7, TD-9, TD-10, TD-11 | Corrigir o registro de custo primeiro (para ver), depois impor quota |
| **R-4** | **Decisão técnica tomada sobre dado errado** | **Alta** — já está acontecendo | Médio-alto — o produto é uma ferramenta de decisão tática | TD-5, TD-6, TD-7, TD-15, F1/F4/F5/F6 da SPEC | Corrigir os no-ops silenciosos; rotular dado estimado como estimativa |
| **R-5** | **Operação principal do produto falha sob carga real** | **Média-alta** — cresce com a duração do vídeo | Alto — o fluxo central fica inutilizável | TD-16 | Job assíncrono; medir a duração real hoje |
| **R-6** | **Roubo de sessão via XSS** | Baixa-média — exige conteúdo poluído + usuário exportando PDF | Alto — token válido por 7–30 dias, sem revogação seletiva | TD-8, TD-35 | Remover o sink; CSP; avaliar cookie `httpOnly` |
| **R-7** | **Correção introduz regressão silenciosa** | **Alta** — este é o risco que governa o *sequenciamento* de tudo | Alto — perda de confiança na base | Zero teste de autorização; sem lint no backend; sem tipagem; E2E desligado | **Ligar os portões antes de corrigir**: lint no backend, E2E no CI, testes de ownership junto com TD-4 |
| **R-8** | **Trabalho de schema bloqueado por desconhecimento do estado real** | **Alta** — já é o caso | Médio — congela evolução do modelo | TD-13, TD-14, TD-31 | Extrair o schema real como baseline |
| **R-9** | **Reintrodução de padrões já removidos** | **Média** — específico de base assistida por IA | Médio — desfaz correções da Fase 1 | TD-22 (docs mortas + instruções de Copilot obsoletas) | Apagar as docs mortas e atualizar `.github/copilot-instructions.md` — barato e de alto retorno |
| **R-10** | **Divergência entre ambientes** | Média | Médio — bug que só aparece em produção | TD-17 (6 lockfiles), TD-33 (2 destinos de deploy), DEP-3 (`yt-dlp` não declarado) | Um gerenciador, um destino de deploy, dependências de sistema documentadas |
| **R-11** | **Perda de trabalho do usuário** | Média | Médio | TD-5, F14/F19–F22 da SPEC-FRONTEND | Cluster FE-1 da SPEC-FRONTEND |
| **R-12** | **Conhecimento de domínio incorreto** (regras IBJJF) | **UNKNOWN** — não verificável por código | Alto — sugerir técnica ilegal para a faixa tem consequência real em competição | AI-10 | Revisão humana com o regulamento IBJJF vigente |

---

## 16. Needs Confirmation

O que o código **não** permite determinar. Nada aqui foi presumido no relatório.

### Bloqueia decisão de segurança (verificar primeiro)

1. **O repositório `github.com/lucasxtech/JiuMetrics` é público?** Determina se TD-1 (chave do Gemini) e TD-2 (credenciais do Supabase) são exposição pública ou apenas interna. Muda a urgência, não a ação.
2. **Qual o estado REAL de RLS e das políticas em produção?** As migrations dizem: RLS desligado em `athletes`/`opponents`/`fight_analyses`; `USING (true)` em `tactical_analyses`/`ai_chat_sessions`/`analysis_versions`; `auth.uid() = user_id` em `api_usage`/`profile_versions`/`strategy_versions`. Podem ter sido alteradas manualmente no dashboard. Consulta: `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname='public'; SELECT * FROM pg_policies;`
3. **Os papéis `anon`/`authenticated` ainda têm GRANT nas tabelas?** É o que decide se TD-2 é explorável de fato. Consulta: `SELECT grantee, table_name, privilege_type FROM information_schema.role_table_grants WHERE grantee IN ('anon','authenticated');`
4. **A chave do Gemini em `.archived/SUPABASE_SETUP.md:25` ainda é válida?** Se sim, rotação imediata. Se já foi rotacionada, ainda precisa sair do histórico.
5. **`SUPABASE_SERVICE_ROLE_KEY` está definida em produção?** Sem ela, `supabaseAdmin` cai para anon (TD-32) e ChatSession/ProfileVersion/StrategyVersion mudam de comportamento silenciosamente.

### Bloqueia entendimento do estado atual

6. **`api_usage` tem linhas?** `SELECT count(*), max(created_at) FROM api_usage;` — decide TD-7. Se houver linhas recentes, minha conclusão sobre RLS está errada e a causa é outra.
7. **`profile_versions` tem linhas?** `SELECT count(*) FROM profile_versions;` — confirma TD-5. Espero **zero**.
8. **Quais migrations foram realmente aplicadas em produção?** Não há tabela de controle. Sem isso, não se sabe qual schema está no ar. A `020` faltante existiu e foi aplicada, ou é só um salto na numeração?
9. **`users.email` tem constraint `UNIQUE`?** Nenhuma migration cria; pode ter sido criada no dashboard. Decide TD-31.
10. **Existe estrutura de tabela `users` além do que os `ALTER` sugerem?** A tabela nunca é criada por migration — o schema real é desconhecido.
11. **Existem dados órfãos** (`user_id IS NULL` ou `''`) em `athletes`/`opponents`/`fight_analyses`? A existência de `FIX_USER_ID.sql` e os filtros defensivos da migration `019` sugerem que houve. Bloqueia TD-14.
12. **Qual é o ambiente de produção canônico?** `deploy.yml` publica o frontend no GitHub Pages; `frontend/vercel.json` e `frontend/.env.production` apontam para Vercel. O CORS libera os dois. Ambos estão no ar? Qual é o oficial?
13. **`VITE_API_URL` está configurado como secret no GitHub?** Se não, o build do GitHub Pages sai apontando para `localhost:5050` ([deploy.yml](.github/workflows/deploy.yml)) — frontend publicado e quebrado.
14. **Qual plano da Vercel e qual o timeout efetivo das functions?** Determina a severidade de TD-16/R-5. Não há `maxDuration` no `vercel.json`.

### Regra de negócio indeterminável pelo código

15. **Um admin deve poder promover outro membro do tenant a admin?** O código permite ([userController.js:176-209](server/src/controllers/userController.js#L176)). Intenção de produto ou herança? — **UNKNOWN**
16. **Usuário comum deve poder ver dados criados por outros membros do mesmo tenant?** Hoje: não (`getScopeIds` devolve só o próprio ID). Mas `AnalysisVersion` não tem escopo algum e `Athlete.getAll` monta `creator_name` para exibir autoria — o que sugere que uma visão de grupo já foi considerada. Qual é a regra desejada? — **NEEDS_CONFIRMATION**
17. **Dados de usuário desativado devem continuar visíveis ao grupo?** Está implementado deliberadamente e comentado ([User.js:123](server/src/models/User.js#L123)). Confirmar que é a intenção.
18. **`tenant_id` deve permitir hierarquia de mais de um nível?** A migration `021` propaga em até 3 níveis, mas `createSubUser` sempre herda do criador e `getGroupUserIds` é plano. Qual é o modelo pretendido? — **UNKNOWN**
19. **A tabela `BELT_RULES` está esportivamente correta** frente ao regulamento IBJJF vigente (adulto, gi)? Não verificável por código. **Exige revisão humana** — R-12.
20. **Registro público deve permanecer desabilitado?** `ALLOW_PUBLIC_REGISTER` não está no `.env.example` e a rota `/register` continua na SPA.
21. **`athletes` e `opponents` devem permanecer entidades separadas?** São estruturalmente idênticas. Se um adversário pode virar atleta (ou o mesmo lutador aparecer nos dois papéis), a modelagem atual duplica a pessoa. — **NEEDS_CONFIRMATION**
22. **A metodologia dos gráficos** (percentuais forçados a somar 100%) é aceitável como está, ou deve virar o event log com timestamps proposto na SPEC (A3/A4)? Decisão de produto, não técnica.
23. **`uuid@13` é realmente usado?** Não localizei `require('uuid')` em `server/src`.
24. **Os testes passam hoje?** `node_modules` não está instalado; **não executei nenhuma suíte**. O CI sugere que o backend está verde (o `continue-on-error` foi removido em `4842f9e`), mas isso não foi verificado nesta auditoria.
25. **`npm audit` reporta vulnerabilidades?** Não executado (exigiria instalar dependências).

---

## 17. Recommended Next Steps

Sequenciado por dependência real, não por severidade. O princípio: **verificar antes de corrigir; ligar os portões antes de mexer no código** (R-7).

### Etapa 0 — Verificação e contenção (antes de tocar em código)

Só investigação e credenciais; nenhuma alteração de código.

1. **Rotacionar a chave do Gemini** (TD-1). Independe de qualquer confirmação.
2. **Responder às perguntas 1–5 do §16** no dashboard do Supabase e nas configurações do GitHub. As 3 consultas SQL estão escritas lá. Isso decide se R-2 é um incidente em curso ou um risco latente.
3. **Rodar as consultas 6, 7 e 11** (`api_usage`, `profile_versions`, órfãos). Confirmam ou refutam TD-7 e TD-5 em minutos.
4. **Remover `GET /api/fight-analysis/debug/all`** (TD-3). Deleção isolada, sem dependência, encerra o vazamento mais fácil de explorar.

### Etapa 1 — Portões de qualidade (antes das correções)

Sem isso, cada correção seguinte é uma aposta (R-7).

5. Remover `continue-on-error` do **secrets-scan** (foi o portão que deixou TD-1 passar).
6. **ESLint no backend** (TD-20) — 69 arquivos hoje sem análise estática nenhuma.
7. **Testes de ownership** para os endpoints do §6, **escritos antes** da correção: devem falhar agora e passar depois. É a rede que impede o próximo IDOR.
8. Ligar o **Playwright no CI** (TD-34) — a suíte já existe e está pronta.

### Etapa 2 — Isolamento entre tenants (o bloco crítico)

9. Corrigir **TD-4** (os 3 endpoints do chat), usando `applyEdit` e `TacticalAnalysis` como referência.
10. Corrigir **TD-5** (snapshot de sessão) e **TD-6** (vinculação de análise).
11. **Empurrar a garantia para o model:** fazer `FightAnalysis.update/delete` exigirem escopo, para que a próxima omissão de controller falhe em vez de vazar. Esta é a correção estrutural — os itens 9–10 são os sintomas.
12. Resolver **TD-2** conforme a Etapa 0: revogar GRANTs de `anon` (recomendado, coerente com o JWT próprio) ou implementar RLS real.

### Etapa 3 — Controle financeiro

13. Corrigir **TD-7** (registro de custo) — **primeiro**, para haver visibilidade antes de impor limites.
14. Limite em `videos[]` (TD-10) e allow-list de modelos (AI-2).
15. Rate limiting com store externo (TD-9).
16. Quota por usuário/tenant.

### Etapa 4 — Correções silenciosas de dados

17. **TD-5** (histórico de versões de perfil — nunca funcionou) e **TD-6** (`technical_profile` no-op).
18. **TD-15** (regra duplicada e divergente entre front e back) — uma fonte só.
19. **TD-8** (sink de XSS) + CSP.
20. **TD-12** (fallback de auth abrindo) e **TD-21** (vazamento de `error.message`).

### Etapa 5 — Limpeza de baixo custo e alto retorno

Barato, sem risco, e reduz R-9 imediatamente.

21. Apagar `docs/MULTI_AGENTS.md`, `QUICKSTART_MULTI_AGENTS.md`, `docs/API.md.old`; **atualizar `.github/copilot-instructions.md`** (TD-22). Num projeto mantido com Copilot, documentação morta é instrução ativa.
22. Consolidar lockfiles (TD-17); decidir o destino de deploy (TD-33).
23. Remover `server/=`, scripts de debug, 6 componentes órfãos, deps não usadas, `server/tests/` (TD-18, TD-36, TD-37, TD-38).

### Etapa 6 — Estrutural (requer decisão sua)

24. **TD-13/TD-14** — baseline do schema + unificação de tipo de `user_id` + FKs. Precisa da Etapa 0 concluída e de limpeza de dados.
25. **TD-16** — job assíncrono para análise de vídeo. Habilita a FE-3 da SPEC-FRONTEND (progresso real).
26. Executar a **SPEC-FRONTEND** a partir de FE-0 (confirmei que nada dela foi implementado).
27. Avaliar as fases restantes da **SPEC-ANALISE-IA** (event log com timestamps, A3/A4).

---

## Decisões — RESPONDIDAS (2026-08-12)

| | Decisão | Resolução |
|---|---|---|
| **D1** | Modelo de acesso ao banco | **Revogar acesso de `anon`/`authenticated`; backend fala exclusivamente por `service_role`.** Autorização passa a ser 100% responsabilidade da aplicação — o que reforça a necessidade de empurrar a garantia de posse para os models (TD-4, item 11 da Etapa 2) |
| **D2** | Usuário comum vê dados de outros membros do tenant? | **Não — apenas admins.** Confirma que `getScopeIds` já implementa a regra correta. A correção de TD-4 é mecânica: aplicar o helper existente nos 6 pontos faltantes. `creator_name` permanece só para exibição na visão de admin |
| **D3** | Portões antes ou correções antes? | **Portões primeiro** (Etapa 1) |
| **D4** | Escopo | **Tudo.** Etapas 0–6, executadas na ordem de dependência |
| **D5** | Destino de produção | **Vercel.** GitHub Pages removido (`deploy.yml` + `basename`/`isGitHubPages` em `App.jsx` + origem `lucasxtech.github.io` no CORS) |
| **D6** | Tipagem | **Adotar TypeScript**, incrementalmente e **não** na mesma rodada das correções de autorização. Passo imediato de custo quase zero: `tsconfig.json` com `checkJs` + `// @ts-check` opt-in nos módulos de maior risco (`models/`, `utils/`), que já pega as 3 falhas silenciosas do §1 |
| **D7** | Regras IBJJF | Extrair do **regulamento oficial IBJJF**. Manter `BELT_RULES` como **tabela determinística em código** (ela alimenta lógica de validação, não só texto de prompt) com citação da fonte + data de revisão. **Não** transformar em base de conhecimento/RAG |
| **D8** | `Athlete` × `Opponent` | **Unificar** numa entidade só, com marcação de papel (tag de adversário). Migração de schema de alto risco — executar **por último** (Etapa 6), depois de TD-13/TD-14 |

O contexto original de cada decisão está preservado abaixo, para registro do raciocínio.

### Contexto original das decisões

Ordenadas por quanto travam o resto.

**D1 — Modelo de acesso ao banco (trava a Etapa 2).** Revogar todo acesso de `anon`/`authenticated` e falar exclusivamente por `service_role` no backend, **ou** reativar RLS com políticas reais? A primeira é coerente com o JWT próprio e é muito menos trabalho; a segunda dá defesa em profundidade. Recomendo a primeira. *Não dá para corrigir TD-2 sem essa decisão.*

**D2 — Visibilidade dentro do tenant (trava o desenho da correção de TD-4).** Usuário comum deve ver dados de outros membros do mesmo tenant? Hoje: não. Mas `creator_name` é montado para exibição, o que sugere que uma visão de grupo já foi pensada. A resposta muda o desenho da correção, então precisa vir **antes** dela.

**D3 — Sequenciamento: portões antes ou correções antes?** Recomendo portões (Etapa 1) primeiro: sem teste de ownership, corrigir 6 endpoints de autorização é apostar. Custa ~1 dia e reduz R-7, que é o risco que governa todo o resto. Se a urgência de segurança falar mais alto, o item 4 (remover `/debug/all`) pode ir na frente sozinho — é deleção isolada.

**D4 — Escopo desta rodada.** Minha recomendação: Etapas 0–2 (isolamento entre tenants) + Etapa 5 (limpeza barata), deixando as Etapas 3–4 para a rodada seguinte. Alternativa: incluir a Etapa 3 se a exposição financeira preocupar mais que a de dados.

**D5 — Destino de produção (trava TD-33).** GitHub Pages ou Vercel? Ambos estão configurados, o CORS libera os dois, e o build do Pages aponta para `localhost` se o secret não existir. Precisa de uma escolha para o pipeline fazer sentido.

**D6 — Tipagem.** As três falhas silenciosas mais graves (TD-5, TD-6, e o `technical_stats` do `versionManager`) são erros que a tipagem pegaria em tempo de compilação. Vale adotar TypeScript incrementalmente no backend (ou `checkJs` com JSDoc, que já existe e é bom), ou aceitar o custo e compensar com testes? *Decisão de rumo, não urgente — mas define quanto teste é necessário.*

**D7 — Revisão das regras IBJJF (R-12).** Preciso de alguém com o regulamento vigente para validar `BELT_RULES`. Não é verificável por código, e sugerir técnica ilegal para uma faixa tem consequência real em competição. Quem faz essa revisão?

**D8 — Entidades `Athlete` e `Opponent` (afeta TD-30).** Devem permanecer separadas? São estruturalmente idênticas, e se o mesmo lutador pode aparecer nos dois papéis, a modelagem atual duplica a pessoa e fragmenta o histórico dela. Unificar é mudança de modelo — não faço sem sua decisão.

---

### Nota de encerramento

Nenhum arquivo de código, migration, prompt, dependência ou configuração foi alterado nesta auditoria. O único arquivo criado é este relatório. Nenhum commit foi feito, e a branch `main` permanece intocada.

Duas observações sobre o que encontrei, que valem mais que qualquer item individual da lista:

**Este código não é ruim — é desigual.** As partes recentes (`llm.js`, schemas, taxonomia de erros, `userController`, `TacticalAnalysis`) mostram julgamento técnico real, com o *porquê* registrado em comentário. As falhas graves estão concentradas em código mais antigo que ninguém revisitou (`chatController`, migrations de RLS, `versionManager`). Isso é uma boa notícia: significa que existe um padrão de qualidade já demonstrado **dentro do próprio repositório** para servir de referência — não é preciso importar convenções de fora.

**Os bugs mais perigosos são os silenciosos, não os visíveis.** Três funcionalidades que a UI oferece nunca funcionaram (histórico de versões de perfil, atualização de `technical_profile`, registro de custo de IA) e ninguém percebeu, porque cada uma falha dentro de um `catch` que só escreve no console. Em produto de análise, um recurso que falha em silêncio é pior que um que quebra: o usuário toma decisão com base em dado que não existe. A recomendação transversal que atravessa todo este relatório é **parar de engolir erro** — os cinco `catch` listados no §11 esconderam mais problemas do que qualquer decisão arquitetural deste projeto.
