/**
 * Testes unitários para configuração de IA
 */

const {
  DEFAULT_MODEL,
  AVAILABLE_MODELS,
  MAX_SUMMARY_WORDS,
  RATE_LIMITS,
  CHART_TITLES,
  CHART_LABELS,
  BELT_RULES
} = require('../config/ai');

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
