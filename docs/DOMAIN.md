# DOMAIN — JiuMetrics

> **Documenta o domínio que EXISTE HOJE.** Entidades foram extraídas do código e das migrations reais, não de intenção de produto.
>
> **Fonte:** `server/src/models/`, `server/src/controllers/`, `server/migrations/`, verificado em 2026-08-12 contra `main` (`895066f`).
>
> **Nada aqui foi inventado.** O que o código não permite determinar está marcado `UNKNOWN` ou `NEEDS_CONFIRMATION`.

---

## 1. O produto, em uma frase

JiuMetrics analisa vídeos de luta de Jiu-Jitsu com IA para produzir um perfil técnico de cada lutador e, cruzando dois perfis, gerar um plano tático de como vencer um adversário específico.

## 2. Fluxo principal — real

```mermaid
flowchart TD
    A["Athlete<br/>(quem eu treino)"] --> FA1["Fight Analysis<br/>1..N por pessoa"]
    O["Opponent<br/>(quem vou enfrentar)"] --> FA2["Fight Analysis<br/>1..N por pessoa"]
    FA1 --> TS1["technical_summary<br/>consolidado por IA<br/>(no próprio Athlete)"]
    FA2 --> TS2["technical_summary<br/>consolidado por IA<br/>(no próprio Opponent)"]
    TS1 --> ST["Tactical Analysis<br/>= a 'Estratégia'"]
    TS2 --> ST
    ST --> V["Strategy Version<br/>histórico de edições"]
    FA1 --> AV["Analysis Version<br/>histórico de edições"]
    ST --> CH["Chat Session<br/>refinamento conversacional"]
    FA1 --> CH
    TS1 --> CH

    style ST fill:#2b5797,color:#fff
```

**Regra de porta que define o produto:** não é possível gerar estratégia sem que **atleta e adversário tenham ao menos uma análise de luta cada**. A estratégia não é uma opinião sobre atributos cadastrados — ela é derivada de vídeo analisado. Se falta análise de um dos lados, o fluxo para com erro específico dizendo qual lado falta (`strategyService.js#generateStrategy`).

### Traduzindo os nomes (importante)

O vocabulário do código colide com o da UI. Sem isso, nada abaixo faz sentido:

| Termo | Significa | Onde vive |
|---|---|---|
| **"Fight Analysis"** / "Análise" | análise de **um ou mais vídeos** de uma pessoa | tabela `fight_analyses` |
| **"Strategy"** / "Estratégia" | o plano tático atleta × adversário | tabela **`tactical_analyses`** |
| **"Análises"** (tela `/analyses`) | lista de **estratégias** (`tactical_analyses`), não de análises de luta | `pages/Analyses.jsx` |
| **"Analysis Version"** | versão de uma `fight_analysis` | `analysis_versions` |
| **"Strategy Version"** | versão de uma `tactical_analysis` | `strategy_versions` |
| **"Profile Version"** | versão do `technical_summary` de uma pessoa | `profile_versions` |

A palavra "análise" designa três coisas diferentes, e "estratégia" é persistida com o nome `tactical_analyses`. **Ao ler qualquer código deste repo, confirme de qual das três se trata.**

---

## 3. Entidades

### 3.1 User

**Responsabilidade** — identidade, credencial, papel, pertencimento a grupo e estado da conta.

**Onde vive** — `models/User.js`, `controllers/userController.js`, `controllers/authController.js`, `middleware/auth.js`, tabela `users`.
⚠️ A tabela `users` **não é criada por nenhuma migration** (só recebe `ALTER` em `017`/`021`/`023`). Foi criada manualmente. O schema real completo é `UNKNOWN`.

**Relacionamentos**

- `created_by → users.id` — quem criou (FK real, migration `017`)
- `tenant_id → users.id` — o admin-raiz do grupo (FK real, migration `021`)
- É dono (`user_id`) de **todas** as outras entidades — **sem FK em nenhuma delas**

**Ownership** — raiz de tudo. Cada linha de dado no sistema pertence a um `user_id`.

**Ciclo de vida**

```mermaid
stateDiagram-v2
    [*] --> Ativo: admin cria sub-usuário<br/>(role='user', herda tenant_id)
    [*] --> AtivoRaiz: registro público<br/>(tenant_id = próprio id)
    Ativo --> Desativado: DELETE /admin/users/:id<br/>(soft — dados preservados)
    Desativado --> Ativo: POST /admin/users/:id/reactivate
    Ativo --> Excluído: DELETE /users/:id/permanent
    Desativado --> Excluído: DELETE /users/:id/permanent
    Excluído --> [*]: dados transferidos OU apagados
```

**Regras de negócio** (`IMPLEMENTED`)

1. Existem exatamente **dois papéis**: `admin` e `user`.
2. Sub-usuário criado por admin **herda o `tenant_id` do criador** e nasce sempre `role: 'user'`.
3. Usuário de registro público é **seu próprio tenant** (`tenant_id = id`).
4. Registro público está **desabilitado por padrão** (`ALLOW_PUBLIC_REGISTER`).
5. Admin **não pode** desativar, excluir nem alterar o próprio papel.
6. Toda operação admin sobre outro usuário exige **mesmo `tenant_id`** (`assertSameTenant`).
7. Desativar ou trocar o papel **incrementa `token_version`**, invalidando as sessões vivas do usuário imediatamente.
8. Exclusão permanente exige decisão explícita: **transferir** os dados para outro usuário do tenant **ou apagá-los**. Não há terceira opção.
9. Ao transferir, movem-se `athletes`, `opponents`, `fight_analyses` e `tactical_analyses`. **Chat sessions e api_usage não são transferidos** — são descartados com o usuário.
10. Dados de usuário **desativado continuam visíveis ao grupo** (decisão deliberada, comentada em `User.js`).
11. Senha: mínimo 6 caracteres, hash `bcrypt` com 10 rounds. Sem requisito de complexidade.

**NEEDS_CONFIRMATION**
- Existe constraint `UNIQUE` em `users.email`? Nenhuma migration cria uma. Sem ela, a criação de usuário tem race condition (checa-depois-insere).
- Um admin promover outro membro do tenant a admin é intenção de produto? O código permite (`PATCH /admin/users/:id/role`).
- `tenant_id` deve suportar hierarquia de mais de um nível? A migration `021` propaga em até 3 níveis, mas `createSubUser` sempre herda do criador direto e `getGroupUserIds` é plano.

---

### 3.2 Athlete e Opponent

**Tratados juntos porque são a mesma coisa no código.** Mesmas colunas, models idênticos (`models/Opponent.js` é cópia de `models/Athlete.js`), mesmo parser (`parseOpponentFromDB = parseAthleteFromDB`). A distinção é **puramente semântica**.

| | Significado |
|---|---|
| **Athlete** | o lutador que o usuário treina/representa |
| **Opponent** | o lutador que vai ser enfrentado |

**Responsabilidade** — representar um lutador: atributos declarados pelo usuário + perfil técnico derivado de IA.

**Campos** — `name` (único obrigatório), `belt`, `weight`, `height`, `age`, `style`, `strong_attacks`, `weaknesses`, `video_url`, `cardio`, `technical_profile` (JSONB), `technical_summary` (TEXT, gerado por IA), `technical_summary_updated_at`, `user_id`.

**Relacionamentos**

- `user_id` → dono (**sem FK**, tipo `VARCHAR(255)`)
- referenciado por `fight_analyses.person_id` + `person_type` — **FK polimórfica sem constraint**
- referenciado por `tactical_analyses.athlete_id` / `opponent_id` — **sem FK**
- referenciado por `profile_versions.person_id` + `person_type` — **sem FK**

**Ownership** — `user_id`. Leitura filtra com `.in('user_id', allowedUserIds)`; escrita com `.eq('user_id', userId)`.

**Ciclo de vida** — criado manualmente pelo usuário (formulário ou QuickAdd) → recebe análises de luta → ganha `technical_summary` consolidado por IA → pode ser editado, inclusive o resumo via chat → deletado por hard delete.

**Regras de negócio** (`IMPLEMENTED`)

1. Só `name` é obrigatório na criação.
2. **Defaults são fabricados quando o campo é omitido**: `age: 25`, `weight: 75`, `belt: 'Branca'`, `style: 'Guarda'`, `cardio: 50`. ⚠️ Esse dado inventado é depois exibido como fato na tela de estratégia. Ver [`PROJECT_STATUS.md`](./PROJECT_STATUS.md#known-issues).
3. `technical_summary` é **regenerado automaticamente** ao criar ou deletar uma análise da pessoa.
4. Se a pessoa fica com **zero** análises, o `technical_summary` é **limpo**.
5. `belt` alimenta as regras IBJJF na geração de estratégia (ver §3.5, regra 4). Faixa vazia ou desconhecida cai no conjunto mais restritivo (branca).
6. `update` no model usa **allow-list explícita** de campos — não há mass assignment, mesmo o controller passando `req.body` inteiro.

**Problema conhecido** — `technical_profile` (JSONB) **nunca é atualizado** pelo fluxo de criação de análise: `Athlete.updateTechnicalProfile` é chamada com 2 de 3 argumentos e retorna `null` em silêncio.

**NEEDS_CONFIRMATION** — devem permanecer duas entidades separadas? Decisão registrada em [ADR-007](./decisions/007-unificar-athlete-e-opponent-numa-entidade-com-papel.md): **unificar** com marcação de papel (`PLANNED`, não implementado). Motivo original da separação, segundo o proprietário: distinguir os dois lados ao montar a estratégia.

---

### 3.3 Fight Analysis

**Responsabilidade** — o resultado da análise por IA de **um ou mais vídeos** de luta de uma pessoa. É a unidade de evidência do sistema: tudo a jusante (perfil técnico, estratégia) deriva daqui.

**Onde vive** — `models/FightAnalysis.js`, `controllers/fightAnalysisController.js`, `controllers/linkController.js`, tabela `fight_analyses`.

**Campos** — `person_id` + `person_type` (`'athlete'|'opponent'`, CHECK no banco), `video_url` (URLs concatenadas por vírgula quando são vários), `charts` (JSONB — 5 gráficos comportamentais), `summary` (texto narrativo), `technical_profile`, `technical_stats` (JSONB — raspagens, passagens, finalizações, tomadas de costas), `frames_analyzed`, `current_version`, `is_edited`, `original_summary`, `original_charts`, `user_id`.

**Ownership** — `user_id`. ⚠️ **Aplicado apenas na leitura.** `FightAnalysis.update()` e `.delete()` **não filtram `user_id`** — a posse é responsabilidade exclusiva do controller, e 3 controllers não a verificam. Ver [`AUTHORIZATION.md`](./AUTHORIZATION.md#known-issues).

**Ciclo de vida**

```mermaid
stateDiagram-v2
    [*] --> Criada: POST /api/ai/analyze-link<br/>(IA analisa o vídeo)
    Criada --> ResumoRegenerado: technical_summary da pessoa<br/>é reconsolidado
    Criada --> Editada: chat aplica sugestão da IA<br/>OU edição manual
    Editada --> Versionada: analysis_versions ganha uma linha
    Versionada --> Editada: restaurar versão
    Criada --> [*]: DELETE (hard)
    Editada --> [*]: DELETE (hard)
```

**Regras de negócio** (`IMPLEMENTED`)

1. `person_type` só aceita `'athlete'` ou `'opponent'`.
2. A pessoa precisa existir **e pertencer ao escopo do usuário** — validado em `POST /api/fight-analysis`, ⚠️ **mas não** em `POST /api/ai/analyze-link`.
3. Os 5 gráficos comportamentais são **normalizados para somar 100%**, e gráficos sem dado observado são descartados. ⚠️ Percentual forçado a somar 100% é uma interpretação, não uma medida — não há timestamps nem eventos verificáveis por trás. Ver [`AI.md`](./AI.md#constraints).
4. Quando há **mais de um** vídeo, os resumos são consolidados por uma segunda chamada de IA; os números são consolidados por **função pura** (médias), sem IA.
5. Criar ou deletar uma análise dispara a reconsolidação do `technical_summary` da pessoa.
6. Ao ser editada, a **versão original é preservada** antes da primeira alteração (`ensureOriginalVersion`).

**Problemas conhecidos** — a análise pode ser vinculada a `person_id` de outro tenant (via `analyze-link`); pode ser lida e sobrescrita entre tenants (3 endpoints do chat); as estatísticas técnicas nunca aparecem no histórico da UI por divergência `technical_stats` × `technicalStats`.

---

### 3.4 Strategy (persistida como `tactical_analyses`)

**Responsabilidade** — cruzar o perfil técnico de um atleta com o de um adversário e produzir um plano tático de como vencer aquele confronto específico.

**Onde vive** — `models/TacticalAnalysis.js`, `controllers/strategyController.js`, `services/strategyService.js`, tabela `tactical_analyses`.

**Campos** — `user_id`, `athlete_id` + `athlete_name` (**desnormalizado**), `opponent_id` + `opponent_name` (**desnormalizado**), `strategy_data` (JSONB — a estratégia inteira), `metadata` (JSONB — modelo usado, tokens, contagem de análises de cada lado).

**Estrutura de `strategy_data`** (definida por `schemas/strategy.js`): `resumo_rapido` (com `como_vencer` e `tres_prioridades`), `analise_de_matchup`, `plano_tatico_faseado`, `cronologia_inteligente`, `checklist_tatico`.

**Ownership** — `user_id`, filtrado com `.in('user_id', ids)` em **todos** os métodos do model. **É o model mais consistente do projeto** — use-o como referência.

**Ciclo de vida**

```mermaid
stateDiagram-v2
    [*] --> Gerada: POST /api/strategy/compare
    Gerada --> VersaoInicial: strategy_versions v1<br/>(edited_by='system')
    VersaoInicial --> Editada: PATCH /analyses/:id<br/>(via chat ou manual)
    Editada --> NovaVersao: strategy_versions v2..N
    NovaVersao --> Editada: restaurar versão
    Gerada --> [*]: DELETE (hard, CASCADE nas versões)
```

**Regras de negócio** (`IMPLEMENTED`)

1. Atleta **e** adversário precisam existir no escopo do usuário.
2. **Ambos precisam ter ≥ 1 análise de luta.** Erro específico indica qual lado falta. É a regra de porta do produto.
3. Se a pessoa já tem `technical_summary` salvo, ele é **reutilizado** em vez de reconsolidar via IA — economia deliberada de custo.
4. **A faixa mais restritiva entre os dois competidores governa as técnicas sugeridas.** Se atleta é marrom e adversário é azul, valem as restrições de azul. Faixa desconhecida → conjunto de branca (fallback seguro: assumir faixa mais permissiva arriscaria sugerir técnica ilegal).
5. Falha ao salvar no histórico **não derruba** a geração — o usuário recebe a estratégia mesmo assim.
6. Edição valida o **shape da seção** antes de persistir (`validateStrategyField`), evitando gravar estratégia corrompida.
7. Uma versão inicial é criada junto com a estratégia.
8. Nomes de atleta e adversário são **copiados** para a linha — a estratégia sobrevive à renomeação (ou exclusão) da pessoa, com o nome de quando foi gerada.

**Problema conhecido** — `+X pts` e `probabilidade` que a UI exibe como métrica são **invenção do modelo**: a estratégia nunca recebeu números verificáveis.

---

### 3.5 Entidades de versionamento

Três históricos independentes, um por tipo de conteúdo editável. Nenhum compartilha implementação.

| Entidade | Versiona | Tabela | Tem `user_id`? | Estado |
|---|---|---|---|---|
| **AnalysisVersion** | `fight_analyses` | `analysis_versions` | ❌ **a coluna não existe** | `IMPLEMENTED` — e globalmente exposto: sem `user_id` não há como filtrar por dono |
| **StrategyVersion** | `tactical_analyses` | `strategy_versions` | ✅ em todos os métodos | `IMPLEMENTED` |
| **ProfileVersion** | `technical_summary` de Athlete/Opponent | `profile_versions` | ✅ em todos os métodos | ⚠️ **QUEBRADO — nunca gravou** |

**Regras comuns** (`IMPLEMENTED`) — versões são numeradas sequencialmente; uma é marcada `is_current`; `edited_by` registra a origem (`user`, `ai`, `ai_suggestion`, `system`); `edit_reason` guarda o motivo.

**Problemas conhecidos**
- ~~`ProfileVersion`~~ ✅ **CORRIGIDO na [spec 007](../specs/007-silent-failures-and-input-validation/spec.md)** (2026-08-18). `versionManager.saveProfileVersion` passava chaves `snake_case` para uma função que desestrutura `camelCase` → todos os campos ficavam `undefined` → o insert violava os `NOT NULL` → o erro morria num `console.warn`. Estava quebrado desde 2026-01-16 (não "nunca funcionou" — a spec 002 mediu 5 linhas do período em que funcionou). O erro agora propaga.
- Sem constraint `UNIQUE(analysis_id, version_number)` e com o número calculado no app sem transação → duas edições simultâneas geram versões com o mesmo número.
- Nada impede duas versões com `is_current = true`.
- `analysis_versions` guarda `content` completo e não tem dono → leitura cross-tenant.

---

### 3.6 ChatSession

**Responsabilidade** — manter uma conversa com a IA para refinar um conteúdo já gerado (uma análise, um perfil técnico ou uma estratégia).

**Onde vive** — `models/ChatSession.js`, `controllers/chat{Session,Analysis,Profile,Strategy}Controller.js`, tabela `ai_chat_sessions`.

**Campos** — `user_id`, `context_type` (`'analysis'|'strategy'|'profile'`, CHECK), `context_id` (**nullable** desde a migration `014`), `context_snapshot` (JSONB — o estado do conteúdo quando o chat começou), `messages` (JSONB — array de turnos), `title`, `is_active`.

**Ownership** — `user_id`, aplicado em `getById`, `getByContext` e `delete`. ⚠️ **Ausente** em `addMessage`, `addMessages` e `updateContextSnapshot`.

**Regras de negócio** (`IMPLEMENTED`)

1. Três tipos de contexto: análise de luta, perfil técnico e estratégia.
2. O snapshot congela o conteúdo no início da conversa, para a IA raciocinar sobre um estado estável.
3. Sessão de estratégia pode ter `context_id = NULL` (estratégia temporária, não persistida).
4. A IA pode devolver uma **sugestão de edição**, que só é aplicada quando o usuário aceita (`POST /api/chat/apply-edit`).
5. O `context_snapshot` é atualizado depois de uma edição aceita.

**Problema conhecido** — `updateContextSnapshot` aceita qualquer `sessionId` do corpo do request, sem validar posse: é possível envenenar o contexto de IA da sessão de outro usuário.

---

### 3.7 ApiUsage

**Responsabilidade** — registrar consumo de tokens e custo estimado por chamada de IA. **É o único controle financeiro do produto.**

**Onde vive** — `models/ApiUsage.js`, `utils/apiUsageLogger.js`, `controllers/usageController.js`, tabela `api_usage`.

**Campos** — `user_id`, `model_name`, `operation_type` (`video_analysis`, `strategy`, `summary`, `consolidate_profile`, `chat_analysis`, `chat_profile`, `chat_strategy`), `prompt_tokens`, `completion_tokens`, `total_tokens`, `estimated_cost_usd`, `metadata` (JSONB).

**Ownership** — `user_id`. Admin vê o consumo do grupo; usuário comum, só o próprio.

**Regras de negócio** (`IMPLEMENTED`) — custo calculado por tabela de preços por modelo, com faixas (*tiered*) para os `3-pro-preview`; modelo desconhecido cai no preço de `gemini-2.5-flash`; falha no registro **nunca** derruba a operação principal.

**Problema conhecido** — o model usa o cliente **anon** contra política RLS `auth.uid() = user_id`, e o projeto não usa Supabase Auth → `auth.uid()` é `NULL` → **o insert é provavelmente rejeitado e o erro é engolido**. As telas de custo mostram zero como se fosse dado real. **NEEDS_CONFIRMATION:** `SELECT count(*) FROM api_usage;`

---

## 4. Ownership — modelo consolidado

```mermaid
erDiagram
    USER ||--o{ ATHLETE : "owns (user_id)"
    USER ||--o{ OPPONENT : "owns (user_id)"
    USER ||--o{ FIGHT_ANALYSIS : "owns (user_id)"
    USER ||--o{ TACTICAL_ANALYSIS : "owns (user_id)"
    USER ||--o{ CHAT_SESSION : "owns (user_id)"
    USER ||--o{ API_USAGE : "owns (user_id)"
    USER ||--o{ USER : "tenant_id / created_by"
    ATHLETE ||--o{ FIGHT_ANALYSIS : "person_id (polimórfico, sem FK)"
    OPPONENT ||--o{ FIGHT_ANALYSIS : "person_id (polimórfico, sem FK)"
    ATHLETE ||--o{ TACTICAL_ANALYSIS : "athlete_id (sem FK)"
    OPPONENT ||--o{ TACTICAL_ANALYSIS : "opponent_id (sem FK)"
    FIGHT_ANALYSIS ||--o{ ANALYSIS_VERSION : "analysis_id (SEM user_id)"
    TACTICAL_ANALYSIS ||--o{ STRATEGY_VERSION : "analysis_id (FK CASCADE)"
```

**Regra de escopo** — toda a autorização de dados cabe em `services/authorization.js#resolveScope` (spec 005; antes vivia em `utils/tenantScope.js#getScopeIds`, que hoje é só um wrapper `@deprecated`):

| Papel | Vê |
|---|---|
| `admin` | todos os `user_id` do mesmo `tenant_id` |
| `user` | **apenas o próprio `user_id`** |

Confirmado com o proprietário em 2026-08-12: **usuário comum vê apenas os próprios dados; somente admin vê o grupo.**

**Exceção estrutural** — `analysis_versions` não tem coluna `user_id`. Sua autorização precisaria derivar da `fight_analysis` pai, e hoje não deriva de nada.

---

## 5. Invariantes do domínio

O que deveria ser sempre verdade. Marcado se o código garante.

| # | Invariante | Garantido? |
|---|---|---|
| 1 | Todo dado pertence a exatamente um `user_id` | ⚠️ **não** — `user_id` é nullable em `athletes`/`opponents`/`fight_analyses`; órfão fica invisível a todos |
| 2 | Estratégia só existe se ambos os lados têm ≥1 análise | ✅ em `generateStrategy` |
| 3 | Uma `fight_analysis` aponta para pessoa existente | ⚠️ **não** — sem FK, e `analyze-link` não valida |
| 4 | Técnica sugerida é legal para a faixa mais restritiva | ✅ na montagem do prompt (**correção esportiva da tabela é `NEEDS_CONFIRMATION`**) |
| 5 | `technical_summary` reflete as análises existentes | ✅ na criação/exclusão de análise |
| 6 | Toda edição gera uma versão | ✅ **sim, desde a spec 007** — análise, estratégia e perfil. Uma exceção explícita e correta: a primeira edição de um perfil sem resumo anterior não gera versão, porque não há estado anterior a registrar (`content` é `NOT NULL`) |
| 7 | Uma única versão é `is_current` por conteúdo | ⚠️ **não** — sem constraint nem transação |
| 8 | Número de versão é único por conteúdo | ⚠️ **não** — calculado no app, sem `UNIQUE` |
| 9 | Usuário comum não acessa dado de outro | ✅ **sim, desde a spec 006** — os 6 endpoints sem verificação de posse foram corrigidos, e o escopo é exigido na assinatura dos models |
| 10 | Todo consumo de IA é registrado | ✅ **sim** — refutado como falha na spec 002 (173 linhas, US$ 3,03 medidos). A falha de registro continua **tolerada** por decisão (custo não derruba operação paga), mas agora é observável: `grep "FALHA TOLERADA"`. Dívida remanescente: 55 das 173 linhas com custo zero (spec 009) |

---

## 6. O que NÃO faz parte do domínio atual

Registrado explicitamente para impedir suposição. **Nenhum destes existe** — não há tabela, model, rota nem componente:

- histórico completo de lutas (o que existe é análise de vídeo, não registro de competições)
- histórico de lesões
- acompanhamento médico, nutricional ou físico
- contas de médico, nutricionista ou preparador físico
- compartilhamento de informação entre profissionais
- categorias de peso, campeonatos, chaves ou resultados oficiais
- planos de treino ou periodização

Estes itens são **possível evolução futura**, mencionados aqui apenas como contexto. Tratá-los como parte do domínio atual seria erro factual.

**Se um deles entrar no roadmap**, duas decisões arquiteturais atuais precisam ser revisitadas antes: (a) o modelo de autorização, hoje binário `admin`/`user` sem noção de papel profissional; (b) a ausência de RLS — compartilhar dado clínico entre organizações sem defesa no banco seria imprudente.

🎯 A análise de viabilidade dessa evolução — se `User` deveria representar um `Athlete`, como modelar profissional ↔ atleta, e **quais decisões precisam ser tomadas agora (custo zero) vs. depois** — está em [`../JIU_METRICS_REFACTORING_PLAN.md`](../JIU_METRICS_REFACTORING_PLAN.md) §7. A conclusão que importa hoje: **nunca assumir que `athletes.user_id` é a conta do próprio atleta** (hoje é a de quem gerencia o registro).

---

## Ver também

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — como o sistema é construído
- [`DATABASE.md`](./DATABASE.md) — tabelas, FKs, constraints
- [`AUTHORIZATION.md`](./AUTHORIZATION.md) — como o ownership é (e não é) aplicado
- [`AI.md`](./AI.md) — como análise e estratégia são geradas
- [`modules/`](./modules/) — detalhe por módulo
- [`../AUDIT.md`](../AUDIT.md) §4 — mapeamento original do domínio, com evidência em `arquivo:linha`
