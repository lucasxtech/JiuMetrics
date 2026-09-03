/**
 * Configurações centralizadas para serviços de IA
 */

// Regras IBJJF por faixa (adulto, gi).
// Fonte única de verdade — qualquer texto/prompt que precise descrever
// regras de faixa deve derivar destes dados, nunca hardcodar uma tabela
// paralela (foi exatamente essa duplicação que causou divergências:
// toe hold sendo listado como permitido para roxa, quando na verdade só
// é liberado a partir de marrom; wrist lock sendo proibido para azul,
// quando é permitido desde essa faixa).
const BELT_RULES = {
  branca: {
    allowed: ['chave de pé reta'],
    forbidden: ['wrist lock', 'toe hold', 'kneebar', 'calf slicer', 'bicep slicer', 'heel hook', 'knee reaping'],
    extraRules: 'Puxar guarda saltando (jump guard) e scissor takedown proibidos. Qualquer slam resulta em desclassificação.'
  },
  white: { alias: 'branca' },
  azul: {
    allowed: ['chave de pé reta', 'wrist lock'],
    forbidden: ['toe hold', 'kneebar', 'calf slicer', 'bicep slicer', 'heel hook', 'knee reaping'],
    extraRules: 'Qualquer slam resulta em desclassificação.'
  },
  blue: { alias: 'azul' },
  roxa: {
    allowed: ['chave de pé reta', 'wrist lock'],
    forbidden: ['toe hold', 'kneebar', 'calf slicer', 'bicep slicer', 'heel hook', 'knee reaping'],
    extraRules: 'Qualquer slam resulta em desclassificação.'
  },
  purple: { alias: 'roxa' },
  marrom: {
    allowed: ['chave de pé reta', 'wrist lock', 'toe hold', 'kneebar', 'calf slicer', 'bicep slicer'],
    forbidden: ['heel hook (no gi)', 'knee reaping (no gi)'],
    extraRules: 'Heel hook e knee reaping são permitidos apenas em competições NO-GI — proibidos de gi.'
  },
  brown: { alias: 'marrom' },
  preta: {
    allowed: ['chave de pé reta', 'wrist lock', 'toe hold', 'kneebar', 'calf slicer', 'bicep slicer'],
    forbidden: ['heel hook (no gi)', 'knee reaping (no gi)'],
    extraRules: 'Heel hook e knee reaping são permitidos apenas em competições NO-GI — proibidos de gi.'
  },
  black: { alias: 'preta' }
};

// Nível numérico de cada faixa canônica (1=branca ... 5=preta), usado para
// determinar a faixa mais restritiva entre dois competidores.
const BELT_LEVELS = { branca: 1, azul: 2, roxa: 3, marrom: 4, preta: 5 };

/**
 * Resolve uma faixa (incluindo aliases em inglês) para sua chave canônica
 * em português (ex.: 'white' -> 'branca'). Fonte única de resolução de
 * alias — antes desta unificação, StrategyRulesAgent.js e getBeltLevel
 * tinham cada um seu próprio mapa de alias independente, arriscando
 * divergir silenciosamente de BELT_RULES.
 * @param {string} belt - Faixa (português ou inglês)
 * @returns {string|null} Chave canônica em português, ou null se vazia/desconhecida
 */
function resolveBeltKey(belt) {
  if (!belt) return null;
  const entry = BELT_RULES[belt.toLowerCase()];
  if (!entry) return null;
  return entry.alias || belt.toLowerCase();
}

/**
 * Resolve uma faixa para sua entrada de regras canônica em BELT_RULES.
 * @param {string} belt - Faixa (português ou inglês)
 * @returns {{allowed: string[], forbidden: string[], extraRules: string}|null}
 */
function resolveBeltRules(belt) {
  const key = resolveBeltKey(belt);
  return key ? BELT_RULES[key] : null;
}

/**
 * Nível numérico da faixa (1=branca ... 5=preta), usado para calcular a
 * faixa mais restritiva entre atleta e adversário. Faixa desconhecida ou
 * não informada retorna 5 (preta) — comportamento histórico preservado.
 * @param {string} belt
 * @returns {number}
 */
function getBeltLevel(belt) {
  const key = resolveBeltKey(belt);
  return key ? (BELT_LEVELS[key] || 5) : 5;
}

// Modelos default por TAREFA, usados quando o usuário não escolhe um modelo
// explícito. A ingestão de vídeo é a etapa que define a qualidade de todo o
// resto do pipeline — usa o modelo forte; texto (consolidações/chat) usa o
// modelo rápido.
const TASK_MODELS = {
  VIDEO_ANALYSIS: 'gemini-2.5-pro',
  STRATEGY: 'gemini-2.5-pro',
  TEXT: 'gemini-2.5-flash',
  CHAT: 'gemini-2.5-flash'
};

/**
 * Modelos que o sistema aceita usar. Fonte única — `AVAILABLE_MODELS` no
 * export abaixo deriva desta constante, para não existirem duas listas.
 */
const ALLOWED_MODELS = [
  'gemini-3.1-pro-preview', // Mais recente e preciso ($2/$12 por 1M até 200K tokens)
  'gemini-2.5-pro',         // Forte em vídeo/raciocínio (default de análise e estratégia)
  'gemini-2.5-flash',       // Rápido e barato (default de texto/chat)
  'gemini-2.0-flash'        // Legado — mantido para comparação
];
// REMOVIDO em 2026-09-02: 'gemini-3-pro-preview' — o provedor marcou como
// descontinuado. Oferecer na tela de Ajustes um modelo que falha ao ser usado
// transfere para o usuário um erro que é nosso. Quem tiver o valor antigo no
// localStorage cai no default da tarefa, com aviso (ver `resolveModel`).
// O preço continua em models/ApiUsage.js#PRICING, para as linhas históricas.

/**
 * Resolve o modelo a usar para uma tarefa: a escolha explícita do usuário
 * vence, **desde que esteja na allow-list**; sem escolha (ou com escolha
 * inválida), cai no default da tarefa.
 *
 * Antes da spec 009 isto era `if (userModel) return userModel` — **qualquer
 * string vinda do cliente virava o modelo usado**. Combinado com
 * `calculateCost`, que caía no preço do flash para modelo desconhecido, dava
 * para usar um modelo caro e registrar o custo de um barato.
 *
 * ⚠️ Modelo desconhecido **cai no default, não gera erro** — decisão
 * deliberada. A escolha do usuário vem do `localStorage` (`ai_model`), então
 * um valor obsoleto salvo no navegador passaria a quebrar a operação de quem
 * nunca fez nada errado. Cair no default resolve o risco de custo (o default
 * é o modelo barato) sem quebrar ninguém, e o aviso no log dá o rastro.
 *
 * @param {'VIDEO_ANALYSIS'|'STRATEGY'|'TEXT'|'CHAT'} task
 * @param {string|null} [userModel] - Modelo escolhido pelo usuário (opcional)
 * @returns {string}
 */
function resolveModel(task, userModel = null) {
  const taskDefault = TASK_MODELS[task] || TASK_MODELS.TEXT;

  if (!userModel) return taskDefault;

  if (!ALLOWED_MODELS.includes(userModel)) {
    console.warn(
      `⚠️ Modelo fora da allow-list ignorado: "${userModel}" — usando o default da tarefa (${taskDefault}).`
    );
    return taskDefault;
  }

  return userModel;
}

/**
 * O modelo está na allow-list?
 * @param {string} modelName
 * @returns {boolean}
 */
function isModelAllowed(modelName) {
  return ALLOWED_MODELS.includes(modelName);
}

module.exports = {
  // Default genérico (fallback e exibição) — os fluxos reais usam TASK_MODELS
  DEFAULT_MODEL: 'gemini-2.5-flash',
  TASK_MODELS,
  resolveModel,
  isModelAllowed,
  // Mesma lista que a allow-list — deriva dela, para não haver duas fontes
  // de verdade sobre quais modelos existem (spec 009).
  AVAILABLE_MODELS: ALLOWED_MODELS,

  // Temperaturas por tipo de tarefa (antes definidas em AGENT_CONFIG e
  // nunca aplicadas — agora usadas de fato pela camada llm.js)
  GENERATION: {
    JSON_TEMPERATURE: 0.2,      // extração estruturada (análise de vídeo)
    STRATEGY_TEMPERATURE: 0.3,  // estratégia (um pouco de variação criativa)
    TEXT_TEMPERATURE: 0.4,      // resumos/consolidações
    CHAT_TEMPERATURE: 0.7       // conversa
  },

  /**
   * Políticas de retry e timeout POR FLUXO (spec 009, R5–R7).
   *
   * Deliberadamente distintas: análise de vídeo e chat têm perfis de custo e
   * latência incomparáveis. Uma inferência de vídeo em `gemini-2.5-pro` é a
   * operação mais cara e mais lenta do sistema — repetir custa muito e demora
   * muito; uma mensagem de chat é barata e o usuário está esperando na tela.
   *
   * `maxAttempts: 1` significa **nenhuma nova tentativa**, não "uma tentativa
   * extra".
   *
   * ⚠️ O timeout limita **quanto tempo esperamos**, não necessariamente quanto
   * o provedor processa: sem cancelamento no SDK, a inferência pode seguir do
   * outro lado e o custo já ter sido incorrido. Serve para não pendurar a
   * função serverless até o `maxDuration` — não como controle de gasto.
   */
  AI_POLICIES: {
    VIDEO_ANALYSIS: { maxAttempts: 2, baseDelayMs: 2000, timeoutMs: 300000 },
    STRATEGY:       { maxAttempts: 2, baseDelayMs: 1500, timeoutMs: 120000 },
    TEXT:           { maxAttempts: 3, baseDelayMs: 800,  timeoutMs: 60000  },
    CHAT:           { maxAttempts: 2, baseDelayMs: 500,  timeoutMs: 45000  }
  },

  /**
   * Orçamento de IA (spec 009, R3). **Por TENANT** — decisão P8, conforme a
   * recomendação do plano de refatoração (§14).
   *
   * Por tenant e não por usuário porque o grupo é a unidade que compartilha os
   * dados e, presumivelmente, a conta. Um teto adicional por usuário dentro do
   * grupo depende do modelo comercial, que não está definido — não foi
   * inventado aqui.
   *
   * ⚠️ Começa PERMISSIVO de propósito. O gasto medido é de US$ 3,03 em 8 meses
   * (≈ US$ 0,38/mês), então US$ 50/mês é ~130× o histórico: barra abuso sem
   * chegar perto do uso real. Apertar depois de observar é fácil; destravar
   * usuário legítimo bloqueado é caro.
   *
   * `AI_MONTHLY_BUDGET_USD=0` desativa a verificação.
   */
  AI_BUDGET: {
    monthlyUsdPerTenant: process.env.AI_MONTHLY_BUDGET_USD !== undefined
      ? Number(process.env.AI_MONTHLY_BUDGET_USD)
      : 50,
    warnAtPercent: 80
  },

  // Configuração de download de vídeo (YouTube → File API)
  VIDEO_DOWNLOAD: {
    MAX_HEIGHT: 720,           // Qualidade máxima (720p suficiente para análise)
    MAX_FILE_SIZE_MB: 200,     // Tamanho máximo do vídeo em MB
    DOWNLOAD_TIMEOUT_MS: 120000, // Timeout do download (2 min)
  },

  // Limites de texto
  MAX_SUMMARY_WORDS: 250,
  DEBUG_RESPONSE_CHARS: { first: 500, last: 300 },

  // Rate limits para chat
  RATE_LIMITS: {
    CHAT_WINDOW_MS: 15 * 60 * 1000, // 15 minutos
    CHAT_MAX_REQUESTS: 100
  },

  // Títulos dos gráficos padronizados
  CHART_TITLES: {
    PERSONALITY: 'Personalidade Geral',
    INITIAL_BEHAVIOR: 'Comportamento Inicial',
    GUARD_GAME: 'Jogo de Guarda',
    PASSING_GAME: 'Jogo de Passagem',
    SUBMISSIONS: 'Tentativas de Finalização'
  },

  // Labels válidas para cada gráfico
  CHART_LABELS: {
    personality: [
      'agressivo', 'explosivo', 'estratégico', 'conservador', 
      'ritmo constante', 'cansa no final', 'acelera no final', 
      'pressão contínua', 'contra-atacador'
    ],
    initialBehavior: [
      'troca de queda', 'puxa pra guarda', 'tenta quedas explosivas',
      'busca controle em pé', 'fica esperando', 'tenta passar direto ao chão'
    ],
    guardGame: [
      'laço', 'guarda fechada', 'guarda aberta agressiva', 'subir de single-leg',
      'guarda borboleta', 'amarra o jogo', 'riscadas/botes sucessivos', 'scramble',
      'de la riva', 'meia guarda', 'one leg', 'guarda usando lapela'
    ],
    passingGame: [
      'toreada', 'over/under', 'emborcada', 'pressão de quadril',
      'caminhada lateral', 'passos rápidos por fora', 'amarração antes de passar',
      'explosão para lateral', 'pulando'
    ],
    submissions: [
      'arm lock', 'triângulo', 'estrangulamento', 'mata leão', 'arco e flecha',
      'omoplata', 'leg lock', 'chave de pé', 'mão de vaca', 'guilhotina',
      'baratoplata', 'tarikoplata', 'baseball choke', 'estrangulamento com lapela',
      'heel hook', 'mata leão no pé', 'chave de panturrilha', 'chave de bíceps',
      'chave de virilha'
    ]
  },

  // Regras IBJJF por faixa — dados definidos acima como const BELT_RULES,
  // reexportados aqui para manter a mesma API pública (config.BELT_RULES).
  BELT_RULES,
  resolveBeltKey,
  resolveBeltRules,
  getBeltLevel,

  // NOTA (Fase 1): o sistema multi-agentes (ORCHESTRATOR_CONFIG /
  // AGENT_CONFIG / STRATEGY_AGENT_CONFIG) e a tabela PRICING que só ele
  // usava foram aposentados — ver SPEC-ANALISE-IA.md itens A1/A2/D4.
  // O rastreamento de custos vive em models/ApiUsage.js (PRICING por modelo).
};
