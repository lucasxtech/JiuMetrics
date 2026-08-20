/**
 * Testes unitários para configuração de IA
 */

// `models/ApiUsage` (usado nos testes de allow-list × preço) importa
// config/supabase, que lança sem credenciais. Este teste é de unidade pura.
jest.mock('../config/supabase', () => ({ supabase: {}, supabaseAdmin: {} }));

const {
  DEFAULT_MODEL,
  AVAILABLE_MODELS,
  MAX_SUMMARY_WORDS,
  RATE_LIMITS,
  CHART_TITLES,
  CHART_LABELS,
  BELT_RULES,
  TASK_MODELS,
  resolveModel,
  isModelAllowed
} = require('../config/ai');
const { calculateCost, PRICING } = require('../models/ApiUsage');

describe('Configuração de IA', () => {
  describe('DEFAULT_MODEL', () => {
    it('deve estar definido', () => {
      expect(DEFAULT_MODEL).toBeDefined();
      expect(typeof DEFAULT_MODEL).toBe('string');
    });

    it('deve ser um modelo válido da lista', () => {
      expect(AVAILABLE_MODELS).toContain(DEFAULT_MODEL);
    });
  });

  describe('AVAILABLE_MODELS', () => {
    it('deve ser um array não vazio', () => {
      expect(Array.isArray(AVAILABLE_MODELS)).toBe(true);
      expect(AVAILABLE_MODELS.length).toBeGreaterThan(0);
    });

    it('cada modelo deve ser uma string', () => {
      AVAILABLE_MODELS.forEach(model => {
        expect(typeof model).toBe('string');
      });
    });

    it('deve ter modelos Gemini', () => {
      const hasGeminiModel = AVAILABLE_MODELS.some(m => m.includes('gemini'));
      expect(hasGeminiModel).toBe(true);
    });
  });

  describe('MAX_SUMMARY_WORDS', () => {
    it('deve ser um número positivo', () => {
      expect(typeof MAX_SUMMARY_WORDS).toBe('number');
      expect(MAX_SUMMARY_WORDS).toBeGreaterThan(0);
    });

    it('deve estar entre 100 e 500', () => {
      expect(MAX_SUMMARY_WORDS).toBeGreaterThanOrEqual(100);
      expect(MAX_SUMMARY_WORDS).toBeLessThanOrEqual(500);
    });
  });

  describe('RATE_LIMITS', () => {
    it('deve ter configuração de chat', () => {
      expect(RATE_LIMITS).toHaveProperty('CHAT_WINDOW_MS');
      expect(RATE_LIMITS).toHaveProperty('CHAT_MAX_REQUESTS');
    });

    it('CHAT_WINDOW_MS deve ser número positivo', () => {
      expect(typeof RATE_LIMITS.CHAT_WINDOW_MS).toBe('number');
      expect(RATE_LIMITS.CHAT_WINDOW_MS).toBeGreaterThan(0);
    });

    it('CHAT_MAX_REQUESTS deve ser número positivo', () => {
      expect(typeof RATE_LIMITS.CHAT_MAX_REQUESTS).toBe('number');
      expect(RATE_LIMITS.CHAT_MAX_REQUESTS).toBeGreaterThan(0);
    });
  });

  describe('CHART_TITLES', () => {
    it('deve ter títulos para os gráficos principais', () => {
      const requiredTitles = [
        'PERSONALITY',
        'INITIAL_BEHAVIOR',
        'GUARD_GAME',
        'PASSING_GAME',
        'SUBMISSIONS'
      ];

      requiredTitles.forEach(title => {
        expect(CHART_TITLES).toHaveProperty(title);
        expect(typeof CHART_TITLES[title]).toBe('string');
      });
    });
  });

  describe('CHART_LABELS', () => {
    it('deve ter labels para personalidade', () => {
      expect(CHART_LABELS.personality).toBeDefined();
      expect(Array.isArray(CHART_LABELS.personality)).toBe(true);
      expect(CHART_LABELS.personality.length).toBeGreaterThan(0);
    });

    it('deve ter labels para comportamento inicial', () => {
      expect(CHART_LABELS.initialBehavior).toBeDefined();
      expect(Array.isArray(CHART_LABELS.initialBehavior)).toBe(true);
    });

    it('deve ter labels para jogo de guarda', () => {
      expect(CHART_LABELS.guardGame).toBeDefined();
      expect(Array.isArray(CHART_LABELS.guardGame)).toBe(true);
    });

    it('deve ter labels para jogo de passagem', () => {
      expect(CHART_LABELS.passingGame).toBeDefined();
      expect(Array.isArray(CHART_LABELS.passingGame)).toBe(true);
    });

    it('deve ter labels para finalizações', () => {
      expect(CHART_LABELS.submissions).toBeDefined();
      expect(Array.isArray(CHART_LABELS.submissions)).toBe(true);
    });

    it('labels devem ser strings', () => {
      Object.values(CHART_LABELS).forEach(labels => {
        labels.forEach(label => {
          expect(typeof label).toBe('string');
        });
      });
    });
  });

  describe('BELT_RULES', () => {
    it('deve ter regras para faixas principais', () => {
      const belts = ['branca', 'azul', 'roxa', 'marrom', 'preta'];
      
      belts.forEach(belt => {
        expect(BELT_RULES).toHaveProperty(belt);
      });
    });

    it('deve ter aliases em inglês', () => {
      const englishBelts = ['white', 'blue', 'purple', 'brown', 'black'];
      
      englishBelts.forEach(belt => {
        expect(BELT_RULES).toHaveProperty(belt);
        expect(BELT_RULES[belt]).toHaveProperty('alias');
      });
    });

    it('cada faixa deve ter técnicas permitidas e proibidas', () => {
      const mainBelts = ['branca', 'azul', 'roxa', 'marrom', 'preta'];
      
      mainBelts.forEach(belt => {
        expect(BELT_RULES[belt]).toHaveProperty('allowed');
        expect(BELT_RULES[belt]).toHaveProperty('forbidden');
        expect(Array.isArray(BELT_RULES[belt].allowed)).toBe(true);
        expect(Array.isArray(BELT_RULES[belt].forbidden)).toBe(true);
      });
    });

    it('faixa branca deve ter mais restrições que preta', () => {
      expect(BELT_RULES.branca.forbidden.length)
        .toBeGreaterThanOrEqual(BELT_RULES.preta.forbidden.length);
    });

    it('cada faixa principal deve ter extraRules', () => {
      const mainBelts = ['branca', 'azul', 'roxa', 'marrom', 'preta'];
      
      mainBelts.forEach(belt => {
        expect(BELT_RULES[belt]).toHaveProperty('extraRules');
        expect(typeof BELT_RULES[belt].extraRules).toBe('string');
      });
    });
  });
});

describe('SPEC-009 (R1) — allow-list de modelos', () => {
  let warnSpy;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('sem escolha do usuário, usa o default da tarefa', () => {
    expect(resolveModel('VIDEO_ANALYSIS')).toBe(TASK_MODELS.VIDEO_ANALYSIS);
    expect(resolveModel('CHAT')).toBe(TASK_MODELS.CHAT);
  });

  it('respeita a escolha do usuário quando está na allow-list', () => {
    expect(resolveModel('CHAT', 'gemini-2.5-pro')).toBe('gemini-2.5-pro');
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it.each([
    'gpt-4-turbo',
    'gemini-9-ultra-inexistente',
    'gemini-2.5-pro; DROP TABLE',
    '../../etc/passwd',
  ])('modelo fora da allow-list (%s) cai no default da tarefa, com aviso', (invalido) => {
    // Cair no default em vez de lançar é deliberado: a escolha vem do
    // localStorage, e um valor obsoleto salvo no navegador não deve quebrar
    // a operação de quem nunca fez nada errado.
    expect(resolveModel('VIDEO_ANALYSIS', invalido)).toBe(TASK_MODELS.VIDEO_ANALYSIS);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('fora da allow-list'));
  });

  it('tarefa desconhecida cai no default de TEXT', () => {
    expect(resolveModel('TAREFA_QUE_NAO_EXISTE')).toBe(TASK_MODELS.TEXT);
  });

  it('isModelAllowed reflete AVAILABLE_MODELS', () => {
    AVAILABLE_MODELS.forEach((m) => expect(isModelAllowed(m)).toBe(true));
    expect(isModelAllowed('modelo-inventado')).toBe(false);
  });

  it('todo default de tarefa está na allow-list', () => {
    Object.values(TASK_MODELS).forEach((m) => expect(AVAILABLE_MODELS).toContain(m));
  });

  it('o descasamento entre modelo usado e preço registrado deixou de ser possível', () => {
    // Era este o defeito: `resolveModel` aceitava qualquer string e
    // `calculateCost` precificava desconhecido como flash — usava-se um modelo
    // caro registrando o custo de um barato. Hoje nenhum modelo que passa por
    // `resolveModel` fica fora de PRICING.
    AVAILABLE_MODELS.forEach((modelo) => {
      expect(PRICING[modelo]).toBeDefined();
    });

    const usado = resolveModel('VIDEO_ANALYSIS', 'gemini-3.1-pro-preview');
    expect(PRICING[usado]).toBeDefined();
    expect(calculateCost(usado, 1000, 1000)).toBeGreaterThan(0);
  });

  it('calculateCost AVISA quando o modelo não tem preço, em vez de reprecificar calado', () => {
    const custo = calculateCost('modelo-sem-preco', 1_000_000, 0);

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('sem preço em PRICING'));
    // Continua estimando (registrar zero subestimaria o gasto), mas o valor
    // é declarado como piso, não como real.
    expect(custo).toBeCloseTo(PRICING[DEFAULT_MODEL].input, 6);
  });
});

describe('Consistência entre configurações', () => {
  it('CHART_LABELS deve ter 5 categorias', () => {
    const labelKeys = Object.keys(CHART_LABELS);
    expect(labelKeys.length).toBe(5);
  });

  it('CHART_TITLES deve ter 5 títulos', () => {
    const titleKeys = Object.keys(CHART_TITLES);
    expect(titleKeys.length).toBe(5);
  });
});
