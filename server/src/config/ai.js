/**
 * Configurações centralizadas para serviços de IA
 */

module.exports = {
  // Modelos disponíveis
  DEFAULT_MODEL: 'gemini-2.0-flash',
  AVAILABLE_MODELS: [
    'gemini-2.0-flash',
    'gemini-1.5-pro',
    'gemini-1.5-flash'
  ],

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

  // Regras IBJJF por faixa
  BELT_RULES: {
    branca: {
      allowed: ['chave de pé reta'],
      forbidden: ['heel hook', 'toe hold', 'kneebar', 'calf slicer', 'bicep slicer'],
      extraRules: 'Puxar guarda saltando (jump guard) e scissor takedown proibidos'
    },
    white: { alias: 'branca' },
    azul: {
      allowed: ['chave de pé reta'],
      forbidden: ['heel hook', 'toe hold', 'kneebar', 'calf slicer'],
      extraRules: 'Bicep slicer e scissor takedown proibidos'
    },
    blue: { alias: 'azul' },
    roxa: {
      allowed: ['chave de pé reta', 'toe hold'],
      forbidden: ['heel hook', 'kneebar', 'calf slicer'],
      extraRules: 'Bicep slicer permitido da montada'
    },
    purple: { alias: 'roxa' },
    marrom: {
      allowed: ['chave de pé reta', 'toe hold', 'kneebar', 'calf slicer'],
      forbidden: ['heel hook (apenas em NO-GI de algumas federações)'],
      extraRules: 'Bicep slicer de qualquer posição'
    },
    brown: { alias: 'marrom' },
    preta: {
      allowed: ['chave de pé reta', 'toe hold', 'kneebar', 'calf slicer'],
      forbidden: ['heel hook (apenas em NO-GI de algumas federações)'],
      extraRules: 'Todas as chaves de braço e compressões permitidas'
    },
    black: { alias: 'preta' }
  }
};
