/**
 * Testes de seleção dinâmica de modelo do geminiService.
 *
 * Versão anterior deste arquivo chamava a API REAL do Gemini (timeout de
 * 30s, sem mocks, exigia GEMINI_API_KEY no ambiente) e assertava um shape
 * de resposta que não existe mais (pontos_fortes_atleta etc.) — falhava
 * sempre. Reescrito como teste unitário: mocka o SDK e verifica o
 * comportamento que o nome do arquivo promete — qual modelo é instanciado
 * quando customModel é passado vs omitido.
 */

// A API key precisa existir ANTES do require, pois geminiService decide no
// carregamento do módulo se cria o client (apiKey ? new GoogleGenerativeAI : null).
process.env.GEMINI_API_KEY = 'test-key-nao-usada';

const mockGenerateContent = jest.fn();
const mockGetGenerativeModel = jest.fn(() => ({
  generateContent: mockGenerateContent,
  startChat: jest.fn()
}));

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn(() => ({
    getGenerativeModel: (...args) => mockGetGenerativeModel(...args)
  }))
}));

const { generateTacticalStrategy, generateAthleteSummary } = require('../geminiService');
const { DEFAULT_MODEL } = require('../../config/ai');

const FAKE_STRATEGY_JSON = JSON.stringify({
  resumo_rapido: { como_vencer: 'pressionar', tres_prioridades: ['a', 'b', 'c'] },
  analise_de_matchup: { vantagem_critica: 'x', risco_oculto: 'y', fator_chave: 'z' }
});

function fakeGeminiResponse(text) {
  return {
    response: {
      text: () => text,
      usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 20, totalTokenCount: 30 }
    }
  };
}

const mockAthleteData = { name: 'João Silva', belt: 'azul', resumo: 'Lutador técnico', technical_stats: null };
const mockOpponentData = { name: 'Pedro Santos', belt: 'azul', resumo: 'Lutador agressivo', technical_stats: null };

describe('Gemini AI - Seleção Dinâmica de Modelo', () => {
  beforeEach(() => {
    mockGenerateContent.mockReset();
    // Não resetar mockGetGenerativeModel por completo: a instância default
    // é criada uma única vez no load do módulo. Limpamos apenas o registro
    // de chamadas para asserções por teste.
    mockGetGenerativeModel.mockClear();
  });

  describe('generateTacticalStrategy', () => {
    it('instancia o modelo customizado quando passado como terceiro parâmetro', async () => {
      mockGenerateContent.mockResolvedValue(fakeGeminiResponse(FAKE_STRATEGY_JSON));

      const result = await generateTacticalStrategy(mockAthleteData, mockOpponentData, 'gemini-2.5-pro');

      expect(mockGetGenerativeModel).toHaveBeenCalledWith({ model: 'gemini-2.5-pro' });
      expect(result.strategy.resumo_rapido.como_vencer).toBe('pressionar');
      expect(result.usage.modelName).toBe('gemini-2.5-pro');
    });

    it('usa o modelo padrão (instância criada no load) quando nenhum modelo é especificado', async () => {
      mockGenerateContent.mockResolvedValue(fakeGeminiResponse(FAKE_STRATEGY_JSON));

      const result = await generateTacticalStrategy(mockAthleteData, mockOpponentData);

      // Sem customModel, reutiliza a instância default — nenhuma instância nova é criada
      expect(mockGetGenerativeModel).not.toHaveBeenCalled();
      expect(result.usage.modelName).toBe(DEFAULT_MODEL);
    });

    it('usa o modelo padrão quando customModel é null', async () => {
      mockGenerateContent.mockResolvedValue(fakeGeminiResponse(FAKE_STRATEGY_JSON));

      const result = await generateTacticalStrategy(mockAthleteData, mockOpponentData, null);

      expect(mockGetGenerativeModel).not.toHaveBeenCalled();
      expect(result.usage.modelName).toBe(DEFAULT_MODEL);
    });
  });

  describe('generateAthleteSummary', () => {
    const athleteWithAnalyses = { name: 'João Silva', analyses: [], attributes: null };

    it('instancia o modelo customizado quando passado como segundo parâmetro', async () => {
      mockGenerateContent.mockResolvedValue(fakeGeminiResponse('Resumo técnico do atleta.'));

      const result = await generateAthleteSummary(athleteWithAnalyses, 'gemini-2.5-pro');

      expect(mockGetGenerativeModel).toHaveBeenCalledWith({ model: 'gemini-2.5-pro' });
      expect(result.summary).toBe('Resumo técnico do atleta.');
      expect(result.usage.modelName).toBe('gemini-2.5-pro');
    });

    it('usa o modelo padrão quando nenhum modelo é especificado', async () => {
      mockGenerateContent.mockResolvedValue(fakeGeminiResponse('Resumo técnico do atleta.'));

      const result = await generateAthleteSummary(athleteWithAnalyses);

      expect(mockGetGenerativeModel).not.toHaveBeenCalled();
      expect(result.summary).toBe('Resumo técnico do atleta.');
      expect(result.usage.modelName).toBe(DEFAULT_MODEL);
    });

    it('usa o modelo padrão quando customModel é null', async () => {
      mockGenerateContent.mockResolvedValue(fakeGeminiResponse('Resumo técnico do atleta.'));

      const result = await generateAthleteSummary(athleteWithAnalyses, null);

      expect(mockGetGenerativeModel).not.toHaveBeenCalled();
      expect(result.usage.modelName).toBe(DEFAULT_MODEL);
    });
  });

  describe('Contrato de retorno', () => {
    it('generateTacticalStrategy retorna { strategy, usage } com contagem de tokens', async () => {
      mockGenerateContent.mockResolvedValue(fakeGeminiResponse(FAKE_STRATEGY_JSON));

      const result = await generateTacticalStrategy(mockAthleteData, mockOpponentData);

      expect(result).toEqual(expect.objectContaining({
        strategy: expect.any(Object),
        usage: expect.objectContaining({
          promptTokens: 10,
          completionTokens: 20,
          totalTokens: 30
        })
      }));
    });
  });
});
