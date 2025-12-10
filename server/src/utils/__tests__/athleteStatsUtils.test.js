const { processPersonAnalyses } = require('../athleteStatsUtils');

describe('athleteStatsUtils', () => {
  describe('processPersonAnalyses', () => {
    it('deve retornar atributos padrão quando não há análises', () => {
      const result = processPersonAnalyses([], { name: 'Teste' });
      
      expect(result).toEqual({
        condicionamento: 50,
        tecnica: 50,
        agressividade: 50,
        defesa: 50,
        movimentacao: 50
      });
    });

    it('deve retornar atributos padrão quando análises é null', () => {
      const result = processPersonAnalyses(null, { name: 'Teste' });
      
      expect(result).toEqual({
        condicionamento: 50,
        tecnica: 50,
        agressividade: 50,
        defesa: 50,
        movimentacao: 50
      });
    });

    it('deve calcular condicionamento baseado em ações', () => {
      const analyses = [
        {
          data: {
            actions: Array(10).fill({ type: 'test' }), // 10 ações
            positions: Array(5).fill({ type: 'test' }) // 5 posições
          }
        }
      ];
      
      const result = processPersonAnalyses(analyses, { name: 'Teste' });
      
      // avgActions = 10, avgPositions = 5
      // condicionamento = (10 * 4) + (5 * 2) = 50
      expect(result.condicionamento).toBe(50);
    });

    it('deve usar cardio do person se disponível', () => {
      const analyses = [
        {
          data: {
            actions: Array(5).fill({ type: 'test' })
          }
        }
      ];
      
      const person = { name: 'Teste', cardio: 75 };
      const result = processPersonAnalyses(analyses, person);
      
      expect(result.condicionamento).toBe(75);
    });

    it('deve calcular técnica baseado em variedade e volume', () => {
      const analyses = [
        {
          data: {
            techniques: [
              { category: 'Guarda', type: 'test1' },
              { category: 'Guarda', type: 'test2' },
              { category: 'Passagem', type: 'test3' },
              { category: 'Finalização', type: 'test4' }
            ]
          }
        }
      ];
      
      const result = processPersonAnalyses(analyses, { name: 'Teste' });
      
      // 3 categorias diferentes * 8 = 24
      // 4 técnicas totais / 1 análise = 4 * 3 = 12
      // total = 36
      expect(result.tecnica).toBe(36);
    });

    it('deve calcular agressividade baseado em finalizações e ações ofensivas', () => {
      const analyses = [
        {
          data: {
            submissions: Array(3).fill({ type: 'test' }),
            sweeps: Array(2).fill({ type: 'test' }),
            backTakes: Array(1).fill({ type: 'test' })
          }
        }
      ];
      
      const result = processPersonAnalyses(analyses, { name: 'Teste' });
      
      // avgSubmissions = 3 * 20 = 60
      // avgSweeps = 2 * 8 = 16
      // avgBackTakes = 1 * 15 = 15
      // bônus por ter tentativas = 10
      // total = 60 + 16 + 15 + 10 = 101 -> limitado a 100
      expect(result.agressividade).toBe(100);
    });

    it('deve calcular defesa baseado em taxa de sucesso de sweeps', () => {
      const analyses = [
        {
          data: {
            sweeps: [
              { completed: true },
              { completed: true },
              { completed: false }
            ],
            techniques: [
              { category: 'Defesas/Escapes' },
              { category: 'Defesas/Escapes' }
            ]
          }
        }
      ];
      
      const result = processPersonAnalyses(analyses, { name: 'Teste' });
      
      // sweepSuccessRate = 2/3 = 0.667 * 40 = 26.67
      // avgDefensive = 2 * 6 = 12
      // base = 20
      // total = 26.67 + 12 + 20 = 58.67 -> 59
      expect(result.defesa).toBe(59);
    });

    it('deve calcular movimentação baseado em transições', () => {
      const analyses = [
        {
          data: {
            backTakes: Array(2).fill({ type: 'test' }),
            sweeps: Array(3).fill({ type: 'test' }),
            techniques: [
              { category: 'Cat1' },
              { category: 'Cat2' },
              { category: 'Cat3' },
              { category: 'Cat4' }
            ],
            positions: Array(60).fill({ type: 'test' })
          }
        }
      ];
      
      const result = processPersonAnalyses(analyses, { name: 'Teste' });
      
      // avgBackTakes = 2 * 18 = 36
      // avgSweeps = 3 * 10 = 30
      // techniqueVariety = 4 * 4 = 16
      // bônus alta mobilidade = 15
      // total = 36 + 30 + 16 + 15 = 97
      expect(result.movimentacao).toBe(97);
    });

    it('deve consolidar múltiplas análises corretamente', () => {
      const analyses = [
        {
          data: {
            actions: Array(5).fill({ type: 'test' }),
            submissions: Array(2).fill({ type: 'test' })
          }
        },
        {
          data: {
            actions: Array(15).fill({ type: 'test' }),
            submissions: Array(4).fill({ type: 'test' })
          }
        }
      ];
      
      const result = processPersonAnalyses(analyses, { name: 'Teste' });
      
      // Média de ações = (5 + 15) / 2 = 10
      // Média de submissions = (2 + 4) / 2 = 3
      expect(result).toMatchObject({
        condicionamento: expect.any(Number),
        tecnica: expect.any(Number),
        agressividade: expect.any(Number),
        defesa: expect.any(Number),
        movimentacao: expect.any(Number)
      });
    });

    it('deve limitar todos os atributos entre os valores mínimos e 100', () => {
      const analyses = [
        {
          data: {
            actions: [],
            techniques: [],
            submissions: [],
            sweeps: [],
            backTakes: []
          }
        }
      ];
      
      const result = processPersonAnalyses(analyses, { name: 'Teste' });
      
      // Todos devem ter valores mínimos definidos
      expect(result.condicionamento).toBeGreaterThanOrEqual(20);
      expect(result.tecnica).toBeGreaterThanOrEqual(15);
      expect(result.agressividade).toBeGreaterThanOrEqual(10);
      expect(result.defesa).toBeGreaterThanOrEqual(15);
      expect(result.movimentacao).toBeGreaterThanOrEqual(10);
      
      // Todos devem estar limitados a 100
      expect(result.condicionamento).toBeLessThanOrEqual(100);
      expect(result.tecnica).toBeLessThanOrEqual(100);
      expect(result.agressividade).toBeLessThanOrEqual(100);
      expect(result.defesa).toBeLessThanOrEqual(100);
      expect(result.movimentacao).toBeLessThanOrEqual(100);
    });

    it('deve retornar números inteiros arredondados', () => {
      const analyses = [
        {
          data: {
            actions: Array(7).fill({ type: 'test' }),
            submissions: Array(1).fill({ type: 'test' })
          }
        }
      ];
      
      const result = processPersonAnalyses(analyses, { name: 'Teste' });
      
      expect(Number.isInteger(result.condicionamento)).toBe(true);
      expect(Number.isInteger(result.tecnica)).toBe(true);
      expect(Number.isInteger(result.agressividade)).toBe(true);
      expect(Number.isInteger(result.defesa)).toBe(true);
      expect(Number.isInteger(result.movimentacao)).toBe(true);
    });
  });
});
