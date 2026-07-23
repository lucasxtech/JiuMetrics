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

module.exports = {
  // Modelos disponíveis (do mais recente ao mais antigo)
  DEFAULT_MODEL: 'gemini-2.0-flash',
  AVAILABLE_MODELS: [
    'gemini-3.1-pro-preview', // Mais recente e preciso ($2/$12 por 1M até 200K tokens)
    'gemini-3-pro-preview',   // Versão anterior do 3 Pro
    'gemini-2.5-pro',         // Equilíbrio velocidade/precisão
    'gemini-2.0-flash'        // Padrão - rápido e eficiente
  ],

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

  // Configuração do Sistema Multi-Agentes
  ORCHESTRATOR_CONFIG: {
    PROVIDER: 'openai', // 'openai' para GPT-4/GPT-5
    MODEL: process.env.OPENAI_MODEL || 'gpt-4.1',
    TEMPERATURE: 0.2, // Determinístico para análises
    MAX_TOKENS: 4000,
    RESPONSE_FORMAT: { type: 'json_object' } // Força resposta em JSON
  },

  AGENT_CONFIG: {
    // Feature flag: ativar/desativar sistema multi-agentes
    ENABLED: process.env.USE_MULTI_AGENTS === 'true',
    
    // Agentes especializados disponíveis
    AGENTS: [
      { 
        name: 'technical', 
        enabled: true,
        description: 'Análise técnica: guarda, passagem, finalizações, transições'
      },
      { 
        name: 'tactical', 
        enabled: true,
        description: 'Análise tática: gameplan, timing, posicionamento, pressão'
      },
      { 
        name: 'rules', 
        enabled: true,
        description: 'Análise de regras: pontuação, vantagens, técnicas ilegais'
      }
    ],
    
    // Execução
    PARALLEL_EXECUTION: true, // Executar agentes em paralelo (mais rápido)
    
    // Resolução de conflitos
    CONFLICT_RESOLUTION: 'highest_confidence', // ou 'weighted_average'
    MIN_CONFIDENCE_THRESHOLD: 0.6, // Confidence mínimo aceitável
    
    // Configuração do Gemini para agentes
    GEMINI_CONFIG: {
      TEMPERATURE: 0.3, // Mais determinístico que o padrão
      TOP_P: 0.8,
      TOP_K: 40
    },
    
    // Retry logic
    RETRY_CONFIG: {
      MAX_RETRIES: 3,
      INITIAL_DELAY: 1000, // ms
      MAX_DELAY: 10000, // ms (10 segundos)
      BACKOFF_MULTIPLIER: 2 // Exponential backoff
    }
  },

  // Multi-agentes para geração de estratégia tática
  // Ativado pela mesma flag USE_MULTI_AGENTS=true
  STRATEGY_AGENT_CONFIG: {
    ENABLED: process.env.USE_MULTI_AGENTS === 'true',
    AGENTS: ['scout', 'gameplan', 'rules'],
    PARALLEL_EXECUTION: true,
    GEMINI_CONFIG: {
      TEMPERATURE: 0.3,
      TOP_P: 0.8,
      TOP_K: 40
    }
  },

  // Custos estimados (USD por 1M tokens) - Atualizar conforme pricing
  PRICING: {
    GEMINI_FLASH_2_0: {
      input: 0.075,
      output: 0.30
    },
    GPT_4_TURBO: {
      input: 10.00,
      output: 30.00
    },
    GPT_5: { // Estimativa - ajustar quando disponível
      input: 15.00,
      output: 40.00
    }
  }
};
