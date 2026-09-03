# Changelog

Mudanças relevantes do JiuMetrics. Baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).

**O que entra aqui:** funcionalidades, mudanças de comportamento, arquitetura, segurança, banco de dados e IA.
**O que não entra:** formatação, renomeações pequenas, refatorações internas sem impacto observável, mudanças cosméticas.

> **Nota sobre o histórico anterior a 2026-08-12:** este changelog começa no estado atual. O histórico do git antes desta data tem mensagens de commit em grande parte genéricas (`fix`, `fix debugs`, `correção`), o que não permite reconstruir com segurança o que mudou e quando. **Nada foi inventado.** As duas entradas históricas abaixo são as únicas reconstruíveis com confiança, a partir de commits descritivos e das specs correspondentes.

---

## [Não lançado]

### 🔬 Primeira medida de qualidade da análise de IA — 2026-09-03

O projeto nunca teve como dizer se uma análise de luta é boa. Agora tem duas ferramentas, e a primeira já produziu números sobre as 285 análises que existem em produção.

**Adicionado**
- `server/src/utils/analysisQuality.js` — 10 regras determinísticas que checam **coerência interna e contrato** de uma análise (gráfico de passagem sem passagem, aritmética impossível, rótulo fora do vocabulário, fatia única em 100%, contagem disfarçada de percentual, linguagem que o prompt proíbe). Sem IA, sem custo, sem gabarito.
- `server/scripts/audit-analysis-quality.js` — roda essas regras sobre o banco (`--por-mes`, `--desde`, `--exemplos`). Só leitura.
- `server/scripts/eval-video-analysis.js` + fixtures — avaliação **sem gabarito humano** em três modos: variância entre execuções do mesmo vídeo, concordância entre modelos, e leitura do placar do broadcast como verdade de chão. Gasta inferência paga: estima o custo e pede confirmação antes. Roda sob demanda, nunca no CI.

**O que foi medido** (285 análises, nenhuma editada por usuário):
- 76,5% têm ao menos um gráfico com **um único rótulo em 100%** — e 8 de 8 no pipeline atual. Uma "distribuição" de um elemento só não distribui nada.
- 17,5% têm valores equidistantes (50/50, 33/33/34): contagem renormalizada, não distribuição.
- O `responseSchema` **funcionou**: rótulo fora do vocabulário caiu de 58% (dez/2025) para 0%, e gráfico que não soma 100 de 33% para 0%.
- Coerência aritmética sai quase limpa. O problema medido não é o modelo se contradizer — é o formato exigir número onde não houve evento.

### 🐛 Correções na camada de IA — 2026-09-03

**Corrigido**
- **Custo do `gemini-2.5-pro` era subestimado acima de 200K tokens.** O modelo cobra o dobro nessa faixa ($2,50/$15,00 contra $1,25/$10,00) e `PRICING` só conhecia a faixa barata. 3 das 9 análises mais recentes estavam nela (198K–227K tokens), então o custo registrado dessas linhas — e o consumo do orçamento mensal por tenant — estava pela metade.
- **A preferência de finalização chegava fragmentada na estratégia.** `finalizacoes_mais_usadas` agrupava por string exata, então "triângulo", "triângulo invertido" e "triângulo voador" contavam como três técnicas de 1× cada. Novo `utils/submissionTaxonomy.js` agrupa por família canônica **preservando o nome específico** em `variantes` — que agora também vai para o prompt de estratégia.

**Alterado**
- `gemini-3-pro-preview` saiu da allow-list e da tela de Ajustes: o provedor marcou o modelo como descontinuado. Quem tiver o valor salvo no navegador cai no default da tarefa, com aviso. O preço continua em `PRICING` para as linhas históricas.
- Estratégia passa a registrar `metadata.quantitativeData` — quais lados tinham dado quantitativo. **52 das 54 pessoas com análise não têm nenhum**, e as 41 estratégias já geradas saíram só com texto. O comportamento não mudou; deixou de ser invisível.

### 📋 Spec 012 proposta — ingestão de vídeo sem cookies do YouTube — 2026-09-03

Um erro de faturamento da API do Gemini (`403 PERMISSION_DENIED`) chegava ao usuário como "os cookies do YouTube podem ter expirado", porque o fallback de download dispara para qualquer falha da ingestão direta e sua mensagem substitui a causa real. A [spec 012](./specs/012-youtube-ingestion-lockdown/spec.md) propõe classificar o erro da tentativa direta e remover o fallback, `YOUTUBE_COOKIES` e `@distube/ytdl-core`. Ainda não implementada.

### 🔧 CI: portões corrigidos e GitHub Pages desligado — 2026-09-02

#### Segurança

- **CSP restritiva no backend em vez de desligada.** O CodeQL apontou `js/insecure-helmet-configuration` (high) em `contentSecurityPolicy: false`, e estava certo: "esta API não serve documento" justifica não precisar de política elaborada, não justifica desligar. Agora `default-src 'none'` + `frame-ancestors 'none'` — recomendação da OWASP para API, verificada como inofensiva (o backend não tem `res.send` de HTML, `express.static` nem `sendFile`).
- **Workflow do GitHub Pages removido**, executando o item 1 do [ADR-008](./docs/decisions/008-vercel-como-unico-destino-de-deploy.md). ⚠️ **O site continua no ar e agora congelado** — ver *Pendente*.

#### Corrigido

- **O portão de coverage nunca funcionou.** `@vitest/coverage-v8` não estava instalado, então o step falhava em toda execução, escondido por `continue-on-error: true` — e a suíte rodava **duas vezes** por PR para produzir nada. Dependência instalada, execução unificada (`--coverage` já roda os testes), relatório saindo de verdade (6,15% de statements, número honesto).
- **`npm run typecheck` não rodava em lugar nenhum** — a spec 011 criou o script e não o ligou. Agora é o job `Backend Typecheck`, dentro do `needs` do Integration Check.
- **`npm audit --production`** → `--omit=dev` (a flag antiga foi renomeada no npm 9 e quebra em silêncio numa atualização de runner).
- **Base do TruffleHog** passa a ser o SHA da base da PR, não o nome do branch default — numa PR que mire outro branch, o diff era calculado contra o intervalo errado.
- **Três builds do frontend por PR viraram dois:** Lighthouse e bundle-size eram dois jobs com `npm ci` e `npm run build` cada; agora é um job que builda uma vez.

#### ⛔ Pendente — ação do proprietário

- 🔴 **Nenhum check é obrigatório.** `main` não tem branch protection nem ruleset (verificado: `404 Branch not protected`, `rulesets: []`). Toda a afirmação de que os portões "bloqueiam merge" — inclusive nesta documentação — **era falsa**: a spec 003 mudou se o check aparece vermelho, não se o merge é possível. Exigir `Integration Check` + `Secrets Scanning` em Settings → Branches é configuração de painel.
- 🔴 **Desativar o GitHub Pages.** Remover o workflow para de publicar, mas `https://lucasxtech.github.io/JiuMetrics/` **continua respondendo 200**, apontando para o backend de produção. Sem o workflow ele fica **congelado** no último build — servindo JS antigo, com os defeitos que as specs seguintes corrigiram, contra dado atual. Nesse estado, remover o workflow sem desativar o Pages é pior que não ter removido.

---

### 📐 Tipagem incremental no backend — 2026-08-24 · [spec 011](./specs/011-schema-integrity/spec.md) (item 5 apenas)

**Parcial, e deliberadamente: só o item sem risco de dado.** A spec 011 cobre cinco frentes — baseline de schema, unificação de tipo de `user_id`, constraints, unificação de `athletes`/`opponents` e adoção de TypeScript. As quatro primeiras são trabalho de banco de produção que a própria spec diz precisar virar specs próprias antes de executar, e que exige um backup com restauração testada — gate que só o proprietário cumpre. Só a quinta (TypeScript, etapa 1 do [ADR-010](./docs/decisions/010-adotar-typescript-incrementalmente.md)) foi executada.

#### Adicionado

- **`server/tsconfig.json`** (`allowJs`, `strict: false`, sem `checkJs` global) e **`// @ts-check`** em todos os 10 models e nos 11 utilitários de topo de `server/src/utils/`. `npm run typecheck` roda `tsc --noEmit` sobre eles.

#### Corrigido

- **12 divergências entre JSDoc e código, em 5 arquivos**, encontradas na primeira passagem do `tsc` — nenhuma de lógica:
  - `ApiUsage.js` e `TacticalAnalysis.js`: `@param` documentava `userId`, a assinatura real (desde as specs 005–006) é escopo (`userIdOrIds`);
  - `errorHandler.js`: `handleError` lê `error.statusCode`, que só existe em `AppError`, não em `Error` puro;
  - `errors.js`: `VideoDownloadError` documentava `debugInfo.method`/`.url`/`.technicalError` como obrigatórios; o construtor já os tratava como opcionais;
  - `versionManager.js` (3 funções): `@returns` de função `async` documentado sem `Promise<...>` — exatamente a classe de erro que `checkJs` existe para pegar.

#### Limitações declaradas

- **Só backend, só 2 diretórios.** Os ~48 arquivos restantes de `server/src/` e os 79 do frontend continuam sem qualquer verificação de tipo.
- **Nenhum arquivo virou `.ts`.** Etapas 2 (arquivo novo nasce `.ts`) e 3 (migração módulo a módulo) do ADR-010 não começaram.
- **Os quatro itens de banco da spec 011 (baseline, tipo de `user_id`, constraints, unificação `athletes`/`opponents`) não foram tocados.**

---

### 🔒 Fechamento do acesso ao banco — 2026-08-24 · [spec 008](./specs/008-database-access-lockdown/spec.md)

**Parcial: o código está pronto, a execução em produção não.** A chave publicável do Supabase estava num arquivo **rastreado no Git** (`frontend/.env.production`) e, medida contra produção na spec 002, lia 9 das 10 tabelas — incluindo `users`, com `email` e `password_hash` (bcrypt) dos 25 usuários, com escrita também liberada. Era o achado de segurança mais grave do projeto, e continua sendo até o passo pendente abaixo ser executado.

#### Segurança

- **Backend unificado num único cliente Supabase (`service_role`).** Havia dois clientes sem regra documentada sobre qual model usava qual, e o cliente privilegiado **caía silenciosamente** para o cliente anon quando a chave de serviço não estava definida — o mesmo código rodando com dois níveis de privilégio dependendo de uma variável de ambiente, sem aviso. Hoje só existe `supabase`, e o processo **falha no boot** sem `SUPABASE_SERVICE_ROLE_KEY`, em vez do fallback silencioso.
- **`frontend/.env.production` retirado do controle de versão.** O `.gitignore` tinha `.env`, que nunca cobriu `.env.production` — padrão *glob* diferente, não um prefixo. É a causa raiz de a chave ter ficado exposta no histórico do repositório. Corrigido para `.env.*` com exceção para os `.env.example` (templates sem segredo, versionados de propósito).
- **`REVOKE` de `anon`/`authenticated` escrito e pronto** em [`server/migrations/024-revoke-anon-access.sql`](./server/migrations/024-revoke-anon-access.sql), por tabela (não `ON ALL TABLES IN SCHEMA public`, para não arriscar atingir função ou view interna do Supabase), com o comando de rollback (`GRANT` de volta) comentado no mesmo arquivo.

#### ⛔ Pendente — ação manual do proprietário, fora do alcance deste ambiente

- **O `REVOKE` acima não foi executado.** Este ambiente só tem a chave `service_role`, que fala com o banco via PostgREST (REST) — e PostgREST não executa DCL. Faltando uma credencial de conexão direta ao Postgres, o único caminho é colar o arquivo no SQL Editor do dashboard do Supabase. **Até isso rodar, a chave anon antiga continua com GRANT nas tabelas de produção.**
- **Chaves não rotacionadas.** A chave publicável do Supabase e a chave do Gemini (esta no *histórico* do Git, em `.archived/SUPABASE_SETUP.md`) precisam ser trocadas nos respectivos dashboards. Sair do controle de versão não invalida uma chave já exposta.
- **Senha de `contateste@teste.com` não trocada.**

#### Resolvido por consequência

- **A pergunta que bloqueava esta spec desde a spec 002 foi respondida:** não existe consumidor externo da chave anon. Isso permitiu executar sem período de migração para terceiros.
- **`api_usage` deixa de depender da política RLS estar inativa.** `ApiUsage.js` já usava o nome `supabase` — o que mudou é o que esse nome aponta. O registro de custo **já funcionava** (medido: 173 linhas, US$ 3,03), mas por acidente; agora é robusto a uma eventual reativação de política.

---

### 🛡️ Consolidação do frontend — 2026-08-18 · [spec 010](./specs/010-frontend-consolidation/spec.md)

#### Segurança

- **O sink de XSS do relatório em PDF está fechado.** `pages/Analyses.jsx` interpolava conteúdo de estratégia — **gerado por IA sobre vídeo de terceiros** — num template de HTML e jogava em `innerHTML`. `innerHTML` não executa `<script>`, mas executa handlers (`<img src=x onerror=...>`), e com o JWT em `localStorage` isso é roubo de sessão válida por 7 a 30 dias. O conteúdo agora é escapado na fonte, com 16 testes que verificam **no DOM** que nenhum nó executável é construído.
- **Headers de segurança passam a existir.** Não havia nenhum: sem `nosniff`, sem proteção de frame, e anunciando a stack em `X-Powered-By`. `helmet` no backend + CSP, `nosniff`, `X-Frame-Options` e `Referrer-Policy` no `frontend/vercel.json`.
- **Validação de URL de vídeo tinha duas portas abertas:** `hostname.includes('youtube.com')` aceitava `youtube.com.attacker.net`, e `url.includes('video')` aceitava qualquer URL contendo a palavra "video".

#### Corrigido

- **As estatísticas técnicas voltaram a aparecer no histórico.** O produto **escondia dado que possuía**: a resposta imediata da IA entregava `technical_stats` e a leitura do banco `technicalStats`, e o card do histórico lia o primeiro. O usuário analisava o vídeo, os números eram extraídos e salvos, e a tela não os mostrava. Corrigido com normalização na fronteira (`services/normalizers.js`).
- **A tela de Análises quebrava exatamente quando a API falhava** — o objeto `Error` era renderizado como filho JSX, o que derruba o React. O tratamento de erro era a causa da tela branca.
- **`AthleteDetail` navegava para `/video-analysis`**, rota que não existe; o catch-all do router mascarava, levando o usuário ao dashboard em silêncio.
- **`processPersonAnalyses` existe em um lugar só.** As duas cópias (238 + 121 linhas, já divergentes) eram **código morto** — nenhuma tinha chamador de produção.
- **6 componentes órfãos removidos.**

#### Alterado

- **`Overview` migrou para React Query**, usando as mesmas query keys das outras telas: criar um atleta agora atualiza o dashboard, o que antes não acontecia.

#### Limitações declaradas

- ⚠️ **O `innerHTML` e o template-string continuam existindo.** A vulnerabilidade está fechada e testada; remover o padrão exige a comparação visual do PDF que a spec define como obrigatória, e que depende de rodar a aplicação.
- ⚠️ **CSP está em Report-Only** — virar bloqueante exige observar se a política quebra Tailwind ou estilo inline.
- ⚠️ **4 páginas seguem com `useEffect` cru** (`Settings`, `AdminUsers`, `AthleteDetail`, `ModernLogin`). Nenhuma com defeito relatado, e migrá-las sem E2E trocaria um bug conhecido por riscos não observáveis.
- ⚠️ **Nada foi verificado na tela.** Estatísticas no histórico e o PDF exigem rodar a aplicação.
- **JWT continua em `localStorage`** — o que mudou é não haver mais caminho conhecido de XSS até ele.

---

### 💸 Controle de gasto e confiabilidade de IA — 2026-08-18 · [spec 009](./specs/009-ai-cost-and-reliability/spec.md)

**Um usuário autenticado podia gerar gasto ilimitado de API, e ninguém veria no painel.** O registro de custo funcionava e media certo — mas era só observação, sem nenhum ponto de decisão que barrasse. Bastava um laço de retry no cliente, ou escolher o modelo mais caro e enviar muitos vídeos.

#### Adicionado — três barreiras, todas ANTES de gastar

- **Allow-list de modelos.** `resolveModel` aceitava **qualquer string** vinda do cliente. Combinado com `calculateCost`, que precificava desconhecido como o modelo barato, dava para usar um modelo caro registrando o custo de outro. Modelo fora da lista agora cai no default da tarefa, com aviso — e não gera erro, porque a escolha vem do `localStorage` e um valor obsoleto salvo no navegador não deve quebrar quem não fez nada errado.
- **Orçamento mensal por grupo** (`AI_MONTHLY_BUDGET_USD`, default 50). Conta o gasto **persistido em `api_usage`** — não um contador em memória —, e é isso que faz o limite valer em serverless. Decisão P8: **por tenant**, porque o grupo é a unidade que compartilha os dados e a conta.
- **Teto de vídeos por requisição** já havia entrado na spec 007.

O default é deliberadamente permissivo: US$ 50/mês contra um histórico medido de ~US$ 0,38/mês. Apertar depois de observar é fácil; destravar usuário legítimo bloqueado é caro.

#### Adicionado — confiabilidade

- **Retry com backoff e timeout, com políticas distintas por fluxo.** Repetir uma inferência de vídeo em `gemini-2.5-pro` custa muito mais que repetir uma consolidação de texto, e o chat tem alguém esperando na tela. **Nunca** repete quota estourada, conteúdo bloqueado, API key ausente ou JSON malformado — cada um seria outra inferência paga sem chance de resultado diferente.
- **`metadata.promptVersions`** nas estratégias novas: o hash do conteúdo de cada template usado. Sem isso não havia como saber com que instrução uma estratégia de meses atrás foi gerada. Ver [ADR-013](./docs/decisions/013-versionamento-de-prompt-por-hash.md).

#### Corrigido

- **Resumo degradado deixou de se passar por consolidado.** Quando a consolidação por IA falhava, a concatenação dos resumos era gravada em `technical_summary` **indistinguível de um perfil consolidado real** — e alimentava a geração de estratégia como se fosse. Agora vem com `degraded: true` e prefixo visível.
- **O último prompt de produção hardcoded saiu do código** (~53 linhas em `strategyService.js`) para `prompts/consolidate-profile.txt`, com teste de comparação **byte a byte** contra um golden capturado do código anterior. Verificado que o teste detecta a remoção de um único espaço.
- **Bug pré-existente:** `parseGeminiError` não era idempotente. Reclassificar um erro já classificado **degradava o tipo** — uma quota estourada virava erro genérico, perdendo o 429 e a informação de "não repita", porque a mensagem em português ("Cota…") não casa com a checagem por "quota".

#### Limitações declaradas

- ⛔ **Rate limiting genérico continua inoperante em serverless** (`MemoryStore` conta por instância). O gasto de IA ficou protegido por outro caminho; o limite por IP — brute force no login, sobretudo — **não**. Resolver exige store externo ou limite na borda: **infraestrutura, decisão do proprietário**.
- **O timeout interrompe a nossa espera, não a inferência do provedor.** Sem cancelamento no SDK, o custo pode já ter sido incorrido.
- **Versão de prompt só no fluxo de estratégia.**
- **As 55 linhas históricas com custo zero não foram recalculadas** — seria migração de dado. A spec impede que volte a acontecer.
- **Reprodutibilidade tem limite honesto:** saber prompt e modelo dá auditabilidade, **não** replay bit-a-bit. LLM não é determinístico e o provedor deprecia modelos.

---

### Falhas silenciosas e validação de entrada — 2026-08-18 · [spec 007](./specs/007-silent-failures-and-input-validation/spec.md)

**As duas funcionalidades que a UI oferecia e que não funcionavam passam a funcionar.** Nenhuma era erro de lógica: as duas eram incompatibilidade de contrato na fronteira `snake_case` (banco) × `camelCase` (aplicação), e sobreviveram meses porque falhavam dentro de um `catch` que só escrevia no console.

#### Corrigido

- **Histórico de versões de perfil técnico** — quebrado desde 2026-01-16. `versionManager.saveProfileVersion` chamava `ProfileVersion.create` com chaves `snake_case` numa função que desestrutura `camelCase`: todos os campos chegavam `undefined`, o insert violava os `NOT NULL` e o erro morria num `console.warn`. A UI mostrava o histórico vazio e parecia "nunca editei".
- **`technical_profile` do atleta** — 0 de 37 atletas com o campo preenchido. Eram **duas** causas, não uma: a chamada com 2 de 3 argumentos, e o merge lendo `athlete.technical_profile` de um objeto que vem em `camelCase` — este segundo defeito descartaria o perfil existente a cada análise mesmo com a aridade corrigida.
- **Versões de análise perdiam as estatísticas técnicas** — `content.technical_stats` gravado a partir de um objeto que produz `technicalStats`.

#### Segurança

- **`error.message` não é mais devolvido ao cliente em produção.** Eram ~30 handlers via `handleError`, mais 4 diretos, expondo mensagens cruas do PostgREST/Postgres (nome de coluna, constraint violada). O `.github/copilot-instructions.md` já proibia esse padrão — o código violava a regra escrita nele mesmo. O detalhe continua no log do servidor.
- **Teto de 5 vídeos por análise**, verificado **antes** de qualquer chamada de IA. Cada vídeo é uma chamada paga num laço que não tinha limite: um corpo com 500 URLs eram 500 chamadas.
- **Validação de entrada com zod** nos 3 endpoints de `/api/ai/*` ([ADR-012](./docs/decisions/012-zod-para-validacao-de-entrada.md)). Campos não declarados são removidos antes do controller, o que faz o formato antigo de `athlete-summary` deixar de ser possível estruturalmente.

#### Alterado — comportamento observável

- **Uma versão de perfil que não gravar agora devolve erro**, em vez de 200 silencioso. É o objetivo da spec, mas parece regressão para quem usa: operações que "funcionavam" com falha oculta passam a falhar visivelmente.
- **`POST /api/ai/analyze-link`** devolve `data.saved` e **`POST /api/strategy/compare`** devolve `data.savedToHistory`. Sem esses campos, uma operação não persistida era indistinguível de uma persistida. Propagar o erro nesses dois casos jogaria fora trabalho de IA já pago.
- **Os 5 `catch` que engoliam falha foram auditados**, cada um com a decisão registrada em comentário: 1 propaga, 4 toleram por motivo explícito. Onde tolerar é a decisão certa, a falha passou a ser localizável (`grep "FALHA TOLERADA"`).

#### Limitações declaradas

- **A validação cobre 3 dos ~15 endpoints que recebem corpo.** "A API valida entrada" não é verdadeiro fora de `/api/ai/*`.
- **Não verificado na UI:** o histórico de versões de perfil aparecendo na tela exige rodar a aplicação contra um banco.
- **E2E continua não executado** (pendência herdada da spec 003).

---

### 🔒 Ownership obrigatório no acesso a dados — 2026-08-18 · [spec 006](./specs/006-ownership-in-data-access/spec.md)

**A mudança de segurança mais importante do projeto até aqui.** Fecha os **7 vazamentos de posse** (o último remanescente da auditoria) e, mais que isso, fecha a **classe** do problema.

#### O que era possível antes, e deixou de ser

Qualquer usuário autenticado, com apenas o ID de um recurso alheio no corpo da requisição, conseguia:

- **sobrescrever** `summary`/`charts`/`technical_stats` de qualquer análise de qualquer tenant (`POST /api/chat/manual-edit`) — corrupção silenciosa, sem sinal para a vítima;
- **ler** o conteúdo completo de todas as versões de qualquer análise (`GET /api/chat/versions/:analysisId`);
- **reverter** a análise de outro tenant e mexer no ponteiro de versão atual dele (`POST /api/chat/restore-version`);
- **envenenar o contexto de IA** da sessão de chat de outro usuário, alterando o que o modelo receberia nos turnos seguintes (`POST /api/chat/apply-edit` via `sessionId`);
- **criar análise vinculada** a um atleta de outro tenant, poluindo as consolidações de perfil (`POST /api/ai/analyze-link`);
- **injetar conteúdo arbitrário direto no prompt** e gastar IA sem teto nem posse (`POST /api/ai/athlete-summary`).

#### Adicionado

- **Escopo de posse obrigatório na assinatura dos models** — `utils/scopeGuard.js#requireScope` + `MissingScopeError`. A chamada sem escopo **lança** em vez de devolver `null` ou lista vazia, que seriam indistinguíveis de "não encontrado" e morreriam no primeiro `catch` que só loga. Rejeita também `[undefined]`, que é o valor que realmente chega quando o chamador passa uma variável inexistente.
- **`AnalysisVersion.isAnalysisInScope`** — a tabela `analysis_versions` não tem dono, então a autorização deriva da análise pai.
- **3 suítes de teste novas**: `models.test.js` (63 casos de escopo obrigatório), `athleteSummary.test.js` (contrato novo + teste explícito de prompt injection), `profileScope.test.js` (acesso de admin ao grupo).

#### Alterado

- **`POST /api/ai/athlete-summary` mudou de contrato**: recebe `athleteId` e carrega os dados no servidor. O formato antigo (`athleteData` no corpo) devolve **400**. Verificado que nenhum componente do frontend chamava o endpoint; o service foi alinhado no mesmo commit.
- **`POST /api/ai/analyze-link`** valida a posse de `personId` **antes** das chamadas de IA — um pedido que vai dar 404 não queima mais tokens pagos primeiro. `personType` inválido virou 400.
- **`FightAnalysis.getById`** (a variante sem filtro de usuário) foi **removida**.
- **Chat de perfil**: a busca da pessoa usa o escopo resolvido e a escrita o `userId` do registro — o **admin recuperou** o acesso ao dado do próprio grupo, que perdia silenciosamente.
- **`chatController.js` (818 linhas, 16 handlers) foi dividido em 4** controllers por subdomínio, em commit de movimentação pura.
- **Os 6 testes de vazamento deixaram de ser `test.failing`** e passaram a bloquear merge.

#### Decisão de arquitetura (P4)

**A autorização de `analysis_versions` deriva da análise pai, verificada na aplicação.** Não por coluna denormalizada (exigiria migration + backfill e criaria uma segunda fonte de verdade de posse), e **não por JOIN do PostgREST — que é inviável aqui**: `analysis_id` é polimórfico (aponta para `fight_analyses` ou `tactical_analyses`) e não tem foreign key. O plano de refatoração descrevia esta opção como "JOIN"; a correção de rumo está registrada no [§8.1 RN-1](./JIU_METRICS_REFACTORING_PLAN.md).

**Nenhuma migration foi executada. Nenhum dado foi alterado.**

---

### Seam de política de autorização — 2026-08-18 · [spec 005](./specs/005-authorization-policy-seam/spec.md)

`refactor:` — **sem mudança de comportamento observável.** Mesma regra, mesmo resultado para as mesmas requisições; só mudou onde ela mora.

#### Adicionado

- **`server/src/services/authorization.js`** — ponto único de decisão de autorização: `resolveScope(actor)` (idêntico ao antigo `getScopeIds`) e `authorize(actor, action, resource)` (assinatura estável para as dimensões futuras — papel profissional, relacionamento, escopo de campo). Testável sem Express: `server/src/services/__tests__/authorization.test.js`.
- **`req.actor = { id, role, tenantId }`** — populado por `middleware/auth.js` ao lado do já existente `req.user`/`req.userId`. `tenantId` fica reservado (não resolvido eagerly, para não adicionar query em todo request).
- **[ADR-011](./docs/decisions/011-seam-de-politica-de-autorizacao.md)** — contexto, decisão, por que não RBAC agora.

#### Alterado

- **23 call sites em 8 controllers** migrados de `getScopeIds(req, User)` para `resolveScope(req.actor)`. `import` de `models/User` removido nos 7 controllers onde só existia para alimentar essa chamada (mantido em `fightAnalysisController`, que usa `User.getGroupUserIds` diretamente em outro lugar).
- **`utils/tenantScope.js#getScopeIds`** vira wrapper `@deprecated`, delegando a `resolveScope`. `grep -rn "getScopeIds" server/src` confirma: só o wrapper.
- **2 suítes de controller** (`fightAnalysisController.test.js`, `strategyController.test.js`) tiveram o mock de `utils/tenantScope` trocado por `services/authorization` — única exceção prevista à regra de "nenhum teste muda".

#### Verificação

- Os 5 testes de baseline da spec 004 (B1–B5) passam **sem uma linha alterada** — é a prova de que o comportamento não mudou.
- Suíte completa: 194 → 201 testes, todos verdes. Lint: 0 erros, 0 avisos.

---

### Rede de testes de autorização — 2026-08-18 · [spec 004](./specs/004-authorization-safety-net/spec.md)

Nenhuma correção de código (`git diff server/src` vazio). O objetivo desta spec era produzir testes vermelhos **intencionais e documentados** para os 6 endpoints sem verificação de posse — a correção é escopo da spec 006.

#### Adicionado

- **`server/src/__tests__/authorization/`** — 6 testes de vazamento (`leaks.test.js`, um por AZ-2..AZ-7 de [`docs/AUTHORIZATION.md`](./docs/AUTHORIZATION.md)) e 5 de baseline (`baseline.test.js`, comportamento correto de escopo que as specs 005/006 não podem quebrar), rodando via `supertest` sobre o `app` real.
- **Fixtures reutilizáveis** (`support/fixtures.js`) — 2 tenants × 2 usuários (1 admin + 1 comum cada) com atleta, adversário, análise de luta, versão, sessão de chat e estratégia em cada.
- **Fake de PostgREST em memória** (`support/fakeSupabase.js`, `support/supabaseMock.js`) — reproduz `.from().select().eq().in().order().single()`/`.insert()`/`.update()`/`.delete()` sobre um `Map`, sem executar SQL de verdade.
- **`supertest`** como devDependency do backend — única dependência nova (decisão P1, aprovada).
- **Testes de unidade de `getScopeIds`** (`server/src/utils/__tests__/tenantScope.test.js`) — baseline da regra (admin → grupo; usuário → próprio id) para a spec 005 provar equivalência.

#### Decisão de processo

- **P2 — banco de teste:** fake de PostgREST, não Supabase real. Só existe o banco de **produção** configurado; rodar fixtures de 2 tenants contra ele misturaria dado de teste com os 25 usuários reais a cada execução do CI. **Limitação aceita e documentada:** o fake prova que o filtro foi *pedido* na chamada, não que a query final restringiria as linhas num Postgres real.
- **Testes vermelhos via `test.failing()`** (Jest 29), não `skip` — o CI roda, reporta, e sai com código 0 porque a falha é a esperada; se um dia passar sem a spec 006 ter rodado, `test.failing` sinaliza como regressão do sinal.

---

### Portões de qualidade no CI — 2026-08-13 · [spec 003](./specs/003-quality-gates/spec.md)

O CI passa a **recusar** o que antes apenas comentava.

#### Adicionado

- **ESLint no backend** (`server/eslint.config.js`) — 69 arquivos que nunca passaram por análise estática. Conjunto de regras deliberadamente **mínimo**: só erro real (`no-undef`, `no-unused-vars`, `no-unreachable`, `no-dupe-keys`, `no-const-assign`, `no-unsafe-finally`…), **nada de estilo**. Script `npm run lint` e job `Backend Lint` no CI.
- **`eslint`** como `devDependency` do `server` — única dependência nova. Dependências de produção **inalteradas**.

#### Alterado

- **Secrets scanning (TruffleHog) passa a bloquear merge.** Escopo é o **diff** (`base..head`), não o histórico: impede a entrada de segredo **novo**. Com `--only-verified`, só bloqueia segredo confirmado como ativo.
- **Lint do frontend passa a bloquear merge** (era `continue-on-error`).
- **`Integration Check` agora exige os 5 portões** (testes de front e back, lint de front e back, build), não só 2.
- **`react-refresh/only-export-components` rebaixada para `warn`** no frontend — disparava em 3 de 3 contexts porque cada um exporta `XProvider` + `useX` no mesmo arquivo, que é o padrão **idiomático** de React Context. Quando uma regra reprova um padrão correto em 100% dos usos, o problema é a configuração.

#### Removido

- **`server/tests/`** — 3 arquivos com extensão `.test.js` que **nunca rodavam** (`testMatch` do Jest cobre só `__tests__/`) e estavam quebrados: zero `describe`/`it`, dois com `process.exit`, um com `require` de caminho inexistente. Davam falsa impressão de cobertura.

#### Correções pontuais (necessárias para o lint passar)

Código morto comprovado, sem mudança de comportamento: import não usado em `AuthContext` e em um teste; leitura de `localStorage` sem uso em `initAuth`; campo desestruturado e ignorado em `chatController`; 3 variáveis locais mortas em `strategyController`. Em `index.js`, o 4º parâmetro do error handler do Express foi renomeado para `_next` — **a aridade 4 é preservada**, que é o único critério do Express, e isso foi verificado.

#### Dívida documentada em vez de escondida

Onde o lint apontou algo que exige **decisão de comportamento**, a correção **não** foi feita: há `eslint-disable` com comentário nomeando a spec responsável. Nenhum caso foi mascarado com prefixo `_`, porque isso apagaria a evidência do problema. Casos: `versionManager` (3× — evidência direta dos bugs das specs 006/007), `AthleteCard` (4 props nunca renderizadas), `StrategyChatPanel` (callback nunca chamado), `VideoAnalysis` (`addVideo` sem controle na UI), `AuthContext` (`set-state-in-effect` na hidratação de sessão), `Strategy` (loading calculado e nunca renderizado).

#### Diferido

- **E2E (Playwright) no CI.** A spec assumia "adicionar um job"; a inspeção mostrou que exige **backend + banco + usuário semeado** — ambiente de teste, não configuração de job. Depende da mesma decisão que a [spec 004](./specs/004-authorization-safety-net/spec.md) precisa tomar, e passa a ser pré-requisito dela.

#### Segurança — novo achado, ação do proprietário

🔴 **`playwright/.env.example` contém a senha em texto claro de uma conta viva** (`contateste@teste.com` — verificado no banco: existe, `role=user`, `is_active=true`). O arquivo é rastreado pelo git.

⚠️ **O portão desta spec não pega este caso:** o TruffleHog detecta segredo por padrão reconhecível; uma senha genérica em `TEST_USER_PASSWORD=` não casa com nenhum detector. Registrado para não criar falsa confiança no instrumento. **Ação recomendada:** rotacionar essa senha junto da chave do Gemini.

---

### Segurança e verificação — 2026-08-13 · [spec 002](./specs/002-verification-baseline/spec.md)

Primeira etapa executada do plano de refatoração. **Uma alteração de código; o resto é verificação e correção de documentação.**

#### Removido

- **`GET /api/fight-analysis/debug/all`** — devolvia `id`, `person_id`, `person_type`, `user_id` e `created_at` de **todas as análises de todos os tenants**, exigindo apenas autenticação. Estava marcada no próprio código como "DEBUG TEMPORÁRIO". Removida junto com a query de banco que vivia dentro do arquivo de rota.

#### Segurança — achado que exige ação do proprietário

🔴 **A chave publicável do Supabase, commitada em `frontend/.env.production`, lê 9 das 10 tabelas do banco — incluindo `users` com `password_hash` (bcrypt) e `email` dos 25 usuários.** A escrita também está liberada (um `INSERT` é recusado por violação de `NOT NULL`, não por permissão).

É materialmente mais grave do que a auditoria estimou, que havia marcado o RLS de `users` como desconhecido. **Ação recomendada: antecipar a [spec 008](./specs/008-database-access-lockdown/spec.md)** e rotacionar as chaves.

#### Correções de diagnóstico (documentação)

A verificação contra produção **refutou uma conclusão da auditoria e refinou outra**:

- ❌ **O rastreamento de custo de IA funciona.** A auditoria concluiu que `api_usage` nunca gravou, por causa de uma política RLS. **Medição: 173 linhas, de 2025-12-14 a 2026-08-12, US$ 3,0295 acumulados.** A política não está ativa em produção. Dívida real e menor descoberta no lugar: **55 das 173 linhas com custo zero**.
- 🔄 **O versionamento de perfil técnico está quebrado desde 2026-01-16**, não "nunca funcionou". Funcionou por 6 dias em janeiro; quebrou quando `versionManager.saveProfileVersion` foi criado com o contrato de argumentos errado (commit `2b13a64`).
- ✅ **Confirmado:** `technical_profile` do atleta nunca é atualizado — 0 de 37 atletas com o campo preenchido.

#### Efeito no plano

- Item de `api_usage` **removido do escopo** da [spec 007](./specs/007-silent-failures-and-input-validation/spec.md).
- [Spec 009](./specs/009-ai-cost-and-reliability/spec.md) **deixou de depender** da 007 (a visibilidade de custo já existe) e absorveu a dívida das 55 linhas com custo zero.
- [Spec 011](./specs/011-schema-integrity/spec.md) desbloqueada com números reais: **67 registros órfãos** (`user_id` nulo), **zero valores não-UUID** (conversão de tipo viável sem perda) e **zero duplicatas** (constraints `UNIQUE` aplicáveis sem limpeza).

**Pendente de acesso do proprietário:** rotação da chave do Gemini, verificação de consumidores externos da chave anon (bloqueia a spec 008), plano/timeout da Vercel, e estado do GitHub Pages.

---

### Planejamento — 2026-08-12

Definição da arquitetura-alvo e do plano de refatoração. **Nenhuma alteração de código, banco, dependência, prompt ou API.** Nada implementado.

#### Adicionado

- **[`JIU_METRICS_REFACTORING_PLAN.md`](./JIU_METRICS_REFACTORING_PLAN.md)** — arquitetura-alvo, comparação `CURRENT` × `TARGET` por área, modularização, modelo de autorização futuro, análise de viabilidade da evolução para atleta/profissionais, classificação de mudanças de banco (*Required Now* / *Useful Later* / *Do Not Change*), estratégia de testes, dependências (KEEP/REPLACE/REMOVE), plano em 9 etapas, estratégia de migração e de commits, *Implementation Gate*, anti-padrões e autorrevisão crítica.
- **10 specs**, todas `Status: Proposed` — [002](./specs/002-verification-baseline/spec.md) a [011](./specs/011-schema-integrity/spec.md), uma por unidade implementável e revisável.

#### Alterado

- **Spec [001](./specs/001-refactor-foundation/spec.md) → `Superseded`.** Cobria 34 itens em 6 etapas num único documento — o padrão "refatorar tudo numa spec" que o plano identifica como anti-padrão. O escopo aprovado permanece; o que mudou foi o fatiamento.
- **`docs/{ARCHITECTURE,DOMAIN,AUTHORIZATION,AI,DATABASE,PROJECT_STATUS}.md`** — ponteiros para a arquitetura-alvo, com `Current` e `Proposed` explicitamente separados. O conteúdo descritivo do estado atual **não mudou**.
- **`CLAUDE.md`** — seção *Specs* aponta o plano e adverte que a spec 002 (verificação) precede qualquer implementação.

#### Decisões arquiteturais do plano

A arquitetura-alvo **mantém as camadas atuais** e adiciona exatamente três elementos estruturais, cada um justificado por uma falha real da auditoria: escopo obrigatório na camada de acesso a dados, seam de política de autorização e validação de entrada por endpoint.

Rewrite completo, reorganização em *feature folders*, Clean/Hexagonal Architecture, agregados e value objects de DDD, CQRS, event bus e container de DI foram avaliados e **rejeitados com motivo registrado** — nenhum corrigiria as três ausências identificadas.

Para autorização futura, RBAC puro foi avaliado e considerado **insuficiente**: o requisito de profissionais com acesso a atletas específicos exige role + relacionamento + escopo de campo.

#### Correções de precisão na documentação

Revisão cruzada corrigiu cinco imprecisões introduzidas na etapa anterior: contagem de páginas (9 → 11), componentes (~50 → 40), services (13 → 12), chamadas de `getScopeIds` (~20 → 23, verificado) e a afirmação de que `ALLOW_PUBLIC_REGISTER` não estava documentado no `.env.example` — **é**, e com valor `true`, o que significa que copiar o arquivo de exemplo **habilita o cadastro público**, invertendo o default seguro do código. Registrado como problema conhecido.

---

### Documentação — 2026-08-12

Criação da memória técnica permanente do projeto. **Nenhuma alteração de código, banco, dependência, prompt ou comportamento.**

#### Adicionado

- **[`AUDIT.md`](./AUDIT.md)** — auditoria forense completa: stack, arquitetura, domínio, autenticação, autorização, banco, IA, segurança, performance, qualidade, dependências e dívida técnica, com evidência em `arquivo:linha`.
- **[`CLAUDE.md`](./CLAUDE.md)** — manual operacional para agentes de IA e desenvolvedores, incluindo as regras de integridade documental.
- **`docs/`** — documentação permanente:
  - [`ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — arquitetura real, com diagramas Mermaid
  - [`DOMAIN.md`](./docs/DOMAIN.md) — entidades, ownership, ciclo de vida, invariantes
  - [`AUTHORIZATION.md`](./docs/AUTHORIZATION.md) — autenticação, autorização e falhas conhecidas
  - [`AI.md`](./docs/AI.md) — integração com Gemini, fluxos de análise e estratégia
  - [`DATABASE.md`](./docs/DATABASE.md) — tabelas, FKs, RLS, migrations
  - [`PROJECT_STATUS.md`](./docs/PROJECT_STATUS.md) — implementado × planejado × dívida × a confirmar
- **`docs/modules/`** — 6 módulos com fronteira clara: `athletes-opponents`, `fight-analysis`, `strategies`, `chat-and-versions`, `users-and-admin`, `usage-tracking`.
- **`docs/decisions/`** — 10 ADRs. Seis registram decisões já implementadas; quatro registram decisões tomadas em 2026-08-12 e **ainda não implementadas** (007–010).
- **`specs/`** — estrutura oficial de specs versionadas, com `001-refactor-foundation` (depois substituída pelas specs 002–011 — ver a entrada de *Planejamento* acima).
- **`.ai/`** — área de trabalho temporária, ignorada pelo Git.

#### Movido

- 7 documentos obsoletos para **[`docs/_legacy/`](./docs/_legacy/)**, preservados mas marcados como **não fonte de verdade**: `MULTI_AGENTS.md`, `QUICKSTART_MULTI_AGENTS.md` e `IMPLEMENTATION_SUMMARY.md` (descrevem o sistema multi-agentes **removido do código** na Fase 1), `architecture-file-tree.md` (era `docs/architecture.md` — dump de árvore de arquivos de quando o projeto se chamava "projeto analise atletas"), `ESTRATEGIAS.md` (pipeline anterior à Fase 1), `API.md.old` e `CODE_REVIEW.md`.
  **Motivo:** ~800 linhas descrevendo um sistema inexistente são instrução ativa para reintroduzi-lo, num projeto mantido com assistência de IA.

#### Decisões registradas (não implementadas)

- [ADR-007](./docs/decisions/007-unificar-athlete-e-opponent-numa-entidade-com-papel.md) — unificar `Athlete` e `Opponent` numa entidade com marcação de papel
- [ADR-008](./docs/decisions/008-vercel-como-unico-destino-de-deploy.md) — Vercel como único destino de deploy; remover GitHub Pages
- [ADR-009](./docs/decisions/009-acesso-ao-banco-exclusivamente-por-service-role.md) — acesso ao banco exclusivamente por `service_role`; **substitui** ADR-002
- [ADR-010](./docs/decisions/010-adotar-typescript-incrementalmente.md) — adotar TypeScript incrementalmente

#### Notas de segurança

A auditoria identificou problemas que **permanecem abertos**, entre eles: chave da API do Gemini no histórico do git, credenciais do Supabase em arquivo rastreado, RLS desligado com GRANTs de `anon` presumivelmente ativos, 6 endpoints sem verificação de posse (leitura e escrita entre tenants), e 3 funcionalidades que a UI oferece e que nunca funcionaram. Detalhe em [`AUDIT.md`](./AUDIT.md) §9 e plano de correção em [`JIU_METRICS_REFACTORING_PLAN.md`](./JIU_METRICS_REFACTORING_PLAN.md).

**Pendente e recomendado como prioridade:** rotacionar a chave do Gemini e confirmar o estado real de RLS/GRANTs no Supabase.

---

## Histórico reconstruível

### Fase 1 — Modernização da camada de IA — commit `c193c8a`

Guiada por [`SPEC-ANALISE-IA.md`](./SPEC-ANALISE-IA.md). Ver [ADR-006](./docs/decisions/006-camada-unica-de-llm-e-aposentadoria-do-multi-agente.md).

#### Alterado

- Migração para o SDK **`@google/genai`**, com `services/llm.js` como **fronteira única** de acesso — nenhum controller ou model importa o SDK.
- **Saída estruturada obrigatória** via `responseSchema` na análise de vídeo e na estratégia, substituindo "JSON de exemplo no prompt + regex".
- **Temperatura explícita por tarefa** e modelo resolvido por tarefa (`TASK_MODELS`), com a escolha do usuário sempre vencendo.
- Regras IBJJF unificadas em **fonte única** (`config/ai.js#BELT_RULES`), com resolução de alias pt/en centralizada e fallback seguro para a faixa mais restritiva. Ver [ADR-005](./docs/decisions/005-belt-rules-como-tabela-deterministica.md).
- **`systemInstruction` do chat passou a ser constante fixa**, sem interpolar dado do usuário (commit `23b475b`). Ver [ADR-003](./docs/decisions/003-system-instruction-fixa-no-chat.md).

#### Removido

- **Sistema multi-agentes** de análise de vídeo e estratégia (`server/src/services/agents/`) — triplicava o custo de análise sem ganho medido. As variáveis `USE_MULTI_AGENTS`, `OPENAI_API_KEY` e `OPENAI_MODEL` deixaram de ser lidas, eliminando a dependência de OpenAI.
- Caminho morto de análise por frames estáticos (commit `a4f7f37`).
- Código morto de matchup baseado em regras hardcoded (commit `c594a02`).

#### Corrigido

- **O sistema parou de inventar dados quando o parse do JSON da IA falhava** — antes, gráficos 50/50 hardcoded eram salvos como análise real (commit `92ac963`).
- `technical_stats` passou a ser persistido, e a consolidação a ler a chave correta (commits `b3907cf`, `9935489`).
- Correção das regras IBJJF por faixa, que estavam erradas e triplicadas (commit `2dea52b`).
- Eliminação de chamadas de IA desperdiçadas ao buscar stats para estratégia (commits `e69a18e`, `e9a6501`).
- `validateStrategyField` passou a checar conteúdo real, não apenas presença de chave (commit `52bb7d4`).
- Agregação de finalizações deixou de gerar a chave `"[object Object]"` (commit `8013b24`).
- Placeholder `{{MAX_WORDS}}` passou a ser preenchido no prompt de consolidação (commit `0f725bf`).

### Fundação de testes, docs e CI — commits `4842f9e`, `77aed03`

#### Alterado

- **Os testes do backend passaram a bloquear PR no CI.** O `continue-on-error` foi removido deliberadamente — segundo o próprio workflow, era *"o motivo de 10 testes quebrados terem vivido meses no repositório sem ninguém ver"*.
- Suíte do backend reescrita e verde (16 suítes).

> ⚠️ Lint de frontend, `npm audit` e o scanner de segredos **continuam** com `continue-on-error` e não bloqueiam nada. O backend não tem lint. Os testes E2E do Playwright existem e nunca rodam no CI.
