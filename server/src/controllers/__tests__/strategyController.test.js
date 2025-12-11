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

// Mock do Gemini Service
jest.mock('../../services/geminiService', () => ({
  generateTacticalStrategy: jest.fn()
}));

const strategyController = require('../strategyController');
const Athlete = require('../../models/Athlete');
const Opponent = require('../../models/Opponent');
const FightAnalysis = require('../../models/FightAnalysis');
const { generateTacticalStrategy } = require('../../services/geminiService');
const { processPersonAnalyses } = require('../../utils/athleteStatsUtils');

jest.mock('../../models/Athlete');
jest.mock('../../models/Opponent');
jest.mock('../../models/FightAnalysis');
jest.mock('../../utils/athleteStatsUtils');

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
      const athlete = {
        id: '1',
        name: 'João Silva',
        aiSummary: 'Lutador técnico com bom jogo de guarda'
      };
      const opponent = {
        id: '2',
        name: 'Pedro Santos',
        aiSummary: 'Lutador agressivo focado em passagem'
      };
      const athleteAnalyses = [{ id: 'a1', data: {} }];
      const opponentAnalyses = [{ id: 'o1', data: {} }];
      const athleteAttributes = {
        condicionamento: 75,
        tecnica: 80,
        agressividade: 60,
        defesa: 70,
        movimentacao: 65
      };
      const opponentAttributes = {
        condicionamento: 70,
        tecnica: 65,
        agressividade: 85,
        defesa: 60,
        movimentacao: 75
      };
      const mockStrategy = {
        analise: 'Análise comparativa...',
        estrategia_para_vencer: 'Estratégias...',
        taticas_especificas: 'Táticas...',
        plano_por_fases: {
          inicio: 'Início...',
          meio: 'Meio...',
          fim: 'Fim...'
        },
        checklist: {
          fazer: ['Ação 1', 'Ação 2'],
          evitar: ['Erro 1'],
          buscar: ['Posição 1'],
          nunca_permitir: ['Situação 1']
        }
      };

      req.body = { athleteId: '1', opponentId: '2' };
      Athlete.getById.mockReturnValue(athlete);
      Opponent.getById.mockReturnValue(opponent);
      FightAnalysis.getByPersonId
        .mockReturnValueOnce(athleteAnalyses)
        .mockReturnValueOnce(opponentAnalyses);
      processPersonAnalyses
        .mockReturnValueOnce(athleteAttributes)
        .mockReturnValueOnce(opponentAttributes);
      generateTacticalStrategy.mockResolvedValue(mockStrategy);

      await strategyController.compareAndStrategy(req, res);

      expect(FightAnalysis.getByPersonId).toHaveBeenCalledWith('1');
      expect(FightAnalysis.getByPersonId).toHaveBeenCalledWith('2');
      expect(processPersonAnalyses).toHaveBeenCalledWith(athleteAnalyses, athlete);
      expect(processPersonAnalyses).toHaveBeenCalledWith(opponentAnalyses, opponent);
      expect(generateTacticalStrategy).toHaveBeenCalledWith(
        {
          name: 'João Silva',
          resumo: 'Lutador técnico com bom jogo de guarda',
          atributos: athleteAttributes
        },
        {
          name: 'Pedro Santos',
          resumo: 'Lutador agressivo focado em passagem',
          atributos: opponentAttributes
        }
      );
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          athlete: {
            id: '1',
            name: 'João Silva',
            attributes: athleteAttributes,
            totalAnalyses: 1
          },
          opponent: {
            id: '2',
            name: 'Pedro Santos',
            attributes: opponentAttributes,
            totalAnalyses: 1
          },
          strategy: mockStrategy,
          generatedAt: expect.any(String)
        }
      });
    });

    it('deve usar resumo padrão quando atleta não tem aiSummary', async () => {
      const athlete = { id: '1', name: 'João Silva' };
      const opponent = { id: '2', name: 'Pedro Santos', aiSummary: 'Resumo...' };
      
      req.body = { athleteId: '1', opponentId: '2' };
      Athlete.getById.mockReturnValue(athlete);
      Opponent.getById.mockReturnValue(opponent);
      FightAnalysis.getByPersonId.mockReturnValue([]);
      processPersonAnalyses.mockReturnValue({
        condicionamento: 50,
        tecnica: 50,
        agressividade: 50,
        defesa: 50,
        movimentacao: 50
      });
      generateTacticalStrategy.mockResolvedValue({
        analise: 'Test',
        estrategia_para_vencer: 'Test',
        taticas_especificas: 'Test',
        plano_por_fases: { inicio: '', meio: '', fim: '' },
        checklist: { fazer: [], evitar: [], buscar: [], nunca_permitir: [] }
      });

      await strategyController.compareAndStrategy(req, res);

      expect(generateTacticalStrategy).toHaveBeenCalledWith(
        expect.objectContaining({
          resumo: 'Sem resumo disponível - sem análises de vídeo ainda.'
        }),
        expect.any(Object)
      );
    });

    it('deve lidar com erro na geração de estratégia', async () => {
      const athlete = { id: '1', name: 'João Silva', aiSummary: 'Resumo...' };
      const opponent = { id: '2', name: 'Pedro Santos', aiSummary: 'Resumo...' };
      
      req.body = { athleteId: '1', opponentId: '2' };
      Athlete.getById.mockReturnValue(athlete);
      Opponent.getById.mockReturnValue(opponent);
      FightAnalysis.getByPersonId.mockReturnValue([]);
      processPersonAnalyses.mockReturnValue({
        condicionamento: 50,
        tecnica: 50,
        agressividade: 50,
        defesa: 50,
        movimentacao: 50
      });
      generateTacticalStrategy.mockRejectedValue(new Error('Erro no Gemini'));

      await strategyController.compareAndStrategy(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Erro no Gemini'
      });
    });
  });
});
