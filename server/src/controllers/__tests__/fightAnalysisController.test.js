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

jest.mock('../../models/FightAnalysis');
jest.mock('../../models/Athlete');
jest.mock('../../models/Opponent');
jest.mock('../../models/User');
jest.mock('../../utils/tenantScope');
jest.mock('../../services/strategyService');

const fightAnalysisController = require('../fightAnalysisController');
const FightAnalysis = require('../../models/FightAnalysis');
const Athlete = require('../../models/Athlete');
const User = require('../../models/User');
const StrategyService = require('../../services/strategyService');
const { getScopeIds } = require('../../utils/tenantScope');

describe('fightAnalysisController.createAnalysis', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = { body: {}, userId: 'user-1' };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    getScopeIds.mockResolvedValue(['user-1']);
    Athlete.getById.mockResolvedValue({ id: 'athlete-1', name: 'Atleta X', userId: 'user-1' });
    Athlete.updateTechnicalProfile.mockResolvedValue({});
    Athlete.update.mockResolvedValue({});
    FightAnalysis.create.mockResolvedValue({ id: 'analysis-1' });
    User.getGroupUserIds.mockResolvedValue(['user-1']);
    StrategyService.consolidateAnalyses.mockResolvedValue({ resumo: 'resumo consolidado' });
  });

  it('persiste technicalStats quando technical_stats vem no corpo da requisição (mesmo fix aplicado em linkController)', async () => {
    req.body = {
      personId: 'athlete-1',
      personType: 'athlete',
      videoUrl: 'https://youtube.com/watch?v=abc',
      charts: [],
      summary: 'resumo',
      technical_stats: {
        sweeps: { quantidade: 2, efetividade_percentual: 100 },
        guard_passes: { quantidade: 0 },
        submissions: { tentativas: 0, ajustadas: 0, concluidas: 0, detalhes: [] },
        back_takes: { quantidade: 0, tentou_finalizar: false }
      }
    };

    await fightAnalysisController.createAnalysis(req, res);

    expect(FightAnalysis.create).toHaveBeenCalledWith(
      expect.objectContaining({
        technicalStats: expect.objectContaining({ sweeps: expect.objectContaining({ quantidade: 2 }) })
      })
    );
  });

  it('passa technicalStats como null quando technical_stats não é fornecido (em vez de omitir o campo)', async () => {
    req.body = {
      personId: 'athlete-1',
      personType: 'athlete',
      videoUrl: 'https://youtube.com/watch?v=abc',
      charts: [],
      summary: 'resumo'
    };

    await fightAnalysisController.createAnalysis(req, res);

    expect(FightAnalysis.create).toHaveBeenCalledWith(
      expect.objectContaining({ technicalStats: null })
    );
  });
});
