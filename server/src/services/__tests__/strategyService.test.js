// Força o caminho monolítico de estratégia (não multi-agentes) para que os
// testes de generateStrategy sejam determinísticos independente do .env.
// Precisa ser definido ANTES de qualquer require, pois config/ai.js calcula
// STRATEGY_AGENT_CONFIG.ENABLED uma única vez, no carregamento do módulo.
process.env.USE_MULTI_AGENTS = 'false';

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

jest.mock('../../models/Athlete');
jest.mock('../../models/Opponent');
jest.mock('../../models/FightAnalysis');
jest.mock('../geminiService', () => ({
  generateTacticalStrategy: jest.fn(),
  generateTacticalStrategyWithAgents: jest.fn(),
}));

const StrategyService = require('../strategyService');
const Athlete = require('../../models/Athlete');
const Opponent = require('../../models/Opponent');
const FightAnalysis = require('../../models/FightAnalysis');
const geminiService = require('../geminiService');

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

describe('StrategyService.getConsolidatedStats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('retorna null quando a pessoa não tem nenhuma análise', async () => {
    FightAnalysis.getByPersonId.mockResolvedValue([]);

    const result = await StrategyService.getConsolidatedStats('person-1', ['user-1']);

    expect(result).toBeNull();
  });

  it('consolida os stats sem fazer nenhuma chamada de IA', async () => {
    FightAnalysis.getByPersonId.mockResolvedValue([
      {
        id: '1',
        technicalStats: {
          sweeps: { quantidade: 2, efetividade_percentual: 100 },
          guard_passes: { quantidade: 1 },
          submissions: { tentativas: 0, ajustadas: 0, concluidas: 0, detalhes: [] },
          back_takes: { quantidade: 0, tentou_finalizar: false }
        }
      }
    ]);

    const result = await StrategyService.getConsolidatedStats('person-1', ['user-1']);

    expect(result.sweeps.quantidade_total).toBe(2);
    expect(FightAnalysis.getByPersonId).toHaveBeenCalledWith('person-1', ['user-1']);
  });
});

describe('StrategyService.generateStrategy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('quando technicalSummary já está salvo, NÃO chama consolidateAnalyses (evita gastar IA à toa)', async () => {
    Athlete.getById.mockResolvedValue({
      id: 'athlete-1', name: 'Atleta X', belt: 'azul', technicalSummary: 'resumo salvo do atleta'
    });
    Opponent.getById.mockResolvedValue({
      id: 'opponent-1', name: 'Adversário Y', belt: 'azul', technicalSummary: 'resumo salvo do adversário'
    });

    FightAnalysis.getByPersonId.mockImplementation((personId) => Promise.resolve([
      {
        id: `analysis-${personId}`,
        technicalStats: {
          sweeps: { quantidade: 1, efetividade_percentual: 100 },
          guard_passes: { quantidade: 0 },
          submissions: { tentativas: 0, ajustadas: 0, concluidas: 0, detalhes: [] },
          back_takes: { quantidade: 0, tentou_finalizar: false }
        }
      }
    ]));

    const consolidateAnalysesSpy = jest.spyOn(StrategyService, 'consolidateAnalyses');

    geminiService.generateTacticalStrategy.mockResolvedValue({
      strategy: { resumo_rapido: {} },
      usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 }
    });

    await StrategyService.generateStrategy('athlete-1', 'opponent-1', ['user-1'], null);

    expect(consolidateAnalysesSpy).not.toHaveBeenCalled();
    expect(geminiService.generateTacticalStrategy).toHaveBeenCalledWith(
      expect.objectContaining({ resumo: 'resumo salvo do atleta', technical_stats: expect.objectContaining({ sweeps: expect.any(Object) }) }),
      expect.objectContaining({ resumo: 'resumo salvo do adversário' }),
      null
    );

    consolidateAnalysesSpy.mockRestore();
  });
});
