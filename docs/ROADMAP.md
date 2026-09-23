# ROADMAP — JiuMetrics como plataforma da equipe

> **Responde a duas perguntas:** para onde o produto vai, e qual é a próxima tarefa.
>
> **Criado:** 2026-09-23 · **Atualizado:** 2026-09-23 (`Perfis e acessos`) · **Dono:** Lucas Menezes · **Origem:** brainstorm de 2026-09-22 e protótipos do Claude Design de 2026-09-22 e 2026-09-23.
>
> **Regra deste documento:** tudo aqui é `PLANNED` até a tarefa correspondente ser fechada com código em `main`. Nada daqui existe no sistema hoje — a lista de "o que NÃO existe" do [`CLAUDE.md`](../CLAUDE.md) continua verdadeira. Quando uma tarefa fecha, ela muda de status **aqui** e a documentação permanente (`DOMAIN.md`, `ARCHITECTURE.md`, `docs/modules/`) é atualizada na mesma PR.

---

## 0. Como usar

- Cada tarefa tem um **ID** (`R-nn`), uma **fase**, um **tipo** e **dependências**. Tipos: `decisão` (só o dono responde), `infra` (fora do código), `spec` (precisa de spec numerada antes de código), `código`, `design` (volta ao Claude Design).
- Status: ⚪ não iniciada · 🟡 em andamento · ✅ feita · 🔴 bloqueada · ⛔ cancelada (com motivo).
- Tarefa do tipo `spec` **não recebe código antes da spec aprovada** — é a regra do repo ([`specs/README.md`](../specs/README.md)).
- A referência visual é o protótipo (§2). **Quando o protótipo e este documento divergem, este documento manda**, porque registra as decisões; o protótipo é uma proposta de forma.
- Fases são sequenciais por dependência, não por calendário. Dentro da fase, a ordem das tarefas é sugestão.

---

## 1. Visão de destino

**Hoje** o JiuMetrics é uma ferramenta de análise de vídeo com IA: perfil técnico por lutador e estratégia por confronto. **Amanhã** é a plataforma da equipe: cada atleta tem um lugar seu, o staff enxerga o time inteiro, e a análise de vídeo passa a ser uma das áreas, não a única.

### 1.1 Quem usa

Dos ~25 usuários, **a maioria são os próprios atletas** e uma ou duas contas são de professores. Isso inverte a premissa antiga de "treinador loga, atleta é registro" (ver [`JIU_METRICS_REFACTORING_PLAN.md`](../JIU_METRICS_REFACTORING_PLAN.md) §7, escrito sob a premissa antiga).

A conta ganha um segundo eixo, independente do primeiro:

| Eixo | Valores | Decide |
|---|---|---|
| Permissão (`role`, existe) | `admin`, `user` | o que a conta administra |
| Perfil (`profile`, **novo**) | `atleta`, `professor`, `nutricionista`, `fisioterapeuta`, `preparador_fisico` | o que a conta vê e edita |

Qualquer conta pode ter **uma ficha de atleta vinculada** (`athletes.account_user_id`, opcional, único). Professor que compete é `professor` com ficha. O perfil é um valor só por conta.

### 1.2 Visibilidade — decidida em 2026-09-22

Modelo de **time de confiança**: sem tabela de vínculo profissional ↔ atleta, sem consentimento por atleta.

| Perfil | Vê | Edita |
|---|---|---|
| `atleta` | **só a própria ficha**, em tudo. Nunca vê outro atleta | a própria ficha, treinos, competições e saúde |
| `professor` | todas as fichas do tenant, **inclusive saúde completa** | grade do time, competições do time, saúde de qualquer atleta |
| `nutricionista`, `fisioterapeuta`, `preparador_fisico` | todas as fichas do tenant, inclusive saúde | saúde e treino de qualquer atleta |
| `admin` | o que o perfil dele vê, mais contas | usuários, perfis, permissões |

Como todo o staff vê tudo, existe **registro de acesso à área de saúde** (quem abriu a saúde de quem, quando), consultável pelo admin. É a única prestação de contas desse modelo, e é reversível: se um dia entrar profissional externo, adiciona-se vínculo por cima.

**Matriz de acesso detalhada** — fixada em `Perfis e acessos.dc.html` (2026-09-23). "Edita" inclui ver; "vê" é só leitura; "—" é invisível.

| Área | atleta | professor | fisioterapeuta · nutricionista · preparador físico |
|---|---|---|---|
| Própria ficha | edita | edita, se tiver ficha | edita, se tiver ficha |
| Fichas de outros atletas | — | vê | vê |
| Treinos e calendário do atleta | edita só os próprios | **vê**, com presença de todos | **edita** de qualquer atleta |
| Grade de treinos do time | vê, como sugestão no calendário | **edita** | vê |
| Competições | edita só as próprias | **edita** as do time | vê |
| Saúde: lesões | edita só a própria | edita | edita |
| Saúde: nutrição (aba nova) | edita só a própria | edita | edita |
| Análises, estratégias, adversários | edita as próprias | edita | edita |
| Usuários e registro de acesso | só com permissão `admin`, qualquer perfil | | |

Regras do registro de acesso: grava quem abriu, de quem, **o quê** (lesão + região, nutrição, ou visão geral) e quando; o atleta abrindo a própria saúde **não** entra no registro.

Isso muda `services/authorization.js#resolveScope`: o escopo passa a depender de `role` **e** `profile`. A regra atual "só admin vê o grupo" ([ADR-002](./decisions/002-rls-desligado-autorizacao-na-aplicacao.md), [ADR-011](./decisions/011-seam-de-politica-de-autorizacao.md)) vira "admin **ou staff** vê o grupo". Vai precisar de ADR novo.

### 1.3 Áreas

| Área | O que é | Conecta com o produto atual |
|---|---|---|
| **Competições** | evento do time → inscrição do atleta (categoria, peso-alvo, status, colocação) → luta (adversário, resultado, forma, vídeo) | o vídeo da luta vira análise de vídeo; o adversário da luta vira registro de adversário |
| **Agenda de treinos** | grade recorrente do time (professor) + sessão do atleta como unidade única; sessão vinda da grade = presença. Visões semana, 2 semanas, mês | restrições de lesão aparecem no calendário |
| **Saúde** | lesão (região, lado, status, gravidade, restrições) → eventos datados (evolução, consulta, exame, liberação…) com anexo; eventos futuros são "marcar exame" | restrições alimentam a agenda; staff do time vê |
| **Início** | atleta: próxima competição, semana, lesão ativa, última análise e estratégia. Staff: time com sinais, próximas competições, presença, atividade | agregação, não entidade |

Sem notificação, lembrete ou e-mail em nenhuma fase: não existe job no projeto, e isso é spec própria quando chegar.

### 1.4 Ordem de entrega e por quê

0. **Segurança** — dado de saúde não entra no banco antes do `REVOKE` executado e das chaves rotacionadas.
1. **Identidade** — perfil, vínculo conta ↔ ficha, escopo por perfil. Tudo depende disso.
2. **Fundação do frontend novo** — shell, design system e as telas que já existem, refeitas no design novo. Sem isso, cada área nova seria encaixada no front antigo.
3. **Competições** — menor superfície nova que exercita o vínculo conta ↔ ficha de ponta a ponta com dado real, e reaproveita análise e adversário.
4. **Agenda de treinos** — uso diário; é a maior peça de interface e nasce já no front novo.
5. **Saúde** — a mais pesada: storage, auditoria, dado sensível.
6. **Início completo e extras** — pesagens, diário de bem-estar, metas ligadas ao perfil técnico, graduações, linha do tempo.

---

## 2. Referência de design

**Projeto no Claude Design:** [`Design scope questionnaire`](https://claude.ai/design/p/6f39984b-2862-4cac-b7e2-8d93de97ffc6?file=JiuMetrics.dc.html) (dono Lucas Menezes). Arquivos: `JiuMetrics.dc.html` (protótipo clicável completo), `StrategyReport.dc.html` (relatório de estratégia como componente único para tela e PDF), **`Perfis e acessos.dc.html`** (2026-09-23: matriz de acesso por perfil, navegação e Início por perfil, tela de Usuários completa, proposta da aba Nutrição), `jm-icons.js`, `support.js`, `github.md` (mapa protótipo → arquivos do repo).

**Cópia local de trabalho:** `.ai/design/` (ignorada pelo Git; pode sumir). Inclui o inventário tela a tela em `inventario-prototipo.md`. ⚠️ A cópia de `JiuMetrics.dc.html` está truncada em 256 KiB pelo limite da ferramenta de leitura — o template está inteiro, o fim do script de dados não.

### 2.1 Decisões de forma que o protótipo propõe — e adotamos

- **Shell:** sidebar escura de 248px no desktop (`#0c1524`), header de 56px + **barra inferior de 5 itens** no celular (4 do perfil + "Mais"). Painel lateral direito de 400px para chat e versões; no celular vira tela cheia.
- **Fonte:** Geist para texto, Geist Mono para números, datas, horários e URLs. Substitui a Inter atual.
- **Tokens:** `surface.nav #0c1524` · `surface.page #f5f7fb` · `surface.card #fff` · `border #e4e7ec` · `text.strong #0f172a` · `text.muted #475467` · `action.primary #4f46e5` · `role.adversario #c2410c` · `ai.estimate #5b21b6/#f5f3ff` com borda tracejada. Tema claro obrigatório; escuro troca só valores.
- **Semânticas novas:** 7 tipos de treino com cor própria (kimono, sem kimono, físico, drill, competição, descanso, outro); 4 status de lesão; 4 medalhas; convenção do calendário: ponto cheio = feito, contorno = planejado ou pulado, tracejado = horário da grade aguardando confirmação.
- **Componentes base:** botão (5 variantes, 44px padrão, 48 em CTA), chip, controle segmentado, abas, pill, avatar com inicial, badge de faixa desenhada como faixa com ponteira, badge "estimativa da IA", sheet (diálogo centralizado no desktop, painel inferior no celular, com `role=dialog`, foco preso, Esc), toast escuro com ação e desfazer, skeleton, estado vazio tracejado, estado de erro que **não mostra zero como dado**, linha do tempo, célula de calendário, stat em mono.
- **Estados globais por tela:** normal, carregando, vazio (com texto e ação próprios por rota), erro. O estado de erro diz literalmente "Nenhum número foi mostrado para não parecer dado real".
- **Navegação por perfil:** atleta vê Início, Meu calendário, Competições, Saúde; staff vê Início, Atletas, Grade de treinos, Competições do time, Saúde do time, com etiqueta "Staff"; todos veem Análises de vídeo, Estratégias, Adversários; atleta tem "Minha ficha"; admin ganha "Usuários" com etiqueta "Admin". **O Início do staff muda por perfil:** professor vê presença da aula de hoje; fisioterapeuta vê lesionados primeiro e consultas/exames dos próximos dias; nutricionista vê peso × peso-alvo por atleta; preparador físico vê o treino físico da semana.
- **Rotas propostas:** `/entrar`, `/`, `/calendario?visao=`, `/grade`, `/competicoes`, `/inscricoes/:id`, `/saude`, `/saude/lesoes/:id`, `/atletas/:id/:aba`, `/adversarios/:id`, `/analises-de-video`, `/estrategias/:id`, `/estrategias/:id/pdf`, `/configuracoes`, `/usuarios`, `/sessao-expirada`, `*` → 404.

### 2.2 Mapa de telas — protótipo × sistema atual × fase

| Tela no protótipo | Rota nova | Hoje | Fase |
|---|---|---|---|
| Login, 404, sessão expirada | `/entrar`, `*`, `/sessao-expirada` | `ModernLogin.jsx`; 404 e expirada **não existem** | 2 |
| Início do atleta | `/` | `Overview.jsx` (é um painel genérico) | 2 mínimo, 6 completo |
| Início do time | `/` | não existe | 2 mínimo, 6 completo |
| Atletas (lista com busca e filtro de faixa, sinais) | `/atletas` | `PersonList.jsx` | 2 (sinais nas fases 3–5) |
| Ficha do atleta com 5 abas | `/atletas/:id/:aba` | `PersonDetail.jsx` (só resumo e análises) | 2 (abas Resumo e Análises), 3, 4, 5 (uma aba por fase) |
| Adversários | `/adversarios` | `PersonList.jsx` | 2 |
| Análises de vídeo: lista, nova, espera, resultado | `/analises-de-video` | `VideoAnalysis.jsx`, `AnalysisDetailModal.jsx` | 2 |
| Estratégias: lista, gerar, relatório, PDF | `/estrategias` | `Analyses.jsx`, `Strategy.jsx`, `AiStrategyBox.jsx`, `StrategySummaryModal.jsx`, `strategyReportHtml.js` | 2 |
| Painel Refinar com IA + Versões | painel lateral | 3 chats e 3 históricos duplicados | 2 |
| Configurações | `/configuracoes` | `Settings.jsx` | 2 |
| Usuários (+ perfil, permissão, registro de acesso à saúde) | `/usuarios` | `AdminUsers.jsx` | 1 e 2 (registro de acesso na 5) |
| Competições do atleta, inscrição com lutas, competições do time | `/competicoes`, `/inscricoes/:id` | não existe | 3 |
| Meu calendário (semana, 2 semanas, mês), sheet de sessão | `/calendario` | não existe | 4 |
| Grade de treinos, sheet de horário | `/grade` | não existe | 4 |
| Saúde do atleta, lesão com linha do tempo, saúde do time, viewer de anexo | `/saude`, `/saude/lesoes/:id` | não existe | 5 |
| Mapa de telas, Design system | páginas internas do protótipo | — | não vão para produção |

### 2.3 O que o protótipo deixou em aberto

Registrado aqui para virar tarefa, não para ser esquecido. Detalhe em `.ai/design/inventario-prototipo.md` §7.

- ~~Professor é sempre admin~~ ✅ **Resolvido em `Perfis e acessos`:** admin é um toggle por conta, independente do perfil; "admin só acrescenta a gestão de contas". → `R-05` fechada.
- ~~Só o atleta edita o calendário~~ ✅ **Resolvido em `Perfis e acessos`:** fisio, nutri e preparador **editam** treinos de qualquer atleta; professor **só vê**, com presença. → `R-06` fechada.
- **Exclusão de conta:** o protótipo transfere análises, estratégias e adversários para outra conta, mas diz que **a ficha e a saúde não são transferidas e ficam sem dono** até serem vinculadas a outra conta. Hoje o backend transfere `athletes` junto, e "dado sem dono" fere o invariante 1 de `DOMAIN.md`. → `R-13`.
- **Senha provisória com troca no primeiro acesso:** o fluxo de novo usuário promete isso e não existe. → `R-14`.
- **Peso atual "da ficha, atualizado em 21 set":** a aba Nutrição lê um peso atual com data. Não existe campo nem entidade. → `R-58`, `R-60`.
- **Aba Nutrição dentro de Saúde:** proposta do protótipo, com restrições alimentares e orientações em linha do tempo. Adotada. → `R-57`.
- **Peso de hoje** aparece no Início e não existe entidade de pesagem. → fase 6 (`R-60`).
- **Sem edição nem exclusão** de sessão, horário da grade, evento, inscrição, luta, evento de linha do tempo, ficha completa. Falta desenhar. → `R-25`.
- **Sem erro de login, de análise (vídeo privado, pessoa não identificada), de upload nem de geração.** → `R-25`.
- **Sem navegação de período** no calendário e na grade (botões sem ação). → `R-41`.
- **Luta aponta para adversário por nome**, sem ID. No sistema real é FK opcional. → `R-31`.
- **Categorias de peso** listadas só para adulto masculino com kimono. Faixa etária e feminino faltam. → `R-30`.
- **Recorrência da grade** só semanal, com início/fim e cancelamento por dia. Sem trocar o professor de um horário. → `R-40`.
- **Cores das faixas** vêm de um componente externo (`jm-belt`) que não foi lido. Hoje estão em `frontend/src/constants/persons.js`. → `R-21`.

---

## 3. Tarefas por fase

### Fase 0 — Segurança (pré-requisito de tudo que é dado sensível)

| ID | Tarefa | Tipo | Depende | Status |
|---|---|---|---|---|
| R-01 | Rotacionar a chave publicável do Supabase e a chave do Gemini expostas no histórico público | infra | — | 🔴 só o dono |
| R-02 | Configurar `SUPABASE_SERVICE_ROLE_KEY` na Vercel, deployar o código da spec 008, validar em produção, **só então** executar `server/migrations/024-revoke-anon-access.sql` | infra | R-01 | 🔴 só o dono |
| R-03 | Trocar a senha de `contateste@teste.com` e tirar do `playwright/.env.example` | infra | — | 🔴 só o dono |

Sem R-02, **nenhuma tarefa da fase 5 começa.** Ver [`GAPS.md`](./GAPS.md) §1 para a sequência exata e o incidente de 2026-09-02.

### Fase 1 — Identidade e escopo por perfil

| ID | Tarefa | Tipo | Depende | Status |
|---|---|---|---|---|
| R-04 | **Spec** de identidade: coluna `users.profile` (enum), `athletes.account_user_id` (UUID, nullable, UNIQUE), regra de escopo por `role` × `profile`, migração dos 25 usuários | spec | — | ⚪ |
| R-05 | ~~Decisão: professor nasce `admin` por padrão?~~ **Não.** Admin é toggle por conta, qualquer perfil; não dá para remover o último admin ativo nem a si mesmo (`Perfis e acessos`, 2026-09-23) | decisão | — | ✅ |
| R-06 | ~~Decisão: quem edita o calendário do atleta?~~ **Atleta, fisioterapeuta, nutricionista e preparador físico.** Professor só vê, com presença (`Perfis e acessos`, 2026-09-23) | decisão | — | ✅ |
| R-07 | ADR: "staff vê o tenant" substitui "só admin vê o grupo"; registrar o modelo de time de confiança e por que não há consentimento por atleta | código | R-04 | ⚪ |
| R-08 | `resolveScope` passa a receber `profile`; testes de posse em `__tests__/authorization/` ganham fixtures de perfil (atleta não vê outro atleta; fisio vê o tenant; admin idem) — **teste antes do código** | código | R-04 | ⚪ |
| R-09 | Migração de dados: vincular cada conta `atleta` à sua ficha. Heurística por nome + **confirmação manual** do dono; nenhuma fusão automática | código + decisão | R-04 | ⚪ |
| R-10 | Endpoints de admin: definir perfil na criação e na edição de usuário; `GET /auth/validate` devolve `profile` | código | R-04 | ⚪ |
| R-11 | Converter `user_id` para UUID nas 3 tabelas `VARCHAR` e recriar FKs (item 2 da spec 011). Pré-requisito para as FKs das áreas novas serem reais | spec + infra | R-02 | ⚪ |
| R-13 | **Decisão:** na exclusão de conta, a ficha vinculada e a saúde ficam sem dono (como o protótipo) ou são transferidas junto (como hoje)? Proposta: transferir a **gestão** (`user_id`) para a conta escolhida e só limpar `account_user_id`; nunca deixar linha sem `user_id` | decisão | R-04 | ⚪ |
| R-14 | Senha provisória com **troca obrigatória no primeiro acesso** (`users.must_change_password`), sem recuperação de senha por e-mail | spec | R-04 | ⚪ |
| R-12 | Unificar `athletes` e `opponents` ([ADR-007](./decisions/007-unificar-athlete-e-opponent-numa-entidade-com-papel.md), item 4 da spec 011). Recomendado antes das tabelas novas apontarem para "o lutador" | spec + infra | R-11 | ⚪ |

R-11 e R-12 são trabalho de banco de produção com backup testado. **Não bloqueiam as fases 2 a 4** se as tabelas novas nascerem apontando para `athletes.id` com FK real (`athletes.id` já é UUID). Bloqueiam a limpeza final.

### Fase 2 — Fundação do frontend novo

Reconstrução do que já existe, no design novo. **Sem funcionalidade nova de backend**, salvo o que a fase 1 exige. Critério de pronto: paridade funcional com hoje + os 16 problemas listados no briefing resolvidos.

| ID | Tarefa | Tipo | Depende | Status |
|---|---|---|---|---|
| R-20 | **Spec** da fundação: um sistema de estilo (decidir: Tailwind v4 com tokens em CSS vars, sem CSS global por elemento, sem CSS Modules), roteamento novo, shell, estratégia de convivência com o front antigo durante a migração (branch longa × rota a rota) | spec | — | ⚪ |
| R-21 | Design system em código: tokens (§2.1), Geist, componentes base, badge de faixa (portar cores de `constants/persons.js`), badge de estimativa de IA, sheet acessível, toast com desfazer, skeleton, vazio, erro | código | R-20 | ⚪ |
| R-22 | Shell: sidebar por perfil, header + barra inferior mobile, sheet "Mais", painel lateral, item ativo por prefixo de rota, "Sair" em todo lugar | código | R-21, R-10 | ⚪ |
| R-23 | Login, cadastro (se `ALLOW_PUBLIC_REGISTER`), **404**, **sessão expirada** | código | R-22 | ⚪ |
| R-24 | Atletas, Adversários, Ficha (abas Resumo e Análises de vídeo), cadastro rápido, formulário completo da ficha | código | R-22 | ⚪ |
| R-25 | **Design:** voltar ao Claude Design com a lista de fluxos que faltam: editar/excluir em cada entidade, erros de login/análise/upload/geração, navegação de período | design | — | ⚪ |
| R-26 | Análise de vídeo: lista, nova (só YouTube, texto corrigido), **espera honesta** (5 etapas, sem porcentagem, pode sair da tela), resultado com barras empilhadas e nota de estimativa; remover badge "N frames" | código | R-22 | ⚪ |
| R-27 | Relatório de estratégia como **componente único** (tela e PDF) a partir de `StrategyReport.dc.html`; gerar, lista, PDF; "+X pts" e probabilidade como estimativa | código | R-22 | ⚪ |
| R-28 | Painel lateral único de chat + versões para os 3 contextos (estratégia, análise, perfil), com sugestão de edição no lugar do texto. Apaga as 4 variações de diff e os 2 relatórios duplicados | código | R-27 | ⚪ |
| R-29 | Configurações e **Usuários conforme `Perfis e acessos`**: contadores (contas, admins, ativas, staff), busca + filtros de perfil/permissão/status, linha com perfil, ficha vinculada, último acesso e status, menu por conta (alterar perfil, tornar/remover admin, vincular/desvincular ficha, ver acessos à saúde, desativar/reativar, excluir com transferência e confirmação digitada), diálogo de novo usuário (perfil com dica, toggle admin, toggle "criar ficha vinculada"); aba "Registro de acesso à saúde" fica vazia até a fase 5. Início mínimo dos dois perfis | código | R-22, R-10 | ⚪ |
| R-2A | Corrigir no backend o que a tela nova expõe: `technical_stats` × `technicalStats`, `submissions.detalhes` como objeto, `sweeps.concluidas` inexistente, F20 (refinamento na tela de estratégia não salva) | código | R-26, R-27 | ⚪ |
| R-2B | E2E mínimo dos fluxos críticos rodando **localmente** (login, analisar vídeo com mock, gerar estratégia, aceitar sugestão) — CI continua sem E2E até decisão | código | R-28 | ⚪ |

### Fase 3 — Competições

| ID | Tarefa | Tipo | Depende | Status |
|---|---|---|---|---|
| R-30 | **Spec** de competições: `competitions` (do tenant), `competition_entries` (atleta × evento), `competition_fights` (com `opponent_id` FK opcional e `fight_analysis_id` FK opcional); enums de status, colocação, forma; **tabela de categorias por gênero, faixa etária e modalidade** (o protótipo só tem adulto masculino) | spec | R-04 | ⚪ |
| R-31 | Modelo e endpoints com escopo obrigatório: atleta lê/escreve as próprias inscrições e lutas; staff lê o tenant; professor cria evento do time; **atleta também pode criar evento** | código | R-30, R-08 | ⚪ |
| R-32 | "Salvar e analisar vídeo": luta → formulário de análise com URL e pessoa preenchidas → ao concluir, `fight_analysis_id` gravado na luta | código | R-31, R-26 | ⚪ |
| R-33 | "Cadastrar como adversário" a partir da luta: cria registro de adversário com nome e faixa e grava `opponent_id` | código | R-31, R-24 | ⚪ |
| R-34 | Telas: competições do atleta (próximas com stepper, histórico), inscrição com lutas, competições do time, sheets de criar evento, inscrever-se, adicionar luta; aba Competições da ficha; card "Próxima competição" no Início | código | R-31 | ⚪ |
| R-35 | Sinal "compete em N dias" na lista de atletas e no Início do time | código | R-34 | ⚪ |

### Fase 4 — Agenda de treinos

| ID | Tarefa | Tipo | Depende | Status |
|---|---|---|---|---|
| R-40 | **Spec** da agenda: `class_schedules` (recorrência semanal: dia, hora, duração, modalidade, professor, vigência), `class_schedule_cancellations` (por data), `training_sessions` (atleta, data, hora opcional, tipo, duração, intensidade 1–10, nota, status `planejado/feito/pulado`, `schedule_id` opcional = presença). **Decisão de recorrência:** só semanal na v1, como o protótipo | spec | R-04, R-06 | ⚪ |
| R-41 | Modelo e endpoints: geração das sugestões da grade por período (sem materializar sessões futuras no banco), confirmar/pular/desfazer, sessão pessoal, copiar semana anterior, **navegação de período** (o protótipo não tem), presença por horário para o staff | código | R-40, R-08 | ⚪ |
| R-42 | Calendário do atleta: visão semana (grade de 7 colunas em desktop largo, lista por dia no celular), 2 semanas, mês só leitura; sheet de sessão em 2 toques com último tipo como padrão; toasts com desfazer | código | R-41, R-21 | ⚪ |
| R-43 | Grade do time: tela, sheet de horário, cancelar/reativar por dia, **editar e excluir horário** (falta no protótipo) | código | R-41 | ⚪ |
| R-44 | Presença: bloco "Presença da semana" no Início do time, quadradinhos de treino na lista de atletas e no time com sinal "poucos treinos" | código | R-42 | ⚪ |
| R-45 | Aba Treinos da ficha e faixa "Esta semana" com "Confirmar presença" direto do Início do atleta | código | R-42 | ⚪ |
| R-46 | Banner de restrições ativas no topo do calendário (a lógica vem da fase 5; aqui fica o slot) | código | R-42 | ⚪ |

### Fase 5 — Saúde

| ID | Tarefa | Tipo | Depende | Status |
|---|---|---|---|---|
| R-50 | **Decisão + infra:** armazenamento de anexo. Proposta: Supabase Storage, bucket privado, URL assinada de curta duração, limite de tamanho, só PDF e imagem | decisão + infra | R-02 | ⚪ |
| R-51 | **Spec** de saúde: `injuries` (região da lista fechada + "Outra", lado, data, mecanismo, gravidade, status 4 valores, restrições da lista fechada + texto), `injury_events` (tipo, data que pode ser futura, texto, autor + perfil do autor), `injury_attachments`, `health_access_log`. Autorização: atleta dono + staff; **nunca outro atleta**. Auditoria de leitura na abertura da área | spec | R-02, R-50 | ⚪ |
| R-52 | Modelo e endpoints com escopo obrigatório e log de acesso escrito **no mesmo request** da leitura (não em `catch` silencioso) | código | R-51, R-08 | ⚪ |
| R-53 | Upload e download de anexo por URL assinada; viewer dentro da plataforma, sem nova aba e sem miniatura em lista | código | R-52 | ⚪ |
| R-54 | Telas: saúde do atleta, lesão com linha do tempo e coluna de status/restrições/dados, sheets de registrar lesão e adicionar evento, excluir lesão com confirmação, saúde do time com "lesionados agora" e "próximos 7 dias"; aba Saúde da ficha; card "Lesão ativa" no Início | código | R-52 | ⚪ |
| R-55 | Restrições ativas alimentam o banner do calendário (R-46) e o sinal "com lesão" na lista de atletas e no Início do time | código | R-54, R-46 | ⚪ |
| R-56 | Registro de acesso à saúde visível em Usuários: aba própria, filtro por atleta a partir do menu da conta, colunas quem (perfil), de quem, o quê, quando | código | R-52 | ⚪ |
| R-57 | **Aba Nutrição dentro de Saúde** (mesma regra de acesso, mesmo registro): bloco "Peso para a próxima competição" (peso atual da ficha × peso-alvo da inscrição × dias), campo **restrições alimentares** (aparece para o staff antes de qualquer orientação), **orientações** em linha do tempo com tipo, texto, anexo e autor. Entra na spec R-51 como `nutrition_notes` + `athletes.dietary_restrictions` | spec + código | R-51, R-34 | ⚪ |
| R-58 | Peso atual na ficha: `athletes.current_weight` + `weight_updated_at`, editável pelo atleta e pelo staff. É o mínimo que a aba Nutrição e o card de competição precisam; o histórico fica para R-60 | código | R-24 | ⚪ |

### Fase 6 — Início completo e extras

| ID | Tarefa | Tipo | Depende | Status |
|---|---|---|---|---|
| R-60 | Pesagens: `weight_logs` por data; "peso hoje × peso-alvo" no card de competição; gráfico rumo à categoria | spec | R-34 | ⚪ |
| R-61 | Diário de bem-estar: sono, dor, disposição por dia; entra pelo mesmo sheet da sessão | spec | R-42 | ⚪ |
| R-62 | Metas por ciclo: fraquezas do perfil técnico viram objetivos com prazo até a próxima competição | spec | R-34, R-27 | ⚪ |
| R-63 | Graduações: histórico de faixa e grau por data; `belt` da ficha passa a ser derivada da última graduação | spec | R-24 | ⚪ |
| R-64 | Linha do tempo unificada do atleta | código | R-34, R-42, R-54 | ⚪ |
| R-65 | Início completo: atleta, e **staff com bloco variável por perfil** (professor: presença de hoje; fisio: consultas e exames próximos; nutri: peso × alvo; preparador: treino físico da semana), ordenação padrão por perfil, feed de atividade real | código | fases 3–5 | ⚪ |
| R-66 | Tema escuro (os tokens já permitem) | código | R-21 | ⚪ |
| R-67 | Notificações e lembretes — **exige job/e-mail, arquitetura nova, spec própria** | spec | — | ⚪ |

---

## 4. Decisões pendentes do dono

Nenhuma é técnica. Todas mudam o que o usuário vê.

| ID | Pergunta | Se ficar sem resposta |
|---|---|---|
| ~~R-05~~ | ✅ respondida em `Perfis e acessos`: admin é toggle independente do perfil | — |
| ~~R-06~~ | ✅ respondida: fisio, nutri e preparador editam treinos; professor só vê | — |
| R-13 | Ficha e saúde de conta excluída ficam sem dono ou vão junto com a transferência? | a fase 1 transfere tudo, como hoje, e só desvincula a conta |
| R-09 | Confirmação manual do vínculo conta → ficha para os 25 usuários | nenhuma conta `atleta` ganha "Minha ficha" até confirmar |
| R-30 | Quais categorias de peso valem (gênero, idade, modalidade)? Fonte: regulamento IBJJF/CBJJ vigente | a inscrição usa lista adulto masculino kimono e o resto é texto livre |
| R-50 | Supabase Storage é aceitável para exame médico? Alternativa é bucket S3 próprio | a fase 5 não começa |

---

## 5. Fora de escopo

Upload de arquivo de vídeo · notificações, lembretes ou e-mail no primeiro ciclo · chat entre pessoas · pagamento · recuperação de senha (não existe no backend, e o protótipo diz isso na criação de conta) · múltiplas academias com isolamento entre si · qualquer coisa em tempo real · vínculo profissional ↔ atleta com consentimento (decidido contra, reversível).

---

## 6. Manutenção deste documento

- Tarefa fechada muda o status aqui **na mesma PR** que a fecha, com o link da spec ou do commit.
- Tarefa nova entra com ID sequencial dentro da fase. Não renumere.
- Quando uma fase inteira fecha, o que era `PLANNED` em `DOMAIN.md` §6 e no `CLAUDE.md` ("o que NÃO existe") sai de lá e vira `IMPLEMENTED` em `docs/modules/`.
- Melhorias de tela que vierem do Claude Design entram em §2.3 como item e ganham tarefa; o protótipo é referência de forma, este documento é a referência de decisão.
