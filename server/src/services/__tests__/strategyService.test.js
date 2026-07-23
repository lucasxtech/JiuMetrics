// Mock Supabase antes de importar qualquer módulo (strategyService importa modelos que
// inicializam o client do Supabase no require).
jest.mock('../../config/supabase', () => ({
  __esModule: true,
  default: {
    from: jest.fn(() => ({
      select: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    }))
  }
}));

const StrategyService = require('../strategyService');

describe('StrategyService.consolidateTechnicalStats', () => {
  it('deve retornar null quando nenhuma análise tem technicalStats', () => {
    const analyses = [
      { id: '1', summary: 'sem stats' },
      { id: '2', summary: 'sem stats também' }
    ];

    const result = StrategyService.consolidateTechnicalStats(analyses);

    expect(result).toBeNull();
  });

  it('deve consolidar stats de análises no formato camelCase retornado pelo dbParsers', () => {
    // Formato real devolvido por parseAnalysisFromDB (server/src/utils/dbParsers.js):
    // a coluna technical_stats do banco vira a chave technicalStats no objeto da aplicação.
    const analyses = [
      {
        id: '1',
        technicalStats: {
          sweeps: { quantidade: 2, efetividade_percentual: 50 },
          guard_passes: { quantidade: 1 },
          submissions: { tentativas: 3, ajustadas: 1, concluidas: 1, detalhes: ['arm lock'] },
          back_takes: { quantidade: 1, tentou_finalizar: true }
        }
      },
      {
        id: '2',
        technicalStats: {
          sweeps: { quantidade: 0, efetividade_percentual: 0 },
          guard_passes: { quantidade: 3 },
          submissions: { tentativas: 1, ajustadas: 0, concluidas: 0, detalhes: [] },
          back_takes: { quantidade: 0, tentou_finalizar: false }
        }
      }
    ];

    const result = StrategyService.consolidateTechnicalStats(analyses);

    expect(result).not.toBeNull();
    expect(result.total_analises).toBe(2);
    expect(result.sweeps.quantidade_total).toBe(2);
    expect(result.guard_passes.quantidade_total).toBe(4);
    expect(result.submissions.tentativas_total).toBe(4);
    expect(result.submissions.concluidas_total).toBe(1);
    expect(result.back_takes.quantidade_total).toBe(1);
  });

  it('deve ignorar análises sem technicalStats mas consolidar as que têm', () => {
    const analyses = [
      { id: '1', technicalStats: null },
      {
        id: '2',
        technicalStats: {
          sweeps: { quantidade: 5, efetividade_percentual: 80 },
          guard_passes: { quantidade: 0 },
          submissions: { tentativas: 0, ajustadas: 0, concluidas: 0, detalhes: [] },
          back_takes: { quantidade: 0, tentou_finalizar: false }
        }
      }
    ];

    const result = StrategyService.consolidateTechnicalStats(analyses);

    expect(result).not.toBeNull();
    expect(result.total_analises).toBe(1);
    expect(result.sweeps.quantidade_total).toBe(5);
  });
});
