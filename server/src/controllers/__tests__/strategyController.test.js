// Mock Supabase antes de importar qualquer módulo
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

const strategyController = require('../strategyController');
const Athlete = require('../../models/Athlete');
const Opponent = require('../../models/Opponent');
const TacticalAnalysis = require('../../models/TacticalAnalysis');
const StrategyVersion = require('../../models/StrategyVersion');
const ApiUsage = require('../../models/ApiUsage');
const StrategyService = require('../../services/strategyService');
const { getScopeIds } = require('../../utils/tenantScope');

jest.mock('../../models/Athlete');
jest.mock('../../models/Opponent');
jest.mock('../../models/TacticalAnalysis');
jest.mock('../../models/StrategyVersion');
jest.mock('../../models/ApiUsage');
jest.mock('../../services/strategyService');
jest.mock('../../utils/tenantScope');

describe('strategyController', () => {
  let req, res;

  beforeEach(() => {
    req = {
      body: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    jest.clearAllMocks();
  });

  describe('compareAndStrategy', () => {
    it('deve retornar erro 400 se athleteId não for fornecido', async () => {
      req.body = { opponentId: '2' };

      await strategyController.compareAndStrategy(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'athleteId e opponentId são obrigatórios'
      });
    });

    it('deve retornar erro 400 se opponentId não for fornecido', async () => {
      req.body = { athleteId: '1' };

      await strategyController.compareAndStrategy(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'athleteId e opponentId são obrigatórios'
      });
    });

    it('deve retornar erro 404 se atleta não for encontrado', async () => {
      req.body = { athleteId: '999', opponentId: '2' };
      Athlete.getById.mockReturnValue(null);

      await strategyController.compareAndStrategy(req, res);

      expect(Athlete.getById).toHaveBeenCalledWith('999', undefined);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Atleta não encontrado'
      });
    });

    it('deve retornar erro 404 se adversário não for encontrado', async () => {
      req.body = { athleteId: '1', opponentId: '999' };
      Athlete.getById.mockReturnValue({ id: '1', name: 'Atleta Teste' });
      Opponent.getById.mockReturnValue(null);

      await strategyController.compareAndStrategy(req, res);

      expect(Opponent.getById).toHaveBeenCalledWith('999', undefined);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Adversário não encontrado'
      });
    });

    it('deve gerar estratégia com sucesso quando todos os dados estão corretos', async () => {
      const strategyResult = {
        strategy: { resumo_rapido: { como_vencer: 'pressionar' } },
        metadata: {
          athlete: { id: '1', name: 'João Silva', belt: 'azul', analysesCount: 2, usedSavedSummary: true },
          opponent: { id: '2', name: 'Pedro Santos', belt: 'azul', analysesCount: 1, usedSavedSummary: false },
          strategyModel: 'gemini-2.0-flash',
          usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
          generatedAt: '2026-07-23T00:00:00.000Z'
        }
      };

      req.body = { athleteId: '1', opponentId: '2', model: 'gemini-2.5-pro' };
      req.userId = 'user-1';
      getScopeIds.mockResolvedValue(['user-1']);
      Athlete.getById.mockResolvedValue({ id: '1', name: 'João Silva' });
      Opponent.getById.mockResolvedValue({ id: '2', name: 'Pedro Santos' });
      StrategyService.generateStrategy.mockResolvedValue(strategyResult);
      TacticalAnalysis.create.mockResolvedValue({ id: 'analysis-1' });
      StrategyVersion.createInitial.mockResolvedValue({});
      ApiUsage.logUsage.mockResolvedValue({});

      await strategyController.compareAndStrategy(req, res);

      // Delega para o StrategyService com escopo e modelo do usuário
      expect(StrategyService.generateStrategy).toHaveBeenCalledWith('1', '2', ['user-1'], 'gemini-2.5-pro');
      // Salva no histórico e cria versão inicial
      expect(TacticalAnalysis.create).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'user-1',
        athleteId: '1',
        opponentId: '2',
        strategyData: strategyResult.strategy
      }));
      expect(StrategyVersion.createInitial).toHaveBeenCalledWith('analysis-1', 'user-1', strategyResult.strategy);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          athlete: { id: '1', name: 'João Silva', analysesCount: 2, usedConsolidation: true },
          opponent: { id: '2', name: 'Pedro Santos', analysesCount: 1, usedConsolidation: false },
          strategy: strategyResult.strategy,
          generatedAt: '2026-07-23T00:00:00.000Z',
          analysisId: 'analysis-1'
        }
      });
    });

    it('não falha a request se salvar o histórico der erro (histórico é best-effort)', async () => {
      req.body = { athleteId: '1', opponentId: '2' };
      req.userId = 'user-1';
      getScopeIds.mockResolvedValue(['user-1']);
      Athlete.getById.mockResolvedValue({ id: '1', name: 'João Silva' });
      Opponent.getById.mockResolvedValue({ id: '2', name: 'Pedro Santos' });
      StrategyService.generateStrategy.mockResolvedValue({
        strategy: { resumo_rapido: {} },
        metadata: {
          athlete: { analysesCount: 1 },
          opponent: { analysesCount: 1 },
          usage: null,
          generatedAt: '2026-07-23T00:00:00.000Z'
        }
      });
      TacticalAnalysis.create.mockRejectedValue(new Error('falha no banco'));

      await strategyController.compareAndStrategy(req, res);

      expect(res.status).not.toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('deve lidar com erro na geração de estratégia', async () => {
      req.body = { athleteId: '1', opponentId: '2' };
      getScopeIds.mockResolvedValue(['user-1']);
      Athlete.getById.mockResolvedValue({ id: '1', name: 'João Silva' });
      Opponent.getById.mockResolvedValue({ id: '2', name: 'Pedro Santos' });
      StrategyService.generateStrategy.mockRejectedValue(new Error('Erro no Gemini'));

      await strategyController.compareAndStrategy(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      // O controller retorna mensagem genérica (não vaza detalhes internos)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Erro ao gerar estratégia tática'
      });
    });
  });

  describe('updateAnalysis', () => {
    beforeEach(() => {
      getScopeIds.mockResolvedValue(['user-1']);
      TacticalAnalysis.getById.mockResolvedValue({ id: 'analysis-1', user_id: 'user-1' });
      TacticalAnalysis.update.mockResolvedValue({ id: 'analysis-1', strategy_data: {} });
      StrategyVersion.create.mockResolvedValue({});
    });

    it('rejeita com 400 quando o newValue de plano_tatico_faseado tem o schema antigo/errado', async () => {
      req.params = { id: 'analysis-1' };
      req.body = {
        strategy_data: {
          plano_tatico_faseado: {
            fase_inicial: 'texto',
            meio_da_luta: 'texto',
            final_da_luta: 'texto'
          }
        },
        edited_field: 'plano_tatico_faseado'
      };

      await strategyController.updateAnalysis(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.stringMatching(/em_pe_standup/)
      }));
      expect(TacticalAnalysis.update).not.toHaveBeenCalled();
    });

    it('aplica a atualização quando o newValue tem o schema real', async () => {
      req.params = { id: 'analysis-1' };
      req.body = {
        strategy_data: {
          plano_tatico_faseado: {
            em_pe_standup: { acao_recomendada: 'x' },
            jogo_de_passagem_top: { estilo_recomendado: 'y' },
            jogo_de_guarda_bottom: { guarda_ideal: 'z' }
          }
        },
        edited_field: 'plano_tatico_faseado'
      };

      await strategyController.updateAnalysis(req, res);

      expect(TacticalAnalysis.update).toHaveBeenCalledWith('analysis-1', 'user-1', {
        strategy_data: req.body.strategy_data
      });
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('não bloqueia quando edited_field não é informado (ex.: restauração de versão)', async () => {
      req.params = { id: 'analysis-1' };
      req.body = {
        strategy_data: { qualquer_coisa: 'valor' }
      };

      await strategyController.updateAnalysis(req, res);

      expect(res.status).not.toHaveBeenCalledWith(400);
      expect(TacticalAnalysis.update).toHaveBeenCalled();
    });
  });
});
