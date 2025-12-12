const { generateTacticalStrategy, generateAthleteSummary } = require('../geminiService.js');

describe('Gemini AI - Seleção Dinâmica de Modelo', () => {
  const mockAthleteData = {
    name: 'João Silva',
    resumo: 'Lutador técnico',
    atributos: {
      tecnica: 80,
      agressividade: 60,
      condicionamento: 75,
      movimentacao: 65,
      defesa: 70
    }
  };

  const mockOpponentData = {
    name: 'Pedro Santos',
    resumo: 'Lutador agressivo',
    atributos: {
      tecnica: 65,
      agressividade: 85,
      condicionamento: 70,
      movimentacao: 75,
      defesa: 60
    }
  };

  describe('generateTacticalStrategy', () => {
    it('deve aceitar modelo customizado como terceiro parâmetro', async () => {
      // Teste com gemini-2.0-flash (modelo explícito)
      const result1 = await generateTacticalStrategy(
        mockAthleteData,
        mockOpponentData,
        'gemini-2.0-flash-exp'
      );

      expect(result1).toBeDefined();
      expect(result1.pontos_fortes_atleta).toBeDefined();
      expect(result1.estrategia_para_vencer).toBeDefined();
    }, 30000); // Timeout de 30s para API do Gemini

    it('deve usar modelo padrão quando nenhum modelo é especificado', async () => {
      const result = await generateTacticalStrategy(
        mockAthleteData,
        mockOpponentData
      );

      expect(result).toBeDefined();
      expect(result.pontos_fortes_atleta).toBeDefined();
      expect(result.estrategia_para_vencer).toBeDefined();
    }, 30000);

    it('deve usar modelo padrão quando customModel é null', async () => {
      const result = await generateTacticalStrategy(
        mockAthleteData,
        mockOpponentData,
        null
      );

      expect(result).toBeDefined();
      expect(result.pontos_fortes_atleta).toBeDefined();
      expect(result.estrategia_para_vencer).toBeDefined();
    }, 30000);
  });

  describe('generateAthleteSummary', () => {
    it('deve aceitar modelo customizado como segundo parâmetro', async () => {
      const result = await generateAthleteSummary(
        mockAthleteData,
        'gemini-2.0-flash-exp'
      );

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    }, 30000);

    it('deve usar modelo padrão quando nenhum modelo é especificado', async () => {
      const result = await generateAthleteSummary(mockAthleteData);

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    }, 30000);

    it('deve usar modelo padrão quando customModel é null', async () => {
      const result = await generateAthleteSummary(mockAthleteData, null);

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    }, 30000);
  });

  describe('Validação de parâmetros', () => {
    it('deve manter compatibilidade retroativa (sem breaking changes)', async () => {
      // Chamadas antigas sem parâmetro de modelo devem continuar funcionando
      const strategy = await generateTacticalStrategy(
        mockAthleteData,
        mockOpponentData
      );

      const summary = await generateAthleteSummary(mockAthleteData);

      expect(strategy).toBeDefined();
      expect(summary).toBeDefined();
    }, 30000);
  });
});
